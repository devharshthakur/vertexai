import { and, asc, eq } from 'drizzle-orm'
import { useDb } from '#server/db'
import { bookmarks, courses, enrollments, lectures, modules, notes, streaks } from '#server/db/schema'
import { ServiceError } from '#server/utils/service-error'
import type { LectureBookmark, LectureNote, LearningStreak } from '#shared/types/learning'
import type { CreateLectureBookmark, CreateLectureNote, UpdateLectureNote } from '#shared/validation/learning'
import { getVisibleDailyStreak } from '#server/services/streaks'

async function requireLectureEnrollment(courseId: string, lectureId: string, userId: string) {
  const db = useDb()
  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)))
    .limit(1)
  if (!enrollment) throw new ServiceError('forbidden')

  const [lecture] = await db
    .select({ id: lectures.id })
    .from(lectures)
    .innerJoin(modules, eq(modules.id, lectures.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(and(eq(lectures.id, lectureId), eq(courses.id, courseId)))
    .limit(1)
  if (!lecture) throw new ServiceError('not_found')
}

function toLectureNote(note: typeof notes.$inferSelect): LectureNote {
  return {
    id: note.id,
    timestampSeconds: note.timestampSeconds,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString()
  }
}

function toLectureBookmark(bookmark: typeof bookmarks.$inferSelect): LectureBookmark {
  return {
    id: bookmark.id,
    timestampSeconds: bookmark.timestampSeconds,
    createdAt: bookmark.createdAt.toISOString()
  }
}

export async function listLectureNotes(courseId: string, lectureId: string, userId: string): Promise<LectureNote[]> {
  await requireLectureEnrollment(courseId, lectureId, userId)
  const rows = await useDb()
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.lectureId, lectureId)))
    .orderBy(asc(notes.timestampSeconds), asc(notes.createdAt))
  return rows.map(toLectureNote)
}

export async function createLectureNote(courseId: string, lectureId: string, userId: string, input: CreateLectureNote): Promise<LectureNote> {
  await requireLectureEnrollment(courseId, lectureId, userId)
  const [note] = await useDb()
    .insert(notes)
    .values({ userId, lectureId, ...input })
    .returning()
  if (!note) throw new ServiceError('not_found')
  return toLectureNote(note)
}

export async function updateLectureNote(courseId: string, lectureId: string, noteId: string, userId: string, input: UpdateLectureNote): Promise<LectureNote> {
  await requireLectureEnrollment(courseId, lectureId, userId)
  const [note] = await useDb()
    .update(notes)
    .set({ content: input.content })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId), eq(notes.lectureId, lectureId)))
    .returning()
  if (!note) throw new ServiceError('not_found')
  return toLectureNote(note)
}

export async function deleteLectureNote(courseId: string, lectureId: string, noteId: string, userId: string): Promise<void> {
  await requireLectureEnrollment(courseId, lectureId, userId)
  const [deleted] = await useDb()
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId), eq(notes.lectureId, lectureId)))
    .returning({ id: notes.id })
  if (!deleted) throw new ServiceError('not_found')
}

export async function listLectureBookmarks(courseId: string, lectureId: string, userId: string): Promise<LectureBookmark[]> {
  await requireLectureEnrollment(courseId, lectureId, userId)
  const rows = await useDb()
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.lectureId, lectureId)))
    .orderBy(asc(bookmarks.timestampSeconds), asc(bookmarks.createdAt))
  return rows.map(toLectureBookmark)
}

export async function createLectureBookmark(courseId: string, lectureId: string, userId: string, input: CreateLectureBookmark): Promise<LectureBookmark> {
  await requireLectureEnrollment(courseId, lectureId, userId)
  const [bookmark] = await useDb()
    .insert(bookmarks)
    .values({ userId, lectureId, ...input })
    .returning()
  if (!bookmark) throw new ServiceError('not_found')
  return toLectureBookmark(bookmark)
}

export async function deleteLectureBookmark(courseId: string, lectureId: string, bookmarkId: string, userId: string): Promise<void> {
  await requireLectureEnrollment(courseId, lectureId, userId)
  const [deleted] = await useDb()
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId), eq(bookmarks.lectureId, lectureId)))
    .returning({ id: bookmarks.id })
  if (!deleted) throw new ServiceError('not_found')
}

export async function getMyLearningStreak(userId: string): Promise<LearningStreak> {
  const [streak] = await useDb().select().from(streaks).where(eq(streaks.userId, userId)).limit(1)
  const today = new Date().toISOString().slice(0, 10)
  return getVisibleDailyStreak({ currentStreak: streak?.currentStreak ?? 0, longestStreak: streak?.longestStreak ?? 0, lastActiveDate: streak?.lastActiveDate ?? null }, today)
}
