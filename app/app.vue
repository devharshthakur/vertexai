<script setup lang="ts">
  import AppHeader from '@/components/layout/AppHeader.vue'

  const layout = useLayout()
</script>

<template>
  <NuxtRouteAnnouncer />
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <AppHeader :variant="layout === 'auth' ? 'minimal' : 'full'" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
