<script setup lang="ts">
  import { useMutation } from '@tanstack/vue-query'
  import { toast } from 'vue-sonner'
  import QuizAttemptResults from '@/components/learning/QuizAttemptResults.vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Checkbox } from '@/components/ui/checkbox'
  import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
  import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
  import { Separator } from '@/components/ui/separator'
  import { Spinner } from '@/components/ui/spinner'
  import type { QuizAttemptDetail, QuizDetailForStudent } from '#shared/types/quizzes'
  import type { QuizQuestionType } from '#shared/validation/quizzes'

  definePageMeta({ middleware: 'auth' })
  useSeoMeta({ title: 'Quiz · VertexAI' })

  const route = useRoute()
  const courseId = computed(() => String(route.params.courseId))
  const quizId = computed(() => String(route.params.quizId))
  const { data, pending, error, refresh } = await useFetch<QuizDetailForStudent>(() => `/api/quizzes/${quizId.value}`)

  const initialAttemptId = data.value?.quiz.openAttemptId ?? data.value?.quiz.latestAttempt?.id ?? null
  const { data: initialAttempt } = await useFetch<QuizAttemptDetail | null>(() => `/api/attempts/${initialAttemptId}`, {
    immediate: Boolean(initialAttemptId),
    default: () => null
  })

  const quiz = computed(() => data.value?.quiz ?? null)
  const questions = computed(() => [...(data.value?.questions ?? [])].sort((left, right) => left.orderIndex - right.orderIndex))
  const activeAttempt = shallowRef<QuizAttemptDetail | null>(initialAttempt.value)
  const selectedOptionIds = reactive<Record<string, string[]>>({})

  const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
    mcq: 'Multiple choice',
    multi_select: 'Select all that apply'
  }

  const answeredCount = computed(() => questions.value.filter((question) => (selectedOptionIds[question.id]?.length ?? 0) > 0).length)
  const allQuestionsAnswered = computed(() => questions.value.length > 0 && answeredCount.value === questions.value.length)

  function clearSelections() {
    for (const key of Object.keys(selectedOptionIds)) selectedOptionIds[key] = []
  }

  function setMcqOption(questionId: string, value: unknown) {
    if (typeof value === 'string' && value) selectedOptionIds[questionId] = [value]
  }

  function isOptionSelected(questionId: string, optionId: string) {
    return selectedOptionIds[questionId]?.includes(optionId) ?? false
  }

  function toggleMultiOption(questionId: string, optionId: string, checked: boolean) {
    const current = selectedOptionIds[questionId] ?? []
    selectedOptionIds[questionId] = checked ? [...current, optionId] : current.filter((id) => id !== optionId)
  }

  const { mutateAsync: startAttempt, isPending: isStartingAttempt } = useMutation({
    mutationFn: () => $fetch<QuizAttemptDetail>(`/api/quizzes/${quizId.value}/attempt`, { method: 'POST' }),
    onSuccess: async (attempt) => {
      activeAttempt.value = attempt
      clearSelections()
      await refresh()
      toast.success(attempt.submittedAt ? 'Your latest attempt is ready to review.' : 'Quiz started.')
    },
    onError: () => {
      toast.error('The quiz could not be started. Please try again.')
    }
  })

  const { mutateAsync: submitAttempt, isPending: isSubmittingAttempt } = useMutation({
    mutationFn: () => {
      const attempt = activeAttempt.value
      if (!attempt) throw new Error('There is no active quiz attempt.')
      return $fetch<QuizAttemptDetail>(`/api/attempts/${attempt.id}/submit`, {
        method: 'POST',
        body: {
          answers: questions.value.map((question) => ({
            questionId: question.id,
            selectedOptionIds: selectedOptionIds[question.id] ?? []
          }))
        }
      })
    },
    onSuccess: async (attempt) => {
      activeAttempt.value = attempt
      clearSelections()
      await refresh()
      toast.success('Quiz submitted.')
    },
    onError: () => {
      toast.error('Your answers could not be submitted. Please try again.')
    }
  })

  async function beginAttempt() {
    try {
      await startAttempt()
    } catch {
      // The mutation reports the failure.
    }
  }

  async function submitQuiz() {
    if (!allQuestionsAnswered.value) return
    try {
      await submitAttempt()
    } catch {
      // The mutation reports the failure.
    }
  }
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <header class="flex flex-col gap-2">
      <Button as-child variant="ghost" class="self-start">
        <NuxtLink :to="`/learn/${courseId}/quizzes`">Back to quizzes</NuxtLink>
      </Button>
      <h1 class="text-3xl font-semibold tracking-tight">{{ quiz?.title ?? 'Quiz' }}</h1>
      <p v-if="quiz" class="text-muted-foreground">{{ quiz.moduleTitle }} · {{ quiz.questionCount }} questions · {{ quiz.totalPoints }} points · Passing score: {{ quiz.passingScore }}%</p>
    </header>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Quiz could not be loaded</AlertTitle>
      <AlertDescription>Make sure you are enrolled in this course and try again.</AlertDescription>
    </Alert>
    <p v-else-if="pending" class="text-sm text-muted-foreground" role="status">Loading quiz…</p>
    <template v-else-if="quiz">
      <Card v-if="!activeAttempt">
        <CardHeader>
          <CardTitle>Ready to begin?</CardTitle>
          <CardDescription>Answer every question, then submit to see your score and explanations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-4">
            <ul class="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>{{ quiz.questionCount }} questions</li>
              <li>{{ quiz.totalPoints }} points total</li>
              <li>Passing score: {{ quiz.passingScore }}%</li>
              <li>You can retake the quiz as many times as you need.</li>
            </ul>
            <Button class="self-start" :disabled="isStartingAttempt" @click="beginAttempt">
              <Spinner v-if="isStartingAttempt" data-icon="inline-start" />
              Start quiz
            </Button>
          </div>
        </CardContent>
      </Card>

      <template v-else-if="activeAttempt && activeAttempt.submittedAt !== null">
        <QuizAttemptResults :attempt="activeAttempt" @retake="beginAttempt" />
      </template>

      <Card v-else>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>Answer every question. Submission stays locked until each question has a selection.</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-6">
            <FieldSet v-for="(question, index) in questions" :key="question.id">
              <FieldLegend>{{ index + 1 }}. {{ question.questionText }}</FieldLegend>
              <p class="text-sm text-muted-foreground">{{ question.points }} {{ question.points === 1 ? 'point' : 'points' }} · {{ QUESTION_TYPE_LABELS[question.questionType] }}</p>
              <RadioGroup v-if="question.questionType === 'mcq'" :model-value="selectedOptionIds[question.id]?.[0] ?? ''" @update:model-value="(value) => setMcqOption(question.id, value)">
                <Field v-for="option in question.options" :key="option.id" orientation="horizontal">
                  <RadioGroupItem :id="`${question.id}-${option.id}`" :value="option.id" />
                  <FieldLabel :for="`${question.id}-${option.id}`">{{ option.optionText }}</FieldLabel>
                </Field>
              </RadioGroup>
              <FieldGroup v-else>
                <Field v-for="option in question.options" :key="option.id" orientation="horizontal">
                  <Checkbox :id="`${question.id}-${option.id}`" :model-value="isOptionSelected(question.id, option.id)" @update:model-value="(checked) => toggleMultiOption(question.id, option.id, checked === true)" />
                  <FieldLabel :for="`${question.id}-${option.id}`">{{ option.optionText }}</FieldLabel>
                </Field>
              </FieldGroup>
            </FieldSet>

            <Separator />

            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground" role="status">{{ answeredCount }} of {{ questions.length }} questions answered</p>
              <Button :disabled="!allQuestionsAnswered || isSubmittingAttempt" @click="submitQuiz">
                <Spinner v-if="isSubmittingAttempt" data-icon="inline-start" />
                Submit quiz
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
