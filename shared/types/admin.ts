import type { AppRole } from '#shared/types/auth'

/**
 * A user account as the admin workspace shows it.
 *
 * The list carries only what an administrator needs to act: who the account
 * is, what it may do, whether it is suspended, and how much of the platform it
 * uses. It never carries credential material or session tokens.
 */
export interface AdminUserSummary {
  id: string
  name: string
  email: string
  role: AppRole
  /** Whether the account is suspended and therefore cannot sign in. */
  suspended: boolean
  /** The reason the account was suspended, when one was given. */
  suspensionReason: string | null
  /** How many courses the account is enrolled in. */
  enrollments: number
  /** How many courses the account teaches. */
  courses: number
  createdAt: string
}

export interface AdminUserListResult {
  items: AdminUserSummary[]
  page: number
  limit: number
  total: number
  totalPages: number
}
