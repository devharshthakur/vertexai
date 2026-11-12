<script setup lang="ts">
  import { DownloadIcon } from '@lucide/vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Textarea } from '@/components/ui/textarea'
  import type { AssignmentInstructorSubmission, AssignmentSummary } from '#shared/types/assignments'

  const props = defineProps<{ assignment: AssignmentSummary }>()
  const submissions = shallowRef<AssignmentInstructorSubmission[]>([])
  const loading = shallowRef(true)
  const savingId = shallowRef('')
  const errorMessage = shallowRef('')
  const grades = reactive<Record<string, string>>({})
  const feedback = reactive<Record<string, string>>({})
  const maxPoints = computed(() => props.assignment.rubric.reduce((total, item) => total + item.points, 0))

  async function loadSubmissions() {
    loading.value = true
    errorMessage.value = ''
    try {
      submissions.value = await $fetch<AssignmentInstructorSubmission[]>(`/api/assignments/${props.assignment.id}/submissions`)
      for (const submission of submissions.value) {
        grades[submission.id] = String(submission.grade ?? '')
        feedback[submission.id] = submission.feedback ?? ''
      }
    } catch {
      errorMessage.value = 'We could not load assignment submissions.'
    } finally {
      loading.value = false
    }
  }

  async function saveGrade(submission: AssignmentInstructorSubmission) {
    const grade = Number(grades[submission.id])
    if (!Number.isFinite(grade)) return
    savingId.value = submission.id
    errorMessage.value = ''
    try {
      const updated = await $fetch<AssignmentInstructorSubmission>(`/api/submissions/${submission.id}/grade`, {
        method: 'PUT',
        body: { grade, feedback: feedback[submission.id] ?? '' }
      })
      submissions.value = submissions.value.map((item) => (item.id === submission.id ? { ...item, ...updated } : item))
    } catch {
      errorMessage.value = 'We could not save this grade. Check the score against the rubric and try again.'
    } finally {
      savingId.value = ''
    }
  }

  await loadSubmissions()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Submissions</CardTitle>
      <CardDescription>Review the uploaded work and enter a score out of {{ maxPoints }} rubric points.</CardDescription>
    </CardHeader>
    <CardContent>
      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertTitle>Submissions unavailable</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>
      <p v-if="loading" class="text-sm text-muted-foreground" role="status">Loading submissions…</p>
      <p v-else-if="!submissions.length" class="text-sm text-muted-foreground">No students have submitted yet.</p>
      <ol v-else class="flex flex-col gap-4">
        <li v-for="submission in submissions" :key="submission.id">
          <Card>
            <CardHeader>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{{ submission.student.name }}</CardTitle>
                  <CardDescription>{{ submission.student.email }} · Submitted {{ new Date(submission.submittedAt).toLocaleString() }}</CardDescription>
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
                    <Field>
                      <FieldLabel :for="`grade-${submission.id}`">Score</FieldLabel>
                      <Input :id="`grade-${submission.id}`" v-model="grades[submission.id]" type="number" min="0" :max="maxPoints" step="0.01" :disabled="savingId === submission.id" />
                    </Field>
                    <Field>
                      <FieldLabel :for="`feedback-${submission.id}`">Feedback</FieldLabel>
                      <Textarea :id="`feedback-${submission.id}`" v-model="feedback[submission.id]" maxlength="10000" :disabled="savingId === submission.id" placeholder="Share feedback with the student" />
                    </Field>
                  </div>
                </FieldGroup>
                <div class="flex justify-end">
                  <Button :disabled="savingId === submission.id || grades[submission.id] === ''" @click="saveGrade(submission)">
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
