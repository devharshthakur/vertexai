<script setup lang="ts">
  import CourseMetadataForm from '@/components/instructor/CourseMetadataForm.vue'
  import InstructorDraftGuard from '@/components/instructor/InstructorDraftGuard.vue'
  import { provideInstructorDrafts } from '@/composables/useInstructorDrafts'
  import { useMutation } from '@tanstack/vue-query'
  import { toast } from 'vue-sonner'
  import type { CreateCourseValues } from '#shared/validation/courses'

  definePageMeta({ layout: 'workspace', middleware: 'instructor' })
  useSeoMeta({ title: 'Create a course · VertexAI' })

  const createdCourseId = shallowRef('')
  provideInstructorDrafts()

  const { mutateAsync: createCourse } = useMutation({
    mutationFn: (values: CreateCourseValues) =>
      $fetch<{ id: string }>('/api/courses', {
        method: 'POST',
        body: values
      }),
    onSuccess: (course) => {
      createdCourseId.value = course.id
      toast.success('Course created.')
    },
    onError: () => {
      toast.error('We could not create this course. Please try again.')
    }
  })

  async function createCourseAndReturn(values: CreateCourseValues) {
    try {
      await createCourse(values)
      return true
    } catch {
      return false
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

    <section class="flex flex-col gap-2">
      <h2 class="text-xl font-semibold tracking-tight">Course details</h2>
      <p class="text-sm text-muted-foreground">This information will appear on your course listing.</p>
      <CourseMetadataForm class="mt-4" :on-save="createCourseAndReturn" @saved="navigateTo(`/instructor/courses/${createdCourseId}`)" />
    </section>

    <p class="border-t pt-5 text-sm text-muted-foreground">Your course starts as a private draft. Submit it for review when you are ready.</p>
    <InstructorDraftGuard />
  </div>
</template>
