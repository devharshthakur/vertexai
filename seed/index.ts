import 'dotenv/config'
import { and, eq, inArray } from 'drizzle-orm'
import { DEMO_COURSES, LEGACY_DEMO_COURSE_TITLES } from './courses'
import { useDb } from '../server/db'
import { courseApprovals, courses, enrollments, lectures, modules, sessions, users } from '../server/db/schema'
import { auth } from '../server/utils/auth'

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
 * Upserts only canonical demo courses, removes only the named legacy demo
 * fixtures, and recreates curriculum/enrollment state for those courses.
 */
async function seedDemoCourses(instructorId: string, adminId: string, studentId: string): Promise<void> {
  const db = useDb()
  const managedTitles = [...DEMO_COURSES.map(({ title }) => title), ...LEGACY_DEMO_COURSE_TITLES]

  await db.transaction(async (tx) => {
    const managedRows = await tx
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(and(eq(courses.instructorId, instructorId), inArray(courses.title, managedTitles)))

    if (managedRows.length > 0) {
      await tx.delete(enrollments).where(
        and(
          eq(enrollments.userId, studentId),
          inArray(
            enrollments.courseId,
            managedRows.map(({ id }) => id)
          )
        )
      )
    }

    await tx.delete(courses).where(and(eq(courses.instructorId, instructorId), inArray(courses.title, LEGACY_DEMO_COURSE_TITLES)))

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
            videoUrl: lecture.videoUrl,
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

  console.info(`Seeded demo accounts: ${DEMO_USERS.map(({ email }) => email).join(', ')}`)
  console.info(`Seeded ${DEMO_COURSES.length} demo courses (all approved and enrolled for the demo student).`)
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
