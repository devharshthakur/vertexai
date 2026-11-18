import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, realpath, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Readable } from 'node:stream'

const STORAGE_DIRECTORY_ENV = 'COURSE_MATERIALS_DIR'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isWithin(child: string, parent: string): boolean {
  const relativePath = relative(parent, child)
  return relativePath === '' || (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
}

function configuredDirectory(): string {
  const configured = process.env[STORAGE_DIRECTORY_ENV]?.trim()
  if (configured && !isAbsolute(configured)) {
    throw new Error(`${STORAGE_DIRECTORY_ENV} must be an absolute path outside the repository.`)
  }

  const directory = resolve(configured || join(homedir(), '.local', 'share', 'vertexai', 'course-materials'))
  const projectRoot = resolve(process.cwd())
  if (isWithin(directory, projectRoot) || isWithin(projectRoot, directory)) {
    throw new Error(`${STORAGE_DIRECTORY_ENV} must point outside the repository.`)
  }

  return directory
}

async function canonicalProspectiveDirectory(directory: string): Promise<string> {
  let existingPath = directory

  while (true) {
    try {
      const actualPath = await realpath(existingPath)
      return resolve(actualPath, relative(existingPath, directory))
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      const parent = dirname(existingPath)
      if (parent === existingPath) throw error
      existingPath = parent
    }
  }
}

function assertOutsideRepository(directory: string, projectRoot: string): void {
  if (isWithin(directory, projectRoot) || isWithin(projectRoot, directory)) {
    throw new Error(`${STORAGE_DIRECTORY_ENV} must point outside the repository.`)
  }
}

async function ensureStorageDirectory(): Promise<string> {
  const directory = configuredDirectory()
  const [prospectiveDirectory, projectRoot] = await Promise.all([canonicalProspectiveDirectory(directory), realpath(process.cwd())])
  assertOutsideRepository(prospectiveDirectory, projectRoot)
  await mkdir(directory, { recursive: true, mode: 0o700 })

  const actualDirectory = await realpath(directory)
  assertOutsideRepository(actualDirectory, projectRoot)
  return actualDirectory
}

function assertStorageKey(storageKey: string): void {
  if (!UUID_PATTERN.test(storageKey)) throw new Error('Invalid course material storage key.')
}

function getStorageKey(): string {
  return randomUUID()
}

/** Thrown when a streamed upload grows past its route's file-size cap. */
export class CourseMaterialTooLargeError extends Error {
  constructor() {
    super('The uploaded file is too large.')
    this.name = 'CourseMaterialTooLargeError'
  }
}

/**
 * Streams an upload into its final external location without buffering it.
 *
 * A unique server-owned key is chosen before reading. The partial file is
 * removed on any failure, including exceeding `maxBytes`.
 */
export async function writeCourseMaterialStream(data: Readable, maxBytes: number): Promise<{ storageKey: string; sizeBytes: number }> {
  const storageKey = getStorageKey()
  const filePath = join(await ensureStorageDirectory(), storageKey)
  const file = await open(filePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600)
  let sizeBytes = 0

  try {
    for await (const chunk of data) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      sizeBytes += bytes.length
      if (sizeBytes > maxBytes) throw new CourseMaterialTooLargeError()

      let offset = 0
      while (offset < bytes.length) {
        const { bytesWritten } = await file.write(bytes, offset, bytes.length - offset)
        if (!bytesWritten) throw new Error('The uploaded file could not be written.')
        offset += bytesWritten
      }
    }
    await file.close()
  } catch (error) {
    await file.close().catch(() => undefined)
    await unlink(filePath).catch(() => undefined)
    throw error
  }

  return { storageKey, sizeBytes }
}

/** Reads at most `length` leading bytes from a stored upload. */
export async function readCourseMaterialHeader(storageKey: string, length: number): Promise<Buffer> {
  const filePath = await getCourseMaterialPath(storageKey)
  const file = await open(filePath, 'r')

  try {
    const buffer = Buffer.alloc(length)
    const { bytesRead } = await file.read(buffer, 0, length, 0)
    return buffer.subarray(0, bytesRead)
  } finally {
    await file.close()
  }
}

/** Scans a stored text upload for a NUL byte without loading it into memory. */
export async function containsNullByte(storageKey: string): Promise<boolean> {
  const filePath = await getCourseMaterialPath(storageKey)
  const file = await open(filePath, 'r')

  try {
    const buffer = Buffer.alloc(64 * 1024)
    while (true) {
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null)
      if (!bytesRead) return false
      if (buffer.subarray(0, bytesRead).includes(0)) return true
    }
  } finally {
    await file.close()
  }
}

export async function getCourseMaterialPath(storageKey: string): Promise<string> {
  assertStorageKey(storageKey)
  const filePath = join(await ensureStorageDirectory(), storageKey)
  const details = await lstat(filePath)

  if (!details.isFile() || details.isSymbolicLink()) throw new Error('Course material is not a regular file.')

  return filePath
}

export async function deleteCourseMaterialFile(storageKey: string): Promise<void> {
  assertStorageKey(storageKey)
  const filePath = join(await ensureStorageDirectory(), storageKey)
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}
