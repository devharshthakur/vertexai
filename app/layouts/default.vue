<script setup lang="ts">
  import AppContainer from '@/components/layout/AppContainer.vue'
</script>

<template>
  <div class="flex flex-1 flex-col">
    <main class="flex flex-1 flex-col py-8 sm:py-10">
      <AppContainer class="flex flex-1 flex-col">
        <slot />
      </AppContainer>
    </main>
  </div>
</template>
