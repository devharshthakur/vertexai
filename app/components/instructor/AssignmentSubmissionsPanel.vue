<script setup lang="ts">
  import AssignmentSubmissionRow from '@/components/instructor/AssignmentSubmissionRow.vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import type { AssignmentInstructorSubmission, AssignmentSubmissionSummary, AssignmentSummary } from '#shared/types/assignments'

  const props = defineProps<{ assignment: AssignmentSummary }>()
  const { data: submissions, pending: loading, error: loadError } = await useFetch<AssignmentInstructorSubmission[]>(() => `/api/assignments/${props.assignment.id}/submissions`, { default: () => [] })
  function updateSubmission(updated: AssignmentSubmissionSummary) {
    submissions.value = submissions.value.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Submissions</CardTitle>
      <CardDescription>Review the uploaded work and enter a score against the rubric.</CardDescription>
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
          <AssignmentSubmissionRow :assignment="props.assignment" :submission="submission" @saved="updateSubmission" />
        </li>
      </ol>
    </CardContent>
  </Card>
</template>
