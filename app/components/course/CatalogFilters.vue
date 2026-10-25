<script setup lang="ts">
import { SearchIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { COURSE_DIFFICULTIES } from '#shared/validation/courses'
import type { CatalogFilterState } from '@/composables/useCourses'

const { filters, categories } = defineProps<{
  filters: CatalogFilterState
  categories: string[]
}>()

const emit = defineEmits<{
  (e: 'update:filters', patch: Partial<CatalogFilterState>): void
}>()

/** Keep draft text locally so requests fire on submit, not on every keystroke. */
const search = ref(filters.q)

watch(
  () => filters.q,
  (value) => {
    search.value = value
  }
)

function applySearch() {
  emit('update:filters', { q: search.value.trim() })
}

function applyDifficulty(value: unknown) {
  emit('update:filters', { difficulty: toFilterValue(value) })
}

function applyCategory(value: unknown) {
  emit('update:filters', { category: toFilterValue(value) })
}

/** The "All …" entries map to an empty API filter value. */
function toFilterValue(value: unknown) {
  const selected = typeof value === 'string' ? value : ''

  return selected === 'all' ? '' : selected
}
</script>

<template>
  <form
    class="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
    @submit.prevent="applySearch"
  >
    <Field>
      <FieldLabel for="catalog-search">Search</FieldLabel>
      <Input
        id="catalog-search"
        v-model="search"
        type="search"
        placeholder="Search courses"
      />
    </Field>

    <Field class="sm:w-44">
      <FieldLabel for="catalog-category">Category</FieldLabel>
      <Select
        :model-value="filters.category || undefined"
        @update:model-value="applyCategory"
      >
        <SelectTrigger id="catalog-category" class="w-full">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem
              v-for="category in categories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>

    <Field class="sm:w-44">
      <FieldLabel for="catalog-difficulty">Difficulty</FieldLabel>
      <Select
        :model-value="filters.difficulty || undefined"
        @update:model-value="applyDifficulty"
      >
        <SelectTrigger id="catalog-difficulty" class="w-full">
          <SelectValue placeholder="All levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem
              v-for="difficulty in COURSE_DIFFICULTIES"
              :key="difficulty"
              :value="difficulty"
            >
              {{ difficulty }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>

    <Button type="submit">
      <SearchIcon data-icon="inline-start" />
      Search
    </Button>
  </form>
</template>
