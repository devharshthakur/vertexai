<script setup lang="ts">
import { BookOpenIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { useAuthSession } from '@/composables/useAuthSession'

definePageMeta({ middleware: 'auth' })

useSeoMeta({
  title: 'Your dashboard · VertexAI',
  description: 'Your learning space on VertexAI.'
})

const { data: session } = await useAuthSession()

const firstName = computed(
  () => session.value?.user.name?.trim().split(/\s+/)[0] ?? 'there'
)
</script>

<template>
  <div class="flex flex-col gap-10">
    <header
      class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
    >
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-muted-foreground">Your dashboard</p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back, {{ firstName }}.
        </h1>
        <p class="max-w-2xl text-muted-foreground">
          Your learning home is ready. Find a course to get started.
        </p>
      </div>

      <Button variant="outline" as-child>
        <NuxtLink to="/courses">Explore courses</NuxtLink>
      </Button>
    </header>

    <Separator />

    <section class="flex flex-col gap-4" aria-labelledby="courses-heading">
      <Card>
        <CardHeader>
          <CardTitle id="courses-heading">Your courses</CardTitle>
          <CardDescription>Courses you join will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpenIcon />
              </EmptyMedia>
              <EmptyTitle>Your learning starts with a course</EmptyTitle>
              <EmptyDescription>
                Enrolled courses and learning progress will show up here. Browse
                the catalog and choose what you would like to learn next.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button as-child>
                <NuxtLink to="/courses">Browse courses</NuxtLink>
              </Button>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </section>
  </div>
</template>
