<script setup lang="ts">
  import { computed, shallowRef } from 'vue'
  import { useChat } from '@ai-sdk/vue'
  import { DefaultChatTransport } from 'ai'
  import { ArrowUpIcon, ChevronDownIcon, SparklesIcon, SquareIcon } from '@lucide/vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
  import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
  import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
  import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from '@/components/ui/message-scroller'
  import { TooltipProvider } from '@/components/ui/tooltip'
  import type { AiChatHistory, AiChatMessage } from '#shared/types/ai'
  import { AI_EXPLANATION_DEPTHS, type AiExplanationDepth } from '#shared/validation/ai'
  import AiTutorMessage from './AiTutorMessage.vue'

  const props = defineProps<{ courseId: string }>()

  const { data: history, error: historyError } = await useFetch<AiChatHistory>(`/api/courses/${props.courseId}/ai/chat`, {
    default: () => ({ messages: [], available: true })
  })

  const depth = ref<AiExplanationDepth>('intermediate')
  const depthOptions = AI_EXPLANATION_DEPTHS.map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))
  const depthLabel = computed(() => depthOptions.find((option) => option.value === depth.value)?.label ?? '')

  const { messages, status, error, sendMessage, stop, regenerate, clearError } = useChat<AiChatMessage>({
    transport: new DefaultChatTransport({ api: `/api/courses/${props.courseId}/ai/chat` }),
    messages: history.value?.messages ?? [],
    throttle: 50
  })

  const input = shallowRef('')
  const available = computed(() => history.value?.available ?? false)
  const busy = computed(() => status.value === 'submitted' || status.value === 'streaming')
  const canSend = computed(() => available.value && !busy.value && Boolean(input.value.trim()))
  /** The server replaces the trailing answer, so only that one can be regenerated. */
  const lastAnswerId = computed(() => [...messages.value].reverse().find((message) => message.role === 'assistant')?.id)

  function submit() {
    const text = input.value.trim()

    if (!text || !canSend.value) return

    input.value = ''
    sendMessage({ text }, { body: { depth: depth.value } })
  }

  function regenerateAnswer(messageId: string) {
    return regenerate({ messageId, body: { depth: depth.value } })
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
        <TooltipProvider>
          <MessageScrollerProvider auto-scroll default-scroll-position="last-anchor">
            <div class="relative h-96 rounded-lg border">
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent>
                    <div class="flex flex-col gap-8 p-3">
                      <Empty v-if="!messages.length">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <SparklesIcon />
                          </EmptyMedia>
                          <EmptyTitle>Ask your first question</EmptyTitle>
                          <EmptyDescription>Try asking for an explanation, an example, or how two lectures connect.</EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                      <MessageScrollerItem v-for="message in messages" :key="message.id" :message-id="message.id" :scroll-anchor="message.role === 'user'">
                        <AiTutorMessage :message="message" :course-id="courseId" :streaming="busy && message.id === lastAnswerId" :regenerable="!busy && message.role === 'assistant' && message.id === lastAnswerId" @regenerate="regenerateAnswer(message.id)" />
                      </MessageScrollerItem>
                    </div>
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </div>
          </MessageScrollerProvider>
        </TooltipProvider>

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

        <form class="flex flex-col gap-2" @submit.prevent="submit">
          <InputGroup>
            <InputGroupTextarea v-model="input" :disabled="!available || busy" placeholder="What does this lecture mean by…?" aria-label="Your question" @keydown="onInputKeydown" />
            <InputGroupAddon align="block-end">
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <InputGroupButton size="sm" variant="outline" class="ml-auto" :disabled="!available" :aria-label="`Explanation depth: ${depthLabel}`">
                    <span class="text-muted-foreground">Depth</span>
                    {{ depthLabel }}
                    <ChevronDownIcon />
                  </InputGroupButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" class="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Explanation depth</DropdownMenuLabel>
                    <DropdownMenuRadioGroup v-model="depth">
                      <DropdownMenuRadioItem v-for="option in depthOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <InputGroupButton v-if="busy" size="icon-sm" variant="secondary" aria-label="Stop the answer" @click="stop()">
                <SquareIcon />
              </InputGroupButton>
              <InputGroupButton v-else type="submit" size="icon-sm" variant="default" :disabled="!canSend" aria-label="Send">
                <ArrowUpIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p class="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for a new line. Beginner defines the terms, advanced assumes the basics.</p>
        </form>
      </div>
    </CardContent>
  </Card>
</template>
