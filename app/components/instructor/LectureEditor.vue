<script setup lang="ts">
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { watch } from 'vue'
  import { toast } from 'vue-sonner'
  import { useInstructorDraft } from '@/composables/useInstructorDrafts'
  import type { LectureSummary } from '#shared/types/courses'
  import { createLectureSchema } from '#shared/validation/courses'
  import type { CreateLectureValues } from '#shared/validation/courses'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Spinner } from '@/components/ui/spinner'
  import { Textarea } from '@/components/ui/textarea'

  const props = defineProps<{
    courseId: string
    moduleId: string
    lecture?: LectureSummary
  }>()

  const emit = defineEmits<{ saved: [lecture: LectureSummary] }>()
  const durationPlaceholder = 'Optional'
  const videoUrlPlaceholder = '/videos/typescript/video.mp4'

  function toDefaults(lecture?: LectureSummary) {
    return {
      title: lecture?.title ?? '',
      videoUrl: lecture?.videoUrl ?? '',
      transcript: lecture?.transcript ?? null,
      durationSeconds: lecture?.durationSeconds ?? null
    }
  }

  const { mutateAsync: saveLectureRequest, isPending: isSaving } = useMutation({
    mutationFn: (payload: CreateLectureValues) =>
      props.lecture ? $fetch<LectureSummary>(`/api/courses/${props.courseId}/modules/${props.moduleId}/lectures/${props.lecture.id}`, { method: 'PUT', body: payload }) : $fetch<LectureSummary>(`/api/courses/${props.courseId}/modules/${props.moduleId}/lectures`, { method: 'POST', body: payload }),
    onSuccess: (lecture) => {
      toast.success(props.lecture ? 'Lecture saved.' : 'Lecture added.')
      emit('saved', lecture)
      if (props.lecture) form.reset(form.state.values)
      else form.reset()
    },
    onError: () => {
      toast.error(`We could not ${props.lecture ? 'save' : 'add'} this lecture. Check the details and try again.`)
    }
  })

  const form = useForm({
    defaultValues: toDefaults(props.lecture),
    validationLogic: revalidateLogic(),
    validators: { onDynamic: createLectureSchema },
    onSubmit: async ({ value }) => {
      const payload: CreateLectureValues = {
        ...value,
        transcript: value.transcript?.trim() || null,
        durationSeconds: value.durationSeconds || null
      }

      try {
        await saveLectureRequest(payload)
      } catch {
        // The mutation reports the failure.
      }
    }
  })
  useInstructorDraft(() => !form.state.isDefaultValue)

  watch(
    () => props.lecture,
    (lecture) => form.reset(toDefaults(lecture))
  )

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
      <CardDescription>Use a local video path and optionally paste its transcript.</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="flex flex-col gap-5" novalidate @submit.prevent="form.handleSubmit()">
        <FieldSet :disabled="isSaving">
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
                  <FieldLabel :for="`${moduleId}-${lecture?.id ?? 'new'}-video-url`">Video path</FieldLabel>
                  <Input :id="`${moduleId}-${lecture?.id ?? 'new'}-video-url`" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" type="text" :placeholder="videoUrlPlaceholder" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                  <FieldDescription>Path to an MP4 file under public/videos, for example /videos/typescript/video.mp4.</FieldDescription>
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
                  <FieldDescription>Optional. Paste the transcript here; it is stored with the lecture.</FieldDescription>
                  <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                </Field>
              </template>
            </form.Field>
          </FieldGroup>

          <form.Subscribe v-slot="{ isSubmitting }">
            <Button type="submit" :disabled="isSubmitting">
              <Spinner v-if="isSubmitting" data-icon="inline-start" />
              {{
                isSubmitting ? 'Saving…'
                : lecture ? 'Save lecture'
                : 'Add lecture'
              }}
            </Button>
          </form.Subscribe>
        </FieldSet>
      </form>
    </CardContent>
  </Card>
</template>
