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
import { useAuthProviders } from '@/composables/useAuthProviders'
import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'
import { toErrorMessages } from '@/lib/form-errors'
import { loginSchema } from '#shared/validation/auth'
import type { LoginValues } from '#shared/validation/auth'

const route = useRoute()

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

/** Failures reported by Better Auth, which belong to the form as a whole. */
const serverError = ref('')

/**
 * The form is created before the first `await`: `useForm` registers a mount
 * hook, and Vue drops the current component instance across an `await`.
 *
 * The Zod schema is attached as a form-level validator, so TanStack Form
 * spreads its issues over the matching fields and blocks the submission
 * while any of them fails.
 */
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

const { data: providers } = await useAuthProviders()
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

/**
 * Field errors stay hidden until the visitor reaches the field. The form-level
 * schema already flags fields that have not been filled in yet, and reporting
 * those would show problems the visitor cannot act on yet.
 */
function fieldErrors(state: { meta: { isTouched: boolean; errors: unknown } }) {
  return state.meta.isTouched ? toErrorMessages(state.meta.errors) : []
}
</script>

<template>
  <form class="flex flex-col gap-6" @submit.prevent.stop="form.handleSubmit()">
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
          <Field :data-invalid="fieldErrors(field.state).length > 0">
            <FieldLabel :for="field.name"> Email </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="fieldErrors(field.state).length > 0"
              type="email"
              placeholder="m@example.com"
              autocomplete="email"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldError :errors="fieldErrors(field.state)" />
          </Field>
        </template>
      </form.Field>
      <form.Field name="password">
        <template #default="{ field }">
          <Field :data-invalid="fieldErrors(field.state).length > 0">
            <FieldLabel :for="field.name"> Password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="fieldErrors(field.state).length > 0"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldError :errors="fieldErrors(field.state)" />
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
