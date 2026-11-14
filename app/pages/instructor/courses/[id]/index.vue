<script setup lang="ts">
  import CourseMetadataForm from '@/components/instructor/CourseMetadataForm.vue'
  import CourseMaterialsPanel from '@/components/instructor/CourseMaterialsPanel.vue'
  import InstructorDraftGuard from '@/components/instructor/InstructorDraftGuard.vue'
  import ModuleManager from '@/components/instructor/ModuleManager.vue'
  import AssignmentManager from '@/components/instructor/AssignmentManager.vue'
  import { provideInstructorDrafts } from '@/composables/useInstructorDrafts'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Skeleton } from '@/components/ui/skeleton'
  import { Spinner } from '@/components/ui/spinner'
  import { useMutation } from '@tanstack/vue-query'
  import { toast } from 'vue-sonner'
  import type { CourseSummary, CourseWithCurriculum } from '#shared/types/courses'
  import type { CreateCourseValues } from '#shared/validation/courses'

  definePageMeta({ layout: 'workspace', middleware: 'instructor' })

  const route = useRoute()
  provideInstructorDrafts()
  const courseId = computed(() => String(route.params.id))
  useSeoMeta({ title: 'Edit course · VertexAI' })

  const courseRequest = useFetch<CourseWithCurriculum>(() => `/api/courses/${courseId.value}`, { deep: true })
  const reviewRequest = useFetch<{ decision: 'approved' | 'rejected'; comment: string | null; reviewedAt: string } | null>(() => `/api/courses/${courseId.value}/review`)
  const [{ data: courseData, pending, error }, { data: review, refresh: refreshReview }] = await Promise.all([courseRequest, reviewRequest])
  const course = computed(() => courseData.value?.course ?? null)

  const { mutateAsync: submitCourse, isPending: isSubmitting } = useMutation({
    mutationFn: () => $fetch<CourseSummary>(`/api/courses/${courseId.value}/submit`, { method: 'POST', body: {} }),
    onSuccess: async (updated) => {
      if (courseData.value) courseData.value.course = updated
      await refreshReview()
      toast.success('Course submitted for review.')
    },
    onError: () => {
      toast.error('We could not submit this course for review. Please try again.')
    }
  })

  const { mutateAsync: saveCourse } = useMutation({
    mutationFn: (values: CreateCourseValues) =>
      $fetch<CourseSummary>(`/api/courses/${courseId.value}`, {
        method: 'PUT',
        body: values
      }),
    onSuccess: async (updated) => {
      if (courseData.value) courseData.value.course = updated
      await refreshReview()
      toast.success('Course details saved.')
    },
    onError: () => {
      toast.error('We could not save course details. Please try again.')
    }
  })

  async function submitForReview() {
    try {
      await submitCourse()
    } catch {
      // The mutation reports the failure.
    }
  }

  async function updateCourse(values: CreateCourseValues) {
    try {
      await saveCourse(values)
      return true
    } catch {
      return false
    }
  }
</script>

<template>
  <div v-if="pending" class="mx-auto flex w-full max-w-4xl flex-col gap-6" aria-busy="true">
    <Skeleton class="h-10 w-1/2" />
    <Card>
      <CardContent>
        <div class="flex flex-col gap-4">
          <Skeleton class="h-8 w-full" />
          <Skeleton class="h-28 w-full" />
        </div>
      </CardContent>
    </Card>
  </div>

  <div v-else-if="error || !courseData" class="mx-auto w-full max-w-3xl">
    <Alert variant="destructive">
      <AlertTitle>Course could not be loaded</AlertTitle>
      <AlertDescription>
        It may not exist, or your account may not have permission to edit it.
        <NuxtLink to="/instructor" class="font-medium underline">Return to your courses</NuxtLink>
      </AlertDescription>
    </Alert>
  </div>

  <div v-else class="mx-auto flex w-full max-w-4xl flex-col gap-8">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-muted-foreground">Course editor</p>
        <h1 class="text-3xl font-semibold tracking-tight">
          {{ course!.title }}
        </h1>
        <p class="text-muted-foreground">Drafts remain private until submitted and approved. Changes to approved courses are live.</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <Badge :variant="course!.status === 'approved' ? 'default' : 'secondary'">
          {{ course!.status }}
        </Badge>
        <Button variant="outline" as-child>
          <NuxtLink :to="`/courses/${course!.id}`">Preview</NuxtLink>
        </Button>
        <Button v-if="course!.status === 'draft' || course!.status === 'rejected'" :disabled="isSubmitting" @click="submitForReview">
          <Spinner v-if="isSubmitting" data-icon="inline-start" />
          {{ course!.status === 'rejected' ? 'Resubmit for review' : 'Submit for review' }}
        </Button>
      </div>
    </header>

    <Alert v-if="review">
      <AlertTitle>Latest review: {{ review.decision }}</AlertTitle>
      <AlertDescription>{{ review.comment || 'No comment was provided.' }}</AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>Course details</CardTitle>
        <CardDescription>Update the metadata shown to students.</CardDescription>
      </CardHeader>
      <CardContent>
        <CourseMetadataForm :course="course!" :on-save="updateCourse" />
      </CardContent>
    </Card>

    <CourseMaterialsPanel :course-id="course!.id" :modules="courseData.modules" />

    <ModuleManager v-model:modules="courseData.modules" :course-id="course!.id" />
    <AssignmentManager :course-id="course!.id" />
    <InstructorDraftGuard />
  </div>
</template>
