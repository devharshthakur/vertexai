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

/** Maps the API status onto the message the enrollment button renders. */
function getEnrollErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return ENROLL_ERROR
  }

  const { statusCode } = error

  if (statusCode === 401) return 'Please sign in again to enroll.'
  if (statusCode === 403) return 'This course is not open for enrollment.'
  if (statusCode === 404) return 'This course is no longer available.'

  return ENROLL_ERROR
}

/**
 * Fetches only for signed-in users because the endpoint is private and an
 * anonymous request would return 401. The query stays disabled until the
 * session resolves, and its data is normalized so consumers always get a list.
 *
 * The SSR prefetch lives here on purpose: the course page derives `isEnrolled`
 * from this list, so leaving the query disabled during SSR would label the
 * button wrongly. The trade-off is one extra enrollment-list query per
 * signed-in course page, which is a single indexed lookup.
 */
export function useMyEnrollments() {
  const session = useAuthSessionState()
  const requestFetch = useRequestFetch()
  // `useAuthSessionState` reads the hydrated `useState` on the server and Better
  // Auth's store in the browser; both must yield the same ID or the key drifts
  // and the dehydrated cache is missed.
  const userId = computed(() => session.value?.user.id ?? null)
  const signedIn = computed(() => userId.value !== null)

  // Options stay a stable object: only `queryKey` and `enabled` are reactive, as
  // Vue Query reads those per observation rather than rebuilding the observer.
  const query = useQuery(
    queryOptions({
      queryKey: computed(() => enrollmentKeys.mine(userId.value)),
      queryFn: ({ signal }) =>
        requestFetch<EnrollmentSummary[]>('/api/enrollments/me', { signal }),
      enabled: signedIn
    })
  )

  // During SSR the session is already known, so fetch before rendering. A
  // disabled query would wait for `enabled`, holding the response open.
  if (import.meta.server) {
    onServerPrefetch(async () => {
      if (signedIn.value) await query.suspense()
    })
  }

  return {
    enrollments: computed(() => query.data.value ?? []),
    // A failed background refetch keeps the last list; consumers need both facts
    // to decide between an error screen and stale cards.
    hasData: computed(() => query.data.value !== undefined),
    isPending: query.isPending,
    isError: query.isError,
    isRefetchError: query.isRefetchError,
    error: query.error,
    refetch: query.refetch
  }
}

/**
 * Enrollment is idempotent; the endpoint returns the existing record when the
 * visitor is already enrolled, so the UI only needs to reflect current state.
 *
 * The response is a full `EnrollmentSummary`, so the cached list is updated in
 * place instead of refetching it. The list is still marked stale, without an
 * immediate refetch, so a later mount revalidates it.
 */
export function useEnroll(courseId: MaybeRefOrGetter<string>) {
  const session = useAuthSessionState()
  const requestFetch = useRequestFetch()
  const queryClient = useQueryClient()
  const { enrollments } = useMyEnrollments()
  const userId = computed(() => session.value?.user.id ?? null)

  const mutation = useMutation({
    mutationFn: (id: string) =>
      requestFetch<EnrollmentSummary>(`/api/courses/${id}/enroll`, {
        method: 'POST'
      }),
    // An earlier list fetch could resolve after this mutation and overwrite the
    // record cached below, so it is cancelled first.
    onMutate: () => queryClient.cancelQueries({ queryKey: enrollmentKeys.all }),
    onSuccess: (enrollment) => {
      // Newest enrollment first, matching `listMyEnrollments`.
      queryClient.setQueryData<EnrollmentSummary[]>(
        enrollmentKeys.mine(userId.value),
        (current = []) =>
          current.some((item) => item.courseId === enrollment.courseId)
            ? current
            : [enrollment, ...current]
      )

      void queryClient.invalidateQueries({
        queryKey: enrollmentKeys.all,
        refetchType: 'none'
      })
    }
  })

  const isSignedIn = computed(() => Boolean(session.value))
  const isEnrolled = computed(() =>
    enrollments.value.some(
      (enrollment) => enrollment.courseId === toValue(courseId)
    )
  )
  const error = computed(() =>
    mutation.isError.value ? mutation.error.value : null
  )
  const errorMessage = computed(() =>
    mutation.isError.value ? getEnrollErrorMessage(mutation.error.value) : null
  )

  function enroll() {
    mutation.mutate(toValue(courseId))
  }

  return {
    enroll,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error,
    errorMessage,
    isSignedIn,
    isEnrolled
  }
}
