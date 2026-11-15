<script setup lang="ts">
  import { AwardIcon, FlameIcon, TargetIcon } from '@lucide/vue'
  import type { Component } from 'vue'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Skeleton } from '@/components/ui/skeleton'
  import { cn } from '@/lib/utils'
  import type { MyBadges } from '#shared/types/achievements'
  import type { BadgeSlug } from '#shared/validation/achievements'

  /** Milestone icons stay in the client: the shared catalogue holds display copy only. */
  const icons: Record<BadgeSlug, Component> = {
    course_completed: AwardIcon,
    streak_7: FlameIcon,
    quiz_perfect: TargetIcon
  }

  const { data, pending, error, refresh } = await useFetch<MyBadges>('/api/me/badges', { default: () => ({ badges: [] }) })

  const badges = computed(() => data.value?.badges ?? [])
  const earnedCount = computed(() => badges.value.filter((badge) => badge.earnedAt).length)

  /** Dates are formatted in UTC on both sides so hydration cannot disagree. */
  function formatEarnedAt(value: string): string {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
  }
</script>

<template>
  <section aria-labelledby="achievements-heading">
    <Card class="h-full">
      <CardHeader>
        <CardTitle id="achievements-heading">Achievements</CardTitle>
        <CardDescription>{{ earnedCount }} of {{ badges.length }} earned. Milestones unlock as you learn.</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="pending" class="flex flex-col gap-3" role="status" aria-busy="true">
          <Skeleton v-for="index in 3" :key="index" class="h-12 w-full" />
        </div>
        <div v-else-if="error" class="flex flex-wrap items-center gap-3">
          <p class="text-sm text-muted-foreground">We could not load your achievements.</p>
          <Button size="sm" variant="outline" @click="refresh()">Try again</Button>
        </div>
        <ul v-else class="flex flex-col gap-4">
          <li v-for="badge in badges" :key="badge.slug" class="flex items-start gap-3">
            <component :is="icons[badge.slug]" :class="cn('mt-0.5 size-5 shrink-0', badge.earnedAt ? 'text-primary' : 'text-muted-foreground/40')" aria-hidden="true" />
            <div class="flex flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <span :class="cn('font-medium', !badge.earnedAt && 'text-muted-foreground')">{{ badge.name }}</span>
                <Badge v-if="badge.earnedAt" variant="secondary">Earned</Badge>
              </div>
              <p class="text-sm text-muted-foreground">{{ badge.description }}</p>
              <p v-if="badge.earnedAt" class="text-xs text-muted-foreground">Earned {{ formatEarnedAt(badge.earnedAt) }}</p>
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>
  </section>
</template>
