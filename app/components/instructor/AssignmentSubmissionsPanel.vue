<script setup lang="ts">
  import { DownloadIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
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
  const savingId = shallowRef('')
  const grades = reactive<Record<string, string>>({})
  const feedback = reactive<Record<string, string>>({})
  const maxPoints = computed(() => props.assignment.rubric.reduce((total, item) => total + item.points, 0))

  watch(
    submissions,
    (items) => {
      for (const submission of items) {
        if (grades[submission.id] === undefined) grades[submission.id] = String(submission.grade ?? '')
        if (feedback[submission.id] === undefined) feedback[submission.id] = submission.feedback ?? ''
      }
    },
    { immediate: true }
  )

  useInstructorDraft(() => submissions.value.some((submission) => grades[submission.id] !== String(submission.grade ?? '') || feedback[submission.id] !== (submission.feedback ?? '')))

  const gradeErrors = computed(() => {
    const errors: Record<string, string> = {}

    for (const submission of submissions.value) {
      const raw = grades[submission.id]
      if (raw === undefined || raw === '') continue

      const grade = Number(raw)
      if (!Number.isFinite(grade) || grade < 0 || grade > maxPoints.value) {
        errors[submission.id] = `Enter a score between 0 and ${maxPoints.value}.`
        continue
      }

      const parsed = gradeAssignmentSubmissionSchema.safeParse({ grade, feedback: feedback[submission.id] ?? '' })
      if (!parsed.success) errors[submission.id] = parsed.error.issues[0]?.message ?? 'Enter a valid score.'
    }

    return errors
  })

  const { mutateAsync: saveGradeRequest } = useMutation({
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

  async function saveGrade(submission: AssignmentInstructorSubmission) {
    const error = gradeErrors.value[submission.id]
    if (error) {
      toast.error(error)
      return
    }

    savingId.value = submission.id
    try {
      await saveGradeRequest({
        submissionId: submission.id,
        payload: {
          grade: Number(grades[submission.id]),
          feedback: feedback[submission.id] ?? ''
        }
      })
    } catch {
      // The mutation reports the failure.
    } finally {
      savingId.value = ''
    }
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
        <li v-for="submission in submissions" :key="submission.id">
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
                    <Field :data-invalid="Boolean(gradeErrors[submission.id])">
                      <FieldLabel :for="`grade-${submission.id}`">Score</FieldLabel>
                      <Input :id="`grade-${submission.id}`" v-model="grades[submission.id]" type="number" min="0" :max="maxPoints" step="0.01" :disabled="savingId === submission.id" :aria-invalid="Boolean(gradeErrors[submission.id])" />
                      <FieldError v-if="gradeErrors[submission.id]">{{ gradeErrors[submission.id] }}</FieldError>
                    </Field>
                    <Field>
                      <FieldLabel :for="`feedback-${submission.id}`">Feedback</FieldLabel>
                      <Textarea :id="`feedback-${submission.id}`" v-model="feedback[submission.id]" maxlength="10000" :disabled="savingId === submission.id" placeholder="Share feedback with the student" />
                    </Field>
                  </div>
                </FieldGroup>
                <div class="flex justify-end">
                  <Button :disabled="savingId === submission.id || !grades[submission.id]" @click="saveGrade(submission)">
                    <Spinner v-if="savingId === submission.id" data-icon="inline-start" />
                    {{
                      savingId === submission.id ? 'Saving…'
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
