<script setup lang="ts">
  import { DownloadIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { z } from 'zod'
  import { toast } from 'vue-sonner'
  import { useInstructorDraft } from '@/composables/useInstructorDrafts'
  import { formatAssignmentDateTime } from '@/lib/date-time'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Spinner } from '@/components/ui/spinner'
  import { Textarea } from '@/components/ui/textarea'
  import type { AssignmentInstructorSubmission, AssignmentSummary } from '#shared/types/assignments'
  import { gradeAssignmentSubmissionSchema, type GradeAssignmentSubmissionValues } from '#shared/validation/assignments'

  const props = defineProps<{ assignment: AssignmentSummary }>()
  const { data: submissions, pending: loading, error: loadError } = await useFetch<AssignmentInstructorSubmission[]>(() => `/api/assignments/${props.assignment.id}/submissions`, { default: () => [] })
  const maxPoints = computed(() => props.assignment.rubric.reduce((total, item) => total + item.points, 0))

  /** The shared grade schema bounds the score by the rubric total; no grade yet is allowed while editing. */
  const gradeEntrySchema = gradeAssignmentSubmissionSchema.safeExtend({
    grade: gradeAssignmentSubmissionSchema.shape.grade.max(maxPoints.value, `Enter a score between 0 and ${maxPoints.value}.`)
  })
  const submissionsFormSchema = z.object({
    entries: z.array(
      z.object({
        grade: gradeEntrySchema.shape.grade.nullable(),
        feedback: gradeEntrySchema.shape.feedback
      })
    )
  })
  type SubmissionsFormValues = z.input<typeof submissionsFormSchema>

  function toFormValues(items: AssignmentInstructorSubmission[]): SubmissionsFormValues {
    return {
      entries: items.map((submission) => ({
        grade: submission.grade ?? null,
        feedback: submission.feedback ?? ''
      }))
    }
  }

  const form = useForm({
    defaultValues: toFormValues(submissions.value),
    validationLogic: revalidateLogic({ mode: 'change' }),
    validators: { onDynamic: submissionsFormSchema }
  })
  useInstructorDraft(() => !form.state.isDefaultValue)

  /** Keep the form defaults in step with the submissions the server returns after a save. */
  watch(submissions, (items) => form.reset(toFormValues(items)), { immediate: true })

  /** Array entries are edited by index, so the deep field names stay typed. */
  function entryFieldName(index: number, key: 'grade' | 'feedback') {
    return `entries[${index}].${key}` as `entries[${number}].${'grade' | 'feedback'}`
  }

  /** Subscribe to the score values so the save buttons follow cleared grades. */
  const entryGrades = form.useSelector((state) => state.values.entries.map((entry) => entry.grade))

  function toGrade(value: string | number) {
    if (value === '') return null
    const grade = Number(value)
    return Number.isFinite(grade) ? grade : null
  }

  const {
    mutate: saveGradeRequest,
    isPending: isSaving,
    variables: saveVariables
  } = useMutation({
    mutationFn: ({ submissionId, payload }: { submissionId: string; payload: GradeAssignmentSubmissionValues }) =>
      $fetch<AssignmentInstructorSubmission>(`/api/submissions/${submissionId}/grade`, {
        method: 'PUT',
        body: payload
      }),
    onSuccess: (updated) => {
      submissions.value = submissions.value.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      toast.success('Grade saved.')
    },
    onError: () => {
      toast.error('We could not save this grade. Check the score against the rubric and try again.')
    }
  })

  function isSavingSubmission(submissionId: string) {
    return isSaving.value && saveVariables.value?.submissionId === submissionId
  }

  function saveGrade(index: number) {
    const submission = submissions.value[index]
    const entry = form.state.values.entries[index]
    if (!submission || !entry) return

    if (entry.grade === null) {
      toast.error(`Enter a score between 0 and ${maxPoints.value}.`)
      return
    }

    const parsed = gradeEntrySchema.safeParse({ grade: entry.grade, feedback: entry.feedback })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Enter a valid score.')
      return
    }

    saveGradeRequest({ submissionId: submission.id, payload: parsed.data })
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Submissions</CardTitle>
      <CardDescription>Review the uploaded work and enter a score out of {{ maxPoints }} rubric points.</CardDescription>
    </CardHeader>
    <CardContent>
      <Alert v-if="loadError" variant="destructive" class="mb-4">
        <AlertTitle>Submissions could not be loaded</AlertTitle>
        <AlertDescription>We could not load assignment submissions. Please refresh the page and try again.</AlertDescription>
      </Alert>
      <p v-if="loading" class="text-sm text-muted-foreground" role="status">Loading submissions…</p>
      <Empty v-else-if="!submissions.length">
        <EmptyHeader>
          <EmptyTitle>No submissions yet</EmptyTitle>
          <EmptyDescription>Student submissions will appear here once they upload their work.</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <ol v-else class="flex flex-col gap-4">
        <li v-for="(submission, index) in submissions" :key="submission.id">
          <Card>
            <CardHeader>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{{ submission.student.name }}</CardTitle>
                  <CardDescription>{{ submission.student.email }} · Submitted {{ formatAssignmentDateTime(submission.submittedAt) }}</CardDescription>
                </div>
                <Badge v-if="submission.gradedAt" variant="secondary">Graded</Badge>
                <Badge v-else variant="outline">Awaiting grade</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <Button as-child variant="outline" size="sm" class="self-start">
                  <a :href="`/api/submissions/${submission.id}/file`" :download="submission.originalFilename">
                    <DownloadIcon data-icon="inline-start" />
                    {{ submission.originalFilename }}
                  </a>
                </Button>
                <FieldGroup>
                  <div class="grid gap-4 sm:grid-cols-[12rem_1fr]">
                    <form.Field :name="entryFieldName(index, 'grade')">
                      <template #default="{ field }">
                        <Field :data-invalid="!field.state.meta.isValid">
                          <FieldLabel :for="`grade-${submission.id}`">Score</FieldLabel>
                          <Input
                            :id="`grade-${submission.id}`"
                            :model-value="field.state.value ?? ''"
                            type="number"
                            min="0"
                            :max="maxPoints"
                            step="0.01"
                            :disabled="isSavingSubmission(submission.id)"
                            :aria-invalid="!field.state.meta.isValid"
                            @update:model-value="(value) => field.handleChange(toGrade(value))"
                            @blur="field.handleBlur"
                          />
                          <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                        </Field>
                      </template>
                    </form.Field>
                    <form.Field :name="entryFieldName(index, 'feedback')">
                      <template #default="{ field }">
                        <Field :data-invalid="!field.state.meta.isValid">
                          <FieldLabel :for="`feedback-${submission.id}`">Feedback</FieldLabel>
                          <Textarea
                            :id="`feedback-${submission.id}`"
                            :model-value="field.state.value ?? ''"
                            maxlength="10000"
                            :disabled="isSavingSubmission(submission.id)"
                            :aria-invalid="!field.state.meta.isValid"
                            placeholder="Share feedback with the student"
                            @update:model-value="(value) => field.handleChange(String(value))"
                            @blur="field.handleBlur"
                          />
                          <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                        </Field>
                      </template>
                    </form.Field>
                  </div>
                </FieldGroup>
                <div class="flex justify-end">
                  <Button :disabled="isSavingSubmission(submission.id) || entryGrades[index] === null" @click="saveGrade(index)">
                    <Spinner v-if="isSavingSubmission(submission.id)" data-icon="inline-start" />
                    {{
                      isSavingSubmission(submission.id) ? 'Saving…'
                      : submission.gradedAt ? 'Update grade'
                      : 'Save grade'
                    }}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      </ol>
    </CardContent>
  </Card>
</template>
