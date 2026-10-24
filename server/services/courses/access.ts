import { ServiceError } from '#server/utils/service-error'

/** Identity and privilege relevant to course access rules. */
export interface CourseActor {
  id: string
  role?: string | null
}

/** Returns whether the actor owns the course or is an admin. */
export function canManageCourse(
  instructorId: string,
  actor: CourseActor
): boolean {
  return actor.role === 'admin' || instructorId === actor.id
}

/** Hides unpublished courses from actors without management access. */
export function assertCanViewCourse(
  status: string,
  instructorId: string,
  actor?: CourseActor | null
): void {
  if (
    status !== 'approved' &&
    (!actor || !canManageCourse(instructorId, actor))
  ) {
    throw new ServiceError('not_found')
  }
}

/** Rejects course changes by anyone other than its owner or an admin. */
export function assertCanManageCourse(
  instructorId: string,
  actor: CourseActor
): void {
  if (!canManageCourse(instructorId, actor)) {
    throw new ServiceError('forbidden')
  }
}
