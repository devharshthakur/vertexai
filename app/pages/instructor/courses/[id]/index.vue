<script setup lang="ts">
import CourseMetadataForm from '@/components/instructor/CourseMetadataForm.vue'
import ModuleManager from '@/components/instructor/ModuleManager.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { CourseWithCurriculum, ModuleSummary } from '#shared/types/courses'
import type { CreateCourseValues } from '#shared/validation/courses'

definePageMeta({ layout: 'workspace', middleware: 'instructor' })

const route = useRoute()
const courseId = computed(() => String(route.params.id))
useSeoMeta({ title: 'Edit course · VertexAI' })

const {
  data: courseData,
  pending,
  error,
  refresh
} = await useFetch<CourseWithCurriculum>(() => `/api/courses/${courseId.value}`)
const course = computed(() => courseData.value?.course ?? null)
const errorMessage = ref('')

async function updateCourse(values: CreateCourseValues) {
  errorMessage.value = ''

  try {
    await $fetch(`/api/courses/${courseId.value}`, {
      method: 'PUT',
      body: values
    })
    await refresh()
  } catch {
    errorMessage.value = 'We could not save course details. Please try again.'
  }
}

function updateModules(modules: ModuleSummary[]) {
  if (courseData.value) {
    courseData.value.modules = modules
  }
}
</script>

<template>
  <div
    v-if="pending"
    class="mx-auto flex w-full max-w-4xl flex-col gap-6"
    aria-busy="true"
  >
    <Skeleton class="h-10 w-1/2" />
    <Card
      ><CardContent
        ><div class="flex flex-col gap-4">
          <Skeleton class="h-8 w-full" /><Skeleton
            class="h-28 w-full"
          /></div></CardContent
    ></Card>
  </div>

  <div v-else-if="error || !courseData" class="mx-auto w-full max-w-3xl">
    <Alert variant="destructive">
      <AlertTitle>Course could not be loaded</AlertTitle>
      <AlertDescription>
        It may not exist, or your account may not have permission to edit it.
        <NuxtLink to="/instructor" class="font-medium underline"
          >Return to your courses</NuxtLink
        >
      </AlertDescription>
    </Alert>
  </div>

  <div v-else class="mx-auto flex w-full max-w-4xl flex-col gap-8">
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-muted-foreground">Course editor</p>
        <h1 class="text-3xl font-semibold tracking-tight">
          {{ course!.title }}
        </h1>
        <p class="text-muted-foreground">
          New courses remain private until an admin approves them.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <Badge
          :variant="course!.status === 'approved' ? 'default' : 'secondary'"
        >
          {{ course!.status }}
        </Badge>
        <Button variant="outline" as-child>
          <NuxtLink :to="`/courses/${course!.id}`">Preview</NuxtLink>
        </Button>
      </div>
    </header>

    <Alert v-if="errorMessage" variant="destructive">
      <AlertTitle>Course update failed</AlertTitle>
      <AlertDescription>{{ errorMessage }}</AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>Course details</CardTitle>
        <CardDescription
          >Update the metadata shown to students.</CardDescription
        >
      </CardHeader>
      <CardContent>
        <CourseMetadataForm :course="course!" :on-save="updateCourse" />
      </CardContent>
    </Card>

    <ModuleManager
      :course-id="course!.id"
      :modules="courseData.modules"
      @update:modules="updateModules"
    />
  </div>
</template>
