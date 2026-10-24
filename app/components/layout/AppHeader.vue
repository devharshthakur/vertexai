<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { LogOutIcon, UserCogIcon, UserRoundIcon } from '@lucide/vue'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import AppContainer from '@/components/layout/AppContainer.vue'
import ModeToggle from '@/components/ModeToggle.vue'
import { useAuthSession } from '@/composables/useAuthSession'
import { useSignOut } from '@/composables/useSignOut'

const props = withDefaults(
  defineProps<{
    variant?: 'full' | 'minimal'
    class?: HTMLAttributes['class']
  }>(),
  { variant: 'full', class: undefined }
)

const { data: session } = await useAuthSession()
const { signOut } = useSignOut()
</script>

<template>
  <header :class="cn('border-b', props.class)">
    <AppContainer class="flex h-14 items-center justify-between gap-4">
      <NuxtLink to="/" class="text-sm font-semibold tracking-tight">
        VertexAI
      </NuxtLink>

      <div class="flex items-center gap-2">
        <nav v-if="variant === 'full'" class="flex items-center gap-2">
          <DropdownMenu v-if="session">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" aria-label="Account menu">
                <UserRoundIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuLabel>
                {{ session.user.email }}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem as-child>
                  <NuxtLink to="/account/settings">
                    <UserCogIcon data-icon="inline-start" />
                    Account settings
                  </NuxtLink>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem @click="signOut">
                  <LogOutIcon data-icon="inline-start" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <template v-else>
            <Button variant="ghost" size="sm" as-child>
              <NuxtLink to="/auth/login">Sign in</NuxtLink>
            </Button>
            <Button size="sm" as-child>
              <NuxtLink to="/auth/signup">Sign up</NuxtLink>
            </Button>
          </template>
        </nav>

        <ModeToggle />
      </div>
    </AppContainer>
  </header>
</template>
