<script setup lang="ts">
import SignupForm from '@/components/auth/SignupForm.vue'
import { Card, CardContent } from '@/components/ui/card'

definePageMeta({ layout: 'auth', middleware: 'guest' })
</script>

<template>
  <div class="flex justify-center">
    <Card class="w-full max-w-sm">
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  </div>
</template>
