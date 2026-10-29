<script setup lang="ts">
import {
  COURSE_DIFFICULTIES,
  type CourseDifficulty
} from '#shared/validation/courses'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

const difficulty = defineModel<CourseDifficulty | null>({ default: null })
</script>

<template>
  <Field>
    <FieldLabel for="difficulty">Difficulty</FieldLabel>
    <Select v-model="difficulty">
      <SelectTrigger id="difficulty">
        <SelectValue placeholder="Choose a level" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem
            v-for="option in COURSE_DIFFICULTIES"
            :key="option"
            :value="option"
          >
            {{ option[0]?.toUpperCase() }}{{ option.slice(1) }}
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </Field>
</template>
