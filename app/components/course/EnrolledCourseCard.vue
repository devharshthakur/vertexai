<script setup lang="ts">
import CourseBadges from '@/components/course/CourseBadges.vue'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { EnrollmentSummary } from '#shared/types/courses'

const { enrollment } = defineProps<{ enrollment: EnrollmentSummary }>()

const displayProgress = computed(() => {
  const value = enrollment.progressPercent

  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(Math.min(100, Math.max(0, value)))
})
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader>
      <CourseBadges
        :category="enrollment.course.category"
        :difficulty="enrollment.course.difficulty"
      />
      <CardTitle>
        <NuxtLink
          :to="`/courses/${enrollment.course.id}`"
          class="hover:underline"
        >
          {{ enrollment.course.title }}
        </NuxtLink>
      </CardTitle>
    </CardHeader>

    <CardContent class="mt-auto">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2 text-sm">
          <span class="text-muted-foreground">Progress</span>
          <span class="font-medium">{{ displayProgress }}%</span>
        </div>
        <Progress
          :model-value="displayProgress"
          :aria-label="`${enrollment.course.title} progress`"
        />
      </div>
    </CardContent>

    <CardFooter>
      <NuxtLink
        :to="`/courses/${enrollment.course.id}`"
        class="text-sm font-medium underline-offset-4 hover:underline"
      >
        View course
      </NuxtLink>
    </CardFooter>
  </Card>
</template>
