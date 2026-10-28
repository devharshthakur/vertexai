<script setup lang="ts">
import { CheckIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useEnroll } from '@/composables/useEnrollment'

const { courseId } = defineProps<{ courseId: string }>()

const { enroll, isPending, errorMessage, isSignedIn, isEnrolled } = useEnroll(
  () => courseId
)
</script>

<template>
  <div class="flex flex-col gap-2">
    <Button
      v-if="!isSignedIn"
      variant="outline"
      as-child
      class="w-full sm:w-auto"
    >
      <NuxtLink :to="`/auth/login?redirect=/courses/${courseId}`">
        Sign in to enroll
      </NuxtLink>
    </Button>

    <Button
      v-else-if="isEnrolled"
      variant="secondary"
      disabled
      class="w-full sm:w-auto"
    >
      <CheckIcon data-icon="inline-start" />
      Enrolled
    </Button>

    <Button
      v-else
      class="w-full sm:w-auto"
      :disabled="isPending"
      @click="enroll"
    >
      <Spinner v-if="isPending" data-icon="inline-start" />
      {{ isPending ? 'Enrolling…' : 'Enroll for free' }}
    </Button>

    <p v-if="errorMessage" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>

    <NuxtLink
      v-if="isEnrolled"
      to="/dashboard"
      class="text-sm font-medium underline-offset-4 hover:underline"
    >
      Go to your dashboard
    </NuxtLink>
  </div>
</template>
