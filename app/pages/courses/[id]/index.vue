<script setup lang="ts">
import { BookOpenIcon } from '@lucide/vue'
import EnrollButton from '@/components/course/EnrollButton.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
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
import { useCourse } from '@/composables/useCourse'

const route = useRoute()
const courseId = computed(() => String(route.params.id))

const { data: course, pending, error } = useCourse(courseId)

const lectureCount = computed(
  () =>
    course.value?.modules.reduce(
      (total, module) => total + module.lectures.length,
      0
    ) ?? 0
)

useSeoMeta({
  title: () =>
    course.value
      ? `${course.value.course.title} · VertexAI`
      : 'Course · VertexAI',
  description: () => course.value?.course.description ?? 'Course details.'
})
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-10">
    <div v-if="pending" class="flex flex-col gap-6" aria-busy="true">
      <Skeleton class="h-10 w-2/3" />
      <Skeleton class="h-40 w-full" />
    </div>

    <Empty v-else-if="error || !course">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpenIcon />
        </EmptyMedia>
        <EmptyTitle>Course not found</EmptyTitle>
        <EmptyDescription>
          This course does not exist or is not published yet.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" as-child>
          <NuxtLink to="/courses">Back to the catalog</NuxtLink>
        </Button>
      </EmptyContent>
    </Empty>

    <div v-else class="flex flex-col gap-8">
      <header class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <Badge v-if="course.course.category" variant="secondary">
            {{ course.course.category }}
          </Badge>
          <Badge v-if="course.course.difficulty" variant="outline">
            {{ course.course.difficulty }}
          </Badge>
        </div>

        <h1 class="text-3xl font-semibold tracking-tight">
          {{ course.course.title }}
        </h1>

        <p v-if="course.course.description" class="text-muted-foreground">
          {{ course.course.description }}
        </p>

        <EnrollButton :course-id="course.course.id" />
      </header>

      <Separator />

      <section class="flex flex-col gap-4">
        <h2 class="text-lg font-semibold tracking-tight">Curriculum</h2>

        <Card v-if="course.modules.length === 0">
          <CardHeader>
            <CardTitle>No modules yet</CardTitle>
            <CardDescription>
              The instructor is still building this course.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card v-for="module in course.modules" :key="module.id">
          <CardHeader>
            <CardTitle>{{ module.title }}</CardTitle>
            <CardDescription>
              {{ module.lectures.length }}
              {{ module.lectures.length === 1 ? 'lecture' : 'lectures' }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol class="flex flex-col gap-2">
              <li
                v-for="lecture in module.lectures"
                :key="lecture.id"
                class="text-sm text-muted-foreground"
              >
                {{ lecture.title }}
              </li>
            </ol>
          </CardContent>
        </Card>

        <p
          v-if="course.modules.length > 0"
          class="text-sm text-muted-foreground"
        >
          {{ lectureCount }}
          {{ lectureCount === 1 ? 'lecture' : 'lectures' }} in total.
        </p>
      </section>
    </div>
  </div>
</template>
