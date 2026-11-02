<script setup lang="ts">
  import { shallowRef } from 'vue'
  import type { LectureSummary } from '#shared/types/courses'
  import { createLectureSchema } from '#shared/validation/courses'
  import type { CreateLectureValues } from '#shared/validation/courses'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Textarea } from '@/components/ui/textarea'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'

  const props = defineProps<{
    courseId: string
    moduleId: string
    lecture?: LectureSummary
  }>()

  const emit = defineEmits<{ saved: [lecture: LectureSummary] }>()
  const errorMessage = shallowRef('')
  const durationPlaceholder = 'Optional'
  const videoUrlPlaceholder = 'https://www.youtube.com/watch?v=…'

  const form = useForm({
    defaultValues: {
      title: props.lecture?.title ?? '',
      videoUrl: props.lecture?.videoUrl ?? '',
      transcript: props.lecture?.transcript ?? null,
      durationSeconds: props.lecture?.durationSeconds ?? null
    },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: createLectureSchema },
    onSubmit: async ({ value }) => {
      errorMessage.value = ''
      const payload: CreateLectureValues = {
        ...value,
        transcript: value.transcript?.trim() || null,
        durationSeconds: value.durationSeconds || null
      }

      try {
        const lecture =
          props.lecture ?
            await $fetch<LectureSummary>(`/api/courses/${props.courseId}/modules/${props.moduleId}/lectures/${props.lecture.id}`, { method: 'PUT', body: payload })
          : await $fetch<LectureSummary>(`/api/courses/${props.courseId}/modules/${props.moduleId}/lectures`, { method: 'POST', body: payload })
        emit('saved', lecture)
        if (!props.lecture) form.reset()
      } catch {
        errorMessage.value = `We could not ${props.lecture ? 'save' : 'add'} this lecture. Check the details and try again.`
      }
    }
  })

  function toDuration(value: string | number) {
    if (value === '') return null
    const seconds = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(seconds) ? seconds : null
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ lecture ? `Edit ${lecture.title}` : 'Add a lecture' }}</CardTitle>
      <CardDescription>Use a YouTube video link and optionally paste its transcript.</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="flex flex-col gap-5" novalidate @submit.prevent="form.handleSubmit()">
        <Alert v-if="errorMessage" variant="destructive">
          <AlertTitle>Lecture was not saved</AlertTitle>
          <AlertDescription>{{ errorMessage }}</AlertDescription>
        </Alert>

        <FieldGroup>
          <form.Field name="title">
            <template #default="{ field }">
              <Field :data-invalid="!field.state.meta.isValid">
                <FieldLabel :for="`${moduleId}-${lecture?.id ?? 'new'}-title`">Lecture title</FieldLabel>
                <Input :id="`${moduleId}-${lecture?.id ?? 'new'}-title`" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" maxlength="200" placeholder="Introduction" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
              </Field>
            </template>
          </form.Field>

          <form.Field name="videoUrl">
            <template #default="{ field }">
              <Field :data-invalid="!field.state.meta.isValid">
                <FieldLabel :for="`${moduleId}-${lecture?.id ?? 'new'}-video-url`">YouTube video URL</FieldLabel>
                <Input :id="`${moduleId}-${lecture?.id ?? 'new'}-video-url`" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" type="url" :placeholder="videoUrlPlaceholder" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
              </Field>
            </template>
          </form.Field>

          <form.Field name="durationSeconds">
            <template #default="{ field }">
              <Field :data-invalid="!field.state.meta.isValid">
                <FieldLabel :for="`${moduleId}-${lecture?.id ?? 'new'}-duration`">Duration in seconds</FieldLabel>
                <Input
                  :id="`${moduleId}-${lecture?.id ?? 'new'}-duration`"
                  :model-value="field.state.value ?? ''"
                  :aria-invalid="!field.state.meta.isValid"
                  type="number"
                  min="1"
                  max="86400"
                  :placeholder="durationPlaceholder"
                  @update:model-value="(value) => field.handleChange(toDuration(value))"
                  @blur="field.handleBlur"
                />
                <FieldDescription>Optional. Leave blank if you do not know the duration.</FieldDescription>
                <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
              </Field>
            </template>
          </form.Field>

          <form.Field name="transcript">
            <template #default="{ field }">
              <Field :data-invalid="!field.state.meta.isValid">
                <FieldLabel :for="`${moduleId}-${lecture?.id ?? 'new'}-transcript`">Transcript</FieldLabel>
                <Textarea
                  :id="`${moduleId}-${lecture?.id ?? 'new'}-transcript`"
                  :model-value="field.state.value ?? ''"
                  :aria-invalid="!field.state.meta.isValid"
                  maxlength="500000"
                  placeholder="Paste the transcript here (optional)."
                  @update:model-value="(value) => field.handleChange(String(value))"
                  @blur="field.handleBlur"
                />
                <FieldDescription>Transcripts must be pasted manually; YouTube captions are not fetched automatically.</FieldDescription>
                <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
              </Field>
            </template>
          </form.Field>
        </FieldGroup>

        <form.Subscribe v-slot="{ isSubmitting }">
          <Button type="submit" :disabled="isSubmitting">
            {{
              isSubmitting ? 'Saving…'
              : lecture ? 'Save lecture'
              : 'Add lecture'
            }}
          </Button>
        </form.Subscribe>
      </form>
    </CardContent>
  </Card>
</template>
