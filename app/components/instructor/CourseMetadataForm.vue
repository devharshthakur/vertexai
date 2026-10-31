<script setup lang="ts">
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
import { revalidateLogic, useForm } from '@tanstack/vue-form'

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
  validationLogic: revalidateLogic(),
  validators: { onDynamic: createCourseSchema },
  onSubmit: async ({ value }) => {
    await props.onSave({
      ...value,
      description: value.description || null,
      category: value.category || null,
      thumbnailUrl: value.thumbnailUrl || null
    })
  }
})

/** Number inputs emit text, and the schema expects a number. */
function toPrice(value: string | number) {
  const price = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(price) ? price : 0
}

/** Nullable text inputs clear back to `null` instead of storing `""`. */
function toNullableText(value: string | number) {
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
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name">Course title</FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="!field.state.meta.isValid"
              placeholder="Introduction to…"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldError
              v-if="!field.state.meta.isValid"
              :errors="field.state.meta.errors"
            />
          </Field>
        </template>
      </form.Field>

      <form.Field name="description">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name">Description</FieldLabel>
            <Textarea
              :id="field.name"
              :model-value="field.state.value ?? ''"
              :aria-invalid="!field.state.meta.isValid"
              placeholder="What will students learn?"
              @update:model-value="
                (value) => field.handleChange(toNullableText(value))
              "
              @blur="field.handleBlur"
            />
            <FieldDescription
              >Describe the course and its learning outcomes.</FieldDescription
            >
            <FieldError
              v-if="!field.state.meta.isValid"
              :errors="field.state.meta.errors"
            />
          </Field>
        </template>
      </form.Field>

      <div class="grid gap-6 sm:grid-cols-2">
        <form.Field name="category">
          <template #default="{ field }">
            <Field :data-invalid="!field.state.meta.isValid">
              <FieldLabel :for="field.name">Category</FieldLabel>
              <Input
                :id="field.name"
                :model-value="field.state.value ?? ''"
                :aria-invalid="!field.state.meta.isValid"
                placeholder="Design, science, business…"
                @update:model-value="
                  (value) => field.handleChange(toNullableText(value))
                "
                @blur="field.handleBlur"
              />
              <FieldError
                v-if="!field.state.meta.isValid"
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
            <Field :data-invalid="!field.state.meta.isValid">
              <FieldLabel :for="field.name">Thumbnail URL</FieldLabel>
              <Input
                :id="field.name"
                :model-value="field.state.value ?? ''"
                :aria-invalid="!field.state.meta.isValid"
                type="url"
                :placeholder="thumbnailPlaceholder"
                @update:model-value="
                  (value) => field.handleChange(toNullableText(value))
                "
                @blur="field.handleBlur"
              />
              <FieldError
                v-if="!field.state.meta.isValid"
                :errors="field.state.meta.errors"
              />
            </Field>
          </template>
        </form.Field>

        <form.Field name="price">
          <template #default="{ field }">
            <Field :data-invalid="!field.state.meta.isValid">
              <FieldLabel :for="field.name">Price</FieldLabel>
              <Input
                :id="field.name"
                :model-value="field.state.value ?? 0"
                :aria-invalid="!field.state.meta.isValid"
                type="number"
                min="0"
                step="0.01"
                @update:model-value="
                  (value) => field.handleChange(toPrice(value))
                "
                @blur="field.handleBlur"
              />
              <FieldError
                v-if="!field.state.meta.isValid"
                :errors="field.state.meta.errors"
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
