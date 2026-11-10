import { and, asc, eq } from 'drizzle-orm'
import { useDb } from '#server/db'
import { courseMaterials, courses, enrollments, lectures, modules } from '#server/db/schema'
import type { CourseMaterialSummary } from '#shared/types/course-materials'
import type { CourseMaterialUploadFields } from '#shared/validation/course-materials'
import { MAX_COURSE_MATERIAL_BYTES } from '#shared/validation/course-materials'
import { ServiceError } from '#server/utils/service-error'
import { assertCanManageCourse, canManageCourse, type CourseActor } from './courses/access'
import { deleteCourseMaterialFile, getCourseMaterialPath, writeCourseMaterial } from './course-material-storage'

const MATERIAL_TYPES: Record<string, { contentType: string; signature: (data: Buffer) => boolean }> = {
  '.pdf': { contentType: 'application/pdf', signature: (data) => data.subarray(0, 5).toString('ascii') === '%PDF-' },
  '.ppt': { contentType: 'application/vnd.ms-powerpoint', signature: (data) => data.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) },
  '.pptx': { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', signature: (data) => data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) },
  '.mp4': { contentType: 'video/mp4', signature: (data) => data.subarray(4, 8).toString('ascii') === 'ftyp' },
  '.mov': { contentType: 'video/quicktime', signature: (data) => ['ftyp', 'moov', 'mdat', 'wide'].includes(data.subarray(4, 8).toString('ascii')) },
  '.webm': { contentType: 'video/webm', signature: (data) => data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) }
}

interface UploadedMaterial {
  filename: string
  data: Buffer
}

function toSummary(row: typeof courseMaterials.$inferSelect): CourseMaterialSummary {
  return {
    id: row.id,
    courseId: row.courseId,
    moduleId: row.moduleId,
    lectureId: row.lectureId,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString()
  }
}

function validateUploadedMaterial(file: UploadedMaterial) {
  const filename = file.filename
    .split(/[\\/]/)
    .at(-1)
    ?.split('')
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join('')
    .trim()
  const extension = filename?.slice(filename.lastIndexOf('.')).toLowerCase()
  const type = extension ? MATERIAL_TYPES[extension] : undefined

  if (!filename || filename.length > 255 || !type) {
    throw new ServiceError('invalid_input', 'Choose a PDF, PowerPoint, or video file.')
  }
  if (file.data.length === 0) throw new ServiceError('invalid_input', 'The selected file is empty.')
  if (file.data.length > MAX_COURSE_MATERIAL_BYTES) throw new ServiceError('invalid_input', 'Files must be 100 MiB or smaller.')
  if (!type.signature(file.data)) throw new ServiceError('invalid_input', 'The file contents do not match the selected file type.')

  return { filename, contentType: type.contentType }
}

async function requireCourse(courseId: string) {
  const [course] = await useDb().select().from(courses).where(eq(courses.id, courseId)).limit(1)
  if (!course) throw new ServiceError('not_found')
  return course
}

async function assertCanReadCourseMaterials(courseId: string, actor: CourseActor) {
  const course = await requireCourse(courseId)
  if (canManageCourse(course.instructorId, actor)) return course
  if (course.status !== 'approved') throw new ServiceError('not_found')

  const [enrollment] = await useDb()
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, actor.id)))
    .limit(1)

  if (!enrollment) throw new ServiceError('forbidden')
  return course
}

async function assertValidTarget(courseId: string, fields: CourseMaterialUploadFields) {
  const [module] = await useDb()
    .select({ id: modules.id })
    .from(modules)
    .where(and(eq(modules.id, fields.moduleId), eq(modules.courseId, courseId)))
    .limit(1)

  if (!module) throw new ServiceError('not_found')
  if (fields.lectureId) {
    const [lecture] = await useDb()
      .select({ id: lectures.id })
      .from(lectures)
      .where(and(eq(lectures.id, fields.lectureId), eq(lectures.moduleId, module.id)))
      .limit(1)
    if (!lecture) throw new ServiceError('not_found')
  }
}

/** Lists course materials for an owner/admin or an enrolled student. */
export async function listCourseMaterials(courseId: string, actor: CourseActor): Promise<CourseMaterialSummary[]> {
  await assertCanReadCourseMaterials(courseId, actor)
  const rows = await useDb().select().from(courseMaterials).where(eq(courseMaterials.courseId, courseId)).orderBy(asc(courseMaterials.moduleId), asc(courseMaterials.lectureId), asc(courseMaterials.createdAt), asc(courseMaterials.id))

  return rows.map(toSummary)
}

/** Stores an instructor's validated file and its course/module/lecture metadata. */
export async function addCourseMaterial(courseId: string, fields: CourseMaterialUploadFields, file: UploadedMaterial, actor: CourseActor): Promise<CourseMaterialSummary> {
  const course = await requireCourse(courseId)
  assertCanManageCourse(course.instructorId, actor)
  await assertValidTarget(courseId, fields)
  const validatedFile = validateUploadedMaterial(file)
  const storageKey = await writeCourseMaterial(file.data)

  try {
    const [row] = await useDb()
      .insert(courseMaterials)
      .values({
        courseId,
        moduleId: fields.moduleId,
        lectureId: fields.lectureId ?? null,
        originalFilename: validatedFile.filename,
        contentType: validatedFile.contentType,
        sizeBytes: file.data.length,
        storageKey
      })
      .returning()

    if (!row) throw new Error('The course material record was not created.')
    return toSummary(row)
  } catch (error) {
    await deleteCourseMaterialFile(storageKey).catch((cleanupError) => {
      console.error('[course-materials] Failed to remove an unrecorded upload.', cleanupError)
    })
    throw error
  }
}

/** Resolves a protected material download after checking course access. */
export async function getCourseMaterialFile(courseId: string, materialId: string, actor: CourseActor) {
  await assertCanReadCourseMaterials(courseId, actor)
  const [row] = await useDb()
    .select()
    .from(courseMaterials)
    .where(and(eq(courseMaterials.id, materialId), eq(courseMaterials.courseId, courseId)))
    .limit(1)
  if (!row) throw new ServiceError('not_found')

  try {
    return { material: toSummary(row), filePath: await getCourseMaterialPath(row.storageKey) }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') throw new ServiceError('not_found')
    throw error
  }
}

/** Removes an owner's material and its server-generated local file. */
export async function removeCourseMaterial(courseId: string, materialId: string, actor: CourseActor): Promise<void> {
  const course = await requireCourse(courseId)
  assertCanManageCourse(course.instructorId, actor)
  const [row] = await useDb()
    .select()
    .from(courseMaterials)
    .where(and(eq(courseMaterials.id, materialId), eq(courseMaterials.courseId, courseId)))
    .limit(1)
  if (!row) throw new ServiceError('not_found')

  await deleteCourseMaterialFile(row.storageKey)
  await useDb().delete(courseMaterials).where(eq(courseMaterials.id, row.id))
}
