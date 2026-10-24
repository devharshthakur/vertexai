import type { CourseListResult } from '#shared/types/courses'

/**
 * The catalog filters.
 *
 * The catalog page owns this state and passes it to `useCourses`; the
 * composable only turns it into a query.
 */
export interface CatalogFilterState {
  q: string
  category: string
  difficulty: string
  page: number
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilterState = {
  q: '',
  category: '',
  difficulty: '',
  page: 1
}

/** The published catalog, filtered and paginated. */
export function useCourses(filters: Ref<CatalogFilterState>) {
  const query = computed(() => ({
    q: filters.value.q || undefined,
    category: filters.value.category || undefined,
    difficulty: filters.value.difficulty || undefined,
    page: filters.value.page,
    limit: 12
  }))

  return useFetch<CourseListResult>('/api/courses', { query })
}

/** The categories that published courses use, for the category filter. */
export function useCourseCategories() {
  return useFetch<string[]>('/api/courses/categories', {
    default: () => []
  })
}
