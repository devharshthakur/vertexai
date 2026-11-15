<script setup lang="ts">
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { formatAssignmentDateTime } from '@/lib/date-time'
  import type { QuizStudentSummary } from '#shared/types/quizzes'

  definePageMeta({ middleware: 'auth' })
  useSeoMeta({ title: 'Course quizzes · VertexAI' })

  const route = useRoute()
  const courseId = computed(() => String(route.params.courseId))
  const { data: quizzes, pending, error } = await useFetch<QuizStudentSummary[]>(() => `/api/courses/${courseId.value}/quizzes`, { default: () => [] })

  /** Precompute labels and formatted timestamps once per list update. */
  const quizViews = computed(() =>
    quizzes.value.map((quiz) => ({
      quiz,
      latestSubmittedText: quiz.latestAttempt ? formatAssignmentDateTime(quiz.latestAttempt.submittedAt) : '',
      actionLabel:
        quiz.openAttemptId ? 'Continue attempt'
        : quiz.latestAttempt ? 'Review or retake'
        : 'Start quiz'
    }))
  )
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <header class="flex flex-col gap-2">
      <Button as-child variant="ghost" class="self-start">
        <NuxtLink :to="`/learn/${courseId}`">Back to course</NuxtLink>
      </Button>
      <h1 class="text-3xl font-semibold tracking-tight">Quizzes</h1>
      <p class="text-muted-foreground">Check your scores, resume an attempt, or retake a quiz to improve your result.</p>
    </header>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Quizzes could not be loaded</AlertTitle>
      <AlertDescription>Make sure you are enrolled in this course and try again.</AlertDescription>
    </Alert>
    <p v-else-if="pending" class="text-sm text-muted-foreground" role="status">Loading quizzes…</p>
    <Empty v-else-if="!quizViews.length">
      <EmptyHeader>
        <EmptyTitle>No quizzes yet</EmptyTitle>
        <EmptyDescription>There are no quizzes for this course yet.</EmptyDescription>
      </EmptyHeader>
    </Empty>
    <ol v-else class="flex flex-col gap-5">
      <li v-for="view in quizViews" :key="view.quiz.id">
        <Card>
          <CardHeader>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex flex-col gap-2">
                <CardTitle>{{ view.quiz.title }}</CardTitle>
                <CardDescription>{{ view.quiz.moduleTitle }} · {{ view.quiz.questionCount }} questions · {{ view.quiz.totalPoints }} points · Passing score: {{ view.quiz.passingScore }}%</CardDescription>
              </div>
              <Badge v-if="view.quiz.latestAttempt" :variant="view.quiz.latestAttempt.passed ? 'default' : 'destructive'">{{ view.quiz.latestAttempt.passed ? 'Passed' : 'Not passed' }} · {{ view.quiz.latestAttempt.score }}%</Badge>
              <Badge v-else-if="view.quiz.openAttemptId" variant="secondary">In progress</Badge>
              <Badge v-else variant="outline">Not started</Badge>
            </div>
          </CardHeader>
          <CardContent v-if="view.quiz.latestAttempt">
            <p class="text-sm text-muted-foreground">Latest score: {{ view.quiz.latestAttempt.score }}% ({{ view.quiz.latestAttempt.passed ? 'Passed' : 'Did not pass' }}) · Submitted {{ view.latestSubmittedText }}</p>
          </CardContent>
          <CardFooter>
            <Button as-child>
              <NuxtLink :to="`/learn/${courseId}/quizzes/${view.quiz.id}`">{{ view.actionLabel }}</NuxtLink>
            </Button>
          </CardFooter>
        </Card>
      </li>
    </ol>
  </div>
</template>
