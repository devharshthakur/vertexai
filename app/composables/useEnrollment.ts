import type { EnrollmentSummary } from '#shared/types/courses'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/vue-query'
import { useAuthSessionState } from './useAuthSession'

/**
 * Enrollments are per-user, so the key carries the user ID to keep one account's
 * cached list out of another's. Enrolling invalidates the shared root.
 */
const enrollmentKeys = {
  all: ['enrollments'] as const,
  mine: (userId: string | null) => ['enrollments', 'me', userId] as const
}

const ENROLL_ERROR = 'Could not enroll right now. Please try again.'

/**
 * Fetches only for signed-in users because the endpoint is private and an
 * anonymous request would return 401. The query stays disabled until the
 * session resolves, and its data is normalized so consumers always get a list.
 */
export function useMyEnrollments() {
  const session = useAuthSessionState()
  const requestFetch = useRequestFetch()
  const userId = computed(() => session.value?.user.id ?? null)
  const signedIn = computed(() => userId.value !== null)

  const query = useQuery(
    computed(() =>
      queryOptions({
        queryKey: enrollmentKeys.mine(userId.value),
        queryFn: () => requestFetch<EnrollmentSummary[]>('/api/enrollments/me'),
        enabled: signedIn.value
      })
    )
  )

  // During SSR the session is already known, so fetch before rendering. A
  // disabled query would wait for `enabled`, holding the response open.
  if (import.meta.server) {
    onServerPrefetch(async () => {
      if (signedIn.value) await query.suspense()
    })
  }

  return {
    data: computed(() => query.data.value ?? []),
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}

/**
 * Enrollment is idempotent; the endpoint returns the existing record when the
 * visitor is already enrolled, so the UI only needs to reflect current state.
 */
export function useEnroll(courseId: MaybeRefOrGetter<string>) {
  const session = useAuthSessionState()
  const queryClient = useQueryClient()
  const { data: enrollments } = useMyEnrollments()

  const mutation = useMutation({
    mutationFn: (id: string) =>
      $fetch(`/api/courses/${id}/enroll`, { method: 'POST' }),
    // Await the refetch so `pending` also covers the refreshed list.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.all })
  })

  const isSignedIn = computed(() => Boolean(session.value))
  const isEnrolled = computed(() =>
    enrollments.value.some(
      (enrollment) => enrollment.courseId === toValue(courseId)
    )
  )
  const error = computed(() => (mutation.isError.value ? ENROLL_ERROR : null))

  async function enroll() {
    const id = toValue(courseId)

    if (!session.value) {
      await navigateTo(`/auth/login?redirect=/courses/${id}`)

      return
    }

    try {
      await mutation.mutateAsync(id)
    } catch {
      // The mutation keeps the failure; `error` renders the friendly message.
    }
  }

  return {
    enroll,
    pending: mutation.isPending,
    error,
    isSignedIn,
    isEnrolled
  }
}
