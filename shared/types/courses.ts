import type { CourseStatus } from '../validation/courses'

/**
 * The shapes the course API returns.
 *
 * These are the JSON the browser receives: dates are ISO strings, and the
 * server and the client share one definition of them.
 */

export interface CourseSummary {
  id: string
  instructorId: string
  title: string
  description: string | null
  category: string | null
  difficulty: string | null
  thumbnailUrl: string | null
  price: number
  status: CourseStatus
  createdAt: string
  updatedAt: string
}

export interface LectureSummary {
  id: string
  moduleId: string
  title: string
  videoUrl: string | null
  transcript: string | null
  durationSeconds: number | null
  orderIndex: number
  resourceUrls: string[]
}

export interface ModuleSummary {
  id: string
  courseId: string
  title: string
  orderIndex: number
  lectures: LectureSummary[]
}

export interface CourseWithCurriculum {
  course: CourseSummary
  modules: ModuleSummary[]
}

export interface CourseListResult {
  items: CourseSummary[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface EnrollmentSummary {
  id: string
  courseId: string
  enrolledAt: string
  progressPercent: number
  course: Pick<
    CourseSummary,
    'id' | 'title' | 'thumbnailUrl' | 'category' | 'difficulty' | 'status'
  >
}
