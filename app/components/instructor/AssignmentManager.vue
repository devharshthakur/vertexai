<script setup lang="ts">
  import { PlusIcon } from '@lucide/vue'
  import AssignmentSubmissionsPanel from '@/components/instructor/AssignmentSubmissionsPanel.vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Separator } from '@/components/ui/separator'
  import { Textarea } from '@/components/ui/textarea'
  import type { AssignmentSummary } from '#shared/types/assignments'
  import type { AssignmentRubricCriterion } from '#shared/validation/assignments'
  import { createAssignmentSchema } from '#shared/validation/assignments'

  const props = defineProps<{ courseId: string }>()
  const assignments = shallowRef<AssignmentSummary[]>([])
  const title = shallowRef('')
  const instructions = shallowRef('')
  const dueAt = shallowRef('')
  const rubric = ref<AssignmentRubricCriterion[]>([{ description: '', points: 100 }])
  const selectedAssignmentId = shallowRef('')
  const loading = shallowRef(true)
  const saving = shallowRef(false)
  const errorMessage = shallowRef('')
  const rubricTotal = computed(() => rubric.value.reduce((total, criterion) => total + (Number(criterion.points) || 0), 0))

  async function loadAssignments() {
    loading.value = true
    try {
      assignments.value = await $fetch<AssignmentSummary[]>(`/api/courses/${props.courseId}/assignments`)
    } catch {
      errorMessage.value = 'We could not load assignments for this course.'
    } finally {
      loading.value = false
    }
  }

  function addCriterion() {
    if (rubric.value.length < 20) rubric.value = [...rubric.value, { description: '', points: 0 }]
  }

  function removeCriterion(index: number) {
    if (rubric.value.length > 1) rubric.value = rubric.value.filter((_item, itemIndex) => itemIndex !== index)
  }

  async function createAssignment() {
    errorMessage.value = ''
    const parsed = createAssignmentSchema.safeParse({
      title: title.value,
      instructions: instructions.value,
      rubric: rubric.value,
      dueAt: dueAt.value ? new Date(dueAt.value).toISOString() : ''
    })
    if (!parsed.success) {
      errorMessage.value = parsed.error.issues[0]?.message ?? 'Check the assignment details and try again.'
      return
    }

    saving.value = true
    try {
      const assignment = await $fetch<AssignmentSummary>(`/api/courses/${props.courseId}/assignments`, { method: 'POST', body: parsed.data })
      assignments.value = [...assignments.value, assignment].sort((left, right) => left.dueAt.localeCompare(right.dueAt))
      title.value = ''
      instructions.value = ''
      dueAt.value = ''
      rubric.value = [{ description: '', points: 100 }]
    } catch {
      errorMessage.value = 'We could not create this assignment. Check that its deadline is in the future.'
    } finally {
      saving.value = false
    }
  }

  await loadAssignments()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Assignments</CardTitle>
      <CardDescription>Create a deadline, instructions, and a rubric; review and grade student submissions here.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col gap-6">
        <Alert v-if="errorMessage" variant="destructive">
          <AlertTitle>Assignment update failed</AlertTitle>
          <AlertDescription>{{ errorMessage }}</AlertDescription>
        </Alert>

        <form class="flex flex-col gap-4" @submit.prevent="createAssignment">
          <FieldGroup>
            <Field>
              <FieldLabel for="assignment-title">Assignment title</FieldLabel>
              <Input id="assignment-title" v-model="title" maxlength="200" required placeholder="Build a small application" />
            </Field>
            <Field>
              <FieldLabel for="assignment-instructions">Instructions</FieldLabel>
              <Textarea id="assignment-instructions" v-model="instructions" maxlength="20000" required placeholder="Describe the task and what students should submit." />
            </Field>
            <Field>
              <FieldLabel for="assignment-due">Deadline</FieldLabel>
              <Input id="assignment-due" v-model="dueAt" type="datetime-local" required />
              <FieldDescription>The deadline is enforced by the server. Late submissions are not accepted.</FieldDescription>
            </Field>
            <FieldSet>
              <FieldLegend>Rubric criteria</FieldLegend>
              <div class="flex flex-col gap-3">
                <div v-for="(criterion, index) in rubric" :key="index" class="grid gap-3 sm:grid-cols-[1fr_9rem_auto]">
                  <Field>
                    <FieldLabel :for="`criterion-${index}`">Criterion {{ index + 1 }}</FieldLabel>
                    <Input :id="`criterion-${index}`" v-model="criterion.description" maxlength="300" required placeholder="Correctness and completeness" />
                  </Field>
                  <Field>
                    <FieldLabel :for="`points-${index}`">Points</FieldLabel>
                    <Input :id="`points-${index}`" v-model.number="criterion.points" type="number" min="0.01" max="100" step="0.01" required />
                  </Field>
                  <Button v-if="rubric.length > 1" type="button" variant="outline" class="self-end" @click="removeCriterion(index)">Remove</Button>
                </div>
                <p class="text-sm text-muted-foreground">Total: {{ rubricTotal }} / 100 points</p>
                <Button type="button" variant="outline" class="self-start" :disabled="rubric.length >= 20" @click="addCriterion">Add criterion</Button>
              </div>
            </FieldSet>
          </FieldGroup>
          <div class="flex justify-end">
            <Button type="submit" :disabled="saving">
              <PlusIcon data-icon="inline-start" />
              {{ saving ? 'Creating…' : 'Create assignment' }}
            </Button>
          </div>
        </form>

        <Separator />
        <div v-if="loading" class="text-sm text-muted-foreground" role="status">Loading assignments…</div>
        <p v-else-if="!assignments.length" class="text-sm text-muted-foreground">No assignments have been created.</p>
        <ol v-else class="flex flex-col gap-3">
          <li v-for="assignment in assignments" :key="assignment.id">
            <Card>
              <CardHeader>
                <CardTitle>{{ assignment.title }}</CardTitle>
                <CardDescription>Due {{ new Date(assignment.dueAt).toLocaleString() }} · {{ assignment.rubric.reduce((total, item) => total + item.points, 0) }} points</CardDescription>
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
