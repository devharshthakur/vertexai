<script setup lang="ts">
import { Button } from '@/components/ui/button'
import ModeToggle from '@/components/ModeToggle.vue'
import {
  refreshAuthSession,
  useAuthSession
} from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

const { data: session } = await useAuthSession()

async function signOut() {
  await authClient.signOut()
  await refreshAuthSession()
  await navigateTo('/')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <header class="border-b">
      <div
        class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6"
      >
        <NuxtLink to="/" class="text-sm font-semibold tracking-tight">
          VertexAI
        </NuxtLink>
        <nav class="flex items-center gap-2">
          <NuxtLink
            to="/courses"
            class="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline"
          >
            Courses
          </NuxtLink>
          <template v-if="session">
            <span class="hidden text-sm text-muted-foreground sm:inline">
              {{ session.user.email }}
            </span>
            <Button variant="outline" size="sm" as-child>
              <NuxtLink to="/dashboard">Dashboard</NuxtLink>
            </Button>
            <Button variant="outline" size="sm" @click="signOut">
              Sign out
            </Button>
          </template>
          <template v-else>
            <Button variant="ghost" size="sm" as-child>
              <NuxtLink to="/auth/login">Sign in</NuxtLink>
            </Button>
            <Button size="sm" as-child>
              <NuxtLink to="/auth/signup">Sign up</NuxtLink>
            </Button>
          </template>
          <ModeToggle />
        </nav>
      </div>
    </header>
    <main class="flex flex-1 flex-col">
      <slot />
    </main>
  </div>
</template>
