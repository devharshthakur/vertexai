<script setup lang="ts">
import { GalleryVerticalEnd } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'
import { signupSchema } from '#shared/validation/auth'
import type { SignupValues } from '#shared/validation/auth'

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
  defaultValues: { name: '', email: '', password: '' } satisfies SignupValues,
  validators: { onChange: signupSchema },
  onSubmit: async ({ value }) => {
    serverError.value = ''

    const { error } = await authClient.signUp.email({
      name: value.name,
      email: value.email,
      password: value.password
    })

    if (error) {
      serverError.value = error.message ?? 'Unable to create the account.'
      return
    }

    await refreshAuthSession()
    await navigateTo(redirectTo.value)
  }
})

const hasSubmitted = form.useSelector((state) => state.submissionAttempts > 0)

/**
 * Field errors stay hidden until the visitor submits the form. The form-level
 * schema still runs on change, so messages can be corrected immediately after
 * that first attempt.
 */
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
        <h1 class="text-xl font-bold">Create your account</h1>
        <FieldDescription>
          Already have an account?
          <NuxtLink to="/auth/login" class="underline underline-offset-4">
            Sign in
          </NuxtLink>
        </FieldDescription>
      </div>
      <form.Field name="name">
        <template #default="{ field }">
          <Field :data-invalid="isInvalid(field.state)">
            <FieldLabel :for="field.name"> Name </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="isInvalid(field.state)"
              type="text"
              placeholder="Ada Lovelace"
              autocomplete="name"
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
              placeholder="At least 8 characters"
              autocomplete="new-password"
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
            {{ isSubmitting ? 'Creating account…' : 'Create account' }}
          </Button>
        </Field>
      </form.Subscribe>
      <p v-if="serverError" class="text-sm text-destructive" role="alert">
        {{ serverError }}
      </p>
    </FieldGroup>
  </form>
</template>
