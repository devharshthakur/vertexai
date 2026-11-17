<script setup lang="ts">
  import { ArrowLeftIcon, ChartColumnIcon, ClockIcon, GraduationCapIcon, UsersIcon } from '@lucide/vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Skeleton } from '@/components/ui/skeleton'
  import type { CourseAnalytics } from '#shared/types/analytics'

  definePageMeta({ layout: 'workspace', middleware: 'instructor' })
  useSeoMeta({ title: 'Course analytics · VertexAI' })

  const route = useRoute()
  const courseId = computed(() => String(route.params.id))
  const { data, pending, error, refresh } = await useFetch<CourseAnalytics>(() => `/api/courses/${courseId.value}/analytics`)

  /** Formats an estimated watch time without exposing raw seconds everywhere. */
  function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0m'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.round((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m`

    return `${Math.round(seconds)}s`
  }

  function formatPercent(value: number | null): string {
    return value === null ? '—' : `${Math.round(value)}%`
  }
</script>

<template>
  <div class="flex flex-col gap-8">
    <header class="flex flex-col gap-4">
      <Button variant="ghost" size="sm" class="self-start" as-child>
        <NuxtLink :to="`/instructor/courses/${courseId}`">
          <ArrowLeftIcon data-icon="inline-start" />
          Back to the course editor
        </NuxtLink>
      </Button>
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-muted-foreground">Instructor analytics</p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">{{ data?.title ?? 'Learning analytics' }}</h1>
        <p class="max-w-2xl text-muted-foreground">See where students stop watching, how they score, and how much time they spend on each lecture. Watch time is estimated from the player's progress reports, so seeking ahead does not count as watching.</p>
      </div>
    </header>

    <Alert v-if="error" variant="destructive">
      <AlertTitle>Analytics unavailable</AlertTitle>
      <AlertDescription>
        We could not load this course's analytics. It may not exist, or your account may not teach it.
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" @click="refresh()">Retry</Button>
          <Button size="sm" variant="ghost" as-child>
            <NuxtLink to="/instructor">Return to your courses</NuxtLink>
          </Button>
        </div>
      </AlertDescription>
    </Alert>

    <div v-if="pending" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      <Card v-for="index in 4" :key="index">
        <CardHeader>
          <Skeleton class="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-20" />
        </CardContent>
      </Card>
    </div>

    <template v-else-if="data">
      <section aria-label="Course summary" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>
              <div class="flex items-center gap-2"><UsersIcon /> Students enrolled</div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-semibold tracking-tight">{{ data.summary.enrolledStudents }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>
              <div class="flex items-center gap-2"><ChartColumnIcon /> Average progress</div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-semibold tracking-tight">{{ formatPercent(data.summary.averageProgressPercent) }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>
              <div class="flex items-center gap-2"><GraduationCapIcon /> Completed the course</div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-semibold tracking-tight">{{ data.summary.completedStudents }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>
              <div class="flex items-center gap-2"><ClockIcon /> Time on task</div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-3xl font-semibold tracking-tight">{{ formatDuration(data.summary.totalWatchedSeconds) }}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lecture drop-off</CardTitle>
          <CardDescription>Students who opened a lecture against those who completed it. Drop-off is the share who started but have not finished.</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty v-if="data.lectures.length === 0">
            <EmptyHeader>
              <EmptyTitle>No lectures yet</EmptyTitle>
              <EmptyDescription>Add modules and lectures in the course editor, and their statistics will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border text-left text-muted-foreground">
                  <th scope="col" class="py-2 pr-4 font-medium">Lecture</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Started</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Completed</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Drop-off</th>
                  <th scope="col" class="py-2 pl-4 text-right font-medium">Avg. watch</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="lecture in data.lectures" :key="lecture.lectureId" class="border-b border-border last:border-0">
                  <th scope="row" class="py-3 pr-4 text-left font-normal">
                    <span class="block font-medium">{{ lecture.title }}</span>
                    <span class="text-muted-foreground">{{ lecture.moduleTitle }}</span>
                  </th>
                  <td class="px-4 py-3 text-right tabular-nums">{{ lecture.started }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ lecture.completed }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ formatPercent(lecture.dropOffPercent) }}</td>
                  <td class="py-3 pl-4 text-right tabular-nums">{{ formatDuration(lecture.averageWatchedSeconds) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiz scores</CardTitle>
          <CardDescription>Every submitted attempt counts, including retakes. Pass rate uses each quiz's passing score.</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty v-if="data.quizzes.length === 0">
            <EmptyHeader>
              <EmptyTitle>No quizzes yet</EmptyTitle>
              <EmptyDescription>Quizzes added in the course editor report their scores here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border text-left text-muted-foreground">
                  <th scope="col" class="py-2 pr-4 font-medium">Quiz</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Attempts</th>
                  <th scope="col" class="px-4 py-2 text-right font-medium">Average score</th>
                  <th scope="col" class="py-2 pl-4 text-right font-medium">Pass rate</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="quiz in data.quizzes" :key="quiz.quizId" class="border-b border-border last:border-0">
                  <th scope="row" class="py-3 pr-4 text-left font-normal">
                    <span class="block font-medium">{{ quiz.title }}</span>
                    <span class="text-muted-foreground">{{ quiz.moduleTitle }} · passes at {{ quiz.passingScore }}%</span>
                  </th>
                  <td class="px-4 py-3 text-right tabular-nums">{{ quiz.attempts }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ formatPercent(quiz.averageScorePercent) }}</td>
                  <td class="py-3 pl-4 text-right tabular-nums">{{ formatPercent(quiz.passRatePercent) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
