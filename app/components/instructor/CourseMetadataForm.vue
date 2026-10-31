<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import DifficultySelect from '@/components/instructor/DifficultySelect.vue'
import type { CourseSummary } from '#shared/types/courses'
import { createCourseSchema } from '#shared/validation/courses'
import type { CreateCourseValues } from '#shared/validation/courses'
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

function isInvalid(state: { meta: { isValid: boolean } }) {
  return hasSubmitted.value && !state.meta.isValid
}

/** Number inputs emit text, and the schema expects a number. */
function toPrice(value: string | number) {
  const price = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(price) ? price : 0
}

/** An empty thumbnail input should clear the value, not store an empty string. */
function toThumbnail(value: string | number) {
  return String(value) || null
}

/**
 * Bound rather than written inline: a `//` inside a scoped-slot attribute
 * value drops the slot scope in vue-tsc's generated code.
 */
const thumbnailPlaceholder = 'https://…'
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

        <form.Field name="difficulty">
          <template #default="{ field }">
            <DifficultySelect
              :model-value="field.state.value ?? null"
              @update:model-value="field.handleChange"
            />
          </template>
        </form.Field>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <form.Field name="thumbnailUrl">
          <template #default="{ field }">
            <Field>
              <FieldLabel for="thumbnail-url">Thumbnail URL</FieldLabel>
              <Input
                id="thumbnail-url"
                :model-value="field.state.value ?? ''"
                type="url"
                :placeholder="thumbnailPlaceholder"
                @update:model-value="(v) => field.handleChange(toThumbnail(v))"
                @blur="field.handleBlur"
              />
            </Field>
          </template>
        </form.Field>

        <form.Field name="price">
          <template #default="{ field }">
            <Field>
              <FieldLabel for="course-price">Price</FieldLabel>
              <Input
                id="course-price"
                :model-value="field.state.value ?? 0"
                type="number"
                min="0"
                step="0.01"
                @update:model-value="(v) => field.handleChange(toPrice(v))"
                @blur="field.handleBlur"
              />
            </Field>
          </template>
        </form.Field>
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
