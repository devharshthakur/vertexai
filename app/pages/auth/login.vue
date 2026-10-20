<script setup lang="ts">
import LoginForm from '@/components/auth/LoginForm.vue'
import { Card, CardContent } from '@/components/ui/card'

definePageMeta({ middleware: 'guest' })
</script>

<template>
  <div class="flex flex-1 items-center justify-center px-6 py-12">
    <Card class="w-full max-w-sm">
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  </div>
</template>
