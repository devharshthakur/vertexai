<script setup lang="ts">
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
import { profileSchema } from '#shared/validation/auth'
import type { ProfileValues } from '#shared/validation/auth'

const props = defineProps<{
  name: string
  email: string
}>()

/** Failures reported by Better Auth, which belong to the form as a whole. */
const serverError = ref('')
const saved = ref(false)

const form = useForm({
  defaultValues: { name: props.name } satisfies ProfileValues,
  validators: { onChange: profileSchema },
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
    id="profile-settings-form"
    class="flex flex-col gap-6"
    novalidate
    @submit.prevent.stop="form.handleSubmit()"
  >
    <FieldGroup>
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
      <Field>
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
        <p v-if="serverError" class="text-sm text-destructive" role="alert">
          {{ serverError }}
        </p>
        <p v-if="saved" class="text-sm text-muted-foreground" role="status">
          Your profile has been updated.
        </p>
      </Field>
    </FieldGroup>
  </form>
</template>
