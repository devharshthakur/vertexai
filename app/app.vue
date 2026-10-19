<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'
</script>

<template>
  <div
    class="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground"
  >
    <NuxtRouteAnnouncer />
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
