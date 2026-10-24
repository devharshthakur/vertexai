import type { NuxtApp } from '#app'
import type { EnrollmentSummary } from '#shared/types/courses'
import { useAuthSession } from './useAuthSession'

/**
 * The caller's enrollments.
 *
 * The list is only fetched when somebody is signed in: the endpoint is
 * private, and an anonymous visitor must not trigger a 401.
 *
 * Reading the session means awaiting, and a composable called after an
 * `await` no longer has the Nuxt instance. `runWithContext` restores it for
 * the calls that need it, so the session and the fetch keep working.
 */
export async function useMyEnrollments(nuxtApp: NuxtApp = useNuxtApp()) {
  const { data: session } = await nuxtApp.runWithContext(() => useAuthSession())
  const signedIn = computed(() => Boolean(session.value))

  return nuxtApp.runWithContext(() =>
    useFetch<EnrollmentSummary[]>('/api/enrollments/me', {
      key: 'enrollments:me',
      immediate: signedIn.value,
      server: signedIn.value,
      default: () => []
    })
  )
}

/**
 * Enrolling in a course.
 *
 * Enrolling twice is not an error — the endpoint returns the existing
 * enrollment — so the button only has to reflect the current state.
 */
export async function useEnroll(courseId: MaybeRefOrGetter<string>) {
  const nuxtApp = useNuxtApp()

  const { data: session } = await nuxtApp.runWithContext(() => useAuthSession())
  const { data: enrollments, refresh } = await useMyEnrollments(nuxtApp)

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
