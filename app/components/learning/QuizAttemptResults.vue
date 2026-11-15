<script setup lang="ts">
  import { RotateCcwIcon } from '@lucide/vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import type { QuizAttemptDetail } from '#shared/types/quizzes'
  import type { QuizQuestionType } from '#shared/validation/quizzes'

  const { attempt } = defineProps<{ attempt: QuizAttemptDetail }>()
  const emit = defineEmits<{ retake: [] }>()

  const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
    mcq: 'Multiple choice',
    multi_select: 'Multi-select'
  }

  const results = computed(() => attempt.results ?? [])
</script>

<template>
  <div class="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex flex-col gap-1">
            <CardTitle>Quiz results</CardTitle>
            <p class="text-sm text-muted-foreground">{{ attempt.quizTitle }}</p>
          </div>
          <Badge :variant="attempt.passed ? 'default' : 'destructive'">{{ attempt.passed ? 'Passed' : 'Did not pass' }}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <p class="text-3xl font-semibold tracking-tight">{{ attempt.score ?? 0 }}%</p>
            <p class="text-sm text-muted-foreground">{{ attempt.earnedPoints ?? 0 }} / {{ attempt.totalPoints }} points · Passing score: {{ attempt.passingScore }}%</p>
          </div>
          <Button class="self-start" @click="emit('retake')">
            <RotateCcwIcon data-icon="inline-start" />
            Retake quiz
          </Button>
        </div>
      </CardContent>
    </Card>

    <div v-if="results.length" class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Answer review</h2>
      <ol class="flex flex-col gap-5">
        <li v-for="(item, index) in results" :key="item.questionId">
          <Card>
            <CardHeader>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex flex-col gap-1">
                  <p class="text-sm text-muted-foreground">Question {{ index + 1 }} · {{ QUESTION_TYPE_LABELS[item.questionType] }}</p>
                  <p class="font-medium">{{ item.questionText }}</p>
                </div>
                <Badge :variant="item.isCorrect ? 'secondary' : 'destructive'">{{ item.isCorrect ? 'Correct' : 'Incorrect' }} · {{ item.pointsEarned }} / {{ item.points }} pts</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div class="flex flex-col gap-4">
                <ul class="flex flex-col gap-2">
                  <li v-for="option in item.options" :key="option.id" class="flex flex-wrap items-center gap-2 text-sm">
                    <span>{{ option.optionText }}</span>
                    <Badge v-if="item.selectedOptionIds.includes(option.id)" variant="outline">Your answer</Badge>
                    <Badge v-if="option.isCorrect" variant="secondary">Correct answer</Badge>
                  </li>
                </ul>
                <Alert v-if="item.explanation">
                  <AlertTitle>Explanation</AlertTitle>
                  <AlertDescription>{{ item.explanation }}</AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </li>
      </ol>
    </div>
  </div>
</template>
