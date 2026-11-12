import { and, asc, eq, isNull } from 'drizzle-orm'
import { useDb } from '#server/db'
import { assignmentSubmissions, assignments, courses, enrollments, users } from '#server/db/schema'
import type { AssignmentInstructorSubmission, AssignmentSubmissionSummary, AssignmentSummary } from '#shared/types/assignments'
import type { CreateAssignmentValues, GradeAssignmentSubmissionValues } from '#shared/validation/assignments'
import { ServiceError } from '#server/utils/service-error'
import { assertCanManageCourse, canManageCourse, type CourseActor } from './courses/access'
import { deleteCourseMaterialFile, getCourseMaterialPath, writeCourseMaterial } from './course-material-storage'

export const MAX_ASSIGNMENT_FILE_BYTES = 100 * 1024 * 1024

interface UploadedAssignmentFile {
  filename: string
  data: Buffer
}

const CODE_EXTENSIONS = new Set(['.c', '.cc', '.cpp', '.cs', '.go', '.h', '.hpp', '.html', '.java', '.js', '.jsx', '.kt', '.md', '.php', '.py', '.rb', '.rs', '.sh', '.sql', '.ts', '.tsx', '.txt', '.vue', '.xml', '.yaml', '.yml'])

function toSubmissionSummary(row: typeof assignmentSubmissions.$inferSelect): AssignmentSubmissionSummary {
  return {
    id: row.id,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    submittedAt: row.submittedAt.toISOString(),
    grade: row.grade === null ? null : Number(row.grade),
    feedback: row.feedback,
    gradedAt: row.gradedAt?.toISOString() ?? null
  }
}

function toAssignmentSummary(row: typeof assignments.$inferSelect, submission: AssignmentSubmissionSummary | null): AssignmentSummary {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    instructions: row.instructions,
    rubric: row.rubric,
    dueAt: row.dueAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    submission
  }
}

function validateAssignmentFile(file: UploadedAssignmentFile) {
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
  if (!filename || filename.length > 255 || !extension || (!['.pdf', '.zip'].includes(extension) && !CODE_EXTENSIONS.has(extension))) {
    throw new ServiceError('invalid_input', 'Choose a PDF, ZIP, or supported source-code file.')
  }
  if (file.data.length === 0) throw new ServiceError('invalid_input', 'The selected file is empty.')
  if (file.data.length > MAX_ASSIGNMENT_FILE_BYTES) throw new ServiceError('invalid_input', 'Files must be 100 MiB or smaller.')
  if (extension === '.pdf' && file.data.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new ServiceError('invalid_input', 'The file contents do not match a PDF file.')
  }
  const zipSignature = file.data.subarray(0, 4)
  const isZip = [
    [0x50, 0x4b, 0x03, 0x04], // Local file header.
    [0x50, 0x4b, 0x05, 0x06], // Empty archive end record.
    [0x50, 0x4b, 0x07, 0x08] // Spanned archive marker.
  ].some((signature) => zipSignature.equals(Buffer.from(signature)))
  if (extension === '.zip' && !isZip) {
    throw new ServiceError('invalid_input', 'The file contents do not match a ZIP file.')
  }
  if (CODE_EXTENSIONS.has(extension) && file.data.includes(0)) {
    throw new ServiceError('invalid_input', 'Source-code uploads must be plain text.')
  }

  const contentType =
    extension === '.pdf' ? 'application/pdf'
    : extension === '.zip' ? 'application/zip'
    : 'text/plain; charset=utf-8'
  return { filename, contentType }
}

async function getAssignment(assignmentId: string) {
  const [row] = await useDb().select({ assignment: assignments, course: courses }).from(assignments).innerJoin(courses, eq(assignments.courseId, courses.id)).where(eq(assignments.id, assignmentId)).limit(1)
  if (!row) throw new ServiceError('not_found')
  return row
}

async function assertCanReadAssignments(courseId: string, actor: CourseActor) {
  const [course] = await useDb().select().from(courses).where(eq(courses.id, courseId)).limit(1)
  if (!course) throw new ServiceError('not_found')
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

async function assertCanSubmit(assignmentId: string, actor: CourseActor) {
  const row = await getAssignment(assignmentId)
  if (row.course.status !== 'approved') throw new ServiceError('not_found')
  const [enrollment] = await useDb()
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, row.course.id), eq(enrollments.userId, actor.id)))
    .limit(1)
  if (!enrollment) throw new ServiceError('forbidden')
  if (Date.now() >= row.assignment.dueAt.getTime()) throw new ServiceError('conflict', 'The submission deadline has passed.')
  return row.assignment
}

/** Lists assignments for an enrolled student or the course owner/admin. */
export async function listCourseAssignments(courseId: string, actor: CourseActor): Promise<AssignmentSummary[]> {
  await assertCanReadAssignments(courseId, actor)
  const rows = await useDb().select().from(assignments).where(eq(assignments.courseId, courseId)).orderBy(asc(assignments.dueAt), asc(assignments.createdAt))
  const submissions = await useDb().select().from(assignmentSubmissions).where(eq(assignmentSubmissions.userId, actor.id))
  const byAssignment = new Map(submissions.map((row) => [row.assignmentId, toSubmissionSummary(row)]))
  return rows.map((row) => toAssignmentSummary(row, byAssignment.get(row.id) ?? null))
}

/** Creates an assignment after verifying course ownership. */
export async function createCourseAssignment(courseId: string, values: CreateAssignmentValues, actor: CourseActor): Promise<AssignmentSummary> {
  const [course] = await useDb().select().from(courses).where(eq(courses.id, courseId)).limit(1)
  if (!course) throw new ServiceError('not_found')
  assertCanManageCourse(course.instructorId, actor)
  const dueAt = new Date(values.dueAt)
  if (!Number.isFinite(dueAt.getTime()) || dueAt.getTime() <= Date.now()) {
    throw new ServiceError('invalid_input', 'Choose a deadline in the future.')
  }
  const [row] = await useDb()
    .insert(assignments)
    .values({
      courseId,
      title: values.title,
      instructions: values.instructions,
      rubric: values.rubric,
      dueAt
    })
    .returning()
  if (!row) throw new Error('The assignment was not created.')
  return toAssignmentSummary(row, null)
}

/** Lists submissions to an instructor-owned assignment, including student identity. */
export async function listAssignmentSubmissions(assignmentId: string, actor: CourseActor): Promise<AssignmentInstructorSubmission[]> {
  const { assignment, course } = await getAssignment(assignmentId)
  assertCanManageCourse(course.instructorId, actor)
  const rows = await useDb()
    .select({ submission: assignmentSubmissions, studentId: users.id, name: users.name, email: users.email })
    .from(assignmentSubmissions)
    .innerJoin(users, eq(assignmentSubmissions.userId, users.id))
    .where(eq(assignmentSubmissions.assignmentId, assignment.id))
    .orderBy(asc(assignmentSubmissions.submittedAt))
  return rows.map(({ submission, studentId, name, email }) => ({
    ...toSubmissionSummary(submission),
    student: { id: studentId, name, email }
  }))
}

/** Creates or replaces the student's ungraded submission before the deadline. */
export async function submitAssignment(assignmentId: string, file: UploadedAssignmentFile, actor: CourseActor): Promise<AssignmentSubmissionSummary> {
  await assertCanSubmit(assignmentId, actor)
  const validated = validateAssignmentFile(file)
  const db = useDb()
  const [existing] = await db
    .select()
    .from(assignmentSubmissions)
    .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.userId, actor.id)))
    .limit(1)
  if (existing?.gradedAt) throw new ServiceError('conflict', 'A graded submission cannot be replaced.')

  const storageKey = await writeCourseMaterial(file.data)
  let saved: typeof assignmentSubmissions.$inferSelect | undefined
  try {
    const [row] =
      existing ?
        await db
          .update(assignmentSubmissions)
          .set({
            storageKey,
            originalFilename: validated.filename,
            contentType: validated.contentType,
            sizeBytes: file.data.length,
            submittedAt: new Date()
          })
          .where(and(eq(assignmentSubmissions.id, existing.id), isNull(assignmentSubmissions.gradedAt)))
          .returning()
      : await db
          .insert(assignmentSubmissions)
          .values({
            assignmentId,
            userId: actor.id,
            storageKey,
            originalFilename: validated.filename,
            contentType: validated.contentType,
            sizeBytes: file.data.length
          })
          .returning()
    if (!row) throw new ServiceError('conflict', 'The assignment submission can no longer be changed.')
    saved = row
  } catch (error) {
    await deleteCourseMaterialFile(storageKey).catch((cleanupError) => {
      console.error('[assignments] Failed to remove an unrecorded submission.', cleanupError)
    })
    throw error
  }
  if (existing) {
    await deleteCourseMaterialFile(existing.storageKey).catch((cleanupError) => {
      console.error('[assignments] Failed to remove a replaced submission.', cleanupError)
    })
  }
  return toSubmissionSummary(saved!)
}

/** Grades a submission using the assignment rubric maximum. */
export async function gradeAssignmentSubmission(submissionId: string, values: GradeAssignmentSubmissionValues, actor: CourseActor): Promise<AssignmentSubmissionSummary> {
  const [row] = await useDb()
    .select({ submission: assignmentSubmissions, assignment: assignments, course: courses })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(eq(assignmentSubmissions.id, submissionId))
    .limit(1)
  if (!row) throw new ServiceError('not_found')
  assertCanManageCourse(row.course.instructorId, actor)
  const maxPoints = row.assignment.rubric.reduce((total, criterion) => total + criterion.points, 0)
  if (values.grade > maxPoints) throw new ServiceError('invalid_input', `Grade cannot exceed ${maxPoints} rubric points.`)
  const [updated] = await useDb()
    .update(assignmentSubmissions)
    .set({
      grade: values.grade.toFixed(2),
      feedback: values.feedback?.trim() || null,
      gradedAt: new Date()
    })
    .where(eq(assignmentSubmissions.id, submissionId))
    .returning()
  if (!updated) throw new ServiceError('not_found')
  return toSubmissionSummary(updated)
}

/** Resolves an upload only for its student or the owning instructor/admin. */
export async function getAssignmentSubmissionFile(submissionId: string, actor: CourseActor) {
  const [row] = await useDb()
    .select({ submission: assignmentSubmissions, course: courses })
    .from(assignmentSubmissions)
    .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(eq(assignmentSubmissions.id, submissionId))
    .limit(1)
  if (!row) throw new ServiceError('not_found')
  if (row.submission.userId !== actor.id) assertCanManageCourse(row.course.instructorId, actor)
  try {
    return { submission: toSubmissionSummary(row.submission), filePath: await getCourseMaterialPath(row.submission.storageKey) }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') throw new ServiceError('not_found')
    throw error
  }
}
