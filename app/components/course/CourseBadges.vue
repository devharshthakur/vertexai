<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

/**
 * The category and difficulty chips of a course.
 *
 * The catalog card and the course page show the same pair, so they render it
 * from one component and stay in step when a chip is added or restyled.
 */
const { category, difficulty } = defineProps<{
  category: string | null
  difficulty: string | null
}>()
</script>

<template>
  <div v-if="category || difficulty" class="flex items-center gap-2">
    <Badge v-if="category" variant="secondary">
      {{ category }}
    </Badge>
    <Badge v-if="difficulty" variant="outline">
      {{ difficulty }}
    </Badge>
  </div>
</template>
