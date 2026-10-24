<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
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
      <div class="flex items-center gap-2">
        <Badge v-if="course.category" variant="secondary">
          {{ course.category }}
        </Badge>
        <Badge v-if="course.difficulty" variant="outline">
          {{ course.difficulty }}
        </Badge>
      </div>
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
