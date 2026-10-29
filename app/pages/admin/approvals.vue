<script setup lang="ts">
import { CheckIcon, ExternalLinkIcon, XIcon } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { CourseListResult } from '#shared/types/courses'
import { reviewCourseSchema } from '#shared/validation/courses'

definePageMeta({ layout: 'workspace', middleware: 'admin' })
useSeoMeta({ title: 'Course approvals · VertexAI' })

const { data, pending, error, refresh } = await useFetch<CourseListResult>(
  '/api/admin/courses/pending',
  { query: { limit: 50 } }
)
const comments = ref<Record<string, string>>({})
const busyCourseId = ref<string | null>(null)
const pageError = ref('')

async function decide(courseId: string, decision: 'approved' | 'rejected') {
  pageError.value = ''
  const result = reviewCourseSchema.safeParse({
    decision,
    comment: comments.value[courseId] || null
  })

  if (!result.success) {
    pageError.value =
      result.error.issues[0]?.message ?? 'Enter a valid review comment.'
    return
  }

  busyCourseId.value = courseId
  try {
    await $fetch(`/api/admin/courses/${courseId}/decision`, {
      method: 'POST',
      body: result.data
    })
    await refresh()
  } catch {
    pageError.value =
      'The review could not be saved. The course may already have been reviewed.'
    await refresh()
  } finally {
    busyCourseId.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <header class="flex flex-col gap-2">
      <p class="text-sm font-medium text-muted-foreground">Admin workspace</p>
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
        Course approvals
      </h1>
      <p class="max-w-2xl text-muted-foreground">
        Review pending course details and curriculum before publication.
      </p>
    </header>

    <Alert v-if="error || pageError" variant="destructive">
      <AlertTitle>{{
        error ? 'Approval queue unavailable' : 'Review not saved'
      }}</AlertTitle>
      <AlertDescription>
        {{
          pageError || 'We could not load pending courses. Please try again.'
        }}
        <Button
          v-if="error"
          size="sm"
          variant="outline"
          class="mt-3"
          @click="refresh()"
        >
          Retry
        </Button>
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

    <Empty v-else-if="!error && data?.items.length === 0">
      <EmptyHeader>
        <EmptyTitle>All caught up</EmptyTitle>
        <EmptyDescription
          >There are no pending courses to review.</EmptyDescription
        >
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
            <NuxtLink
              :to="`/courses/${course.id}`"
              class="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
            >
              Preview course and curriculum
              <ExternalLinkIcon data-icon="inline-end" />
            </NuxtLink>
            <FieldGroup>
              <Field>
                <FieldLabel :for="`review-${course.id}`"
                  >Review comment (optional)</FieldLabel
                >
                <Textarea
                  :id="`review-${course.id}`"
                  v-model="comments[course.id]"
                  maxlength="2000"
                  placeholder="Add context for the instructor…"
                />
              </Field>
            </FieldGroup>
          </div>
        </CardContent>
        <CardFooter>
          <div class="flex flex-wrap gap-3">
            <Button
              :disabled="busyCourseId !== null"
              @click="decide(course.id, 'approved')"
            >
              <CheckIcon data-icon="inline-start" />
              {{ busyCourseId === course.id ? 'Saving…' : 'Approve course' }}
            </Button>
            <Button
              variant="outline"
              :disabled="busyCourseId !== null"
              @click="decide(course.id, 'rejected')"
            >
              <XIcon data-icon="inline-start" />
              Reject
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
