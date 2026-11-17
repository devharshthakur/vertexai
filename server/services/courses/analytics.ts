import { and, asc, avg, count, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { useDb } from '#server/db'
import { courses, enrollments, lectureProgress, lectures, modules, quizAttempts, quizzes } from '#server/db/schema'
import { ServiceError } from '#server/utils/service-error'
import { assertCanManageCourse, type CourseActor } from './access'
import type { CourseAnalytics, LectureAnalytics, QuizAnalytics } from '#shared/types/analytics'

/**
 * Aggregates one course's learning data for its instructor.
 *
 * Drop-off is measured from lecture progress: everyone who opened a lecture
 * counts as started, and the students who have not completed it yet are the
 * drop-off. Watch time comes from the estimated `watched_seconds` accumulated
 * by the progress endpoint, so seeking forward does not inflate it.
 */
export async function getCourseAnalytics(courseId: string, actor: CourseActor): Promise<CourseAnalytics> {
  const db = useDb()
  const [course] = await db.select({ id: courses.id, title: courses.title, instructorId: courses.instructorId }).from(courses).where(eq(courses.id, courseId)).limit(1)

  if (!course) throw new ServiceError('not_found')
  assertCanManageCourse(course.instructorId, actor)

  const [courseLectureStats] = await db.select({ total: count() }).from(lectures).innerJoin(modules, eq(modules.id, lectures.moduleId)).where(eq(modules.courseId, courseId))

  const enrollmentProgressRows = await db
    .select({
      completedLectures: sql<number>`count(distinct ${lectureProgress.lectureId}) filter (where ${lectureProgress.completed} and ${modules.courseId} = ${courseId})`.mapWith(Number)
    })
    .from(enrollments)
    .leftJoin(lectureProgress, eq(lectureProgress.enrollmentId, enrollments.id))
    .leftJoin(lectures, eq(lectures.id, lectureProgress.lectureId))
    .leftJoin(modules, eq(modules.id, lectures.moduleId))
    .where(eq(enrollments.courseId, courseId))
    .groupBy(enrollments.id)

  const totalLectures = courseLectureStats?.total ?? 0
  const enrollmentProgress = enrollmentProgressRows.map(({ completedLectures }) => (totalLectures ? (completedLectures / totalLectures) * 100 : 0))
  const averageProgress = enrollmentProgress.length ? enrollmentProgress.reduce((total, progress) => total + progress, 0) / enrollmentProgress.length : 0
  const completedStudents = enrollmentProgress.filter((progress) => progress >= 100).length

  const moduleRows = await db.select({ id: modules.id, title: modules.title }).from(modules).where(eq(modules.courseId, courseId)).orderBy(asc(modules.orderIndex), asc(modules.id))
  const moduleTitles = new Map(moduleRows.map((row) => [row.id, row.title]))
  const moduleIds = moduleRows.map((row) => row.id)

  const lectureRows = moduleIds.length ? await db.select({ id: lectures.id, moduleId: lectures.moduleId, title: lectures.title, durationSeconds: lectures.durationSeconds }).from(lectures).where(inArray(lectures.moduleId, moduleIds)).orderBy(asc(lectures.orderIndex), asc(lectures.id)) : []

  const progressRows = await db
    .select({
      lectureId: lectureProgress.lectureId,
      started: count(),
      completed: sql<number>`count(*) filter (where ${lectureProgress.completed})`.mapWith(Number),
      totalWatchedSeconds: sql<number>`coalesce(sum(${lectureProgress.watchedSeconds}), 0)`.mapWith(Number)
    })
    .from(lectureProgress)
    .innerJoin(enrollments, eq(enrollments.id, lectureProgress.enrollmentId))
    .where(eq(enrollments.courseId, courseId))
    .groupBy(lectureProgress.lectureId)

  const progressByLecture = new Map(progressRows.map((row) => [row.lectureId, row]))

  const lectureAnalytics: LectureAnalytics[] = lectureRows.map((lecture) => {
    const progress = progressByLecture.get(lecture.id)
    const started = progress?.started ?? 0
    const completed = progress?.completed ?? 0
    const totalWatchedSeconds = progress?.totalWatchedSeconds ?? 0

    return {
      lectureId: lecture.id,
      moduleTitle: moduleTitles.get(lecture.moduleId) ?? '',
      title: lecture.title,
      durationSeconds: lecture.durationSeconds,
      started,
      completed,
      dropOffPercent: started > 0 ? ((started - completed) / started) * 100 : null,
      averageWatchedSeconds: started > 0 ? Math.round(totalWatchedSeconds / started) : 0,
      totalWatchedSeconds
    }
  })

  const quizRows = moduleIds.length ? await db.select({ id: quizzes.id, moduleId: quizzes.moduleId, title: quizzes.title, passingScore: quizzes.passingScore }).from(quizzes).where(inArray(quizzes.moduleId, moduleIds)).orderBy(asc(quizzes.createdAt), asc(quizzes.id)) : []
  const quizIds = quizRows.map((quiz) => quiz.id)

  const attemptRows =
    quizIds.length ?
      await db
        .select({
          quizId: quizAttempts.quizId,
          attempts: count(),
          averageScore: avg(quizAttempts.score),
          passed: sql<number>`count(*) filter (where ${quizAttempts.passed})`.mapWith(Number)
        })
        .from(quizAttempts)
        .where(
          and(
            inArray(quizAttempts.quizId, quizIds),
            isNotNull(quizAttempts.submittedAt),
            sql`exists (
              select 1
              from ${enrollments}
              where ${enrollments.userId} = ${quizAttempts.userId}
                and ${enrollments.courseId} = ${courseId}
            )`
          )
        )
        .groupBy(quizAttempts.quizId)
    : []

  const attemptsByQuiz = new Map(attemptRows.map((row) => [row.quizId, row]))

  const quizAnalytics: QuizAnalytics[] = quizRows.map((quiz) => {
    const attempts = attemptsByQuiz.get(quiz.id)

    if (!attempts || attempts.attempts === 0) {
      return {
        quizId: quiz.id,
        moduleTitle: moduleTitles.get(quiz.moduleId) ?? '',
        title: quiz.title,
        passingScore: quiz.passingScore,
        attempts: 0,
        averageScorePercent: null,
        passRatePercent: null
      }
    }

    return {
      quizId: quiz.id,
      moduleTitle: moduleTitles.get(quiz.moduleId) ?? '',
      title: quiz.title,
      passingScore: quiz.passingScore,
      attempts: attempts.attempts,
      averageScorePercent: Number(attempts.averageScore ?? 0),
      passRatePercent: (attempts.passed / attempts.attempts) * 100
    }
  })

  const totalWatchedSeconds = lectureAnalytics.reduce((total, lecture) => total + lecture.totalWatchedSeconds, 0)

  return {
    courseId: course.id,
    title: course.title,
    summary: {
      enrolledStudents: enrollmentProgress.length,
      averageProgressPercent: averageProgress,
      completedStudents,
      totalWatchedSeconds
    },
    lectures: lectureAnalytics,
    quizzes: quizAnalytics
  }
}
