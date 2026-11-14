<script setup lang="ts">
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { watch } from 'vue'
  import { toast } from 'vue-sonner'
  import { Button } from '@/components/ui/button'
  import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Spinner } from '@/components/ui/spinner'
  import { refreshAuthSession } from '@/composables/useAuthSession'
  import { authClient } from '@/lib/auth-client'
  import { profileSchema } from '#shared/validation/auth'
  import type { ProfileValues } from '#shared/validation/auth'

  const props = defineProps<{
    name: string
    email: string
  }>()

  const { mutateAsync: updateProfile } = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await authClient.updateUser({ name })
      if (error) throw new Error(error.message ?? 'Unable to update your profile.')
    },
    onSuccess: async () => {
      await refreshAuthSession()
      toast.success('Profile updated.')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to update your profile.')
    }
  })

  const form = useForm({
    defaultValues: { name: props.name } satisfies ProfileValues,
    validationLogic: revalidateLogic(),
    validators: { onDynamic: profileSchema },
    onSubmit: async ({ value }) => {
      try {
        await updateProfile(value.name)
      } catch {
        // The mutation reports the failure.
      }
    }
  })

  watch(
    () => props.name,
    (name) => form.reset({ name })
  )
</script>

<template>
  <form id="profile-settings-form" class="flex flex-col gap-6" novalidate @submit.prevent="form.handleSubmit()">
    <FieldGroup>
      <form.Field name="name">
        <template #default="{ field }">
          <Field :data-invalid="!field.state.meta.isValid">
            <FieldLabel :for="field.name"> Name </FieldLabel>
            <Input :id="field.name" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" type="text" placeholder="Ada Lovelace" autocomplete="name" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
            <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
          </Field>
        </template>
      </form.Field>
      <Field data-disabled="true">
        <FieldLabel for="email"> Email </FieldLabel>
        <Input id="email" :model-value="email" type="email" autocomplete="email" disabled />
        <FieldDescription>The email address cannot be changed.</FieldDescription>
      </Field>
      <Field orientation="horizontal" class="flex-wrap">
        <form.Subscribe v-slot="{ isSubmitting }">
          <Button type="submit" :disabled="isSubmitting">
            <Spinner v-if="isSubmitting" data-icon="inline-start" />
            {{ isSubmitting ? 'Saving…' : 'Save changes' }}
          </Button>
        </form.Subscribe>
      </Field>
    </FieldGroup>
  </form>
</template>
