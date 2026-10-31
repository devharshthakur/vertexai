import 'dotenv/config'
import { and, eq } from 'drizzle-orm'
import { auth } from '../utils/auth'
import { useDb } from './index'
import {
  courseApprovals,
  courses,
  lectures,
  modules,
  sessions,
  users
} from './schema'

const DEMO_PASSWORD =
  process.env.DEMO_SEED_PASSWORD ?? 'VertexAI-Demo-Only-123!'
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
const DEMO_COURSE_TITLE = 'VertexAI Demo: Foundations of Learning'

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

async function ensureUser(
  demoUser: (typeof DEMO_USERS)[number]
): Promise<string> {
  const db = useDb()
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, demoUser.email))
    .limit(1)
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
    .set({ role: demoUser.role })
    .where(eq(users.id, userId))

  return userId
}

async function seedDemoCourse(instructorId: string, adminId: string) {
  const db = useDb()
  const [existingCourse] = await db
    .select({ id: courses.id, status: courses.status })
    .from(courses)
    .where(
      and(
        eq(courses.instructorId, instructorId),
        eq(courses.title, DEMO_COURSE_TITLE)
      )
    )
    .limit(1)
  let courseId = existingCourse?.id
  let courseStatus = existingCourse?.status

  if (!courseId) {
    const [course] = await db
      .insert(courses)
      .values({
        instructorId,
        title: DEMO_COURSE_TITLE,
        description:
          'A seeded course for trying the student catalog, curriculum preview, and enrollment flow.',
        category: 'Learning',
        difficulty: 'beginner',
        status: 'approved'
      })
      .returning({ id: courses.id })
    courseId = course!.id
    courseStatus = 'approved'
  }

  const [existingModule] = await db
    .select({ id: modules.id })
    .from(modules)
    .where(
      and(eq(modules.courseId, courseId), eq(modules.title, 'Getting started'))
    )
    .limit(1)
  let moduleId = existingModule?.id

  if (!moduleId) {
    const [module] = await db
      .insert(modules)
      .values({ courseId, title: 'Getting started', orderIndex: 0 })
      .returning({ id: modules.id })
    moduleId = module!.id
  }

  const [existingLecture] = await db
    .select({ id: lectures.id })
    .from(lectures)
    .where(
      and(
        eq(lectures.moduleId, moduleId),
        eq(lectures.title, 'How this course works')
      )
    )
    .limit(1)

  if (!existingLecture) {
    await db.insert(lectures).values({
      moduleId,
      title: 'How this course works',
      transcript:
        'Welcome. This demo lecture introduces the course structure and learning goals.',
      durationSeconds: 120,
      orderIndex: 0
    })
  }

  const [existingApproval] = await db
    .select({ id: courseApprovals.id })
    .from(courseApprovals)
    .where(eq(courseApprovals.courseId, courseId))
    .limit(1)

  if (!existingApproval && courseStatus === 'approved') {
    await db.insert(courseApprovals).values({
      courseId,
      reviewedBy: adminId,
      decision: 'approved',
      comment: 'Approved seeded demo course.'
    })
  }
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

  await seedDemoCourse(userIds.get('instructor')!, userIds.get('admin')!)
  console.info(
    `Seeded demo accounts: ${DEMO_USERS.map(({ email }) => email).join(', ')}`
  )
  console.info('Set DEMO_SEED_PASSWORD to choose their shared password.')
}

seed().catch((error: unknown) => {
  console.error('Demo seed failed:', error)
  process.exitCode = 1
})
