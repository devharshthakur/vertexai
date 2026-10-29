<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import DifficultySelect from '@/components/instructor/DifficultySelect.vue'
import type { CourseSummary } from '#shared/types/courses'
import { createCourseSchema } from '#shared/validation/courses'
import type {
  CourseDifficulty,
  CreateCourseValues
} from '#shared/validation/courses'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{
  course?: CourseSummary | null
  onSave: (values: CreateCourseValues) => Promise<void>
}>()

const defaults: CreateCourseValues = {
  title: props.course?.title ?? '',
  description: props.course?.description ?? null,
  category: props.course?.category ?? null,
  difficulty:
    (props.course?.difficulty as CreateCourseValues['difficulty']) ?? null,
  thumbnailUrl: props.course?.thumbnailUrl ?? null,
  price: props.course?.price ?? 0
}

const form = useForm({
  defaultValues: defaults,
  validators: { onChange: createCourseSchema },
  onSubmit: async ({ value }) => {
    await props.onSave({
      ...value,
      description: value.description || null,
      category: value.category || null,
      thumbnailUrl: value.thumbnailUrl || null
    })
  }
})

const hasSubmitted = form.useSelector((state) => state.submissionAttempts > 0)
const difficulty = shallowRef<CourseDifficulty | null>(
  defaults.difficulty ?? null
)
const thumbnailUrl = shallowRef(defaults.thumbnailUrl ?? '')
const price = shallowRef(defaults.price ?? 0)

watch(difficulty, (value) => {
  form.setFieldValue('difficulty', value)
})
watch(thumbnailUrl, (value) => {
  form.setFieldValue('thumbnailUrl', value || null)
})
watch(price, (value) => {
  form.setFieldValue('price', value)
})

function isInvalid(state: { meta: { isValid: boolean } }) {
  return hasSubmitted.value && !state.meta.isValid
}
</script>

<template>
  <form
    class="flex flex-col gap-6"
    novalidate
    @submit.prevent="form.handleSubmit()"
  >
    <FieldGroup>
      <form.Field name="title">
        <template #default="{ field }">
          <Field :data-invalid="isInvalid(field.state)">
            <FieldLabel :for="field.name">Course title</FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="isInvalid(field.state)"
              placeholder="Introduction to…"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldError
              v-if="isInvalid(field.state)"
              :errors="field.state.meta.errors"
            />
          </Field>
        </template>
      </form.Field>

      <form.Field name="description">
        <template #default="{ field }">
          <Field :data-invalid="isInvalid(field.state)">
            <FieldLabel :for="field.name">Description</FieldLabel>
            <Textarea
              :id="field.name"
              :model-value="field.state.value ?? ''"
              :aria-invalid="isInvalid(field.state)"
              placeholder="What will students learn?"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldDescription
              >Describe the course and its learning outcomes.</FieldDescription
            >
            <FieldError
              v-if="isInvalid(field.state)"
              :errors="field.state.meta.errors"
            />
          </Field>
        </template>
      </form.Field>

      <div class="grid gap-6 sm:grid-cols-2">
        <form.Field name="category">
          <template #default="{ field }">
            <Field :data-invalid="isInvalid(field.state)">
              <FieldLabel :for="field.name">Category</FieldLabel>
              <Input
                :id="field.name"
                :model-value="field.state.value ?? ''"
                :aria-invalid="isInvalid(field.state)"
                placeholder="Design, science, business…"
                @update:model-value="
                  (value) => field.handleChange(String(value))
                "
                @blur="field.handleBlur"
              />
              <FieldError
                v-if="isInvalid(field.state)"
                :errors="field.state.meta.errors"
              />
            </Field>
          </template>
        </form.Field>

        <DifficultySelect v-model="difficulty" />
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <Field>
          <FieldLabel for="thumbnail-url">Thumbnail URL</FieldLabel>
          <Input
            id="thumbnail-url"
            v-model="thumbnailUrl"
            type="url"
            placeholder="https://…"
          />
        </Field>

        <Field>
          <FieldLabel for="course-price">Price</FieldLabel>
          <Input
            id="course-price"
            v-model.number="price"
            type="number"
            min="0"
            step="0.01"
          />
        </Field>
      </div>

      <form.Subscribe v-slot="{ isSubmitting }">
        <Button type="submit" :disabled="isSubmitting">
          {{
            isSubmitting ? 'Saving…' : course ? 'Save changes' : 'Create course'
          }}
        </Button>
      </form.Subscribe>
    </FieldGroup>
  </form>
</template>
