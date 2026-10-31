<script setup lang="ts">
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
import { authClient } from '@/lib/auth-client'
import { passwordSchema } from '#shared/validation/auth'
import type { PasswordValues } from '#shared/validation/auth'

const serverError = shallowRef('')
const saved = shallowRef(false)

const form = useForm({
  defaultValues: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  } satisfies PasswordValues,
  validationLogic: revalidateLogic(),
  validators: { onDynamic: passwordSchema },
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
</script>

<template>
  <form
    class="flex flex-col gap-6"
    novalidate
    @submit.prevent="form.handleSubmit()"
  >
    <FieldGroup>
      <form.Field name="currentPassword">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> Current password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="!field.state.meta.isValid"
              type="password"
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
      <form.Field name="newPassword">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> New password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="!field.state.meta.isValid"
              type="password"
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
      <form.Field name="confirmPassword">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> Confirm new password </FieldLabel>
            <Input
              :id="field.name"
              :model-value="field.state.value"
              :aria-invalid="!field.state.meta.isValid"
              type="password"
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
      <Field orientation="horizontal" class="flex-wrap">
        <form.Subscribe v-slot="{ isSubmitting }">
          <Button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Changing…' : 'Change password' }}
          </Button>
        </form.Subscribe>
        <FieldError v-if="serverError">{{ serverError }}</FieldError>
        <FieldDescription v-if="saved" role="status">
          Your password has been changed.
        </FieldDescription>
      </Field>
    </FieldGroup>
  </form>
</template>
