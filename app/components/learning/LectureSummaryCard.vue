<script setup lang="ts">
  import { computed, watch } from 'vue'
  import { useCompletion } from '@ai-sdk/vue'
  import { BookOpenIcon, SparklesIcon, SquareIcon } from '@lucide/vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Spinner } from '@/components/ui/spinner'
  import { useAuthSessionState } from '@/composables/useAuthSession'
  import type { AiLectureSummary } from '#shared/types/ai'

  const props = defineProps<{ courseId: string; lectureId: string }>()

  const session = useAuthSessionState()
  const { data: cached, pending } = await useFetch<AiLectureSummary>(`/api/courses/${props.courseId}/lectures/${props.lectureId}/summary`, {
    default: () => ({ summary: null, generatedAt: null, available: true })
  })

  const { completion, complete, stop, error, isLoading, setCompletion } = useCompletion({
    api: `/api/courses/${props.courseId}/lectures/${props.lectureId}/summary`,
    id: `summary-${props.courseId}-${props.lectureId}`,
    streamProtocol: 'text'
  })

  const available = computed(() => cached.value?.available ?? false)
  const canRegenerate = computed(() => session.value?.user.role === 'instructor' || session.value?.user.role === 'admin')
  const hasSummary = computed(() => Boolean(completion.value || cached.value?.summary))
  const busy = computed(() => Boolean(isLoading.value))

  watch(
    () => cached.value?.summary,
    (summary) => setCompletion(summary ?? ''),
    { immediate: true }
  )

  async function generate(force = false) {
    try {
      await complete('Summarize this lecture.', { body: { regenerate: force } })
    } catch {
      // The completion hook exposes the error state.
    }
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>
        <span class="flex items-center gap-2">
          <BookOpenIcon class="size-5 text-primary" aria-hidden="true" />
          Lecture summary
        </span>
      </CardTitle>
      <CardDescription>AI-generated key points from this lecture's transcript.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col gap-3">
        <Alert v-if="!available">
          <AlertTitle>AI summary unavailable</AlertTitle>
          <AlertDescription>The tutor is not configured on this deployment yet.</AlertDescription>
        </Alert>
        <p v-if="hasSummary" class="text-sm whitespace-pre-wrap">{{ completion || cached?.summary }}</p>
        <p v-else-if="pending" class="text-sm text-muted-foreground">Loading summary…</p>
        <p v-else class="text-sm text-muted-foreground">{{ available ? 'Generate a summary to review the key points of this lecture.' : 'A summary will be available once the tutor is configured.' }}</p>
        <div v-if="busy" class="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner data-icon="inline-start" />
          Generating…
        </div>
        <Alert v-if="error" variant="destructive">
          <AlertTitle>Summary could not be generated</AlertTitle>
          <AlertDescription>Please try again. If the problem continues, the AI service may be unavailable.</AlertDescription>
        </Alert>
        <div v-if="available" class="flex flex-wrap gap-2">
          <Button v-if="busy" type="button" variant="secondary" @click="stop">
            <SquareIcon data-icon="inline-start" />
            Stop
          </Button>
          <Button v-else-if="!hasSummary" type="button" @click="generate(false)">
            <SparklesIcon data-icon="inline-start" />
            Generate summary
          </Button>
          <Button v-else-if="canRegenerate" type="button" variant="outline" @click="generate(true)">
            <SparklesIcon data-icon="inline-start" />
            Regenerate
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
