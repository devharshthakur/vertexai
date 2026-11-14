<script setup lang="ts">
  import { BookOpenCheckIcon, ShieldCheckIcon } from '@lucide/vue'
  import AppContainer from '@/components/layout/AppContainer.vue'
  import { Button } from '@/components/ui/button'
  import { Separator } from '@/components/ui/separator'
  import { useAuthSessionState } from '@/composables/useAuthSession'
  import { APP_ROLES } from '#shared/types/auth'

  const session = useAuthSessionState()
  const isAdmin = computed(() => session.value?.user.role === APP_ROLES.ADMIN)
</script>

<template>
  <div class="flex-1">
    <AppContainer class="py-8 sm:py-10">
      <div class="flex flex-col gap-8">
        <nav aria-label="Workspace" class="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" as-child>
            <NuxtLink to="/instructor">
              <BookOpenCheckIcon data-icon="inline-start" />
              Browse your courses
            </NuxtLink>
          </Button>
          <Button v-if="isAdmin" variant="ghost" size="sm" as-child>
            <NuxtLink to="/admin/approvals">
              <ShieldCheckIcon data-icon="inline-start" />
              Course approvals
            </NuxtLink>
          </Button>
        </nav>
        <Separator />
        <main>
          <slot />
        </main>
      </div>
    </AppContainer>
  </div>
</template>
