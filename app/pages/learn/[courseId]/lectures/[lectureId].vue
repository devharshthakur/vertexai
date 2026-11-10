<script setup lang="ts">
  import LearningPlayer from '@/components/learning/LearningPlayer.vue'
  import LectureTools from '@/components/learning/LectureTools.vue'
  import { useLectureContent } from '@/composables/useLectureContent'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Progress } from '@/components/ui/progress'
  import { useQueryClient } from '@tanstack/vue-query'
  import type { LearningCourse } from '#shared/types/learning'
  import type { CourseMaterialSummary } from '#shared/types/course-materials'

  definePageMeta({ middleware: 'auth' })
  const route = useRoute()
  const courseId = computed(() => String(route.params.courseId))
  const lectureId = computed(() => String(route.params.lectureId))
  const { data, error, pending, refresh } = await useFetch<LearningCourse>(() => `/api/courses/${courseId.value}/learn`)
  const { data: materials, error: materialsError } = await useFetch<CourseMaterialSummary[]>(() => `/api/courses/${courseId.value}/materials`, { default: () => [] })
  const player = useTemplateRef<InstanceType<typeof LearningPlayer>>('player')
  const queryClient = useQueryClient()
  const { current, lectureMaterials } = useLectureContent(data, materials, lectureId)
  const saving = shallowRef(false)
  const saveError = shallowRef(false)

  function getCurrentTime() {
    return player.value?.getCurrentTime() ?? null
  }

  function seekTo(timestampSeconds: number) {
    player.value?.seekTo(timestampSeconds)
  }

  function materialUrl(materialId: string): string {
    return `/api/courses/${courseId.value}/materials/${materialId}`
  }

  watch(
    [courseId, lectureId, current],
    async ([course, lecture, selected], _old, onCleanup) => {
      if (!selected || import.meta.server) return
      let active = true
      onCleanup(() => {
        active = false
      })
      try {
        await $fetch(`/api/courses/${course}/lectures/${lecture}/progress`, { method: 'POST', body: { action: 'view' } })
        if (active) saveError.value = false
      } catch {
        if (active) saveError.value = true
      }
    },
    { immediate: true }
  )

  async function markComplete() {
    saving.value = true
    saveError.value = false
    try {
      await $fetch(`/api/courses/${courseId.value}/lectures/${lectureId.value}/progress`, { method: 'POST', body: { action: 'complete' } })
      await refresh()
      // Invalidate all per-user enrollment lists after a completion.
      // eslint-disable-next-line @tanstack/query/prefer-query-options -- This is a shared query-key prefix, not one query's options.
      await queryClient.invalidateQueries({ queryKey: ['enrollments'] })
    } catch {
      saveError.value = true
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <div class="flex flex-col gap-6">
    <Button variant="outline" as-child>
      <NuxtLink to="/dashboard">Back to dashboard</NuxtLink>
    </Button>
    <p v-if="pending">Loading your course…</p>
    <Alert v-else-if="error || !data || !current">
      <AlertTitle>Unable to open this lecture</AlertTitle>
      <AlertDescription>Make sure you are enrolled and the lecture is available.</AlertDescription>
    </Alert>
    <template v-else>
      <header class="flex flex-col gap-2">
        <p class="text-muted-foreground">{{ data.title }}</p>
        <h1 class="text-3xl font-semibold tracking-tight">{{ current.title }}</h1>
      </header>
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <div class="flex flex-col gap-4">
          <LearningPlayer ref="player" :key="current.id" :course-id="courseId" :lecture-id="current.id" :video-url="current.videoUrl" :title="current.title" :position-seconds="current.positionSeconds" />
          <LectureTools :key="`tools-${current.id}`" :course-id="courseId" :lecture-id="current.id" :get-current-time="getCurrentTime" @seek="seekTo" />
          <Alert v-if="materialsError">
            <AlertTitle>Course materials unavailable</AlertTitle>
            <AlertDescription>We could not load the resources for this lecture.</AlertDescription>
          </Alert>
          <Card v-if="lectureMaterials.all.length">
            <CardHeader>
              <CardTitle>Lecture materials</CardTitle>
              <CardDescription>Files attached to this lecture and its module.</CardDescription>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <video v-for="material in lectureMaterials.videos" :key="material.id" :src="materialUrl(material.id)" :aria-label="material.originalFilename" controls preload="metadata" class="aspect-video w-full rounded-md">Your browser does not support embedded video.</video>
                <ul v-if="lectureMaterials.documents.length" class="flex flex-col gap-2">
                  <li v-for="material in lectureMaterials.documents" :key="material.id">
                    <Button variant="outline" size="sm" as-child>
                      <a :href="materialUrl(material.id)" :download="material.originalFilename">{{ material.originalFilename }} · {{ Math.ceil(material.sizeBytes / 1024) }} KB</a>
                    </Button>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
          <Alert v-if="saveError">
            <AlertTitle>Progress not saved</AlertTitle>
            <AlertDescription>Please try again.</AlertDescription>
          </Alert>
          <Button :disabled="current.completed || saving" @click="markComplete">{{ current.completed ? 'Completed' : 'Mark complete' }}</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Course progress · {{ Math.round(data.progressPercent) }}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-5">
              <Progress :model-value="data.progressPercent" aria-label="Course progress" />
              <div v-for="module in data.modules" :key="module.id" class="flex flex-col gap-2">
                <h2 class="font-semibold">{{ module.title }}</h2>
                <ul class="flex flex-col gap-2">
                  <li v-for="lecture in module.lectures" :key="lecture.id" class="flex items-center justify-between gap-2">
                    <NuxtLink :to="`/learn/${courseId}/lectures/${lecture.id}`" :aria-current="lecture.id === lectureId ? 'page' : undefined" class="text-sm underline-offset-4 hover:underline">{{ lecture.title }}</NuxtLink>
                    <Badge v-if="lecture.completed" variant="secondary">Done</Badge>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </template>
  </div>
</template>
