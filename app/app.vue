<script setup lang="ts">
  import 'vue-sonner/style.css'
  import AppHeader from '@/components/layout/AppHeader.vue'
  import { Toaster } from '@/components/ui/sonner'

  const layout = useLayout()
</script>

<template>
  <NuxtRouteAnnouncer />
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <AppHeader :variant="layout === 'auth' ? 'minimal' : 'full'" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster position="top-right" />
  </div>
</template>
