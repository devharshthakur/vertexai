import type { CourseMaterialSummary } from '#shared/types/course-materials'
import { queryOptions, useQuery } from '@tanstack/vue-query'

export const courseMaterialKeys = {
  byCourse: (courseId: string) => ['course-materials', courseId] as const
}

/** Share one SSR-hydrated course-materials cache between instructor and learner views. */
export function useCourseMaterials(courseId: MaybeRefOrGetter<string>) {
  const requestFetch = useRequestFetch()
  const query = useQuery(
    queryOptions({
      queryKey: computed(() => courseMaterialKeys.byCourse(toValue(courseId))),
      queryFn: ({ signal }) => requestFetch<CourseMaterialSummary[]>(`/api/courses/${toValue(courseId)}/materials`, { signal })
    })
  )

  if (import.meta.server) {
    onServerPrefetch(async () => {
      await query.suspense()
    })
  }

  return {
    materials: computed(() => query.data.value ?? []),
    pending: query.isPending,
    error: query.error,
    refetch: query.refetch
  }
}
