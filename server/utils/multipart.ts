import { Busboy, type BusboyConfig } from '@fastify/busboy'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createError, type RequestEvent } from 'nuxt/server'
import { CourseMaterialTooLargeError, deleteCourseMaterialFile, writeCourseMaterialStream } from '#server/services/courses/material-storage'

const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024

export interface MultipartUploadFile {
  fieldName: string
  filename: string
  contentType: string
  storageKey: string
  sizeBytes: number
}

interface MultipartUploadOptions {
  maxFileBytes: number
  maxFiles: number
  maxFields: number
  maxParts: number
  invalidMessage: string
  tooLargeMessage: string
}

interface MultipartUpload {
  fields: Record<string, string>
  files: MultipartUploadFile[]
}

class InvalidMultipartError extends Error {
  constructor() {
    super('Invalid multipart form.')
    this.name = 'InvalidMultipartError'
  }
}

/**
 * Streams a multipart request into bounded external files.
 *
 * Nuxt's `event.req.formData()` buffers a whole part before returning it.
 * Busboy applies limits while the request is read, and file bytes go straight
 * to the configured course-materials directory. Callers take ownership of
 * successful files; `cleanupMultipartUploads` removes them when downstream
 * validation or storage fails.
 */
export async function readMultipartUpload(event: Pick<RequestEvent, 'req'>, options: MultipartUploadOptions): Promise<MultipartUpload> {
  const request = event.req
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;') || !request.body) throw invalid(options)

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > options.maxFileBytes + MAX_MULTIPART_OVERHEAD_BYTES) {
    throw tooLarge(options)
  }

  let busboy: ReturnType<typeof Busboy>
  try {
    busboy = Busboy({
      headers: Object.fromEntries(request.headers) as BusboyConfig['headers'],
      limits: {
        fileSize: options.maxFileBytes + 1,
        files: options.maxFiles,
        fields: options.maxFields,
        fieldNameSize: 100,
        fieldSize: 1024,
        parts: options.maxParts,
        headerSize: 16 * 1024,
        headerPairs: 20
      }
    })
  } catch {
    throw invalid(options)
  }

  const fields: Record<string, string> = {}
  const files: MultipartUploadFile[] = []
  const writes: Promise<void>[] = []
  let failure: unknown
  let storageFailure: unknown

  const fail = (error: unknown) => {
    failure ??= error
    busboy.destroy()
  }

  busboy.on('file', (fieldName, stream, filename, _encoding, mimeType) => {
    if (failure) {
      stream.on('error', () => undefined)
      stream.resume()
      return
    }

    stream.on('limit', () => fail(new CourseMaterialTooLargeError()))
    stream.on('error', () => fail(new InvalidMultipartError()))

    const write = writeCourseMaterialStream(stream, options.maxFileBytes)
      .then(({ storageKey, sizeBytes }) => {
        files.push({ fieldName, filename, contentType: mimeType, storageKey, sizeBytes })
      })
      .catch((error: unknown) => {
        storageFailure = error
        fail(error)
      })
    writes.push(write)
  })

  busboy.on('field', (fieldName, value, nameTruncated, valueTruncated) => {
    if (failure) return
    if (nameTruncated || valueTruncated || fieldName in fields) {
      fail(new InvalidMultipartError())
      return
    }
    fields[fieldName] = value
  })

  busboy.on('partsLimit', () => fail(new InvalidMultipartError()))
  busboy.on('filesLimit', () => fail(new InvalidMultipartError()))
  busboy.on('fieldsLimit', () => fail(new InvalidMultipartError()))

  try {
    await pipeline(Readable.fromWeb(request.body), busboy)
  } catch (error) {
    failure ??= error
  }

  await Promise.all(writes)

  if (failure) {
    await cleanupMultipartUploads(files)

    if (failure instanceof CourseMaterialTooLargeError) throw tooLarge(options)
    if (failure === storageFailure) {
      if (request.signal.aborted) throw invalid(options)
      throw failure
    }
    throw invalid(options)
  }

  return { fields, files }
}

/** Removes uploads that no database record took ownership of. */
export async function cleanupMultipartUploads(files: readonly Pick<MultipartUploadFile, 'storageKey'>[]): Promise<void> {
  await Promise.all(
    files.map((file) =>
      deleteCourseMaterialFile(file.storageKey).catch((error: unknown) => {
        console.error('[uploads] Failed to remove an unrecorded file.', error)
      })
    )
  )
}

function invalid(options: MultipartUploadOptions) {
  return createError({ status: 400, statusText: options.invalidMessage })
}

function tooLarge(options: MultipartUploadOptions) {
  return createError({ status: 413, statusText: options.tooLargeMessage })
}
