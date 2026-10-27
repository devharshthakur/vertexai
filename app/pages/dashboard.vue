<script setup lang="ts">
import { BookOpenIcon } from '@lucide/vue'
import EnrolledCourseCard from '@/components/course/EnrolledCourseCard.vue'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { useAuthSessionState } from '@/composables/useAuthSession'
import { useMyEnrollments } from '@/composables/useEnrollment'

definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'Your dashboard · VertexAI',
  description: 'Your learning space on VertexAI.'
})

const session = useAuthSessionState()
const { data: enrollments, pending, error, refresh } = useMyEnrollments()

defineExpose({ enrollments, pending, error, refresh })

const firstName = computed(
  () => session.value?.user.name?.trim().split(/\s+/)[0] ?? 'there'
)

const coursesDescription = computed(() =>
  enrollments.value.length === 0
    ? 'Courses you join will appear here.'
    : 'Pick up where you left off.'
)
</script>

<template>
  <div class="flex flex-col gap-10">
    <header
      class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
    >
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-muted-foreground">Your dashboard</p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back, {{ firstName }}.
        </h1>
        <p class="max-w-2xl text-muted-foreground">
          Your learning home is ready. Find a course to get started.
        </p>
      </div>

      <Button variant="outline" as-child>
        <NuxtLink to="/courses">Explore courses</NuxtLink>
      </Button>
    </header>

    <Separator />

    <section class="flex flex-col gap-4" aria-labelledby="courses-heading">
      <div class="flex flex-col gap-1">
        <h2 id="courses-heading" class="text-xl font-semibold tracking-tight">
          Your courses
        </h2>
        <p class="text-sm text-muted-foreground">{{ coursesDescription }}</p>
      </div>

      <Empty v-if="enrollments.length === 0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenIcon />
          </EmptyMedia>
          <EmptyTitle>Your learning starts with a course</EmptyTitle>
          <EmptyDescription>
            Enrolled courses and learning progress will show up here. Browse the
            catalog and choose what you would like to learn next.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button as-child>
            <NuxtLink to="/courses">Browse courses</NuxtLink>
          </Button>
        </EmptyContent>
      </Empty>

      <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <EnrolledCourseCard
          v-for="enrollment in enrollments"
          :key="enrollment.id"
          :enrollment="enrollment"
        />
      </div>
    </section>
  </div>
</template>
