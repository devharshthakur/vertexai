<script setup lang="ts">
import { BookOpenIcon, CircleAlertIcon } from '@lucide/vue'
import EnrolledCourseCard from '@/components/course/EnrolledCourseCard.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthSessionState } from '@/composables/useAuthSession'
import { useMyEnrollments } from '@/composables/useEnrollment'

definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'Your dashboard · VertexAI',
  description: 'Your learning space on VertexAI.'
})

const session = useAuthSessionState()
const {
  data: enrollments,
  pending,
  status,
  error,
  refresh
} = useMyEnrollments()

defineExpose({ enrollments, pending, error, refresh })

const firstName = computed(
  () => session.value?.user.name?.trim().split(/\s+/)[0] ?? 'there'
)

/**
 * `pending` alone leaves a cold client load showing the empty state while the
 * session resolves and the fetch has not started, so idle counts as loading.
 */
const isLoading = computed(() => pending.value || status.value === 'idle')

const coursesDescription = computed(() => {
  if (isLoading.value) {
    return 'Loading your courses…'
  }

  if (error.value) {
    return 'We could not load your courses.'
  }

  if (enrollments.value.length === 0) {
    return 'Courses you join will appear here.'
  }

  return 'Pick up where you left off.'
})
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

      <div
        v-if="isLoading"
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
      >
        <Card v-for="index in 3" :key="index">
          <CardHeader>
            <div class="flex items-center gap-2">
              <Skeleton class="h-5 w-20" />
              <Skeleton class="h-5 w-16" />
            </div>
            <Skeleton class="h-6 w-3/4" />
          </CardHeader>
          <CardContent class="mt-auto">
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-2">
                <Skeleton class="h-4 w-16" />
                <Skeleton class="h-4 w-10" />
              </div>
              <Skeleton class="h-1 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton class="h-4 w-24" />
          </CardFooter>
        </Card>
      </div>

      <Empty v-else-if="error">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>We couldn't load your courses</EmptyTitle>
          <EmptyDescription>
            Something went wrong while loading your dashboard. Please try again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" @click="refresh()">Try again</Button>
        </EmptyContent>
      </Empty>

      <Empty v-else-if="enrollments.length === 0">
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
