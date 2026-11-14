<script setup lang="ts">
  import { CheckIcon, ExternalLinkIcon, XIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { toast } from 'vue-sonner'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Skeleton } from '@/components/ui/skeleton'
  import { Spinner } from '@/components/ui/spinner'
  import { Textarea } from '@/components/ui/textarea'
  import type { CourseListResult } from '#shared/types/courses'
  import { reviewCourseSchema, type ReviewCourseValues } from '#shared/validation/courses'

  definePageMeta({ layout: 'workspace', middleware: 'admin' })
  useSeoMeta({ title: 'Course approvals · VertexAI' })

  const page = shallowRef(1)
  const { data, pending, error, refresh } = await useFetch<CourseListResult>('/api/admin/courses/pending', {
    query: { limit: 50, page }
  })
  const comments = ref<Record<string, string>>({})
  const busyCourseId = shallowRef<string | null>(null)
  const busyDecision = shallowRef<'approved' | 'rejected' | null>(null)
  watch(data, (result) => {
    if (result && page.value > result.totalPages) page.value = result.totalPages
  })

  const { mutateAsync: decideCourse } = useMutation({
    mutationFn: ({ courseId, payload }: { courseId: string; payload: ReviewCourseValues }) =>
      $fetch(`/api/admin/courses/${courseId}/decision`, {
        method: 'POST',
        body: payload
      }),
    onSuccess: async () => {
      await refresh()
      toast.success('Review saved.')
    },
    onError: async () => {
      toast.error('The review could not be saved. The course may already have been reviewed.')
      await refresh()
    }
  })

  async function decide(courseId: string, decision: 'approved' | 'rejected') {
    const result = reviewCourseSchema.safeParse({
      decision,
      comment: comments.value[courseId] || null
    })

    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Enter a valid review comment.')
      return
    }

    busyCourseId.value = courseId
    busyDecision.value = decision
    try {
      await decideCourse({ courseId, payload: result.data })
    } catch {
      // The mutation reports the failure.
    } finally {
      busyCourseId.value = null
      busyDecision.value = null
    }
  }
</script>

<template>
  <div class="flex flex-col gap-8">
    <header class="flex flex-col gap-2">
      <p class="text-sm font-medium text-muted-foreground">Admin workspace</p>
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Course approvals</h1>
      <p class="max-w-2xl text-muted-foreground">Review pending course details and curriculum before publication.</p>
    </header>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Approval queue unavailable</AlertTitle>
      <AlertDescription>
        We could not load pending courses. Please try again.
        <Button size="sm" variant="outline" class="mt-3" @click="refresh()"> Retry </Button>
      </AlertDescription>
    </Alert>

    <div v-if="pending" class="grid gap-5 lg:grid-cols-2" aria-busy="true">
      <Card v-for="index in 2" :key="index">
        <CardHeader>
          <div class="flex flex-col gap-3">
            <Skeleton class="h-5 w-24" />
            <Skeleton class="h-7 w-2/3" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-4">
            <Skeleton class="h-16 w-full" />
            <Skeleton class="h-24 w-full" />
          </div>
        </CardContent>
        <CardFooter>
          <div class="flex gap-3">
            <Skeleton class="h-9 w-24" />
            <Skeleton class="h-9 w-24" />
          </div>
        </CardFooter>
      </Card>
    </div>

    <Empty v-else-if="!error && data?.total === 0">
      <EmptyHeader>
        <EmptyTitle>All caught up</EmptyTitle>
        <EmptyDescription>There are no pending courses to review.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else-if="data" class="grid gap-5 lg:grid-cols-2">
      <Card v-for="course in data.items" :key="course.id" class="flex flex-col">
        <CardHeader>
          <CardDescription>
            {{ course.category || 'Uncategorized' }}
            <span v-if="course.difficulty"> · {{ course.difficulty }}</span>
          </CardDescription>
          <CardTitle>{{ course.title }}</CardTitle>
        </CardHeader>
        <CardContent class="flex-1">
          <div class="flex flex-col gap-5">
            <p class="text-sm whitespace-pre-line text-muted-foreground">
              {{ course.description || 'No course description provided.' }}
            </p>
            <NuxtLink :to="`/courses/${course.id}`" class="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
              Preview course and curriculum
              <ExternalLinkIcon data-icon="inline-end" />
            </NuxtLink>
            <FieldGroup>
              <Field>
                <FieldLabel :for="`review-${course.id}`">Review comment (optional)</FieldLabel>
                <Textarea :id="`review-${course.id}`" v-model="comments[course.id]" maxlength="2000" placeholder="Add context for the instructor…" />
              </Field>
            </FieldGroup>
          </div>
        </CardContent>
        <CardFooter>
          <div class="flex flex-wrap gap-3">
            <Button :disabled="busyCourseId !== null" @click="decide(course.id, 'approved')">
              <Spinner v-if="busyCourseId === course.id && busyDecision === 'approved'" data-icon="inline-start" />
              <CheckIcon v-else data-icon="inline-start" />
              {{ busyCourseId === course.id && busyDecision === 'approved' ? 'Saving…' : 'Approve course' }}
            </Button>
            <Button variant="outline" :disabled="busyCourseId !== null" @click="decide(course.id, 'rejected')">
              <Spinner v-if="busyCourseId === course.id && busyDecision === 'rejected'" data-icon="inline-start" />
              <XIcon v-else data-icon="inline-start" />
              Reject
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
    <footer v-if="data && data.total > 0" class="flex items-center justify-between gap-4 border-t border-border pt-6">
      <Button variant="outline" size="sm" :disabled="pending || page <= 1" @click="page--">Previous</Button>
      <p class="text-sm text-muted-foreground">Page {{ data.page }} of {{ data.totalPages }} · {{ data.total }} pending</p>
      <Button variant="outline" size="sm" :disabled="pending || page >= data.totalPages" @click="page++">Next</Button>
    </footer>
  </div>
</template>
