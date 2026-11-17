<script setup lang="ts">
  import { PlusIcon, SparklesIcon, Trash2Icon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import type { z } from 'zod'
  import { toast } from 'vue-sonner'
  import QuizQuestionsPreview from '@/components/instructor/QuizQuestionsPreview.vue'
  import { useInstructorDraft } from '@/composables/useInstructorDrafts'
  import { getAiGenerationErrorMessage } from '@/lib/ai-errors'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Checkbox } from '@/components/ui/checkbox'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
  import { Separator } from '@/components/ui/separator'
  import { Spinner } from '@/components/ui/spinner'
  import { Textarea } from '@/components/ui/textarea'
  import type { ModuleSummary } from '#shared/types/courses'
  import type { QuizDraft, QuizStudentSummary } from '#shared/types/quizzes'
  import { createQuizSchema, type CreateQuizValues, type QuizQuestionType } from '#shared/validation/quizzes'

  const props = defineProps<{ courseId: string; modules: ModuleSummary[] }>()

  const { data: quizzes, pending: loading, error: loadError } = await useFetch<QuizStudentSummary[]>(() => `/api/courses/${props.courseId}/quizzes`, { default: () => [] })
  const expandedQuizId = shallowRef('')

  const QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
    mcq: 'Multiple choice (single answer)',
    multi_select: 'Multi-select (all that apply)'
  }

  type QuizFormValues = z.input<typeof createQuizSchema>
  type QuestionFieldKey = 'questionText' | 'questionType' | 'points' | 'explanation' | 'options'
  type OptionFieldKey = 'optionText' | 'isCorrect'

  function createQuestion(): QuizFormValues['questions'][number] {
    return {
      questionText: '',
      questionType: 'mcq',
      points: 10,
      explanation: '',
      options: [
        { optionText: '', isCorrect: true },
        { optionText: '', isCorrect: false }
      ]
    }
  }

  function createDefaultValues(): QuizFormValues {
    return {
      moduleId: props.modules[0]?.id ?? '',
      title: '',
      passingScore: 70,
      questions: [createQuestion()]
    }
  }

  /** Normalize the optional explanation so the API receives `null` instead of an empty string. */
  function toPayload(values: QuizFormValues): CreateQuizValues {
    return {
      moduleId: values.moduleId,
      title: values.title,
      passingScore: values.passingScore,
      questions: values.questions.map((question) => ({
        questionText: question.questionText,
        questionType: question.questionType,
        points: question.points,
        explanation: question.explanation?.trim() ? question.explanation.trim() : null,
        options: question.options.map((option) => ({ optionText: option.optionText, isCorrect: option.isCorrect }))
      }))
    }
  }

  const form = useForm({
    defaultValues: createDefaultValues(),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: createQuizSchema },
    onSubmit: async ({ value }) => {
      try {
        await createQuiz(toPayload(value))
        resetForm()
      } catch {
        // The mutation reports the failure.
      }
    }
  })
  useInstructorDraft(() => !form.state.isDefaultValue)

  /** The module select follows the module list when it arrives after the form is created. */
  watch(
    () => props.modules.map((module) => module.id),
    (moduleIds) => {
      if (!form.state.values.moduleId && moduleIds[0]) form.setFieldValue('moduleId', moduleIds[0])
    },
    { immediate: true }
  )

  /** Array rows are edited by index, so the deep field names stay typed. */
  function questionFieldName<Key extends QuestionFieldKey>(index: number, key: Key) {
    return `questions[${index}].${key}` as `questions[${number}].${Key}`
  }

  function optionFieldName<Key extends OptionFieldKey>(questionIndex: number, optionIndex: number, key: Key) {
    return `questions[${questionIndex}].options[${optionIndex}].${key}` as `questions[${number}].options[${number}].${Key}`
  }

  /** Subscribe to the questions so the running totals follow edits and add/remove. */
  const questionCount = form.useSelector((state) => state.values.questions.length)
  const totalPoints = form.useSelector((state) => state.values.questions.reduce((total, question) => total + (Number.isFinite(question.points) ? question.points : 0), 0))
  const hasSubmittedForm = form.useSelector((state) => state.submissionAttempts > 0)

  const { mutateAsync: createQuiz, isPending: isCreating } = useMutation({
    mutationFn: (payload: CreateQuizValues) =>
      $fetch<QuizStudentSummary>(`/api/courses/${props.courseId}/quizzes`, {
        method: 'POST',
        body: payload
      }),
    onSuccess: (quiz) => {
      quizzes.value = [...quizzes.value, quiz]
      toast.success('Quiz created.')
    },
    onError: () => {
      toast.error('We could not create this quiz. Check the questions and options and try again.')
    }
  })

  function resetForm() {
    form.reset(createDefaultValues())
  }

  /** Lectures whose transcript can seed a quiz draft. */
  const lectureOptions = computed(() => props.modules.flatMap((module) => module.lectures.filter((lecture) => Boolean(lecture.transcript?.trim())).map((lecture) => ({ id: lecture.id, title: lecture.title, moduleTitle: module.title }))))
  const draftLectureId = ref('')

  watch(
    () => lectureOptions.value.map((lecture) => lecture.id),
    (lectureIds) => {
      if (!lectureIds.includes(draftLectureId.value)) draftLectureId.value = lectureIds[0] ?? ''
    },
    { immediate: true }
  )

  const { mutate: generateDraft, isPending: isGeneratingDraft } = useMutation({
    mutationFn: (lectureId: string) => $fetch<QuizDraft>(`/api/courses/${props.courseId}/lectures/${lectureId}/quiz-draft`, { method: 'POST' }),
    onSuccess: (draft) => {
      form.reset({
        moduleId: draft.moduleId,
        title: draft.title,
        passingScore: draft.passingScore,
        questions: draft.questions.map((question) => ({
          questionText: question.questionText,
          questionType: question.questionType,
          points: question.points,
          explanation: question.explanation ?? '',
          options: question.options.map((option) => ({ ...option }))
        }))
      })
      toast.success('Quiz draft ready. Review the questions before creating the quiz.')
    },
    onError: (error) => {
      toast.error(getAiGenerationErrorMessage(error, 'We could not draft a quiz from this lecture. Check the transcript and the AI configuration, then try again.'))
    }
  })

  function addQuestion() {
    if (form.state.values.questions.length >= 30) return
    form.pushFieldValue('questions', createQuestion())
  }

  function removeQuestion(index: number) {
    if (form.state.values.questions.length > 1) void form.removeFieldValue('questions', index)
  }

  function addOption(questionIndex: number) {
    const question = form.state.values.questions[questionIndex]
    if (!question || question.options.length >= 8) return
    form.pushFieldValue(questionFieldName(questionIndex, 'options'), { optionText: '', isCorrect: false })
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const question = form.state.values.questions[questionIndex]
    if (!question || question.options.length <= 2) return

    const remaining = question.options.filter((_, index) => index !== optionIndex)
    const options = question.questionType === 'mcq' && !remaining.some((option) => option.isCorrect) ? remaining.map((option, index) => ({ ...option, isCorrect: index === 0 })) : remaining
    form.setFieldValue(questionFieldName(questionIndex, 'options'), options)
  }

  /** Multiple-choice questions keep exactly one correct option; multi-select toggles each option. */
  function setOptionCorrect(questionIndex: number, optionIndex: number, isCorrect: boolean) {
    const question = form.state.values.questions[questionIndex]
    if (!question) return

    const options = question.options.map((option, index) => (question.questionType === 'mcq' ? { ...option, isCorrect: index === optionIndex } : { ...option, isCorrect: index === optionIndex ? isCorrect : option.isCorrect }))
    form.setFieldValue(questionFieldName(questionIndex, 'options'), options)
  }

  function changeQuestionType(questionIndex: number, value: unknown) {
    const questionType: QuizQuestionType = value === 'multi_select' ? 'multi_select' : 'mcq'
    form.setFieldValue(questionFieldName(questionIndex, 'questionType'), questionType)
    if (questionType === 'multi_select') return

    const question = form.state.values.questions[questionIndex]
    if (!question) return
    const correctIndex = question.options.findIndex((option) => option.isCorrect)
    const keepIndex = correctIndex === -1 ? 0 : correctIndex
    form.setFieldValue(
      questionFieldName(questionIndex, 'options'),
      question.options.map((option, index) => ({ ...option, isCorrect: index === keepIndex }))
    )
  }

  function toggleQuiz(quizId: string) {
    expandedQuizId.value = expandedQuizId.value === quizId ? '' : quizId
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Quizzes</CardTitle>
      <CardDescription>Write module quizzes with multiple-choice or multi-select questions; students are graded automatically.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col gap-6">
        <Alert v-if="loadError" variant="destructive">
          <AlertTitle>Quizzes could not be loaded</AlertTitle>
          <AlertDescription>We could not load quizzes for this course. Please refresh the page and try again.</AlertDescription>
        </Alert>

        <Alert v-if="!modules.length">
          <AlertTitle>Create a module first</AlertTitle>
          <AlertDescription>Every quiz belongs to a module. Add at least one module above before writing a quiz.</AlertDescription>
        </Alert>

        <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="form.handleSubmit()">
          <div class="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div class="flex flex-col gap-1">
              <p class="text-sm font-medium">Draft questions from a lecture</p>
              <p class="text-sm text-muted-foreground">The AI reads one lecture transcript and fills the form with 5–10 questions. Review and edit them before creating the quiz.</p>
            </div>
            <div v-if="lectureOptions.length" class="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div class="flex flex-1 flex-col gap-2">
                <label for="quiz-draft-lecture" class="text-sm font-medium">Lecture</label>
                <Select v-model="draftLectureId">
                  <SelectTrigger id="quiz-draft-lecture">
                    <SelectValue placeholder="Choose a lecture" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="lecture in lectureOptions" :key="lecture.id" :value="lecture.id">{{ lecture.title }} · {{ lecture.moduleTitle }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" :disabled="isGeneratingDraft || !draftLectureId" @click="generateDraft(draftLectureId)">
                <Spinner v-if="isGeneratingDraft" data-icon="inline-start" />
                <SparklesIcon v-else data-icon="inline-start" />
                {{ isGeneratingDraft ? 'Drafting…' : 'Draft with AI' }}
              </Button>
            </div>
            <p v-else class="text-sm text-muted-foreground">Add a transcript to a lecture to draft questions from it.</p>
            <p v-if="lectureOptions.length" class="text-xs text-muted-foreground">Generating replaces the questions currently in the form.</p>
          </div>

          <FieldGroup>
            <FieldSet>
              <FieldLegend>Quiz details</FieldLegend>
              <FieldGroup>
                <form.Field name="moduleId">
                  <template #default="{ field }">
                    <Field :data-invalid="!field.state.meta.isValid">
                      <FieldLabel for="quiz-module">Module</FieldLabel>
                      <Select :model-value="field.state.value" @update:model-value="(value) => field.handleChange(typeof value === 'string' ? value : '')">
                        <SelectTrigger id="quiz-module" :aria-invalid="!field.state.meta.isValid">
                          <SelectValue placeholder="Choose a module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem v-for="module in modules" :key="module.id" :value="module.id">{{ module.title }}</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                    </Field>
                  </template>
                </form.Field>

                <form.Field name="title">
                  <template #default="{ field }">
                    <Field :data-invalid="!field.state.meta.isValid">
                      <FieldLabel for="quiz-title">Quiz title</FieldLabel>
                      <Input id="quiz-title" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" maxlength="200" required placeholder="Module 1 knowledge check" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                      <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                    </Field>
                  </template>
                </form.Field>

                <form.Field name="passingScore">
                  <template #default="{ field }">
                    <Field :data-invalid="(field.state.meta.isBlurred || hasSubmittedForm) && !field.state.meta.isValid">
                      <FieldLabel for="quiz-passing-score">Passing score</FieldLabel>
                      <Input
                        id="quiz-passing-score"
                        :model-value="Number.isFinite(field.state.value) ? field.state.value : ''"
                        :aria-invalid="(field.state.meta.isBlurred || hasSubmittedForm) && !field.state.meta.isValid"
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        required
                        @update:model-value="(value) => field.handleChange(value === '' ? Number.NaN : Number(value))"
                        @blur="field.handleBlur"
                      />
                      <FieldDescription>Percentage of the total points a student needs to pass.</FieldDescription>
                      <FieldError v-if="(field.state.meta.isBlurred || hasSubmittedForm) && !field.state.meta.isValid" :errors="field.state.meta.errors" />
                    </Field>
                  </template>
                </form.Field>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Questions</FieldLegend>
              <FieldDescription>Questions are graded automatically. Multiple-choice questions need exactly one correct option; multi-select questions need at least one.</FieldDescription>
              <form.Field name="questions">
                <template #default="{ field }">
                  <FieldGroup>
                    <Card v-for="(question, index) in field.state.value" :key="index">
                      <CardHeader>
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <CardTitle>Question {{ index + 1 }}</CardTitle>
                          <Button v-if="field.state.value.length > 1" type="button" variant="outline" size="sm" @click="removeQuestion(index)">
                            <Trash2Icon data-icon="inline-start" />
                            Remove question
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <FieldGroup>
                          <form.Field :name="questionFieldName(index, 'questionText')">
                            <template #default="{ field: questionTextField }">
                              <Field :data-invalid="!questionTextField.state.meta.isValid">
                                <FieldLabel :for="`question-${index}-prompt`">Question</FieldLabel>
                                <Textarea
                                  :id="`question-${index}-prompt`"
                                  :model-value="questionTextField.state.value"
                                  :aria-invalid="!questionTextField.state.meta.isValid"
                                  maxlength="2000"
                                  required
                                  placeholder="What does the `useFetch` composable return?"
                                  @update:model-value="(value) => questionTextField.handleChange(String(value))"
                                  @blur="questionTextField.handleBlur"
                                />
                                <FieldError v-if="!questionTextField.state.meta.isValid" :errors="questionTextField.state.meta.errors" />
                              </Field>
                            </template>
                          </form.Field>

                          <form.Field :name="questionFieldName(index, 'questionType')">
                            <template #default="{ field: questionTypeField }">
                              <Field :data-invalid="!questionTypeField.state.meta.isValid">
                                <FieldLabel :for="`question-${index}-type`">Question type</FieldLabel>
                                <Select :model-value="questionTypeField.state.value" @update:model-value="(value) => changeQuestionType(index, value)">
                                  <SelectTrigger :id="`question-${index}-type`" :aria-invalid="!questionTypeField.state.meta.isValid">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectItem value="mcq">{{ QUESTION_TYPE_LABELS.mcq }}</SelectItem>
                                      <SelectItem value="multi_select">{{ QUESTION_TYPE_LABELS.multi_select }}</SelectItem>
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                                <FieldError v-if="!questionTypeField.state.meta.isValid" :errors="questionTypeField.state.meta.errors" />
                              </Field>
                            </template>
                          </form.Field>

                          <form.Field :name="questionFieldName(index, 'points')">
                            <template #default="{ field: questionPointsField }">
                              <Field :data-invalid="(questionPointsField.state.meta.isBlurred || hasSubmittedForm) && !questionPointsField.state.meta.isValid">
                                <FieldLabel :for="`question-${index}-points`">Points</FieldLabel>
                                <Input
                                  :id="`question-${index}-points`"
                                  :model-value="Number.isFinite(questionPointsField.state.value) ? questionPointsField.state.value : ''"
                                  :aria-invalid="(questionPointsField.state.meta.isBlurred || hasSubmittedForm) && !questionPointsField.state.meta.isValid"
                                  type="number"
                                  min="0.01"
                                  max="100"
                                  step="0.01"
                                  required
                                  @update:model-value="(value) => questionPointsField.handleChange(value === '' ? Number.NaN : Number(value))"
                                  @blur="questionPointsField.handleBlur"
                                />
                                <FieldError v-if="(questionPointsField.state.meta.isBlurred || hasSubmittedForm) && !questionPointsField.state.meta.isValid" :errors="questionPointsField.state.meta.errors" />
                              </Field>
                            </template>
                          </form.Field>

                          <form.Field :name="questionFieldName(index, 'explanation')">
                            <template #default="{ field: explanationField }">
                              <Field :data-invalid="!explanationField.state.meta.isValid">
                                <FieldLabel :for="`question-${index}-explanation`">Explanation</FieldLabel>
                                <Textarea
                                  :id="`question-${index}-explanation`"
                                  :model-value="explanationField.state.value ?? ''"
                                  :aria-invalid="!explanationField.state.meta.isValid"
                                  maxlength="2000"
                                  placeholder="Explain why the answer is correct (optional)"
                                  @update:model-value="(value) => explanationField.handleChange(String(value))"
                                  @blur="explanationField.handleBlur"
                                />
                                <FieldDescription>Shown to students after they submit the quiz.</FieldDescription>
                                <FieldError v-if="!explanationField.state.meta.isValid" :errors="explanationField.state.meta.errors" />
                              </Field>
                            </template>
                          </form.Field>

                          <form.Field :name="questionFieldName(index, 'options')">
                            <template #default="{ field: optionsField }">
                              <FieldSet>
                                <FieldLegend variant="label">Answer options</FieldLegend>
                                <FieldDescription>{{ question.questionType === 'mcq' ? 'Mark exactly one correct option.' : 'Mark every correct option.' }}</FieldDescription>
                                <FieldGroup>
                                  <div v-for="(option, optionIndex) in optionsField.state.value" :key="optionIndex" class="flex flex-col gap-2">
                                    <form.Field :name="optionFieldName(index, optionIndex, 'optionText')">
                                      <template #default="{ field: optionTextField }">
                                        <Field :data-invalid="!optionTextField.state.meta.isValid">
                                          <FieldLabel :for="`option-${index}-${optionIndex}-text`">Option {{ optionIndex + 1 }}</FieldLabel>
                                          <Input
                                            :id="`option-${index}-${optionIndex}-text`"
                                            :model-value="optionTextField.state.value"
                                            :aria-invalid="!optionTextField.state.meta.isValid"
                                            maxlength="500"
                                            required
                                            placeholder="Answer choice"
                                            @update:model-value="(value) => optionTextField.handleChange(String(value))"
                                            @blur="optionTextField.handleBlur"
                                          />
                                          <FieldError v-if="!optionTextField.state.meta.isValid" :errors="optionTextField.state.meta.errors" />
                                        </Field>
                                      </template>
                                    </form.Field>
                                    <div class="flex flex-wrap items-center justify-between gap-3">
                                      <form.Field :name="optionFieldName(index, optionIndex, 'isCorrect')">
                                        <template #default="{ field: correctField }">
                                          <Field orientation="horizontal">
                                            <Checkbox :id="`option-${index}-${optionIndex}-correct`" :model-value="correctField.state.value" @update:model-value="(value) => setOptionCorrect(index, optionIndex, value === true)" />
                                            <FieldLabel :for="`option-${index}-${optionIndex}-correct`">Correct answer</FieldLabel>
                                          </Field>
                                        </template>
                                      </form.Field>
                                      <Button v-if="optionsField.state.value.length > 2" type="button" variant="outline" size="sm" @click="removeOption(index, optionIndex)">
                                        <Trash2Icon data-icon="inline-start" />
                                        Remove option
                                      </Button>
                                    </div>
                                  </div>
                                </FieldGroup>
                                <FieldError v-if="!optionsField.state.meta.isValid" :errors="optionsField.state.meta.errors" />
                                <Button type="button" variant="outline" size="sm" class="self-start" :disabled="optionsField.state.value.length >= 8" @click="addOption(index)">
                                  <PlusIcon data-icon="inline-start" />
                                  Add option
                                </Button>
                              </FieldSet>
                            </template>
                          </form.Field>
                        </FieldGroup>
                      </CardContent>
                    </Card>
                    <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                  </FieldGroup>
                </template>
              </form.Field>

              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-muted-foreground">{{ questionCount }} questions · {{ totalPoints }} points total</p>
                <Button type="button" variant="outline" :disabled="questionCount >= 30" @click="addQuestion">
                  <PlusIcon data-icon="inline-start" />
                  Add question
                </Button>
              </div>
            </FieldSet>
          </FieldGroup>

          <div class="flex justify-end">
            <Button type="submit" :disabled="isCreating">
              <Spinner v-if="isCreating" data-icon="inline-start" />
              <PlusIcon v-else data-icon="inline-start" />
              {{ isCreating ? 'Creating…' : 'Create quiz' }}
            </Button>
          </div>
        </form>

        <Separator />

        <div class="flex flex-col gap-3">
          <p v-if="loading" class="text-sm text-muted-foreground" role="status">Loading quizzes…</p>
          <Empty v-else-if="!quizzes.length">
            <EmptyHeader>
              <EmptyTitle>No quizzes yet</EmptyTitle>
              <EmptyDescription>Create the first quiz above so students can check their understanding.</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <ol v-else class="flex flex-col gap-3">
            <li v-for="quiz in quizzes" :key="quiz.id">
              <Card>
                <CardHeader>
                  <CardTitle>{{ quiz.title }}</CardTitle>
                  <CardDescription> {{ quiz.moduleTitle }} · Passing score: {{ quiz.passingScore }}% · {{ quiz.questionCount }} questions · {{ quiz.totalPoints }} points </CardDescription>
                </CardHeader>
                <CardContent>
                  <div class="flex flex-col gap-3">
                    <p v-if="quiz.instructor" class="text-sm text-muted-foreground">{{ quiz.instructor.attemptCount }} attempts ({{ quiz.instructor.passCount }} passed)</p>
                    <Button v-if="quiz.instructor" variant="outline" size="sm" class="self-start" @click="toggleQuiz(quiz.id)">
                      {{ expandedQuizId === quiz.id ? 'Hide questions' : 'View questions' }}
                    </Button>
                    <QuizQuestionsPreview v-if="expandedQuizId === quiz.id && quiz.instructor" :questions="quiz.instructor.questions" />
                  </div>
                </CardContent>
              </Card>
            </li>
          </ol>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
