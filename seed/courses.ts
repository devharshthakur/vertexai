import type { CourseDifficulty, CourseStatus } from '../shared/validation/courses.ts'
import type { QuizQuestionType } from '../shared/validation/quizzes.ts'

interface DemoLecture {
  /** Folder under `public/videos/` holding an MP4, `transcript.txt`, and `about.md`. */
  slug: string
}

interface DemoQuizOption {
  optionText: string
  isCorrect: boolean
}

interface DemoQuizQuestion {
  questionText: string
  questionType: QuizQuestionType
  /** Points awarded for an exactly correct answer. */
  points: number
  /** Shown with a student's graded results after the attempt is submitted. */
  explanation: string
  options: DemoQuizOption[]
}

interface DemoQuiz {
  title: string
  /** Minimum percentage of total points needed to pass. */
  passingScore: number
  questions: DemoQuizQuestion[]
}

interface DemoModule {
  title: string
  lectures: DemoLecture[]
  quizzes?: DemoQuiz[]
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
        lectures: [{ slug: 'typescript' }],
        quizzes: [
          {
            title: 'TypeScript Fundamentals Quiz',
            passingScore: 70,
            questions: [
              {
                questionText: "Given `const language = 'TypeScript'`, what type does TypeScript infer for `language`?",
                questionType: 'mcq',
                points: 1,
                explanation: "A `const` declaration infers the literal type `'TypeScript'`, so assigning a different string later is an error. A `let` declaration would widen the type to `string`.",
                options: [
                  { optionText: "The literal type `'TypeScript'`", isCorrect: true },
                  { optionText: '`string`', isCorrect: false },
                  { optionText: '`any`', isCorrect: false },
                  { optionText: '`unknown`', isCorrect: false }
                ]
              },
              {
                questionText: "Which statements about explicitly annotating a function's return type are true?",
                questionType: 'multi_select',
                points: 2,
                explanation: 'A return type annotation documents the contract and makes a wrong branch fail where it is written instead of widening the inferred union. Parameter types are separate, and annotations are erased at runtime.',
                options: [
                  { optionText: 'It documents the intended contract for callers.', isCorrect: true },
                  { optionText: 'It reports a wrong return value inside the function instead of widening the inferred type.', isCorrect: true },
                  { optionText: 'It removes the need to annotate parameter types.', isCorrect: false },
                  { optionText: 'It makes the function run faster because the type is known.', isCorrect: false }
                ]
              },
              {
                questionText: 'What does the `strictNullChecks` compiler option require you to handle?',
                questionType: 'mcq',
                points: 1,
                explanation: '`strictNullChecks` stops `null` and `undefined` from being assignable to every type, so you must narrow a possibly-absent value before using it.',
                options: [
                  { optionText: '`null` and `undefined` before using a possibly-absent value', isCorrect: true },
                  { optionText: 'Only `undefined` returned from `async` functions', isCorrect: false },
                  { optionText: 'Missing properties on every object type', isCorrect: false },
                  { optionText: 'Unused variables declared in a module', isCorrect: false }
                ]
              }
            ]
          }
        ]
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
        lectures: [{ slug: 'react' }],
        quizzes: [
          {
            title: 'React Essentials Quiz',
            passingScore: 70,
            questions: [
              {
                questionText: 'Why does React need a stable `key` when rendering a list?',
                questionType: 'mcq',
                points: 1,
                explanation: 'The key lets React match list items between renders, so component state and DOM nodes move with the item instead of being reused by position.',
                options: [
                  { optionText: 'So React can match items between renders and preserve their state', isCorrect: true },
                  { optionText: 'So the browser can cache the rendered DOM nodes', isCorrect: false },
                  { optionText: 'So React can sort the list automatically', isCorrect: false },
                  { optionText: 'So every item receives a unique CSS class', isCorrect: false }
                ]
              },
              {
                questionText: 'Which of these calls break the Rules of Hooks?',
                questionType: 'multi_select',
                points: 2,
                explanation: 'Hooks must run in the same order on every render, which means at the top level of a component or custom hook. A conditional call or a call from a plain helper changes the order.',
                options: [
                  { optionText: 'Calling `useState` inside an `if` block.', isCorrect: true },
                  { optionText: 'Calling `useEffect` from a regular function whose name does not start with `use`.', isCorrect: true },
                  { optionText: 'Calling `useState` at the top level of a component.', isCorrect: false },
                  { optionText: 'Calling `useEffect` inside a custom hook named `useDocumentTitle`.', isCorrect: false }
                ]
              },
              {
                questionText: 'When does the cleanup function returned from `useEffect` run?',
                questionType: 'mcq',
                points: 1,
                explanation: 'React calls the cleanup before re-running the effect after a dependency change and once more when the component unmounts. Any request cancellation has to be written inside it, for example with an `AbortController`.',
                options: [
                  { optionText: 'Before the next effect run and when the component unmounts', isCorrect: true },
                  { optionText: 'After every render, before the effect body', isCorrect: false },
                  { optionText: 'Only when the effect throws an error', isCorrect: false },
                  { optionText: 'It stops the effect from running on the first render', isCorrect: false }
                ]
              }
            ]
          }
        ]
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
        lectures: [{ slug: 'tailwind' }],
        quizzes: [
          {
            title: 'Tailwind Utility Basics Quiz',
            passingScore: 70,
            questions: [
              {
                questionText: 'How does the `md:` variant apply a utility by default?',
                questionType: 'mcq',
                points: 1,
                explanation: 'Tailwind breakpoint variants are min-width queries: `md:flex` applies at the `md` breakpoint and wider, not below it and not only at exactly that width.',
                options: [
                  { optionText: 'At the `md` breakpoint and above', isCorrect: true },
                  { optionText: 'Only on screens exactly at the `md` width', isCorrect: false },
                  { optionText: 'At the `md` breakpoint and below', isCorrect: false },
                  { optionText: 'It only reorders the utility in the generated stylesheet', isCorrect: false }
                ]
              },
              {
                questionText: 'Which of these utilities create a flex container?',
                questionType: 'multi_select',
                points: 2,
                explanation: '`flex` and `inline-flex` both set `display: flex`, differing only in the outer display type. `grid` and `block` create different layout containers.',
                options: [
                  { optionText: '`flex`', isCorrect: true },
                  { optionText: '`inline-flex`', isCorrect: true },
                  { optionText: '`grid`', isCorrect: false },
                  { optionText: '`block`', isCorrect: false }
                ]
              },
              {
                questionText: 'What is `w-[42rem]` in Tailwind CSS 4?',
                questionType: 'mcq',
                points: 1,
                explanation: 'Square brackets use an arbitrary value, so `w-[42rem]` generates `width: 42rem` without adding anything to the theme. It is not a variant, because variants end with a colon.',
                options: [
                  { optionText: 'An arbitrary value that generates `width: 42rem`', isCorrect: true },
                  { optionText: 'A custom utility named `42rem` from the config', isCorrect: false },
                  { optionText: 'A variant that applies only at a `42rem` breakpoint', isCorrect: false },
                  { optionText: 'An invalid class that Tailwind ignores', isCorrect: false }
                ]
              }
            ]
          }
        ]
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
