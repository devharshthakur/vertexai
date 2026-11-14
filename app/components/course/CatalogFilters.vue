<script setup lang="ts">
  import { SearchIcon } from '@lucide/vue'
  import { Button } from '@/components/ui/button'
  import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
  import { COURSE_DIFFICULTIES } from '#shared/validation/courses'
  import type { CatalogFilterState } from '@/lib/catalog'

  const filters = defineModel<CatalogFilterState>('filters', { required: true })
  const { categories } = defineProps<{
    categories: string[]
  }>()

  /** Keep draft text locally so requests fire on submit, not on every keystroke. */
  const search = shallowRef(filters.value.q)

  watch(
    () => filters.value.q,
    (value) => {
      search.value = value
    }
  )

  function updateFilters(patch: Partial<CatalogFilterState>) {
    filters.value = { ...filters.value, ...patch, page: 1 }
  }

  function applySearch() {
    updateFilters({ q: search.value.trim() })
  }

  function applyDifficulty(value: unknown) {
    updateFilters({ difficulty: toFilterValue(value) })
  }

  function applyCategory(value: unknown) {
    updateFilters({ category: toFilterValue(value) })
  }

  /** The "All …" entries map to an empty API filter value. */
  function toFilterValue(value: unknown) {
    const selected = typeof value === 'string' ? value : ''

    return selected === 'all' ? '' : selected
  }
</script>

<template>
  <form @submit.prevent="applySearch">
    <FieldGroup class="sm:flex-row sm:items-end">
      <Field class="flex-1">
        <FieldLabel for="catalog-search">Search</FieldLabel>
        <Input id="catalog-search" v-model="search" type="search" placeholder="Search courses" />
      </Field>

      <Field class="sm:w-44">
        <FieldLabel for="catalog-category">Category</FieldLabel>
        <Select :model-value="filters.category || undefined" @update:model-value="applyCategory">
          <SelectTrigger id="catalog-category" class="w-full">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem v-for="category in categories" :key="category" :value="category">
                {{ category }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field class="sm:w-44">
        <FieldLabel for="catalog-difficulty">Difficulty</FieldLabel>
        <Select :model-value="filters.difficulty || undefined" @update:model-value="applyDifficulty">
          <SelectTrigger id="catalog-difficulty" class="w-full">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem v-for="difficulty in COURSE_DIFFICULTIES" :key="difficulty" :value="difficulty">
                {{ difficulty }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Button type="submit" class="sm:self-end">
        <SearchIcon data-icon="inline-start" />
        Search
      </Button>
    </FieldGroup>
  </form>
</template>
