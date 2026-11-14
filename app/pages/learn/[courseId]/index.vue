<script setup lang="ts">
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import type { LearningCourse } from '#shared/types/learning'

  definePageMeta({ middleware: 'auth' })
  const route = useRoute()
  const courseId = computed(() => String(route.params.courseId))
  const { data, error } = await useFetch<LearningCourse>(() => `/api/courses/${courseId.value}/learn`)
  if (data.value?.resumeLectureId) await navigateTo(`/learn/${courseId.value}/lectures/${data.value.resumeLectureId}`, { replace: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <Alert v-if="error">
      <AlertTitle>Unable to open this course</AlertTitle>
      <AlertDescription>Make sure you are enrolled and try again.</AlertDescription>
    </Alert>
    <Alert v-else>
      <AlertTitle>No lectures yet</AlertTitle>
      <AlertDescription>This course does not have any lectures yet.</AlertDescription>
    </Alert>
    <Button as-child variant="outline">
      <NuxtLink to="/dashboard">Back to dashboard</NuxtLink>
    </Button>
  </div>
</template>
