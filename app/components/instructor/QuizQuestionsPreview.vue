<script setup lang="ts">
  import { Badge } from '@/components/ui/badge'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import type { QuizInstructorQuestion } from '#shared/types/quizzes'
  import type { QuizQuestionType } from '#shared/validation/quizzes'

  defineProps<{ questions: QuizInstructorQuestion[] }>()

  const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
    mcq: 'Multiple choice',
    multi_select: 'Multi-select'
  }
</script>

<template>
  <ol class="flex flex-col gap-3">
    <li v-for="(question, index) in questions" :key="question.id">
      <Card>
        <CardHeader>
          <CardTitle>{{ index + 1 }}. {{ question.questionText }}</CardTitle>
          <CardDescription>{{ QUESTION_TYPE_LABELS[question.questionType] }} · {{ question.points }} points</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-3">
            <ul class="flex flex-col gap-2">
              <li v-for="option in question.options" :key="option.id" class="flex flex-wrap items-center gap-2">
                <span class="text-sm">{{ option.optionText }}</span>
                <Badge v-if="option.isCorrect" variant="secondary">Correct</Badge>
              </li>
            </ul>
            <p v-if="question.explanation" class="text-sm text-muted-foreground">Explanation: {{ question.explanation }}</p>
          </div>
        </CardContent>
      </Card>
    </li>
  </ol>
</template>
