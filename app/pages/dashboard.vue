<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  useAuthSession,
  refreshAuthSession
} from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

definePageMeta({ middleware: 'auth' })

const { data: session } = await useAuthSession()

const firstName = computed(
  () => session.value?.user.name?.trim().split(/\s+/)[0] ?? 'there'
)

async function signOut() {
  await authClient.signOut()
  await refreshAuthSession()
  await navigateTo('/')
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-12">
    <div class="flex flex-col gap-12">
      <header class="flex flex-col gap-2">
        <p class="text-sm text-muted-foreground">Dashboard</p>
        <h1 class="text-3xl font-semibold tracking-tight">
          Welcome back, {{ firstName }}
        </h1>
        <p class="text-muted-foreground">
          You are signed in. The LMS modules land here next.
        </p>
      </header>

      <section class="flex flex-col gap-4">
        <h2
          class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
        >
          Your account
        </h2>
        <dl class="flex flex-col divide-y divide-border">
          <div class="flex items-baseline justify-between gap-6 py-3">
            <dt class="text-sm text-muted-foreground">Name</dt>
            <dd class="text-sm font-medium">{{ session?.user.name }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-6 py-3">
            <dt class="text-sm text-muted-foreground">Email</dt>
            <dd class="text-sm font-medium">{{ session?.user.email }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-6 py-3">
            <dt class="text-sm text-muted-foreground">Role</dt>
            <dd class="text-sm font-medium">
              {{ session?.user.role ?? 'student' }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="flex flex-col gap-4">
        <h2
          class="text-xs font-medium tracking-wider text-muted-foreground uppercase"
        >
          Your courses
        </h2>
        <p class="text-sm text-muted-foreground">
          Enrolled courses, progress and streaks will appear here.
        </p>
      </section>

      <footer class="border-t border-border pt-6">
        <Button variant="ghost" size="sm" @click="signOut">Sign out</Button>
      </footer>
    </div>
  </div>
</template>
