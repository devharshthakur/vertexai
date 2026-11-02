<script setup lang="ts">
  import { ArrowDownIcon, ArrowUpIcon } from '@lucide/vue'
  import type { LectureSummary } from '#shared/types/courses'
  import LectureEditor from '@/components/instructor/LectureEditor.vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'

  const props = defineProps<{
    courseId: string
    moduleId: string
  }>()

  const lectures = defineModel<LectureSummary[]>('lectures', { required: true })
  const isReordering = shallowRef(false)
  const errorMessage = shallowRef('')

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

    const previous = [...lectures.value]
    const reordered = [...lectures.value]
    ;[reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!]
    lectures.value = reordered
    isReordering.value = true
    errorMessage.value = ''

    try {
      lectures.value = await $fetch<LectureSummary[]>(`/api/courses/${props.courseId}/modules/${props.moduleId}/lectures/reorder`, {
        method: 'PUT',
        body: { lectureIds: reordered.map((lecture) => lecture.id) }
      })
    } catch {
      lectures.value = previous
      errorMessage.value = 'The lecture order was not saved. Please try again.'
    } finally {
      isReordering.value = false
    }
  }
</script>

<template>
  <div class="flex flex-col gap-4">
    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>Lecture order was not saved</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <ol v-if="lectures.length" class="flex flex-col gap-4">
      <li v-for="(lecture, index) in lectures" :key="lecture.id" class="flex items-start gap-2">
        <LectureEditor class="min-w-0 flex-1" :course-id="courseId" :module-id="moduleId" :lecture="lecture" @saved="saveLecture" />
        <div class="flex shrink-0 flex-col gap-1">
          <Button variant="ghost" size="icon" :aria-label="`Move ${lecture.title} up`" :disabled="index === 0 || isReordering" @click="moveLecture(index, -1)">
            <ArrowUpIcon />
          </Button>
          <Button variant="ghost" size="icon" :aria-label="`Move ${lecture.title} down`" :disabled="index === lectures.length - 1 || isReordering" @click="moveLecture(index, 1)">
            <ArrowDownIcon />
          </Button>
        </div>
      </li>
    </ol>

    <p v-else class="text-sm text-muted-foreground">This module does not have any lectures yet.</p>

    <LectureEditor :course-id="courseId" :module-id="moduleId" @saved="saveLecture" />
  </div>
</template>
