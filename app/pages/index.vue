<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import ModeToggle from '@/components/ModeToggle.vue'
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center"
  >
    <main class="flex flex-col items-center gap-6">
      <h1 class="text-4xl font-semibold tracking-tight">Hello World</h1>
      <Button variant="default">
        <CheckIcon data-icon="inline-start" />
        shadcn-vue is set up
      </Button>
      <ModeToggle />
    </main>
  </div>
</template>
