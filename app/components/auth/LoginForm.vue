<script setup lang="ts">
import { GalleryVerticalEnd } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAuthProviders } from '@/composables/useAuthProviders'
import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

const route = useRoute()

const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

const { data: providers } = await useAuthProviders()
const githubEnabled = computed(
  () => providers.value?.providers.includes('github') ?? false
)

/**
 * Only same-origin paths are accepted, so the `redirect` query parameter
 * cannot be used to bounce the visitor to another site.
 */
const redirectTo = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//')
    ? target
    : '/dashboard'
})

async function onSubmit() {
  pending.value = true
  errorMessage.value = ''

  const { error } = await authClient.signIn.email({
    email: email.value,
    password: password.value
  })

  if (error) {
    errorMessage.value = error.message ?? 'Unable to sign in.'
    pending.value = false
    return
  }

  await refreshAuthSession()
  await navigateTo(redirectTo.value)
}

async function signInWithGitHub() {
  errorMessage.value = ''

  await authClient.signIn.social({
    provider: 'github',
    callbackURL: redirectTo.value
  })
}
</script>

<template>
  <form class="flex flex-col gap-6" @submit.prevent="onSubmit">
    <FieldGroup>
      <div class="flex flex-col items-center gap-2 text-center">
        <NuxtLink to="/" class="flex flex-col items-center gap-2 font-medium">
          <div class="flex size-8 items-center justify-center rounded-md">
            <GalleryVerticalEnd class="size-6" />
          </div>
          <span class="sr-only">VertexAI</span>
        </NuxtLink>
        <h1 class="text-xl font-bold">Welcome back</h1>
        <FieldDescription>
          Don't have an account?
          <NuxtLink to="/auth/signup" class="underline underline-offset-4">
            Sign up
          </NuxtLink>
        </FieldDescription>
      </div>
      <Field>
        <FieldLabel for="email"> Email </FieldLabel>
        <Input
          id="email"
          v-model="email"
          type="email"
          placeholder="m@example.com"
          autocomplete="email"
          required
        />
      </Field>
      <Field>
        <FieldLabel for="password"> Password </FieldLabel>
        <Input
          id="password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          required
        />
      </Field>
      <Field>
        <Button type="submit" class="w-full" :disabled="pending">
          {{ pending ? 'Signing in…' : 'Sign in' }}
        </Button>
      </Field>
      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>
      <template v-if="githubEnabled">
        <FieldSeparator>Or</FieldSeparator>
        <Field>
          <Button
            variant="outline"
            type="button"
            class="w-full"
            @click="signInWithGitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="size-4 fill-current"
              aria-hidden="true"
            >
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
            </svg>
            Continue with GitHub
          </Button>
        </Field>
      </template>
    </FieldGroup>
  </form>
</template>
