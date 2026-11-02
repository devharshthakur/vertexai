import 'dotenv/config'
import { and, eq, notInArray } from 'drizzle-orm'
import type { CourseDifficulty, CourseStatus } from '../../shared/validation/courses'
import { auth } from '../utils/auth'
import { useDb } from './index'
import { courseApprovals, courses, enrollments, lectures, modules, sessions, users } from './schema'

const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD ?? 'password@123'
const DEMO_USERS = [
  { name: 'VertexAI Demo Admin', email: 'admin@vertexai.test', role: 'admin' },
  {
    name: 'VertexAI Demo Instructor',
    email: 'instructor@vertexai.test',
    role: 'instructor'
  },
  {
    name: 'VertexAI Demo Student',
    email: 'student@vertexai.test',
    role: 'student'
  }
] as const

interface DemoLecture {
  title: string
  durationSeconds: number
  transcript: string
}

interface DemoModule {
  title: string
  lectures: DemoLecture[]
}

interface DemoCourse {
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

const DEMO_COURSES: DemoCourse[] = [
  {
    title: 'VertexAI Demo: Foundations of Learning',
    description: 'A seeded course for trying the student catalog, curriculum preview, and enrollment flow.',
    category: 'Learning',
    difficulty: 'beginner',
    status: 'approved',
    modules: [
      {
        title: 'Orientation',
        lectures: [
          {
            title: 'Welcome to the demo course',
            durationSeconds: 120,
            transcript: 'Welcome. This demo lecture introduces the course structure and learning goals.'
          },
          {
            title: 'How the learning flow works',
            durationSeconds: 180,
            transcript: 'Walk through the catalog, the curriculum, and the player before starting the first lesson.'
          }
        ]
      },
      {
        title: 'How Learning Works',
        lectures: [
          {
            title: 'Spaced repetition in practice',
            durationSeconds: 240,
            transcript: 'Spacing study sessions over time improves long-term retention more than cramming.'
          },
          {
            title: 'Retrieval practice that sticks',
            durationSeconds: 300,
            transcript: 'Testing yourself is a learning strategy, not only a measurement of what you know.'
          }
        ]
      },
      {
        title: 'Putting It Into Practice',
        lectures: [
          {
            title: 'Building a weekly study plan',
            durationSeconds: 300,
            transcript: 'Turn course goals into a realistic weekly schedule with short, focused sessions.'
          },
          {
            title: 'Reviewing progress with analytics',
            durationSeconds: 240,
            transcript: 'Use the progress view to spot stalled courses and adjust your plan.'
          }
        ]
      }
    ],
    approval: {
      decision: 'approved',
      comment: 'Approved for the demo catalog.'
    },
    enrollmentProgress: '45.00'
  },
  {
    title: 'Full-Stack TypeScript with Nuxt & Drizzle',
    description: 'Build a typed full-stack application with Nuxt, Nitro server routes, Drizzle, and PostgreSQL.',
    category: 'Web Development',
    difficulty: 'intermediate',
    status: 'approved',
    modules: [
      {
        title: 'Project setup',
        lectures: [
          {
            title: 'Scaffolding a Nuxt 4 app',
            durationSeconds: 300,
            transcript: 'Create the application shell and review the directory layout Nuxt expects.'
          },
          {
            title: 'Configuring TypeScript and tooling',
            durationSeconds: 240,
            transcript: 'Enable strict type checking, formatting, and linting before writing features.'
          }
        ]
      },
      {
        title: 'Data layer with Drizzle',
        lectures: [
          {
            title: 'Defining the schema',
            durationSeconds: 360,
            transcript: 'Model tables, relations, and constraints as typed Drizzle schema modules.'
          },
          {
            title: 'Writing migrations',
            durationSeconds: 300,
            transcript: 'Generate migrations from the schema and apply them to a local PostgreSQL database.'
          }
        ]
      },
      {
        title: 'Serving the app',
        lectures: [
          {
            title: 'Building Nitro API routes',
            durationSeconds: 300,
            transcript: 'Keep routes thin and move business logic into services that the rest of the app can reuse.'
          },
          {
            title: 'Validating input with Zod',
            durationSeconds: 240,
            transcript: 'Share request schemas between the client and the server for consistent validation.'
          }
        ]
      }
    ],
    approval: {
      decision: 'approved',
      comment: 'Approved for the demo catalog.'
    },
    enrollmentProgress: '0.00'
  },
  {
    title: 'Course-Grounded RAG Systems in Practice',
    description: 'Design retrieval-augmented generation systems that answer questions from course material.',
    category: 'AI Engineering',
    difficulty: 'advanced',
    status: 'approved',
    modules: [
      {
        title: 'Retrieval foundations',
        lectures: [
          {
            title: 'Chunking course material',
            durationSeconds: 360,
            transcript: 'Choose chunk sizes and overlap that preserve the meaning of each lecture.'
          },
          {
            title: 'Embedding and indexing lectures',
            durationSeconds: 420,
            transcript: 'Store embeddings alongside source metadata so answers can cite their context.'
          }
        ]
      },
      {
        title: 'Grounded answers',
        lectures: [
          {
            title: 'Retrieval-augmented generation pipeline',
            durationSeconds: 480,
            transcript: 'Combine retrieved context with clear instructions so the model stays grounded.'
          },
          {
            title: 'Evaluating answer quality',
            durationSeconds: 360,
            transcript: 'Measure faithfulness, relevance, and citation accuracy with a small evaluation set.'
          }
        ]
      }
    ],
    approval: {
      decision: 'approved',
      comment: 'Approved for the demo catalog.'
    },
    enrollmentProgress: null
  },
  {
    title: 'Practical Prompt Engineering for Educators',
    description: 'Write clearer prompts for lesson planning, feedback, and classroom material.',
    category: 'AI Engineering',
    difficulty: 'beginner',
    status: 'pending',
    modules: [
      {
        title: 'Prompt fundamentals',
        lectures: [
          {
            title: 'Anatomy of an effective prompt',
            durationSeconds: 240,
            transcript: 'Separate context, instructions, examples, and output format in every prompt.'
          },
          {
            title: 'Iterating with examples',
            durationSeconds: 300,
            transcript: 'Use a few representative examples to steer tone and structure.'
          }
        ]
      },
      {
        title: 'Prompts for the classroom',
        lectures: [
          {
            title: 'Designing rubric-aligned prompts',
            durationSeconds: 300,
            transcript: 'Translate rubric criteria into explicit instructions the model can follow.'
          },
          {
            title: 'Reviewing AI output responsibly',
            durationSeconds: 240,
            transcript: 'Check generated material for accuracy and bias before sharing it with learners.'
          }
        ]
      }
    ],
    approval: null,
    enrollmentProgress: null
  },
  {
    title: 'Modern UI Architecture with Design Systems',
    description: 'Structure a component library with design tokens, accessible primitives, and clear contracts.',
    category: 'Web Development',
    difficulty: 'intermediate',
    status: 'pending',
    modules: [
      {
        title: 'Design tokens',
        lectures: [
          {
            title: 'Token architecture that scales',
            durationSeconds: 300,
            transcript: 'Name and layer tokens so themes can change without rewriting components.'
          }
        ]
      },
      {
        title: 'Component contracts',
        lectures: [
          {
            title: 'Composing accessible primitives',
            durationSeconds: 300,
            transcript: 'Build complex widgets from accessible base components instead of custom markup.'
          },
          {
            title: 'Documenting component APIs',
            durationSeconds: 240,
            transcript: 'Publish props, slots, and usage examples so teams adopt the system consistently.'
          }
        ]
      }
    ],
    approval: null,
    enrollmentProgress: null
  },
  {
    title: 'Intro to Quantum Computing (Draft)',
    description: 'An early draft covering qubits, superposition, and the road to quantum algorithms.',
    category: 'Computer Science',
    difficulty: 'advanced',
    status: 'rejected',
    modules: [
      {
        title: 'Quantum foundations',
        lectures: [
          {
            title: 'Qubits and superposition',
            durationSeconds: 300,
            transcript: 'A qubit can hold a superposition of basis states until it is measured.'
          }
        ]
      }
    ],
    approval: {
      decision: 'rejected',
      comment: 'Please add the remaining modules and a knowledge check before resubmitting.'
    },
    enrollmentProgress: null
  }
]

/**
 * Keeps the demo accounts on the shared password from `DEMO_SEED_PASSWORD`
 * even when they were created by an earlier run, and drops their sessions so
 * nobody keeps an old credential signed in.
 */
async function syncDemoPassword(userId: string): Promise<void> {
  const ctx = await auth.$context
  const passwordHash = await ctx.password.hash(DEMO_PASSWORD)

  await ctx.internalAdapter.updatePassword(userId, passwordHash)
  await useDb().delete(sessions).where(eq(sessions.userId, userId))
}

async function ensureUser(demoUser: (typeof DEMO_USERS)[number]): Promise<string> {
  const db = useDb()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, demoUser.email)).limit(1)
  let userId = existing?.id

  if (!userId) {
    const result = await auth.api.signUpEmail({
      body: {
        name: demoUser.name,
        email: demoUser.email,
        password: DEMO_PASSWORD
      }
    })
    userId = result.user.id

    // This is a setup script, not an interactive sign-in. Remove the session
    // created by Better Auth's configured autoSignIn option.
    await db.delete(sessions).where(eq(sessions.userId, userId))
  } else {
    await syncDemoPassword(userId)
  }

  await db
    .update(users)
    .set({
      name: demoUser.name,
      role: demoUser.role,
      emailVerified: true
    })
    .where(eq(users.id, userId))

  return userId
}

/**
 * Replaces the instructor's demo courses and the student's enrollments with
 * the canonical demo dataset. Existing courses are matched by
 * `(instructorId, title)` and updated in place so their UUIDs stay stable
 * across runs; everything below a course is re-inserted, which keeps the
 * curriculum deterministic.
 */
async function seedDemoCourses(instructorId: string, adminId: string, studentId: string): Promise<void> {
  const db = useDb()
  const demoCourseTitles = DEMO_COURSES.map(({ title }) => title)

  await db.transaction(async (tx) => {
    await tx.delete(courses).where(and(eq(courses.instructorId, instructorId), notInArray(courses.title, demoCourseTitles)))
    await tx.delete(enrollments).where(eq(enrollments.userId, studentId))

    for (const demoCourse of DEMO_COURSES) {
      const [existing] = await tx
        .select({ id: courses.id })
        .from(courses)
        .where(and(eq(courses.instructorId, instructorId), eq(courses.title, demoCourse.title)))
        .limit(1)
      let courseId = existing?.id

      if (courseId) {
        await tx
          .update(courses)
          .set({
            description: demoCourse.description,
            category: demoCourse.category,
            difficulty: demoCourse.difficulty,
            price: '0',
            status: demoCourse.status
          })
          .where(eq(courses.id, courseId))
      } else {
        const [inserted] = await tx
          .insert(courses)
          .values({
            instructorId,
            title: demoCourse.title,
            description: demoCourse.description,
            category: demoCourse.category,
            difficulty: demoCourse.difficulty,
            price: '0',
            status: demoCourse.status
          })
          .returning({ id: courses.id })
        courseId = inserted!.id
      }

      await tx.delete(modules).where(eq(modules.courseId, courseId))
      await tx.delete(courseApprovals).where(eq(courseApprovals.courseId, courseId))

      for (const [moduleIndex, demoModule] of demoCourse.modules.entries()) {
        const [insertedModule] = await tx
          .insert(modules)
          .values({
            courseId,
            title: demoModule.title,
            orderIndex: moduleIndex
          })
          .returning({ id: modules.id })

        await tx.insert(lectures).values(
          demoModule.lectures.map((lecture, lectureIndex) => ({
            moduleId: insertedModule!.id,
            title: lecture.title,
            transcript: lecture.transcript,
            durationSeconds: lecture.durationSeconds,
            orderIndex: lectureIndex
          }))
        )
      }

      if (demoCourse.approval) {
        await tx.insert(courseApprovals).values({
          courseId,
          reviewedBy: adminId,
          decision: demoCourse.approval.decision,
          comment: demoCourse.approval.comment
        })
      }

      if (demoCourse.enrollmentProgress !== null) {
        await tx.insert(enrollments).values({
          userId: studentId,
          courseId,
          progressPercent: demoCourse.enrollmentProgress
        })
      }
    }
  })
}

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo seed is disabled in production.')
  }
  if (DEMO_PASSWORD.length < 12) {
    throw new Error('DEMO_SEED_PASSWORD must contain at least 12 characters.')
  }

  const userIds = new Map<string, string>()
  for (const demoUser of DEMO_USERS) {
    userIds.set(demoUser.role, await ensureUser(demoUser))
  }

  await seedDemoCourses(userIds.get('instructor')!, userIds.get('admin')!, userIds.get('student')!)

  const approvedCourses = DEMO_COURSES.filter(({ status }) => status === 'approved').length
  const enrollmentsCreated = DEMO_COURSES.filter(({ enrollmentProgress }) => enrollmentProgress !== null).length

  console.info(`Seeded demo accounts: ${DEMO_USERS.map(({ email }) => email).join(', ')}`)
  console.info(`Seeded ${DEMO_COURSES.length} demo courses (${approvedCourses} approved, ${enrollmentsCreated} student enrollments).`)
  console.info('Set DEMO_SEED_PASSWORD to choose the shared password.')
}

void (async () => {
  try {
    await seed()
  } catch (error: unknown) {
    console.error('Demo seed failed:', error)
    process.exitCode = 1
  } finally {
    await useDb().$client.end()
  }
})()
