import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { CourseMaterialSummary } from '#shared/types/course-materials'
import type { LearningCourse } from '#shared/types/learning'

/**
 * Resolves the selected lecture and groups its module and lecture materials by
 * media type. The API delivers the course and material lists separately, so
 * the relationship between them belongs here rather than in the page template.
 */
export function useLectureContent(course: MaybeRefOrGetter<LearningCourse | null | undefined>, materials: MaybeRefOrGetter<CourseMaterialSummary[] | null | undefined>, lectureId: MaybeRefOrGetter<string>) {
  const currentModule = computed(() => toValue(course)?.modules.find((module) => module.lectures.some((lecture) => lecture.id === toValue(lectureId))))
  const current = computed(() => currentModule.value?.lectures.find((lecture) => lecture.id === toValue(lectureId)))

  const lectureMaterials = computed(() => {
    const selectedModuleId = currentModule.value?.id
    const selectedLectureId = toValue(lectureId)
    const all = (toValue(materials) ?? []).filter((material) => material.moduleId === selectedModuleId && (material.lectureId === null || material.lectureId === selectedLectureId))

    return {
      all,
      videos: all.filter((material) => material.contentType.startsWith('video/')),
      documents: all.filter((material) => !material.contentType.startsWith('video/'))
    }
  })

  return { current, lectureMaterials }
}
