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
    description: 'A concise, beginner-friendly TypeScript crash course by Brad Traversy on Traversy Media.',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn TypeScript',
        lectures: [
          {
            title: 'TypeScript Crash Course — Traversy Media',
            videoUrl: 'https://www.youtube.com/watch?v=BCg4U1FzODs',
            durationSeconds: 3147,
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
    description: 'A concise introduction to modern React with Web Dev Simplified.',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn React',
        lectures: [
          {
            title: 'Learn React in 30 Minutes — Web Dev Simplified',
            videoUrl: 'https://www.youtube.com/watch?v=hQAHSlTtcmY',
            durationSeconds: 1635,
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
    description: 'A beginner-friendly Tailwind CSS v4 course with JavaScript Mastery.',
    category: 'Web Development',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Learn Tailwind CSS',
        lectures: [
          {
            title: 'Tailwind CSS v4 Full Course — JavaScript Mastery',
            videoUrl: 'https://www.youtube.com/watch?v=6biMWgD6_JY',
            durationSeconds: 3260,
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
