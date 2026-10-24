import type { CourseWithCurriculum } from '#shared/types/courses'

/** A course with its curriculum, by id. */
export function useCourse(courseId: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(courseId))

  return useAsyncData(
    () => `course:${id.value}`,
    () => $fetch<CourseWithCurriculum>(`/api/courses/${id.value}`),
    { watch: [id] }
  )
}
