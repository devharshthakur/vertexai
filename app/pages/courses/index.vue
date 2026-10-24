<script setup lang="ts">
import { BookOpenIcon } from '@lucide/vue'
import CatalogFilters from '@/components/course/CatalogFilters.vue'
import CourseCard from '@/components/course/CourseCard.vue'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DEFAULT_CATALOG_FILTERS,
  useCourseCategories,
  useCourses,
  type CatalogFilterState
} from '@/composables/useCourses'

useSeoMeta({
  title: 'Courses · VertexAI',
  description: 'Browse the published course catalog.'
})

const filters = ref<CatalogFilterState>({ ...DEFAULT_CATALOG_FILTERS })

const { data: courses, pending, error } = useCourses(filters)
const { data: categories } = useCourseCategories()

/**
 * Applying a filter returns to the first page — otherwise a search on page
 * three would show an empty list.
 */
function updateFilters(patch: Partial<CatalogFilterState>) {
  filters.value = {
    ...filters.value,
    ...patch,
    page: patch.page ?? 1
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-10">
    <div class="flex flex-col gap-8">
      <header class="flex flex-col gap-2">
        <h1 class="text-3xl font-semibold tracking-tight">Course catalog</h1>
        <p class="text-muted-foreground">
          {{
            courses
              ? `${courses.total} published ${courses.total === 1 ? 'course' : 'courses'}`
              : 'Loading courses…'
          }}
        </p>
      </header>

      <CatalogFilters
        :filters="filters"
        :categories="categories"
        @update:filters="updateFilters"
      />

      <div
        v-if="pending"
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
      >
        <Skeleton v-for="index in 6" :key="index" class="h-56" />
      </div>

      <Empty v-else-if="error">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenIcon />
          </EmptyMedia>
          <EmptyTitle>The catalog is unavailable</EmptyTitle>
          <EmptyDescription>
            We could not load the courses. Please try again in a moment.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <Empty v-else-if="!courses || courses.items.length === 0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenIcon />
          </EmptyMedia>
          <EmptyTitle>No courses found</EmptyTitle>
          <EmptyDescription>
            Nothing matches these filters yet. Try a different search.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" as-child>
            <NuxtLink to="/courses">Clear filters</NuxtLink>
          </Button>
        </EmptyContent>
      </Empty>

      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CourseCard
          v-for="course in courses.items"
          :key="course.id"
          :course="course"
        />
      </div>

      <footer
        v-if="courses && courses.totalPages > 1"
        class="flex items-center justify-between gap-4 border-t border-border pt-6"
      >
        <Button
          variant="outline"
          size="sm"
          :disabled="courses.page <= 1"
          @click="updateFilters({ page: courses.page - 1 })"
        >
          Previous
        </Button>
        <p class="text-sm text-muted-foreground">
          Page {{ courses.page }} of {{ courses.totalPages }}
        </p>
        <Button
          variant="outline"
          size="sm"
          :disabled="courses.page >= courses.totalPages"
          @click="updateFilters({ page: courses.page + 1 })"
        >
          Next
        </Button>
      </footer>
    </div>
  </div>
</template>
