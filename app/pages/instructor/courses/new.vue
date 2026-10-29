<script setup lang="ts">
import CourseMetadataForm from '@/components/instructor/CourseMetadataForm.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import type { CreateCourseValues } from '#shared/validation/courses'

definePageMeta({ layout: 'workspace', middleware: 'instructor' })
useSeoMeta({ title: 'Create a course · VertexAI' })

const errorMessage = ref('')

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
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <header class="flex flex-col gap-2">
      <p class="text-sm font-medium text-muted-foreground">
        Instructor workspace
      </p>
      <h1 class="text-3xl font-semibold tracking-tight">Create a course</h1>
      <p class="text-muted-foreground">
        New courses start as pending and remain private until an admin approves
        them.
      </p>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>Course could not be created</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>Course details</CardTitle>
        <CardDescription
          >Provide the information students will see in the
          catalog.</CardDescription
        >
      </CardHeader>
      <CardContent>
        <CourseMetadataForm :on-save="createCourse" />
      </CardContent>
    </Card>
  </div>
</template>
