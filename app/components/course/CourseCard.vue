<script setup lang="ts">
import CourseBadges from '@/components/course/CourseBadges.vue'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import type { CourseSummary } from '#shared/types/courses'

const { course } = defineProps<{ course: CourseSummary }>()
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader>
      <CourseBadges
        :category="course.category"
        :difficulty="course.difficulty"
      />
      <CardTitle>
        <NuxtLink :to="`/courses/${course.id}`" class="hover:underline">
          {{ course.title }}
        </NuxtLink>
      </CardTitle>
    </CardHeader>

    <CardContent class="mt-auto">
      <div class="flex flex-col gap-3">
        <p
          v-if="course.description"
          class="line-clamp-3 text-sm text-muted-foreground"
        >
          {{ course.description }}
        </p>
        <p class="text-sm text-muted-foreground">
          {{ course.price > 0 ? `$${course.price}` : 'Free' }}
        </p>
      </div>
    </CardContent>

    <CardFooter>
      <NuxtLink
        :to="`/courses/${course.id}`"
        class="text-sm font-medium underline-offset-4 hover:underline"
      >
        View course
      </NuxtLink>
    </CardFooter>
  </Card>
</template>
