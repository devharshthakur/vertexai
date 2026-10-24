<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue'
import { Card, CardContent } from '@/components/ui/card'

definePageMeta({ layout: 'auth', middleware: 'guest' })
</script>

<template>
  <div class="flex justify-center">
    <Card class="w-full max-w-sm">
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  </div>
</template>
