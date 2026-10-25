import type { EnrollmentSummary } from '#shared/types/courses'
import { useAuthSessionState } from './useAuthSession'

/**
 * The caller's enrollments.
 *
 * The list is only fetched when somebody is signed in: the endpoint is
 * private, and an anonymous visitor must not trigger a 401.
 *
 * Both reads happen synchronously during setup. `useFetch` has to be
 * registered before the first `await`, otherwise Nuxt reports NUXT_E3003 and
 * cannot wait for the request. The session ref is safe to read that early
 * because the `session.global` middleware has already resolved it.
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

  // The client store can still be loading the session on a cold page load, so
  // run the request once the session is known to exist.
  if (import.meta.client) {
    watch(signedIn, (value) => {
      if (value) enrollments.refresh()
    })
  }

  return enrollments
}

/**
 * Enrolling in a course.
 *
 * Enrolling twice is not an error — the endpoint returns the existing
 * enrollment — so the button only has to reflect the current state.
 *
 * The setup reads are synchronous for the same reason as in `useMyEnrollments`:
 * the enrollment fetch must register during setup to avoid NUXT_E3003.
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
