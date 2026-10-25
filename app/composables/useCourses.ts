import type { CourseListResult } from '#shared/types/courses'

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

export function useCourseCategories() {
  return useFetch<string[]>('/api/courses/categories', {
    default: () => []
  })
}
