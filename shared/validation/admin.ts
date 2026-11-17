import { z } from 'zod'
import { APP_ROLES } from '#shared/types/auth'

/**
 * Schemas for the admin workspace.
 *
 * The role list comes from the shared role definition, so a role the app does
 * not know can never be assigned.
 */

export const adminRoleSchema = z.enum([APP_ROLES.STUDENT, APP_ROLES.INSTRUCTOR, APP_ROLES.ADMIN])

/**
 * A user account id.
 *
 * Better Auth creates text ids, so this is not a UUID; it is the id shape
 * Better Auth generates.
 */
export const adminUserIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid account id.')

/**
 * The admin user list query. Values arrive as strings, so the numbers are
 * coerced before they are validated.
 */
export const adminUserQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  role: adminRoleSchema.optional(),
  suspended: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

/** The role an administrator assigns to an account. */
export const adminUserRoleSchema = z.object({
  role: adminRoleSchema
})

/**
 * The suspension state of an account.
 *
 * Suspending revokes the sessions and blocks sign-in; restoring does the
 * opposite. The reason is stored with the account and shown to administrators.
 */
export const adminUserSuspensionSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().max(500).optional()
})

export type AdminRoleValues = z.output<typeof adminRoleSchema>
export type AdminUserQueryValues = z.output<typeof adminUserQuerySchema>
