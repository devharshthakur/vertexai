import { and, asc, eq, inArray } from 'drizzle-orm'
import { useDb } from '#server/db'
import { certificates, courses, enrollments, lectureProgress, lectures, modules, streaks } from '#server/db/schema'
import { ServiceError } from '#server/utils/service-error'
import { awardBadges, issueCourseCertificate } from '#server/services/achievements'
import { recordDailyStreakActivity } from '#server/services/streaks'
import type { LearningCourse } from '#shared/types/learning'
import type { ProgressUpdate } from '#shared/validation/progress'
import { courseProgressCounts, courseProgressPercent } from './progress-counts'

export async function getLearningCourse(courseId: string, userId: string): Promise<LearningCourse> {
  const db = useDb()
  const [enrollment] = await db
    .select({ id: enrollments.id, title: courses.title })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)))
    .limit(1)
  if (!enrollment) throw new ServiceError('forbidden')

  const moduleRows = await db.select().from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.orderIndex), asc(modules.id))
  const ids = moduleRows.map((row) => row.id)
  const lectureRows = ids.length ? await db.select().from(lectures).where(inArray(lectures.moduleId, ids)).orderBy(asc(lectures.orderIndex), asc(lectures.id)) : []
  const progress = await db.select().from(lectureProgress).where(eq(lectureProgress.enrollmentId, enrollment.id))
  const byLecture = new Map(progress.map((row) => [row.lectureId, row]))
  const resultModules = moduleRows.map((module) => ({
    id: module.id,
    title: module.title,
    lectures: lectureRows
      .filter((lecture) => lecture.moduleId === module.id)
      .map((lecture) => ({
        id: lecture.id,
        title: lecture.title,
        videoUrl: lecture.videoUrl,
        positionSeconds: byLecture.get(lecture.id)?.positionSeconds ?? 0,
        completed: byLecture.get(lecture.id)?.completed ?? false
      }))
  }))
  const ordered = resultModules.flatMap((module) => module.lectures)
  const latest = progress.filter((row) => ordered.some((lecture) => lecture.id === row.lectureId)).sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime())[0]
  const [certificate] = await db
    .select({ id: certificates.id, courseTitle: certificates.courseTitle, issuedAt: certificates.issuedAt })
    .from(certificates)
    .where(and(eq(certificates.courseId, courseId), eq(certificates.userId, userId)))
    .limit(1)
  return {
    title: enrollment.title,
    resumeLectureId: latest?.lectureId ?? ordered[0]?.id ?? null,
    progressPercent: ordered.length ? (ordered.filter((lecture) => lecture.completed).length / ordered.length) * 100 : 0,
    certificate: certificate ? { id: certificate.id, courseTitle: certificate.courseTitle, issuedAt: certificate.issuedAt.toISOString() } : null,
    modules: resultModules
  }
}

/** Playback reports arrive about every 10 seconds; allow for scheduling jitter. */
const POSITION_REPORT_TOLERANCE_SECONDS = 2

/**
 * A long pause is not watch time.
 *
 * The client saves on pause and resumes reporting afterwards, so the gap
 * between two reports can be much longer than the playback it represents. The
 * elapsed time is capped before it is used as an allowance.
 */
const MAX_REPORT_GAP_SECONDS = 30

interface PreviousPosition {
  positionSeconds: number
  lastPositionAt: Date
}

/**
 * Estimates how many of the reported seconds were actually watched.
 *
 * The player reports its current position, not a duration. The forward
 * movement is the upper bound; the wall-clock time since the previous report
 * is the lower one. Capping by elapsed time keeps a seek from being counted as
 * watching, while a normal report still adds its full interval.
 */
function estimateWatchedSeconds(previous: PreviousPosition | undefined, positionSeconds: number, now: Date): number {
  if (!previous) return 0

  const advance = positionSeconds - previous.positionSeconds
  if (advance <= 0) return 0

  const elapsed = Math.min(MAX_REPORT_GAP_SECONDS, Math.max(0, Math.floor((now.getTime() - previous.lastPositionAt.getTime()) / 1000)))

  return Math.min(advance, elapsed + POSITION_REPORT_TOLERANCE_SECONDS)
}

export async function updateLectureProgress(courseId: string, lectureId: string, userId: string, input: ProgressUpdate): Promise<void> {
  const db = useDb()
  await db.transaction(async (tx) => {
    const [enrollment] = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)))
      .for('update')
      .limit(1)
    if (!enrollment) throw new ServiceError('forbidden')
    const [lecture] = await tx
      .select({ id: lectures.id })
      .from(lectures)
      .innerJoin(modules, eq(modules.id, lectures.moduleId))
      .where(and(eq(lectures.id, lectureId), eq(modules.courseId, courseId)))
      .limit(1)
    if (!lecture) throw new ServiceError('not_found')

    const now = new Date()
    const [previous] =
      input.action === 'position' ?
        await tx
          .select({
            positionSeconds: lectureProgress.positionSeconds,
            watchedSeconds: lectureProgress.watchedSeconds,
            lastPositionAt: lectureProgress.lastPositionAt
          })
          .from(lectureProgress)
          .where(and(eq(lectureProgress.enrollmentId, enrollment.id), eq(lectureProgress.lectureId, lectureId)))
          .for('update')
          .limit(1)
      : []

    const update =
      input.action === 'view' ? { viewedAt: now, lastPositionAt: now }
      : input.action === 'position' ?
        {
          positionSeconds: input.positionSeconds,
          watchedSeconds: (previous?.watchedSeconds ?? 0) + estimateWatchedSeconds(previous, input.positionSeconds, now),
          lastPositionAt: now
        }
      : { completed: true }

    await tx
      .insert(lectureProgress)
      .values({ enrollmentId: enrollment.id, lectureId, ...update })
      .onConflictDoUpdate({ target: [lectureProgress.enrollmentId, lectureProgress.lectureId], set: update })

    if (input.action === 'view') {
      const today = new Date().toISOString().slice(0, 10)

      // Upsert an empty row first so concurrent views in different courses
      // serialize on the same per-user streak record.
      await tx.insert(streaks).values({ userId }).onConflictDoNothing()
      const [streak] = await tx.select().from(streaks).where(eq(streaks.userId, userId)).for('update').limit(1)
      if (!streak) throw new ServiceError('not_found')

      if (streak.lastActiveDate !== today) {
        const updated = recordDailyStreakActivity({ currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastActiveDate: streak.lastActiveDate }, today)
        await tx.update(streaks).set(updated).where(eq(streaks.userId, userId))
        if (updated.currentStreak >= 7) await awardBadges(tx, userId, ['streak_7'])
      }
    }

    if (input.action === 'complete') {
      const [counts] = await tx
        .select({ total: courseProgressCounts.total, completed: courseProgressCounts.completed })
        .from(lectures)
        .innerJoin(modules, eq(modules.id, lectures.moduleId))
        .leftJoin(lectureProgress, and(eq(lectureProgress.lectureId, lectures.id), eq(lectureProgress.enrollmentId, enrollment.id)))
        .where(eq(modules.courseId, courseId))
      const percent = courseProgressPercent(counts?.total, counts?.completed)
      await tx
        .update(enrollments)
        .set({ progressPercent: percent.toFixed(2) })
        .where(eq(enrollments.id, enrollment.id))

      if (counts?.total && counts.completed === counts.total) {
        const [course] = await tx.select({ title: courses.title }).from(courses).where(eq(courses.id, courseId)).limit(1)
        if (course) await issueCourseCertificate(tx, { userId, courseId, courseTitle: course.title })
      }
    }
  })
}
