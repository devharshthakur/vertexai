<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

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
