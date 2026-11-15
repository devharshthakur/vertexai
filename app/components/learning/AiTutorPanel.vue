<script setup lang="ts">
  import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
  import { useChat } from '@ai-sdk/vue'
  import { DefaultChatTransport } from 'ai'
  import { RotateCcwIcon, SendIcon, SparklesIcon, SquareIcon } from '@lucide/vue'
  import { cn } from 'cn'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Badge } from '@/components/ui/badge'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { ScrollArea } from '@/components/ui/scroll-area'
  import { Textarea } from '@/components/ui/textarea'
  import type { AiChatHistory, AiChatMessage, AiCitation } from '#shared/types/ai'

  const props = defineProps<{ courseId: string }>()

  const { data: history, error: historyError } = await useFetch<AiChatHistory>(`/api/courses/${props.courseId}/ai/chat`, {
    default: () => ({ messages: [], available: true })
  })

  const { messages, status, error, sendMessage, stop, regenerate, clearError } = useChat<AiChatMessage>({
    transport: new DefaultChatTransport({ api: `/api/courses/${props.courseId}/ai/chat` }),
    messages: history.value?.messages ?? [],
    throttle: 50
  })

  const input = shallowRef('')
  const bottom = useTemplateRef<HTMLElement>('bottom')
  const available = computed(() => history.value?.available ?? false)
  const busy = computed(() => status.value === 'submitted' || status.value === 'streaming')
  const canSend = computed(() => available.value && !busy.value && Boolean(input.value.trim()))
  const lastMessageLength = computed(() => messageText(messages.value.at(-1)).length)

  watch([() => messages.value.length, lastMessageLength], scrollToBottom, { immediate: true })

  /** Keeps the newest message in view without scrolling the page. */
  async function scrollToBottom() {
    await nextTick()
    const viewport = bottom.value?.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')
    viewport?.scrollTo({ top: viewport.scrollHeight })
  }

  function messageText(message: AiChatMessage | undefined): string {
    return message?.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('') ?? ''
  }

  function citationsFor(message: AiChatMessage): AiCitation[] {
    return message.metadata?.citations ?? []
  }

  function submit() {
    const text = input.value.trim()

    if (!text || !canSend.value) return

    input.value = ''
    sendMessage({ text })
  }

  /** Enter submits; Shift+Enter adds a line. IME confirmation never submits. */
  function onInputKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey) return

    event.preventDefault()

    if (event.isComposing || event.keyCode === 229) return

    submit()
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>
        <span class="flex items-center gap-2">
          <SparklesIcon class="size-5 text-primary" aria-hidden="true" />
          AI tutor
        </span>
      </CardTitle>
      <CardDescription>Ask about this course. Answers are grounded in its lecture transcripts and cite the lectures they use.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col gap-4">
        <div class="h-80 rounded-lg border">
          <ScrollArea class="h-full">
            <div class="flex flex-col gap-4 p-3">
              <Empty v-if="!messages.length">
                <EmptyHeader>
                  <EmptyTitle>Ask your first question</EmptyTitle>
                  <EmptyDescription>Try asking for an explanation, an example, or how two lectures connect.</EmptyDescription>
                </EmptyHeader>
              </Empty>
              <div v-for="message in messages" :key="message.id" class="flex flex-col gap-1">
                <span class="text-xs font-medium text-muted-foreground">{{ message.role === 'user' ? 'You' : 'AI tutor' }}</span>
                <div :class="cn('max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap', message.role === 'user' ? 'self-end bg-primary text-primary-foreground' : 'bg-muted')">{{ messageText(message) }}</div>
                <div v-if="citationsFor(message).length" class="flex flex-wrap gap-2 pt-1">
                  <Badge v-for="citation in citationsFor(message)" :key="citation.lectureId" class="max-w-full" variant="secondary" :title="citation.excerpt">
                    <span class="truncate">Source: {{ citation.title }}</span>
                  </Badge>
                </div>
              </div>
              <div ref="bottom" />
            </div>
          </ScrollArea>
        </div>

        <Alert v-if="!available">
          <AlertTitle>AI tutor unavailable</AlertTitle>
          <AlertDescription>The tutor is not configured on this deployment yet. The rest of the course still works.</AlertDescription>
        </Alert>
        <Alert v-else-if="historyError">
          <AlertTitle>Conversation unavailable</AlertTitle>
          <AlertDescription>We could not load your previous messages. You can still ask a new question.</AlertDescription>
        </Alert>
        <Alert v-else-if="error" variant="destructive">
          <AlertTitle>The tutor could not answer</AlertTitle>
          <AlertDescription>Please try again. If the problem continues, the AI service may be unavailable.</AlertDescription>
          <Button class="mt-2" variant="outline" size="sm" @click="clearError">Dismiss</Button>
        </Alert>

        <form class="flex flex-col gap-3" @submit.prevent="submit">
          <FieldGroup>
            <Field>
              <FieldLabel for="ai-tutor-input">Your question</FieldLabel>
              <Textarea id="ai-tutor-input" v-model="input" rows="3" :disabled="!available || busy" placeholder="What does this lecture mean by…?" @keydown="onInputKeydown" />
              <FieldDescription>Press Enter to send, Shift+Enter for a new line.</FieldDescription>
            </Field>
          </FieldGroup>
          <div class="flex flex-wrap gap-2">
            <Button v-if="busy" type="button" variant="secondary" @click="stop">
              <SquareIcon data-icon="inline-start" />
              Stop
            </Button>
            <Button v-else type="submit" :disabled="!canSend">
              <SendIcon data-icon="inline-start" />
              Send
            </Button>
            <Button type="button" variant="outline" :disabled="busy || !available || !messages.length" @click="regenerate()">
              <RotateCcwIcon data-icon="inline-start" />
              Regenerate
            </Button>
          </div>
        </form>
      </div>
    </CardContent>
  </Card>
</template>
