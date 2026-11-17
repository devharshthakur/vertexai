<script setup lang="ts">
  import { DownloadIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { z } from 'zod'
  import { toast } from 'vue-sonner'
  import { useInstructorDraft } from '@/composables/useInstructorDrafts'
  import { formatAssignmentDateTime } from '@/lib/date-time'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Spinner } from '@/components/ui/spinner'
  import { Textarea } from '@/components/ui/textarea'
  import type { AssignmentInstructorSubmission, AssignmentSummary } from '#shared/types/assignments'
  import { gradeAssignmentSubmissionSchema, type GradeAssignmentSubmissionValues } from '#shared/validation/assignments'

  const props = defineProps<{
    assignment: AssignmentSummary
    submission: AssignmentInstructorSubmission
  }>()
  const emit = defineEmits<{
    saved: [submission: AssignmentInstructorSubmission]
  }>()

  const maxPoints = computed(() => props.assignment.rubric.reduce((total, item) => total + item.points, 0))
  const gradeEntrySchema = gradeAssignmentSubmissionSchema.safeExtend({
    grade: gradeAssignmentSubmissionSchema.shape.grade.max(maxPoints.value, `Enter a score between 0 and ${maxPoints.value}.`)
  })
  const form = useForm({
    defaultValues: {
      grade: props.submission.grade ?? null,
      feedback: props.submission.feedback ?? ''
    },
    validationLogic: revalidateLogic({ mode: 'change' }),
    validators: {
      onDynamic: z.object({
        grade: gradeEntrySchema.shape.grade.nullable(),
        feedback: z.string().trim().max(10_000, 'Keep feedback under 10,000 characters.')
      })
    }
  })
  useInstructorDraft(() => !form.state.isDefaultValue)
  const grade = form.useSelector((state) => state.values.grade)

  // A server update resets only this submission's draft, never its sibling rows.
  watch(
    () => props.submission,
    (submission) => form.reset({ grade: submission.grade ?? null, feedback: submission.feedback ?? '' })
  )

  function toGrade(value: string | number) {
    if (value === '') return null
    const grade = Number(value)
    return Number.isFinite(grade) ? grade : null
  }

  const { mutate: saveGradeRequest, isPending: isSaving } = useMutation({
    mutationFn: (payload: GradeAssignmentSubmissionValues) =>
      $fetch<AssignmentInstructorSubmission>(`/api/submissions/${props.submission.id}/grade`, {
        method: 'PUT',
        body: payload
      }),
    onSuccess: (updated) => {
      emit('saved', updated)
      toast.success('Grade saved.')
    },
    onError: () => {
      toast.error('We could not save this grade. Check the score against the rubric and try again.')
    }
  })

  function saveGrade() {
    const { grade, feedback } = form.state.values
    if (grade === null) {
      toast.error(`Enter a score between 0 and ${maxPoints.value}.`)
      return
    }

    const parsed = gradeEntrySchema.safeParse({ grade, feedback })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Enter a valid score.')
      return
    }

    saveGradeRequest(parsed.data)
  }
</script>

<template>
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
            <form.Field name="grade">
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
                    :disabled="isSaving"
                    :aria-invalid="!field.state.meta.isValid"
                    @update:model-value="(value) => field.handleChange(toGrade(value))"
                    @blur="field.handleBlur"
                  />
                  <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                </Field>
              </template>
            </form.Field>
            <form.Field name="feedback">
              <template #default="{ field }">
                <Field :data-invalid="!field.state.meta.isValid">
                  <FieldLabel :for="`feedback-${submission.id}`">Feedback</FieldLabel>
                  <Textarea
                    :id="`feedback-${submission.id}`"
                    :model-value="field.state.value ?? ''"
                    maxlength="10000"
                    :disabled="isSaving"
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
          <Button :disabled="isSaving || grade === null" @click="saveGrade">
            <Spinner v-if="isSaving" data-icon="inline-start" />
            {{
              isSaving ? 'Saving…'
              : submission.gradedAt ? 'Update grade'
              : 'Save grade'
            }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
