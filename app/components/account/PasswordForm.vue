<script setup lang="ts">
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { toast } from 'vue-sonner'
  import { Button } from '@/components/ui/button'
  import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Spinner } from '@/components/ui/spinner'
  import { authClient } from '@/lib/auth-client'
  import { passwordSchema } from '#shared/validation/auth'
  import type { PasswordValues } from '#shared/validation/auth'

  const { mutateAsync: changePassword } = useMutation({
    mutationFn: async (values: PasswordValues) => {
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true
      })
      if (error) throw new Error(error.message ?? 'Unable to change your password.')
    },
    onSuccess: () => {
      form.reset()
      toast.success('Password changed.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to change your password.')
    }
  })

  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    } satisfies PasswordValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: passwordSchema },
    onSubmit: async ({ value }) => {
      try {
        await changePassword(value)
      } catch {
        // The mutation reports the failure.
      }
    }
  })
</script>

<template>
  <form class="flex flex-col gap-6" novalidate @submit.prevent="form.handleSubmit()">
    <FieldGroup>
      <form.Field name="currentPassword">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> Current password </FieldLabel>
            <Input :id="field.name" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" type="password" autocomplete="current-password" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
            <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
          </Field>
        </template>
      </form.Field>
      <form.Field name="newPassword">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> New password </FieldLabel>
            <Input :id="field.name" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" type="password" autocomplete="new-password" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
            <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
          </Field>
        </template>
      </form.Field>
      <form.Field name="confirmPassword">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> Confirm new password </FieldLabel>
            <Input :id="field.name" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" type="password" autocomplete="new-password" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
            <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
          </Field>
        </template>
      </form.Field>
      <Field orientation="horizontal" class="flex-wrap">
        <form.Subscribe v-slot="{ isSubmitting }">
          <Button type="submit" :disabled="isSubmitting">
            <Spinner v-if="isSubmitting" data-icon="inline-start" />
            {{ isSubmitting ? 'Changing…' : 'Change password' }}
          </Button>
        </form.Subscribe>
      </Field>
    </FieldGroup>
  </form>
</template>
