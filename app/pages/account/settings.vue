<script setup lang="ts">
import { KeyRoundIcon, LogOutIcon, UserRoundIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import PasswordForm from '@/components/account/PasswordForm.vue'
import ProfileForm from '@/components/account/ProfileForm.vue'
import { useAuthSessionState } from '@/composables/useAuthSession'
import { useSignOut } from '@/composables/useSignOut'

definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'Account settings · VertexAI',
  description: 'Update your profile details and password.'
})

const session = useAuthSessionState()
const { signOut } = useSignOut()
</script>

<template>
  <div class="flex flex-col gap-8">
    <header class="flex flex-col gap-2">
      <p class="text-sm font-medium text-primary">Your account</p>
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
        Account settings
      </h1>
      <p class="max-w-2xl text-muted-foreground">
        Manage your profile details and sign-in security.
      </p>
    </header>

    <div class="grid max-w-5xl gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <UserRoundIcon class="text-primary" aria-hidden="true" />
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update the name associated with your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            :name="session?.user.name ?? ''"
            :email="session?.user.email ?? ''"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <KeyRoundIcon class="text-primary" aria-hidden="true" />
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Change the password you use to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Sign out of VertexAI on this device.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="destructive" @click="signOut">
            <LogOutIcon data-icon="inline-start" />
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
