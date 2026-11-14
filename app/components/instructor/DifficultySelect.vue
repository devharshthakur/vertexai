<script setup lang="ts">
  import { COURSE_DIFFICULTIES, type CourseDifficulty } from '#shared/validation/courses'
  import { Field, FieldError, FieldLabel } from '@/components/ui/field'
  import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

  const { invalid = false, errors = [] } = defineProps<{
    invalid?: boolean
    errors?: Array<string | { message: string | undefined } | undefined>
  }>()

  const difficulty = defineModel<CourseDifficulty | null>({ default: null })
</script>

<template>
  <Field :data-invalid="invalid">
    <FieldLabel for="difficulty">Difficulty</FieldLabel>
    <Select v-model="difficulty">
      <SelectTrigger id="difficulty" :aria-invalid="invalid">
        <SelectValue placeholder="Choose a level" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem v-for="option in COURSE_DIFFICULTIES" :key="option" :value="option"> {{ option[0]?.toUpperCase() }}{{ option.slice(1) }} </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
    <FieldError v-if="invalid" :errors="errors" />
  </Field>
</template>
