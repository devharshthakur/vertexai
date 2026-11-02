import type { CourseDifficulty, CourseStatus } from '../shared/validation/courses.ts'

interface DemoLecture {
  title: string
  videoUrl: string
  durationSeconds: number
  transcript: string | null
}

interface DemoModule {
  title: string
  lectures: DemoLecture[]
}

export interface DemoCourse {
  title: string
  description: string
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
    description: 'A beginner-friendly, full-length TypeScript course by John Smilga on freeCodeCamp.org.',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn TypeScript',
        lectures: [
          {
            title: 'Learn TypeScript for Practical Projects — John Smilga',
            videoUrl: 'https://www.youtube.com/watch?v=JHEB7RhJG1Y',
            durationSeconds: 36000,
            transcript: null
          }
        ]
      }
    ],
    approval: { decision: 'approved', comment: 'Approved for the demo catalog.' },
    enrollmentProgress: '0.00'
  },
  {
    title: 'Learning React',
    description: 'Learn modern React through hands-on projects with Bob Ziroll on freeCodeCamp.org.',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn React',
        lectures: [
          {
            title: 'Learn React — Bob Ziroll',
            videoUrl: 'https://www.youtube.com/watch?v=x4rFhThSX04',
            durationSeconds: 56454,
            transcript: null
          }
        ]
      }
    ],
    approval: { decision: 'approved', comment: 'Approved for the demo catalog.' },
    enrollmentProgress: '0.00'
  },
  {
    title: 'Learning Tailwind CSS',
    description: 'An introduction to Tailwind CSS fundamentals with Guillaume on freeCodeCamp.org.',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn Tailwind CSS',
        lectures: [
          {
            title: 'Learn Tailwind CSS — Guillaume',
            videoUrl: 'https://www.youtube.com/watch?v=ft30zcMlFao',
            durationSeconds: 15138,
            transcript: null
          }
        ]
      }
    ],
    approval: { decision: 'approved', comment: 'Approved for the demo catalog.' },
    enrollmentProgress: '0.00'
  }
]

/** Earlier demo-only seed fixtures removed by the canonical demo seed. */
export const LEGACY_DEMO_COURSE_TITLES = [
  'VertexAI Demo: Foundations of Learning',
  'Full-Stack TypeScript with Nuxt & Drizzle',
  'Course-Grounded RAG Systems in Practice',
  'Practical Prompt Engineering for Educators',
  'Modern UI Architecture with Design Systems',
  'Intro to Quantum Computing (Draft)'
] as const
