import type { EnrollmentSummary } from '#shared/types/courses'
import { useAuthSessionState } from './useAuthSession'

/**
 * Fetches only for signed-in users because the endpoint is private and an
 * anonymous request would return 401. The fetch registers synchronously during
 * setup so Nuxt can await it.
 */
export function useMyEnrollments() {
  const session = useAuthSessionState()
  const signedIn = computed(() => Boolean(session.value))

  const enrollments = useFetch<EnrollmentSummary[]>('/api/enrollments/me', {
    key: 'enrollments:me',
    immediate: signedIn.value,
    server: signedIn.value,
    default: () => []
  })

  // A cold client load may still be resolving the session; fetch once it exists.
  if (import.meta.client) {
    watch(signedIn, (value) => {
      if (value) enrollments.refresh()
    })
  }

  return enrollments
}

/**
 * Enrollment is idempotent; the endpoint returns the existing record when the
 * visitor is already enrolled, so the UI only needs to reflect current state.
 */
export function useEnroll(courseId: MaybeRefOrGetter<string>) {
  const session = useAuthSessionState()
  const { data: enrollments, refresh } = useMyEnrollments()

  const pending = ref(false)
  const error = ref<string | null>(null)

  const isSignedIn = computed(() => Boolean(session.value))
  const isEnrolled = computed(() =>
    enrollments.value.some(
      (enrollment) => enrollment.courseId === toValue(courseId)
    )
  )

  async function enroll() {
    const id = toValue(courseId)

    if (!session.value) {
      await navigateTo(`/auth/login?redirect=/courses/${id}`)

      return
    }

    pending.value = true
    error.value = null

    try {
      await $fetch(`/api/courses/${id}/enroll`, { method: 'POST' })
      await refresh()
    } catch {
      error.value = 'Could not enroll right now. Please try again.'
    } finally {
      pending.value = false
    }
  }

  return { enroll, pending, error, isSignedIn, isEnrolled }
}
