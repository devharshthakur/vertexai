<script setup lang="ts">
import { GalleryVerticalEnd } from '@lucide/vue'
import { revalidateLogic, useForm } from '@tanstack/vue-form'
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
import { resolveSafeRedirect } from '@/lib/redirect'
import { signupSchema } from '#shared/validation/auth'
import type { SignupValues } from '#shared/validation/auth'

const route = useRoute()

const redirectTo = computed(() => resolveSafeRedirect(route.query.redirect))

const serverError = shallowRef('')

const form = useForm({
  defaultValues: { name: '', email: '', password: '' } satisfies SignupValues,
  validationLogic: revalidateLogic(),
  validators: { onDynamic: signupSchema },
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
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> Name </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="!field.state.meta.isValid"
              type="text"
              placeholder="Ada Lovelace"
              autocomplete="name"
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
              placeholder="At least 8 characters"
              autocomplete="new-password"
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
            {{ isSubmitting ? 'Creating account…' : 'Create account' }}
          </Button>
        </Field>
      </form.Subscribe>
      <FieldError v-if="serverError">{{ serverError }}</FieldError>
    </FieldGroup>
  </form>
</template>
