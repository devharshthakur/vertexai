import { eq } from 'drizzle-orm'
import { useDb, type Db } from '#server/db'
import { certificates, userBadges, users } from '#server/db/schema'
import { ServiceError } from '#server/utils/service-error'
import type { MyBadges } from '#shared/types/achievements'
import { BADGE_DEFINITIONS, type BadgeSlug } from '#shared/validation/achievements'
import type { CourseActor } from '../courses/access'
import { certificateFileName, renderCertificatePdf } from './pdf'

/** A transaction handle, so rewards commit with the fact that earned them. */
type Transaction = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Certificates and milestone badges.
 *
 * Both are idempotent: `user_badges` is keyed by (user, slug) and `certificates`
 * by (user, course), so the awarding calls use `onConflictDoNothing` and can
 * run on every completion, view, or submission without creating duplicates.
 */

/** Records every slug the user has not earned yet. */
export async function awardBadges(tx: Transaction, userId: string, slugs: BadgeSlug[]): Promise<void> {
  if (slugs.length === 0) return

  await tx
    .insert(userBadges)
    .values(slugs.map((badgeSlug) => ({ userId, badgeSlug })))
    .onConflictDoNothing()
}

/**
 * Issues the course certificate and the matching badge once every lecture is
 * complete. The recipient name and course title are copied onto the row so a
 * later rename cannot change a document that was already issued.
 */
export async function issueCourseCertificate(tx: Transaction, input: { userId: string; courseId: string; courseTitle: string }): Promise<void> {
  const [recipient] = await tx.select({ name: users.name }).from(users).where(eq(users.id, input.userId)).limit(1)
  if (!recipient) throw new ServiceError('not_found')

  await tx.insert(certificates).values({ userId: input.userId, courseId: input.courseId, recipientName: recipient.name, courseTitle: input.courseTitle }).onConflictDoNothing()

  await awardBadges(tx, input.userId, ['course_completed'])
}

/** The full badge catalogue with the current user's earned dates. */
export async function getMyBadges(userId: string): Promise<MyBadges> {
  const earned = await useDb().select({ badgeSlug: userBadges.badgeSlug, earnedAt: userBadges.earnedAt }).from(userBadges).where(eq(userBadges.userId, userId))
  const earnedAt = new Map(earned.map((row) => [row.badgeSlug, row.earnedAt.toISOString()]))

  return { badges: BADGE_DEFINITIONS.map((definition) => ({ ...definition, earnedAt: earnedAt.get(definition.slug) ?? null })) }
}

/**
 * Renders a certificate for its owner (or an admin). Anyone else gets
 * `forbidden`, and an unknown id is `not_found`.
 */
export async function getCertificateDownload(certificateId: string, actor: CourseActor): Promise<{ filename: string; pdf: Buffer }> {
  const [certificate] = await useDb().select().from(certificates).where(eq(certificates.id, certificateId)).limit(1)
  if (!certificate) throw new ServiceError('not_found')
  if (certificate.userId !== actor.id && actor.role !== 'admin') throw new ServiceError('forbidden')

  const pdf = await renderCertificatePdf({
    recipientName: certificate.recipientName,
    courseTitle: certificate.courseTitle,
    certificateId: certificate.id,
    issuedAt: certificate.issuedAt
  })

  return { filename: certificateFileName(certificate.courseTitle), pdf }
}
