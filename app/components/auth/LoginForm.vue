<script setup lang="ts">
import { GalleryVerticalEnd } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'
import type { AuthProvidersResponse } from '#shared/types/auth'
import { loginSchema } from '#shared/validation/auth'
import type { LoginValues } from '#shared/validation/auth'

const route = useRoute()

/** Accept only same-origin paths to prevent an open redirect. */
const redirectTo = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//')
    ? target
    : '/dashboard'
})

const serverError = ref('')

// Create the form before awaiting provider data so its lifecycle hooks register in setup.
const form = useForm({
  defaultValues: { email: '', password: '' } satisfies LoginValues,
  validators: { onChange: loginSchema },
  onSubmit: async ({ value }) => {
    serverError.value = ''

    const { error } = await authClient.signIn.email({
      email: value.email,
      password: value.password
    })

    if (error) {
      serverError.value = error.message ?? 'Unable to sign in.'
      return
    }

    await refreshAuthSession()
    await navigateTo(redirectTo.value)
  }
})

const hasSubmitted = form.useSelector((state) => state.submissionAttempts > 0)

const { data: providers } = await useFetch<AuthProvidersResponse>(
  '/api/auth-providers',
  { key: 'auth:providers' }
)
const githubEnabled = computed(
  () => providers.value?.providers.includes('github') ?? false
)

async function signInWithGitHub() {
  serverError.value = ''

  await authClient.signIn.social({
    provider: 'github',
    callbackURL: redirectTo.value
  })
}

/** Do not show field errors before the first submission attempt. */
function isInvalid(state: { meta: { isValid: boolean } }) {
  return hasSubmitted.value && !state.meta.isValid
}
</script>

<template>
  <form
    class="flex flex-col gap-6"
    novalidate
    @submit.prevent.stop="form.handleSubmit()"
  >
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
      <form.Field name="email">
        <template #default="{ field }">
          <Field :data-invalid="isInvalid(field.state)">
            <FieldLabel :for="field.name"> Email </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="isInvalid(field.state)"
              type="email"
              placeholder="m@example.com"
              autocomplete="email"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldError
              v-if="isInvalid(field.state)"
              :errors="field.state.meta.errors"
            />
          </Field>
        </template>
      </form.Field>
      <form.Field name="password">
        <template #default="{ field }">
          <Field :data-invalid="isInvalid(field.state)">
            <FieldLabel :for="field.name"> Password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="isInvalid(field.state)"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldError
              v-if="isInvalid(field.state)"
              :errors="field.state.meta.errors"
            />
          </Field>
        </template>
      </form.Field>
      <form.Subscribe v-slot="{ isSubmitting }">
        <Field>
          <Button type="submit" class="w-full" :disabled="isSubmitting">
            {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
          </Button>
        </Field>
      </form.Subscribe>
      <p v-if="serverError" class="text-sm text-destructive" role="alert">
        {{ serverError }}
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
            <Icon
              name="simple-icons:github"
              data-icon="inline-start"
              aria-hidden="true"
            />
            Continue with GitHub
          </Button>
        </Field>
      </template>
    </FieldGroup>
  </form>
</template>
