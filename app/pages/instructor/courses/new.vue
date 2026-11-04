<script setup lang="ts">
  import CourseMetadataForm from '@/components/instructor/CourseMetadataForm.vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import type { CreateCourseValues } from '#shared/validation/courses'

  definePageMeta({ layout: 'workspace', middleware: 'instructor' })
  useSeoMeta({ title: 'Create a course · VertexAI' })

  const errorMessage = shallowRef('')

  async function createCourse(values: CreateCourseValues) {
    errorMessage.value = ''

    try {
      const course = await $fetch<{ id: string }>('/api/courses', {
        method: 'POST',
        body: values
      })
      await navigateTo(`/instructor/courses/${course.id}`)
    } catch {
      errorMessage.value = 'We could not create this course. Please try again.'
    }
  }
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-10 py-4">
    <header class="flex flex-col gap-3 border-b pb-8">
      <p class="text-sm font-medium text-muted-foreground">INSTRUCTOR WORKSPACE</p>
      <h1 class="text-4xl font-semibold tracking-tight">Create a course</h1>
      <p class="max-w-2xl text-muted-foreground">Share your expertise with students. Add the essential details below to get started.</p>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>Course could not be created</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <section class="flex flex-col gap-2">
      <h2 class="text-xl font-semibold tracking-tight">Course details</h2>
      <p class="text-sm text-muted-foreground">This information will appear on your course listing.</p>
      <CourseMetadataForm class="mt-4" :on-save="createCourse" />
    </section>

    <p class="border-t pt-5 text-sm text-muted-foreground">Your course will remain private while it is pending admin approval.</p>
  </div>
</template>
