<script setup lang="ts">
import {
  ArrowRightIcon,
  BookOpenIcon,
  BrainCircuitIcon,
  ChartNoAxesColumnIncreasingIcon
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { useAuthSession } from '@/composables/useAuthSession'

useSeoMeta({
  title: 'VertexAI · Learn with focus',
  description:
    'Explore courses and build a focused learning habit with VertexAI.'
})

definePageMeta({ layout: 'marketing' })

const { data: session } = await useAuthSession()

const upcomingFeatures = [
  {
    title: 'Learn with context',
    description:
      'Get explanations grounded in the course material you are studying.',
    icon: BrainCircuitIcon
  },
  {
    title: 'See your progress',
    description:
      'Pick up where you left off and understand what you have mastered.',
    icon: ChartNoAxesColumnIncreasingIcon
  }
]
</script>

<template>
  <div class="flex flex-col gap-8">
    <section
      class="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center sm:gap-6"
    >
      <Badge variant="secondary">A more focused way to learn</Badge>
      <div class="flex flex-col gap-3 sm:gap-4">
        <h1
          class="text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
        >
          Make every lesson <span class="text-primary">count.</span>
        </h1>
        <p
          class="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground"
        >
          Find a course worth learning, understand it deeply, and keep your
          momentum — all in one learning space.
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <Button v-if="session" size="lg" as-child>
          <NuxtLink to="/dashboard">
            Dashboard
            <ArrowRightIcon data-icon="inline-end" />
          </NuxtLink>
        </Button>
        <Button v-else size="lg" as-child>
          <NuxtLink to="/courses">
            Explore courses
            <ArrowRightIcon data-icon="inline-end" />
          </NuxtLink>
        </Button>
        <Button v-if="!session" variant="outline" size="lg" as-child>
          <NuxtLink to="/auth/signup">Create an account</NuxtLink>
        </Button>
      </div>
    </section>

    <section class="flex flex-col gap-5" aria-labelledby="platform-heading">
      <div class="flex flex-col gap-2 text-center">
        <p class="text-sm font-medium text-primary">The learning space</p>
        <h2
          id="platform-heading"
          class="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Start with a course. Grow from there.
        </h2>
        <p class="mx-auto max-w-xl text-balance text-muted-foreground">
          Browse the catalog today. More tools for learning and tracking your
          progress are taking shape.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between gap-3">
              <BookOpenIcon class="text-primary" />
              <Badge>Available</Badge>
            </div>
            <CardTitle>Courses to explore</CardTitle>
            <CardDescription>
              Browse published courses and find a topic that moves you forward.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card v-for="feature in upcomingFeatures" :key="feature.title">
          <CardHeader>
            <div class="flex items-center justify-between gap-3">
              <component :is="feature.icon" class="text-muted-foreground" />
              <Badge variant="outline">Coming soon</Badge>
            </div>
            <CardTitle>{{ feature.title }}</CardTitle>
            <CardDescription>{{ feature.description }}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  </div>
</template>
