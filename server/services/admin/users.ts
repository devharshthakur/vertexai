import { and, count, countDistinct, desc, eq, ilike, or } from 'drizzle-orm'
import { APIError } from 'better-auth/api'
import { useDb } from '#server/db'
import { courseApprovals, courses, enrollments, users } from '#server/db/schema'
import { auth } from '#server/utils/auth'
import { ServiceError } from '#server/utils/service-error'
import type { AdminUserListResult } from '#shared/types/admin'
import type { AppRole } from '#shared/types/auth'
import type { AdminRoleValues, AdminUserQueryValues } from '#shared/validation/admin'

/**
 * The administrator performing the action.
 *
 * The request headers travel with it because the Better Auth admin endpoints
 * read the acting session from them; the route has already checked that the
 * session is an administrator.
 */
export interface AdminActor {
  id: string
  headers: Headers
}

/**
 * Translates a Better Auth error into a domain error.
 *
 * The admin endpoints answer with their own status codes, which would
 * otherwise surface as an unexplained 500.
 */
function rethrowAsServiceError(error: unknown): never {
  if (error instanceof APIError) {
    const message = error.message || 'The account could not be changed.'

    if (error.statusCode === 400) throw new ServiceError('invalid_input', message)
    if (error.statusCode === 403) throw new ServiceError('forbidden', message)
    if (error.statusCode === 404) throw new ServiceError('not_found', message)

    throw new ServiceError('conflict', message)
  }

  throw error
}

/** Profiles the plugin's placeholder for "no reason was given". */
const DEFAULT_BAN_REASON = 'No reason'

/** Reads the role of an account, falling back to the default for older rows. */
function toAppRole(role: string | null): AppRole {
  if (role === 'admin' || role === 'instructor' || role === 'student') return role

  return 'student'
}

/** Lists the accounts an administrator can act on. */
export async function listAdminUsers(query: AdminUserQueryValues): Promise<AdminUserListResult> {
  const db = useDb()
  const filters = []

  if (query.q) {
    const pattern = `%${query.q}%`
    filters.push(or(ilike(users.name, pattern), ilike(users.email, pattern)))
  }

  if (query.role) filters.push(eq(users.role, query.role))
  if (query.suspended !== undefined) filters.push(eq(users.banned, query.suspended))

  const where = filters.length > 0 ? and(...filters) : undefined
  const offset = (query.page - 1) * query.limit

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      banReason: users.banReason,
      createdAt: users.createdAt,
      // A user has many enrollments and many courses. Counting the joined
      // rows would multiply one by the other, so each side is counted
      // distinctly.
      enrollments: countDistinct(enrollments.id),
      courses: countDistinct(courses.id)
    })
    .from(users)
    .leftJoin(enrollments, eq(enrollments.userId, users.id))
    .leftJoin(courses, eq(courses.instructorId, users.id))
    .where(where)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))
    .limit(query.limit)
    .offset(offset)

  const [totals] = await db.select({ total: count() }).from(users).where(where)
  const total = totals?.total ?? 0

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: toAppRole(row.role),
      suspended: row.banned ?? false,
      // The admin plugin stores a human-readable reason and fills in
      // "No reason" when the caller did not give one. The placeholder is not
      // a reason, so the API reports it as absent.
      suspensionReason: row.banReason && row.banReason !== DEFAULT_BAN_REASON ? row.banReason : null,
      enrollments: row.enrollments,
      courses: row.courses,
      createdAt: row.createdAt.toISOString()
    })),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit))
  }
}

/** Changes the role of an account. */
export async function changeUserRole(userId: string, role: AdminRoleValues, actor: AdminActor): Promise<void> {
  if (actor.id === userId) {
    throw new ServiceError('invalid_input', 'You cannot change your own role.')
  }

  const [target] = await useDb().select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)

  if (!target) throw new ServiceError('not_found', 'This account does not exist.')

  try {
    await auth.api.setRole({ headers: actor.headers, body: { userId, role } })
  } catch (error) {
    rethrowAsServiceError(error)
  }
}

/**
 * Suspends or restores an account.
 *
 * A suspended account cannot sign in and its sessions stop working. The
 * reason is kept with the account for the admin workspace.
 */
export async function setUserSuspension(userId: string, suspended: boolean, reason: string | undefined, actor: AdminActor): Promise<void> {
  if (actor.id === userId) {
    throw new ServiceError('invalid_input', 'You cannot suspend your own account.')
  }

  const [target] = await useDb().select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)

  if (!target) throw new ServiceError('not_found', 'This account does not exist.')

  try {
    if (suspended) {
      await auth.api.banUser({ headers: actor.headers, body: { userId, banReason: reason } })
      return
    }

    await auth.api.unbanUser({ headers: actor.headers, body: { userId } })
  } catch (error) {
    rethrowAsServiceError(error)
  }
}

/**
 * Deletes an account and everything that belongs to it.
 *
 * An account that still owns courses is kept: deleting it would take the
 * published courses with it, because the courses belong to their instructor.
 * An account that reviewed course submissions is kept too, because the
 * approval history references the reviewer.
 */
export async function deleteUser(userId: string, actor: AdminActor): Promise<void> {
  if (actor.id === userId) {
    throw new ServiceError('invalid_input', 'You cannot delete your own account.')
  }

  const db = useDb()
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1)

  if (!target) throw new ServiceError('not_found', 'This account does not exist.')

  const [owned] = await db.select({ total: count() }).from(courses).where(eq(courses.instructorId, userId))

  if ((owned?.total ?? 0) > 0) {
    throw new ServiceError('conflict', 'This account still owns courses. Remove or hand over those courses before deleting it.')
  }

  const [reviews] = await db.select({ total: count() }).from(courseApprovals).where(eq(courseApprovals.reviewedBy, userId))

  if ((reviews?.total ?? 0) > 0) {
    throw new ServiceError('conflict', 'This account reviewed course submissions, so its approval history must be kept.')
  }

  try {
    await auth.api.removeUser({ headers: actor.headers, body: { userId } })
  } catch (error) {
    rethrowAsServiceError(error)
  }
}
