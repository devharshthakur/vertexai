<script setup lang="ts">
import { GalleryVerticalEnd } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

const route = useRoute()

const name = ref('')
const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

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

  const { error } = await authClient.signUp.email({
    name: name.value,
    email: email.value,
    password: password.value
  })

  if (error) {
    errorMessage.value = error.message ?? 'Unable to create the account.'
    pending.value = false
    return
  }

  await refreshAuthSession()
  await navigateTo(redirectTo.value)
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
        <h1 class="text-xl font-bold">Create your account</h1>
        <FieldDescription>
          Already have an account?
          <NuxtLink to="/auth/login" class="underline underline-offset-4">
            Sign in
          </NuxtLink>
        </FieldDescription>
      </div>
      <Field>
        <FieldLabel for="name"> Name </FieldLabel>
        <Input
          id="name"
          v-model="name"
          type="text"
          placeholder="Ada Lovelace"
          autocomplete="name"
          required
        />
      </Field>
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
          placeholder="At least 8 characters"
          autocomplete="new-password"
          minlength="8"
          required
        />
      </Field>
      <Field>
        <Button type="submit" class="w-full" :disabled="pending">
          {{ pending ? 'Creating account…' : 'Create account' }}
        </Button>
      </Field>
      <p v-if="errorMessage" class="text-sm text-destructive" role="alert">
        {{ errorMessage }}
      </p>
    </FieldGroup>
  </form>
</template>
