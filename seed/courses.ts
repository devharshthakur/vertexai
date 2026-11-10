import type { CourseDifficulty, CourseStatus } from '../shared/validation/courses.ts'

interface DemoLecture {
  /** Folder under `public/videos/` holding an MP4, `transcript.txt`, and `about.md`. */
  slug: string
}

interface DemoModule {
  title: string
  lectures: DemoLecture[]
}

export interface DemoCourse {
  title: string
  /** Folder whose `about.md` supplies the course description. */
  descriptionSlug: string
  category: string
  difficulty: CourseDifficulty
  status: CourseStatus
  modules: DemoModule[]
  approval: { decision: 'approved' | 'rejected'; comment: string } | null
  /** Progress for the demo student, or `null` when the student is not enrolled. */
  enrollmentProgress: string | null
}

/** The only courses managed by the demo seed. */
export const DEMO_COURSES: DemoCourse[] = [
  {
    title: 'Learning TypeScript',
    descriptionSlug: 'typescript',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn TypeScript',
        lectures: [{ slug: 'typescript' }]
      }
    ],
    approval: { decision: 'approved', comment: 'Approved for the demo catalog.' },
    enrollmentProgress: '0.00'
  },
  {
    title: 'Learning React',
    descriptionSlug: 'react',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn React',
        lectures: [{ slug: 'react' }]
      }
    ],
    approval: { decision: 'approved', comment: 'Approved for the demo catalog.' },
    enrollmentProgress: '0.00'
  },
  {
    title: 'Learning Tailwind CSS',
    descriptionSlug: 'tailwind',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn Tailwind CSS',
        lectures: [{ slug: 'tailwind' }]
      }
    ],
    approval: { decision: 'approved', comment: 'Approved for the demo catalog.' },
    enrollmentProgress: '0.00'
  }
]

/** Every folder the demo seed validates before changing database rows. */
export const DEMO_VIDEO_SLUGS = [...new Set(DEMO_COURSES.flatMap((course) => [course.descriptionSlug, ...course.modules.flatMap((module) => module.lectures.map((lecture) => lecture.slug))]))]

/** Earlier demo-only seed fixtures removed by the canonical demo seed. */
export const LEGACY_DEMO_COURSE_TITLES = [
  'VertexAI Demo: Foundations of Learning',
  'Full-Stack TypeScript with Nuxt & Drizzle',
  'Course-Grounded RAG Systems in Practice',
  'Practical Prompt Engineering for Educators',
  'Modern UI Architecture with Design Systems',
  'Intro to Quantum Computing (Draft)'
] as const
