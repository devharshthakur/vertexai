<script setup lang="ts">
import SignupForm from '@/components/auth/SignupForm.vue'
import { Card, CardContent } from '@/components/ui/card'

definePageMeta({ middleware: 'guest' })
</script>

<template>
  <div class="flex flex-1 items-center justify-center px-6 py-12">
    <Card class="w-full max-w-sm">
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  </div>
</template>
