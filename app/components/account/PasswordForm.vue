<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { passwordSchema } from '#shared/validation/auth'
import type { PasswordValues } from '#shared/validation/auth'

/** Failures reported by Better Auth, which belong to the form as a whole. */
const serverError = ref('')
const saved = ref(false)

const form = useForm({
  defaultValues: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  } satisfies PasswordValues,
  validators: { onChange: passwordSchema },
  onSubmit: async ({ value }) => {
    serverError.value = ''
    saved.value = false

    const { error } = await authClient.changePassword({
      currentPassword: value.currentPassword,
      newPassword: value.newPassword,
      revokeOtherSessions: true
    })

    if (error) {
      serverError.value = error.message ?? 'Unable to change your password.'
      return
    }

    form.reset()
    saved.value = true
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
      <form.Field name="currentPassword">
        <template #default="{ field }">
          <Field :data-invalid="isInvalid(field.state)">
            <FieldLabel :for="field.name"> Current password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="isInvalid(field.state)"
              type="password"
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
      <form.Field name="newPassword">
        <template #default="{ field }">
          <Field :data-invalid="isInvalid(field.state)">
            <FieldLabel :for="field.name"> New password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="isInvalid(field.state)"
              type="password"
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
      <form.Field name="confirmPassword">
        <template #default="{ field }">
          <Field :data-invalid="isInvalid(field.state)">
            <FieldLabel :for="field.name"> Confirm new password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="isInvalid(field.state)"
              type="password"
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
      <Field orientation="horizontal" class="flex-wrap">
        <form.Subscribe v-slot="{ isSubmitting }">
          <Button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Changing…' : 'Change password' }}
          </Button>
        </form.Subscribe>
        <p v-if="serverError" class="text-sm text-destructive" role="alert">
          {{ serverError }}
        </p>
        <p v-if="saved" class="text-sm text-muted-foreground" role="status">
          Your password has been changed.
        </p>
      </Field>
    </FieldGroup>
  </form>
</template>
