<script setup lang="ts">
  import { CheckIcon, ExternalLinkIcon, XIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { z } from 'zod'
  import { toast } from 'vue-sonner'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Skeleton } from '@/components/ui/skeleton'
  import { Spinner } from '@/components/ui/spinner'
  import { Textarea } from '@/components/ui/textarea'
  import type { CourseListResult, CourseSummary } from '#shared/types/courses'
  import { reviewCourseSchema, type ReviewCourseValues } from '#shared/validation/courses'

  definePageMeta({ layout: 'workspace', middleware: 'admin' })
  useSeoMeta({ title: 'Course approvals · VertexAI' })

  const page = shallowRef(1)
  const { data, pending, error, refresh } = await useFetch<CourseListResult>('/api/admin/courses/pending', {
    query: { limit: 50, page }
  })
  const approvalsFormSchema = z.object({
    entries: z.array(z.object({ comment: reviewCourseSchema.shape.comment }))
  })
  type ApprovalsFormValues = z.input<typeof approvalsFormSchema>

  function toFormValues(items: CourseSummary[]): ApprovalsFormValues {
    return { entries: items.map(() => ({ comment: '' })) }
  }

  const form = useForm({
    defaultValues: toFormValues(data.value?.items ?? []),
    validationLogic: revalidateLogic({ mode: 'change' }),
    validators: { onDynamic: approvalsFormSchema }
  })

  /** Keep the form entries aligned with the pending courses the server returns. */
  watch(data, (result) => {
    if (result && page.value > result.totalPages) page.value = result.totalPages
    form.reset(toFormValues(result?.items ?? []))
  })

  /** Array entries are edited by index, so the deep field names stay typed. */
  function commentFieldName(index: number) {
    return `entries[${index}].comment` as `entries[${number}].comment`
  }

  const {
    mutate: decideCourse,
    isPending: isDeciding,
    variables: decisionVariables
  } = useMutation({
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

  function isCourseDecisionPending(courseId: string, decision: 'approved' | 'rejected') {
    return isDeciding.value && decisionVariables.value?.courseId === courseId && decisionVariables.value.payload.decision === decision
  }

  /**
   * `reviewCourseSchema` is registered as a form-level validator, so `validateField` cannot
   * observe it. Parse the pending payload directly and mirror any issue into the field's
   * error map, which is what `<FieldError>` renders.
   */
  function decide(index: number, decision: ReviewCourseValues['decision']) {
    const course = data.value?.items[index]
    if (!course) return

    const comment = form.state.values.entries[index]?.comment
    const result = reviewCourseSchema.safeParse({ decision, comment: comment?.trim() || null })

    if (!result.success) {
      form.setFieldMeta(commentFieldName(index), (meta) => ({
        ...meta,
        errorMap: { ...meta.errorMap, onDynamic: [result.error.issues[0]?.message ?? 'Enter a valid review comment.'] },
        errorSourceMap: { ...meta.errorSourceMap, onDynamic: 'form' }
      }))
      return
    }

    decideCourse({ courseId: course.id, payload: result.data })
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
      <Card v-for="(course, index) in data.items" :key="course.id" class="flex flex-col">
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
              <form.Field :name="commentFieldName(index)">
                <template #default="{ field }">
                  <Field :data-invalid="!field.state.meta.isValid">
                    <FieldLabel :for="`review-${course.id}`">Review comment (optional)</FieldLabel>
                    <Textarea :id="`review-${course.id}`" :model-value="field.state.value ?? ''" maxlength="2000" :aria-invalid="!field.state.meta.isValid" placeholder="Add context for the instructor…" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                    <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                  </Field>
                </template>
              </form.Field>
            </FieldGroup>
          </div>
        </CardContent>
        <CardFooter>
          <div class="flex flex-wrap gap-3">
            <Button :disabled="isDeciding" @click="decide(index, 'approved')">
              <Spinner v-if="isCourseDecisionPending(course.id, 'approved')" data-icon="inline-start" />
              <CheckIcon v-else data-icon="inline-start" />
              {{ isCourseDecisionPending(course.id, 'approved') ? 'Saving…' : 'Approve course' }}
            </Button>
            <Button variant="outline" :disabled="isDeciding" @click="decide(index, 'rejected')">
              <Spinner v-if="isCourseDecisionPending(course.id, 'rejected')" data-icon="inline-start" />
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
