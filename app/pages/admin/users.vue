<script setup lang="ts">
  import { ShieldOffIcon, UserRoundIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { toast } from 'vue-sonner'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Input } from '@/components/ui/input'
  import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
  import { Skeleton } from '@/components/ui/skeleton'
  import { Spinner } from '@/components/ui/spinner'
  import { useAuthSessionState } from '@/composables/useAuthSession'
  import { APP_ROLES, type AppRole } from '#shared/types/auth'
  import type { AdminUserListResult } from '#shared/types/admin'

  definePageMeta({ layout: 'workspace', middleware: 'admin' })
  useSeoMeta({ title: 'User accounts · VertexAI' })

  const ROLES = [APP_ROLES.STUDENT, APP_ROLES.INSTRUCTOR, APP_ROLES.ADMIN] as const

  const page = ref(1)
  const search = ref('')
  const roleFilter = ref<AppRole | 'all'>('all')
  const statusFilter = ref<'all' | 'suspended' | 'active'>('all')

  const query = computed(() => ({
    q: search.value.trim() || undefined,
    role: roleFilter.value === 'all' ? undefined : roleFilter.value,
    suspended: statusFilter.value === 'all' ? undefined : statusFilter.value === 'suspended',
    page: page.value,
    limit: 20
  }))

  const { data, pending, error, refresh } = await useFetch<AdminUserListResult>('/api/admin/users', {
    query,
    watch: [query]
  })

  /** Reports what a failed action was about, so the message is actionable. */
  function reportFailure(message: string) {
    toast.error(message)
  }

  const { mutate: changeRole, isPending: isChangingRole } = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      $fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: { role }
      }),
    onSuccess: async () => {
      await refresh()
      toast.success('The role was updated.')
    },
    onError: () => {
      reportFailure('The role could not be changed.')
    }
  })

  const { mutate: setSuspension, isPending: isSuspending } = useMutation({
    mutationFn: ({ userId, suspended }: { userId: string; suspended: boolean }) =>
      $fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PUT',
        body: { suspended }
      }),
    onSuccess: async () => {
      await refresh()
      toast.success('The account was updated.')
    },
    onError: () => {
      reportFailure('The account could not be updated.')
    }
  })

  const { mutate: removeAccount, isPending: isRemoving } = useMutation({
    mutationFn: ({ userId }: { userId: string }) => $fetch(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await refresh()
      toast.success('The account was deleted.')
    },
    onError: () => {
      reportFailure('The account could not be deleted. Accounts that still own courses or have reviewed course submissions are kept.')
    }
  })

  /** The current administrator cannot change their own account. */
  const session = useAuthSessionState()
  const ownUserId = computed(() => session.value?.user.id ?? null)

  function roleLabel(role: AppRole): string {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  // A fixed locale and time zone keep the server and browser markup identical;
  // otherwise a visitor's settings would trigger a hydration mismatch.
  const joinedFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })

  function joinedLabel(createdAt: string): string {
    return joinedFormatter.format(new Date(createdAt))
  }
</script>

<template>
  <div class="flex flex-col gap-8">
    <header class="flex flex-col gap-2">
      <p class="text-sm font-medium text-muted-foreground">Admin workspace</p>
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">User accounts</h1>
      <p class="max-w-2xl text-muted-foreground">Search the accounts, change what they may do, suspend access, and remove the ones that should no longer exist.</p>
    </header>

    <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div class="flex flex-1 flex-col gap-2">
        <label class="text-sm font-medium" for="admin-user-search">Search</label>
        <Input id="admin-user-search" v-model="search" placeholder="Name or email" @input="page = 1" />
      </div>
      <div class="flex flex-col gap-2 sm:w-48">
        <label class="text-sm font-medium" for="admin-user-role">Role</label>
        <Select v-model="roleFilter" @update:model-value="page = 1">
          <SelectTrigger id="admin-user-role">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem v-for="option in ROLES" :key="option" :value="option">{{ roleLabel(option) }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div class="flex flex-col gap-2 sm:w-48">
        <label class="text-sm font-medium" for="admin-user-status">Status</label>
        <Select v-model="statusFilter" @update:model-value="page = 1">
          <SelectTrigger id="admin-user-status">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All accounts</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Accounts unavailable</AlertTitle>
      <AlertDescription>
        We could not load the accounts. Please try again.
        <Button size="sm" variant="outline" class="mt-3" @click="refresh()"> Retry </Button>
      </AlertDescription>
    </Alert>

    <div v-if="pending" class="grid gap-5" aria-busy="true">
      <Card v-for="index in 3" :key="index">
        <CardHeader>
          <Skeleton class="h-6 w-1/3" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-10 w-full" />
        </CardContent>
      </Card>
    </div>

    <Empty v-else-if="!error && (data?.items.length ?? 0) === 0">
      <EmptyHeader>
        <EmptyTitle>No accounts found</EmptyTitle>
        <EmptyDescription>No account matches the current search and filters.</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else-if="data" class="grid gap-5">
      <Card v-for="account in data.items" :key="account.id">
        <CardHeader>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex flex-col gap-1">
              <CardTitle>{{ account.name }}</CardTitle>
              <p class="text-sm text-muted-foreground">{{ account.email }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{{ roleLabel(account.role) }}</Badge>
              <Badge v-if="account.suspended" variant="destructive">Suspended</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-4">
            <p class="text-sm text-muted-foreground">{{ account.enrollments }} enrolled · {{ account.courses }} teaching · joined {{ joinedLabel(account.createdAt) }}</p>
            <p v-if="account.suspended && account.suspensionReason" class="text-sm text-muted-foreground">Reason: {{ account.suspensionReason }}</p>

            <div class="flex flex-wrap items-center gap-3">
              <div class="flex flex-col gap-2 sm:w-48">
                <label class="text-sm font-medium" :for="`role-${account.id}`">Role</label>
                <Select :model-value="account.role" :disabled="isChangingRole || account.id === ownUserId" @update:model-value="(value) => changeRole({ userId: account.id, role: value as AppRole })">
                  <SelectTrigger :id="`role-${account.id}`">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="option in ROLES" :key="option" :value="option">{{ roleLabel(option) }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" :disabled="isSuspending || account.id === ownUserId" @click="setSuspension({ userId: account.id, suspended: !account.suspended })">
                <Spinner v-if="isSuspending" data-icon="inline-start" />
                <ShieldOffIcon v-else data-icon="inline-start" />
                {{ account.suspended ? 'Restore access' : 'Suspend' }}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger as-child>
                  <Button variant="destructive" :disabled="isRemoving || account.id === ownUserId">
                    <UserRoundIcon data-icon="inline-start" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this account?</AlertDialogTitle>
                    <AlertDialogDescription> {{ account.name }} loses access immediately, and the courses, notes, and attempts that belong to the account are removed with it. This cannot be undone. </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep the account</AlertDialogCancel>
                    <AlertDialogAction @click="removeAccount({ userId: account.id })">Delete the account</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <footer v-if="data && data.total > 0" class="flex items-center justify-between gap-4 border-t border-border pt-6">
      <Button variant="outline" size="sm" :disabled="pending || page <= 1" @click="page--">Previous</Button>
      <p class="text-sm text-muted-foreground">Page {{ data.page }} of {{ data.totalPages }} · {{ data.total }} {{ data.total === 1 ? 'account' : 'accounts' }}</p>
      <Button variant="outline" size="sm" :disabled="pending || page >= data.totalPages" @click="page++">Next</Button>
    </footer>
  </div>
</template>
