<script setup lang="ts">
  import { DownloadIcon, UploadIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { toast } from 'vue-sonner'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Separator } from '@/components/ui/separator'
  import { Spinner } from '@/components/ui/spinner'
  import { formatAssignmentDateTime } from '@/lib/date-time'
  import type { AssignmentSummary } from '#shared/types/assignments'

  definePageMeta({ middleware: 'auth' })
  const route = useRoute()
  const courseId = computed(() => String(route.params.courseId))
  const { data: assignments, pending, error, refresh } = await useFetch<AssignmentSummary[]>(() => `/api/courses/${courseId.value}/assignments`, { default: () => [] })
  const files = reactive<Record<string, File | null>>({})

  /** Precompute deadline state and rubric totals once per list update. */
  const assignmentViews = computed(() =>
    assignments.value.map((assignment) => ({
      assignment,
      dueText: formatAssignmentDateTime(assignment.dueAt),
      submittedText: assignment.submission ? formatAssignmentDateTime(assignment.submission.submittedAt) : '',
      maxPoints: assignment.rubric.reduce((total, item) => total + item.points, 0),
      pastDeadline: Date.now() >= new Date(assignment.dueAt).getTime()
    }))
  )

  const {
    mutate: submitFileRequest,
    isPending: isSubmitting,
    variables: submitVariables
  } = useMutation({
    mutationFn: ({ assignmentId, file }: { assignmentId: string; file: File }) => {
      const body = new FormData()
      body.append('file', file)
      return $fetch(`/api/assignments/${assignmentId}/submit`, { method: 'POST', body })
    },
    onSuccess: async (_response, { assignmentId }) => {
      files[assignmentId] = null
      await refresh()
      toast.success('Assignment submitted.')
    },
    onError: () => {
      toast.error('The file could not be submitted. Check the file type and deadline, then try again.')
    }
  })

  function setFile(assignmentId: string, event: Event) {
    const target = event.currentTarget
    if (target instanceof HTMLInputElement) files[assignmentId] = target.files?.[0] ?? null
  }

  function isSubmittingAssignment(assignmentId: string) {
    return isSubmitting.value && submitVariables.value?.assignmentId === assignmentId
  }

  function submitFile(assignmentId: string) {
    const file = files[assignmentId]
    if (!file) return

    submitFileRequest({ assignmentId, file })
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

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Assignments could not be loaded</AlertTitle>
      <AlertDescription>Make sure you are enrolled in this course and try again.</AlertDescription>
    </Alert>
    <p v-else-if="pending" class="text-sm text-muted-foreground" role="status">Loading assignments…</p>
    <Empty v-else-if="!assignmentViews.length">
      <EmptyHeader>
        <EmptyTitle>No assignments yet</EmptyTitle>
        <EmptyDescription>There are no assignments for this course yet.</EmptyDescription>
      </EmptyHeader>
    </Empty>
    <ol v-else class="flex flex-col gap-5">
      <li v-for="view in assignmentViews" :key="view.assignment.id">
        <Card>
          <CardHeader>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex flex-col gap-2">
                <CardTitle>{{ view.assignment.title }}</CardTitle>
                <CardDescription>Due {{ view.dueText }}</CardDescription>
              </div>
              <Badge v-if="view.assignment.submission?.gradedAt" variant="secondary">Graded</Badge>
              <Badge v-else-if="view.assignment.submission" variant="outline">Submitted</Badge>
              <Badge v-else-if="view.pastDeadline" variant="destructive">Deadline passed</Badge>
              <Badge v-else variant="outline">Not submitted</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div class="flex flex-col gap-5">
              <p class="text-sm whitespace-pre-wrap">{{ view.assignment.instructions }}</p>
              <section class="flex flex-col gap-2" aria-label="Grading rubric">
                <h2 class="text-sm font-semibold">Rubric</h2>
                <ul class="flex flex-col gap-2 text-sm text-muted-foreground">
                  <li v-for="(criterion, index) in view.assignment.rubric" :key="index" class="flex justify-between gap-4">
                    <span>{{ criterion.description }}</span>
                    <span class="shrink-0">{{ criterion.points }} pts</span>
                  </li>
                </ul>
                <p class="text-sm font-medium">Total: {{ view.maxPoints }} points</p>
              </section>
              <Separator />
              <div v-if="view.assignment.submission" class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="font-medium">{{ view.assignment.submission.originalFilename }}</p>
                    <p class="text-sm text-muted-foreground">Submitted {{ view.submittedText }}</p>
                  </div>
                  <Button as-child variant="outline" size="sm">
                    <a :href="`/api/submissions/${view.assignment.submission.id}/file`" :download="view.assignment.submission.originalFilename">
                      <DownloadIcon data-icon="inline-start" />
                      Download
                    </a>
                  </Button>
                </div>
                <Alert v-if="view.assignment.submission.gradedAt">
                  <AlertTitle>Grade: {{ view.assignment.submission.grade }} / {{ view.maxPoints }}</AlertTitle>
                  <AlertDescription>{{ view.assignment.submission.feedback || 'No written feedback was provided.' }}</AlertDescription>
                </Alert>
                <p v-else-if="view.pastDeadline" class="text-sm text-muted-foreground">Your submission is recorded. The deadline has passed, so it can no longer be replaced.</p>
              </div>
              <FieldGroup v-if="!view.assignment.submission?.gradedAt && !view.pastDeadline">
                <Field>
                  <FieldLabel :for="`file-${view.assignment.id}`">{{ view.assignment.submission ? 'Replace submission' : 'Upload your work' }}</FieldLabel>
                  <Input
                    :id="`file-${view.assignment.id}`"
                    type="file"
                    accept=".pdf,.zip,.c,.cc,.cpp,.cs,.go,.h,.hpp,.html,.java,.js,.jsx,.kt,.md,.php,.py,.rb,.rs,.sh,.sql,.ts,.tsx,.txt,.vue,.xml,.yaml,.yml"
                    :disabled="isSubmittingAssignment(view.assignment.id)"
                    @change="setFile(view.assignment.id, $event)"
                  />
                  <FieldDescription>PDF, ZIP, or source-code file · maximum 100 MiB. Resubmitting replaces your ungraded file.</FieldDescription>
                </Field>
                <Button class="self-start" :disabled="!files[view.assignment.id] || isSubmittingAssignment(view.assignment.id)" @click="submitFile(view.assignment.id)">
                  <Spinner v-if="isSubmittingAssignment(view.assignment.id)" data-icon="inline-start" />
                  <UploadIcon v-else data-icon="inline-start" />
                  {{
                    isSubmittingAssignment(view.assignment.id) ? 'Uploading…'
                    : view.assignment.submission ? 'Replace submission'
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
