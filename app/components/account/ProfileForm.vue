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
import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'
import { profileSchema } from '#shared/validation/auth'
import type { ProfileValues } from '#shared/validation/auth'

const props = defineProps<{
  name: string
  email: string
}>()

const serverError = shallowRef('')
const saved = shallowRef(false)

const form = useForm({
  defaultValues: { name: props.name } satisfies ProfileValues,
  validationLogic: revalidateLogic(),
  validators: { onDynamic: profileSchema },
  onSubmit: async ({ value }) => {
    serverError.value = ''
    saved.value = false

    const { error } = await authClient.updateUser({ name: value.name })

    if (error) {
      serverError.value = error.message ?? 'Unable to update your profile.'
      return
    }

    await refreshAuthSession()
    saved.value = true
  }
})
</script>

<template>
  <form
    id="profile-settings-form"
    class="flex flex-col gap-6"
    novalidate
    @submit.prevent="form.handleSubmit()"
  >
    <FieldGroup>
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
      <Field data-disabled="true">
        <FieldLabel for="email"> Email </FieldLabel>
        <Input
          id="email"
          :model-value="email"
          type="email"
          autocomplete="email"
          disabled
        />
        <FieldDescription
          >The email address cannot be changed.</FieldDescription
        >
      </Field>
      <Field orientation="horizontal" class="flex-wrap">
        <form.Subscribe v-slot="{ isSubmitting }">
          <Button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving…' : 'Save changes' }}
          </Button>
        </form.Subscribe>
        <FieldError v-if="serverError">{{ serverError }}</FieldError>
        <FieldDescription v-if="saved" role="status">
          Your profile has been updated.
        </FieldDescription>
      </Field>
    </FieldGroup>
  </form>
</template>
