<script setup lang="ts">
  import { ArrowDownIcon, ArrowUpIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { toast } from 'vue-sonner'
  import type { LectureSummary } from '#shared/types/courses'
  import LectureEditor from '@/components/instructor/LectureEditor.vue'
  import { Button } from '@/components/ui/button'
  import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty'

  const props = defineProps<{
    courseId: string
    moduleId: string
  }>()

  const lectures = defineModel<LectureSummary[]>('lectures', { required: true })

  const { mutateAsync: reorderLectures, isPending: isReordering } = useMutation({
    mutationFn: (lectureIds: string[]) =>
      $fetch<LectureSummary[]>(`/api/courses/${props.courseId}/modules/${props.moduleId}/lectures/reorder`, {
        method: 'PUT',
        body: { lectureIds }
      }),
    onMutate: (lectureIds) => {
      const previous = [...lectures.value]
      const byId = new Map(lectures.value.map((lecture) => [lecture.id, lecture]))
      lectures.value = lectureIds.flatMap((id) => {
        const lecture = byId.get(id)
        return lecture ? [lecture] : []
      })
      return { previous }
    },
    onSuccess: (saved) => {
      lectures.value = saved
      toast.success('Lecture order saved.')
    },
    onError: (_error, _lectureIds, context) => {
      if (context?.previous) lectures.value = context.previous
      toast.error('The lecture order was not saved. Please try again.')
    }
  })

  function saveLecture(saved: LectureSummary) {
    const index = lectures.value.findIndex((lecture) => lecture.id === saved.id)
    if (index === -1) {
      lectures.value = [...lectures.value, saved].sort((left, right) => left.orderIndex - right.orderIndex)
      return
    }

    lectures.value = lectures.value.map((lecture) => (lecture.id === saved.id ? saved : lecture))
  }

  async function moveLecture(index: number, offset: -1 | 1) {
    const target = index + offset
    if (target < 0 || target >= lectures.value.length || isReordering.value) return

    const reordered = [...lectures.value]
    ;[reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!]

    try {
      await reorderLectures(reordered.map((lecture) => lecture.id))
    } catch {
      // The mutation restores the previous order.
    }
  }
</script>

<template>
  <div class="flex flex-col gap-4">
    <ol v-if="lectures.length" class="flex flex-col gap-4">
      <li v-for="(lecture, index) in lectures" :key="lecture.id" class="flex items-start gap-2">
        <LectureEditor class="min-w-0 flex-1" :course-id="courseId" :module-id="moduleId" :lecture="lecture" @saved="saveLecture" />
        <div class="flex shrink-0 flex-col gap-1">
          <Button variant="ghost" size="icon" :aria-label="`Move ${lecture.title} up`" :disabled="index === 0 || isReordering" @click="moveLecture(index, -1)">
            <ArrowUpIcon data-icon="inline-start" />
          </Button>
          <Button variant="ghost" size="icon" :aria-label="`Move ${lecture.title} down`" :disabled="index === lectures.length - 1 || isReordering" @click="moveLecture(index, 1)">
            <ArrowDownIcon data-icon="inline-start" />
          </Button>
        </div>
      </li>
    </ol>

    <Empty v-else>
      <EmptyHeader>
        <EmptyDescription>This module does not have any lectures yet.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <LectureEditor :course-id="courseId" :module-id="moduleId" @saved="saveLecture" />
  </div>
</template>
