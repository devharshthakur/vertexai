import type { BadgeDefinition } from '#shared/validation/achievements'

/** A certificate the student can download, as exposed on the learn payload. */
export interface CertificateSummary {
  id: string
  courseTitle: string
  issuedAt: string
}

/** The badge catalogue with the current user's earned date, if any. */
export interface MyBadge extends BadgeDefinition {
  earnedAt: string | null
}

export interface MyBadges {
  badges: MyBadge[]
}
