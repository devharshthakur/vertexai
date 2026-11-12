<script setup lang="ts">
  import { DownloadIcon, UploadIcon } from '@lucide/vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Separator } from '@/components/ui/separator'
  import type { AssignmentSummary } from '#shared/types/assignments'

  definePageMeta({ middleware: 'auth' })
  const route = useRoute()
  const courseId = String(route.params.courseId)
  const { data: assignments, pending, error, refresh } = await useFetch<AssignmentSummary[]>(`/api/courses/${courseId}/assignments`, { default: () => [] })
  const files = reactive<Record<string, File | null>>({})
  const submittingId = shallowRef('')
  const submissionError = shallowRef('')

  const dueText = (dueAt: string) => new Date(dueAt).toLocaleString()
  const isPastDeadline = (dueAt: string) => Date.now() >= new Date(dueAt).getTime()
  const maxPoints = (assignment: AssignmentSummary) => assignment.rubric.reduce((total, item) => total + item.points, 0)

  function setFile(assignmentId: string, event: Event) {
    const target = event.currentTarget
    if (target instanceof HTMLInputElement) files[assignmentId] = target.files?.[0] ?? null
  }

  async function submitFile(assignmentId: string) {
    const file = files[assignmentId]
    if (!file) return
    submittingId.value = assignmentId
    submissionError.value = ''
    const body = new FormData()
    body.append('file', file)
    try {
      await $fetch(`/api/assignments/${assignmentId}/submit`, { method: 'POST', body })
      files[assignmentId] = null
      await refresh()
    } catch {
      submissionError.value = 'The file could not be submitted. Check the file type and deadline, then try again.'
    } finally {
      submittingId.value = ''
    }
  }
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <header class="flex flex-col gap-2">
      <Button as-child variant="ghost" class="self-start">
        <NuxtLink :to="`/learn/${courseId}`">Back to course</NuxtLink>
      </Button>
      <h1 class="text-3xl font-semibold tracking-tight">Assignments</h1>
      <p class="text-muted-foreground">Read the rubric and submit your work before each deadline.</p>
    </header>

    <Alert v-if="submissionError" variant="destructive">
      <AlertTitle>Submission failed</AlertTitle>
      <AlertDescription>{{ submissionError }}</AlertDescription>
    </Alert>
    <Alert v-if="error" variant="destructive">
      <AlertTitle>Assignments could not be loaded</AlertTitle>
      <AlertDescription>Make sure you are enrolled in this course and try again.</AlertDescription>
    </Alert>
    <p v-else-if="pending" class="text-sm text-muted-foreground" role="status">Loading assignments…</p>
    <p v-else-if="!assignments?.length" class="text-sm text-muted-foreground">There are no assignments for this course yet.</p>
    <ol v-else class="flex flex-col gap-5">
      <li v-for="assignment in assignments" :key="assignment.id">
        <Card>
          <CardHeader>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex flex-col gap-2">
                <CardTitle>{{ assignment.title }}</CardTitle>
                <CardDescription>Due {{ dueText(assignment.dueAt) }}</CardDescription>
              </div>
              <Badge v-if="assignment.submission?.gradedAt" variant="secondary">Graded</Badge>
              <Badge v-else-if="assignment.submission" variant="outline">Submitted</Badge>
              <Badge v-else-if="isPastDeadline(assignment.dueAt)" variant="destructive">Deadline passed</Badge>
              <Badge v-else variant="outline">Not submitted</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-5">
              <p class="text-sm whitespace-pre-wrap">{{ assignment.instructions }}</p>
              <section class="flex flex-col gap-2" aria-label="Grading rubric">
                <h2 class="text-sm font-semibold">Rubric</h2>
                <ul class="flex flex-col gap-2 text-sm text-muted-foreground">
                  <li v-for="(criterion, index) in assignment.rubric" :key="index" class="flex justify-between gap-4">
                    <span>{{ criterion.description }}</span>
                    <span class="shrink-0">{{ criterion.points }} pts</span>
                  </li>
                </ul>
                <p class="text-sm font-medium">Total: {{ maxPoints(assignment) }} points</p>
              </section>
              <Separator />
              <div v-if="assignment.submission" class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="font-medium">{{ assignment.submission.originalFilename }}</p>
                    <p class="text-sm text-muted-foreground">Submitted {{ dueText(assignment.submission.submittedAt) }}</p>
                  </div>
                  <Button as-child variant="outline" size="sm">
                    <a :href="`/api/submissions/${assignment.submission.id}/file`" :download="assignment.submission.originalFilename">
                      <DownloadIcon data-icon="inline-start" />
                      Download
                    </a>
                  </Button>
                </div>
                <Alert v-if="assignment.submission.gradedAt">
                  <AlertTitle>Grade: {{ assignment.submission.grade }} / {{ maxPoints(assignment) }}</AlertTitle>
                  <AlertDescription>{{ assignment.submission.feedback || 'No written feedback was provided.' }}</AlertDescription>
                </Alert>
                <p v-else-if="isPastDeadline(assignment.dueAt)" class="text-sm text-muted-foreground">Your submission is recorded. The deadline has passed, so it can no longer be replaced.</p>
              </div>
              <FieldGroup v-if="!assignment.submission?.gradedAt && !isPastDeadline(assignment.dueAt)">
                <Field>
                  <FieldLabel :for="`file-${assignment.id}`">{{ assignment.submission ? 'Replace submission' : 'Upload your work' }}</FieldLabel>
                  <Input :id="`file-${assignment.id}`" type="file" accept=".pdf,.zip,.c,.cc,.cpp,.cs,.go,.h,.hpp,.html,.java,.js,.jsx,.kt,.md,.php,.py,.rb,.rs,.sh,.sql,.ts,.tsx,.txt,.vue,.xml,.yaml,.yml" :disabled="submittingId === assignment.id" @change="setFile(assignment.id, $event)" />
                  <FieldDescription>PDF, ZIP, or source-code file · maximum 100 MiB. Resubmitting replaces your ungraded file.</FieldDescription>
                </Field>
                <Button class="self-start" :disabled="!files[assignment.id] || submittingId === assignment.id" @click="submitFile(assignment.id)">
                  <UploadIcon data-icon="inline-start" />
                  {{
                    submittingId === assignment.id ? 'Uploading…'
                    : assignment.submission ? 'Replace submission'
                    : 'Submit assignment'
                  }}
                </Button>
              </FieldGroup>
            </div>
          </CardContent>
        </Card>
      </li>
    </ol>
  </div>
</template>
