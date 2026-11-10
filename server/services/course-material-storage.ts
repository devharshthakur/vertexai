import { randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, mkdir, open, realpath, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

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

export async function writeCourseMaterial(data: Buffer): Promise<string> {
  const storageKey = getStorageKey()
  const filePath = join(await ensureStorageDirectory(), storageKey)
  const file = await open(filePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600)

  try {
    await file.writeFile(data)
    await file.close()
  } catch (error) {
    await file.close().catch(() => undefined)
    await unlink(filePath).catch(() => undefined)
    throw error
  }

  return storageKey
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
