/**
 * Instructor-facing analytics for one course.
 *
 * The dashboard answers three questions from data the platform already
 * records: how far students get in each lecture, how they score on the
 * quizzes, and how much time they spend watching. All figures are scoped to
 * one course and one instructor.
 */

export interface CourseAnalyticsSummary {
  enrolledStudents: number
  /** Mean cached progress across the course's enrollments, 0–100. */
  averageProgressPercent: number
  /** Enrollments that have completed every lecture. */
  completedStudents: number
  /** Estimated watch time across every student and lecture, in seconds. */
  totalWatchedSeconds: number
}

export interface LectureAnalytics {
  lectureId: string
  moduleTitle: string
  title: string
  durationSeconds: number | null
  /** Students who have opened the lecture at least once. */
  started: number
  completed: number
  /** Share of the students who started but have not completed, 0–100. */
  dropOffPercent: number | null
  /** Mean estimated watch time per student who started, in seconds. */
  averageWatchedSeconds: number
  totalWatchedSeconds: number
}

export interface QuizAnalytics {
  quizId: string
  moduleTitle: string
  title: string
  passingScore: number
  /** Submitted attempts; a retake counts again. */
  attempts: number
  /** Mean score across the submitted attempts, 0–100. */
  averageScorePercent: number | null
  /** Share of the submitted attempts that passed, 0–100. */
  passRatePercent: number | null
}

export interface CourseAnalytics {
  courseId: string
  title: string
  summary: CourseAnalyticsSummary
  lectures: LectureAnalytics[]
  quizzes: QuizAnalytics[]
}
