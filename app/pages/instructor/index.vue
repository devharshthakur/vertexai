<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import CourseBadges from '@/components/course/CourseBadges.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import type { CourseListResult } from '#shared/types/courses'

definePageMeta({ layout: 'workspace', middleware: 'instructor' })
useSeoMeta({ title: 'Instructor workspace · VertexAI' })

const { data, pending, error, refresh } =
  await useFetch<CourseListResult>('/api/courses/mine')
</script>

<template>
  <div class="flex flex-col gap-8">
    <header
      class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-muted-foreground">
          Instructor workspace
        </p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Your courses
        </h1>
        <p class="max-w-2xl text-muted-foreground">
          Create courses, build a curriculum, and track review status.
        </p>
      </div>
      <Button as-child>
        <NuxtLink to="/instructor/courses/new">
          <PlusIcon data-icon="inline-start" />
          Create course
        </NuxtLink>
      </Button>
    </header>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>We could not load your courses</AlertTitle>
      <AlertDescription>
        <div class="flex flex-wrap items-center gap-3">
          Try again, or reload this page.
          <Button size="sm" variant="outline" @click="refresh()">Retry</Button>
        </div>
      </AlertDescription>
    </Alert>

    <div
      v-if="pending"
      class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
    >
      <Card v-for="index in 3" :key="index">
        <CardHeader>
          <div class="flex flex-col gap-3">
            <Skeleton class="h-5 w-24" />
            <Skeleton class="h-6 w-3/4" />
          </div>
        </CardHeader>
        <CardContent><Skeleton class="h-4 w-full" /></CardContent>
        <CardFooter><Skeleton class="h-4 w-24" /></CardFooter>
      </Card>
    </div>

    <Empty v-else-if="!error && data?.items.length === 0">
      <EmptyHeader>
        <EmptyTitle>Your first course starts here</EmptyTitle>
        <EmptyDescription>
          Courses you create will appear here. New courses are submitted for
          admin review.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button as-child
          ><NuxtLink to="/instructor/courses/new"
            >Create a course</NuxtLink
          ></Button
        >
      </EmptyContent>
    </Empty>

    <div v-else-if="data" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Card v-for="course in data.items" :key="course.id" class="flex flex-col">
        <CardHeader>
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <CourseBadges
                :category="course.category"
                :difficulty="course.difficulty"
              />
              <Badge
                :variant="
                  course.status === 'approved' ? 'default' : 'secondary'
                "
              >
                {{ course.status }}
              </Badge>
            </div>
            <CardTitle>
              <NuxtLink
                :to="`/instructor/courses/${course.id}`"
                class="hover:underline"
              >
                {{ course.title }}
              </NuxtLink>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent class="mt-auto">
          <p
            v-if="course.description"
            class="line-clamp-3 text-sm text-muted-foreground"
          >
            {{ course.description }}
          </p>
          <p v-else class="text-sm text-muted-foreground">
            No description yet.
          </p>
        </CardContent>
        <CardFooter>
          <NuxtLink
            :to="`/instructor/courses/${course.id}`"
            class="text-sm font-medium underline-offset-4 hover:underline"
          >
            Edit course
          </NuxtLink>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
