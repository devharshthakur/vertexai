<script setup lang="ts">
  import { PlusIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { z } from 'zod'
  import { toast } from 'vue-sonner'
  import AssignmentSubmissionsPanel from '@/components/instructor/AssignmentSubmissionsPanel.vue'
  import { useInstructorDraft } from '@/composables/useInstructorDrafts'
  import { formatAssignmentDateTime } from '@/lib/date-time'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Separator } from '@/components/ui/separator'
  import { Spinner } from '@/components/ui/spinner'
  import { Textarea } from '@/components/ui/textarea'
  import type { AssignmentSummary } from '#shared/types/assignments'
  import { createAssignmentSchema } from '#shared/validation/assignments'

  const props = defineProps<{ courseId: string }>()

  /** The form edits the browser's datetime-local value; the API receives ISO. */
  const assignmentFormSchema = createAssignmentSchema.safeExtend({
    dueAt: z
      .string()
      .min(1, 'Choose a deadline.')
      .refine((value) => new Date(value).getTime() > Date.now(), 'Choose a deadline in the future.')
  })

  const { data: assignments, pending: loading, error: loadError } = await useFetch<AssignmentSummary[]>(() => `/api/courses/${props.courseId}/assignments`, { default: () => [] })
  const selectedAssignmentId = shallowRef('')

  const form = useForm({
    defaultValues: {
      title: '',
      instructions: '',
      dueAt: '',
      rubric: [{ description: '', points: 100 }]
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: assignmentFormSchema },
    onSubmit: async ({ value }) => {
      try {
        await createAssignment({
          title: value.title,
          instructions: value.instructions,
          rubric: value.rubric,
          dueAt: new Date(value.dueAt).toISOString()
        })
        form.reset()
      } catch {
        // The mutation reports the failure.
      }
    }
  })
  useInstructorDraft(() => !form.state.isDefaultValue)

  /** Subscribe to the rubric so edits and add/remove updates the running total. */
  const rubricTotal = form.useSelector((state) => state.values.rubric.reduce((total, criterion) => total + (Number(criterion.points) || 0), 0))

  /** Deep field names keep array typing for the rubric row errors. */
  function criterionFieldName(index: number, key: 'description' | 'points') {
    return `rubric[${index}].${key}` as `rubric[${number}].${'description' | 'points'}`
  }

  const { mutateAsync: createAssignment, isPending: isCreating } = useMutation({
    mutationFn: (payload: { title: string; instructions: string; rubric: { description: string; points: number }[]; dueAt: string }) =>
      $fetch<AssignmentSummary>(`/api/courses/${props.courseId}/assignments`, {
        method: 'POST',
        body: payload
      }),
    onSuccess: (assignment) => {
      assignments.value = [...assignments.value, assignment].sort((left, right) => left.dueAt.localeCompare(right.dueAt))
      toast.success('Assignment created.')
    },
    onError: () => {
      toast.error('We could not create this assignment. Check that its deadline is in the future.')
    }
  })

  function addCriterion() {
    if (form.state.values.rubric.length < 20) form.pushFieldValue('rubric', { description: '', points: 0 })
  }

  function removeCriterion(index: number) {
    if (form.state.values.rubric.length > 1) void form.removeFieldValue('rubric', index)
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Assignments</CardTitle>
      <CardDescription>Create a deadline, instructions, and a rubric; review and grade student submissions here.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col gap-6">
        <Alert v-if="loadError" variant="destructive">
          <AlertTitle>Assignments could not be loaded</AlertTitle>
          <AlertDescription>We could not load assignments for this course. Please refresh the page and try again.</AlertDescription>
        </Alert>

        <form class="flex flex-col gap-4" novalidate @submit.prevent="form.handleSubmit()">
          <FieldGroup>
            <form.Field name="title">
              <template #default="{ field }">
                <Field :data-invalid="!field.state.meta.isValid">
                  <FieldLabel for="assignment-title">Assignment title</FieldLabel>
                  <Input id="assignment-title" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" maxlength="200" required placeholder="Build a small application" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                  <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                </Field>
              </template>
            </form.Field>

            <form.Field name="instructions">
              <template #default="{ field }">
                <Field :data-invalid="!field.state.meta.isValid">
                  <FieldLabel for="assignment-instructions">Instructions</FieldLabel>
                  <Textarea
                    id="assignment-instructions"
                    :model-value="field.state.value"
                    :aria-invalid="!field.state.meta.isValid"
                    maxlength="20000"
                    required
                    placeholder="Describe the task and what students should submit."
                    @update:model-value="(value) => field.handleChange(String(value))"
                    @blur="field.handleBlur"
                  />
                  <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                </Field>
              </template>
            </form.Field>

            <form.Field name="dueAt">
              <template #default="{ field }">
                <Field :data-invalid="!field.state.meta.isValid">
                  <FieldLabel for="assignment-due">Deadline</FieldLabel>
                  <Input id="assignment-due" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" type="datetime-local" required @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                  <FieldDescription>The deadline is enforced by the server. Late submissions are not accepted.</FieldDescription>
                  <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                </Field>
              </template>
            </form.Field>

            <form.Field name="rubric">
              <template #default="{ field }">
                <FieldSet>
                  <FieldLegend>Rubric criteria</FieldLegend>
                  <FieldGroup>
                    <div v-for="(criterion, index) in field.state.value" :key="index" class="grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
                      <form.Field :name="criterionFieldName(index, 'description')">
                        <template #default="{ field: criterionField }">
                          <Field :data-invalid="!criterionField.state.meta.isValid">
                            <FieldLabel :for="`criterion-${index}`">Criterion {{ index + 1 }}</FieldLabel>
                            <Input
                              :id="`criterion-${index}`"
                              :model-value="criterionField.state.value"
                              :aria-invalid="!criterionField.state.meta.isValid"
                              maxlength="300"
                              required
                              placeholder="Correctness and completeness"
                              @update:model-value="(value) => criterionField.handleChange(String(value))"
                              @blur="criterionField.handleBlur"
                            />
                            <FieldError v-if="!criterionField.state.meta.isValid" :errors="criterionField.state.meta.errors" />
                          </Field>
                        </template>
                      </form.Field>
                      <form.Field :name="criterionFieldName(index, 'points')">
                        <template #default="{ field: criterionField }">
                          <Field :data-invalid="!criterionField.state.meta.isValid">
                            <FieldLabel :for="`points-${index}`">Points</FieldLabel>
                            <Input
                              :id="`points-${index}`"
                              :model-value="criterionField.state.value"
                              :aria-invalid="!criterionField.state.meta.isValid"
                              type="number"
                              min="0.01"
                              max="100"
                              step="0.01"
                              required
                              @update:model-value="(value) => criterionField.handleChange(Number(value) || 0)"
                              @blur="criterionField.handleBlur"
                            />
                            <FieldError v-if="!criterionField.state.meta.isValid" :errors="criterionField.state.meta.errors" />
                          </Field>
                        </template>
                      </form.Field>
                      <Button v-if="field.state.value.length > 1" type="button" variant="outline" class="self-end" @click="removeCriterion(index)">Remove</Button>
                    </div>
                  </FieldGroup>
                  <p class="text-sm text-muted-foreground">Total: {{ rubricTotal }} / 100 points</p>
                  <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                  <Button type="button" variant="outline" class="self-start" :disabled="field.state.value.length >= 20" @click="addCriterion">Add criterion</Button>
                </FieldSet>
              </template>
            </form.Field>
          </FieldGroup>
          <div class="flex justify-end">
            <Button type="submit" :disabled="isCreating">
              <Spinner v-if="isCreating" data-icon="inline-start" />
              <PlusIcon v-else data-icon="inline-start" />
              {{ isCreating ? 'Creating…' : 'Create assignment' }}
            </Button>
          </div>
        </form>

        <Separator />
        <p v-if="loading" class="text-sm text-muted-foreground" role="status">Loading assignments…</p>
        <Empty v-else-if="!assignments.length">
          <EmptyHeader>
            <EmptyTitle>No assignments yet</EmptyTitle>
            <EmptyDescription>Create the first assignment above to start collecting submissions.</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <ol v-else class="flex flex-col gap-3">
          <li v-for="assignment in assignments" :key="assignment.id">
            <Card>
              <CardHeader>
                <CardTitle>{{ assignment.title }}</CardTitle>
                <CardDescription>Due {{ formatAssignmentDateTime(assignment.dueAt) }} · {{ assignment.rubric.reduce((total, item) => total + item.points, 0) }} points</CardDescription>
              </CardHeader>
              <CardContent>
                <div class="flex flex-col gap-3">
                  <p class="text-sm whitespace-pre-wrap text-muted-foreground">{{ assignment.instructions }}</p>
                  <Button variant="outline" size="sm" class="self-start" @click="selectedAssignmentId = selectedAssignmentId === assignment.id ? '' : assignment.id">
                    {{ selectedAssignmentId === assignment.id ? 'Hide submissions' : 'Review submissions' }}
                  </Button>
                  <AssignmentSubmissionsPanel v-if="selectedAssignmentId === assignment.id" :assignment="assignment" />
                </div>
              </CardContent>
            </Card>
          </li>
        </ol>
      </div>
    </CardContent>
  </Card>
</template>
