import type { CourseWithCurriculum } from '#shared/types/courses'

export function useCourse(courseId: MaybeRefOrGetter<string>) {
  return useFetch<CourseWithCurriculum>(
    () => `/api/courses/${toValue(courseId)}`
  )
}
