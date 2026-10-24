<script setup lang="ts">
import AppContainer from '@/components/layout/AppContainer.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <AppHeader />

    <main class="flex flex-1 flex-col py-8 sm:py-10">
      <AppContainer class="flex flex-1 flex-col">
        <div class="my-auto w-full">
          <slot />
        </div>
      </AppContainer>
    </main>
  </div>
</template>
