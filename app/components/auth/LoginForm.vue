<script setup lang="ts">
import { GalleryVerticalEnd } from '@lucide/vue'
import { revalidateLogic, useForm } from '@tanstack/vue-form'
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
import { resolveSafeRedirect } from '@/lib/redirect'
import type { AuthProvidersResponse } from '#shared/types/auth'
import { loginSchema } from '#shared/validation/auth'
import type { LoginValues } from '#shared/validation/auth'

const route = useRoute()

const redirectTo = computed(() => resolveSafeRedirect(route.query.redirect))

const serverError = shallowRef('')

// Create the form before awaiting provider data so its lifecycle hooks register in setup.
const form = useForm({
  defaultValues: { email: '', password: '' } satisfies LoginValues,
  validationLogic: revalidateLogic(),
  validators: { onDynamic: loginSchema },
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
</script>

<template>
  <form
    class="flex flex-col gap-6"
    novalidate
    @submit.prevent="form.handleSubmit()"
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
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> Email </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="!field.state.meta.isValid"
              type="email"
              placeholder="m@example.com"
              autocomplete="email"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldError
              v-if="!field.state.meta.isValid"
              :errors="field.state.meta.errors"
            />
          </Field>
        </template>
      </form.Field>
      <form.Field name="password">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> Password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="!field.state.meta.isValid"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              @update:model-value="(value) => field.handleChange(String(value))"
              @blur="field.handleBlur"
            />
            <FieldError
              v-if="!field.state.meta.isValid"
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
      <FieldError v-if="serverError">{{ serverError }}</FieldError>
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
