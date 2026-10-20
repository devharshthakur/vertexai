<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  useAuthSession,
  refreshAuthSession
} from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

definePageMeta({ middleware: 'auth' })

const { data: session } = await useAuthSession()

async function signOut() {
  await authClient.signOut()
  await refreshAuthSession()
  await navigateTo('/')
}
</script>

<template>
  <div class="flex flex-1 items-center justify-center px-6 py-12">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>Your workspace</CardTitle>
        <CardDescription>
          You are signed in. The LMS modules land here next.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <dl class="grid gap-2 text-sm">
          <div class="flex justify-between gap-4">
            <dt class="text-muted-foreground">Name</dt>
            <dd class="font-medium">{{ session?.user.name }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted-foreground">Email</dt>
            <dd class="font-medium">{{ session?.user.email }}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-muted-foreground">Role</dt>
            <dd class="font-medium">{{ session?.user.role ?? 'student' }}</dd>
          </div>
        </dl>
        <Button variant="outline" class="w-full" @click="signOut">
          Sign out
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
