<script setup lang="ts">
  import type { AiChatMessage, AiCitation } from '#shared/types/ai'
  import { computed, ref } from 'vue'
  import { ArrowUpRightIcon, BookOpenIcon, CircleCheckIcon, LoaderCircleIcon, RefreshCcwIcon } from '@lucide/vue'
  import { isReasoningUIPart } from 'ai'
  import { Bubble, BubbleContent } from '@/components/ui/bubble'
  import { Button } from '@/components/ui/button'
  import { Message, MessageContent, MessageFooter } from '@/components/ui/message'
  import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
  import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from '@/components/ui/trace'
  import AiTutorMarkdown from './AiTutorMarkdown.vue'

  const props = defineProps<{
    /** One turn of the conversation. */
    message: AiChatMessage
    /** The course the tutor answers about. */
    courseId: string
    /** True while this answer is still streaming. */
    streaming?: boolean
    /** True when the server can replace this answer with a new one. */
    regenerable?: boolean
  }>()

  const emit = defineEmits<{
    regenerate: []
  }>()

  /** The open state the reader chose for a reasoning trace. */
  const openState = ref<Record<string, boolean>>({})

  const text = computed(() =>
    props.message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')
  )

  const reasoning = computed(() => props.message.parts.filter((part) => isReasoningUIPart(part)))

  /**
   * The reasoning worth showing.
   *
   * A model may send a reasoning part without any text, for example when the
   * provider keeps the thinking encrypted. Such a part shows nothing, so the
   * line is only kept while the model is still thinking.
   */
  const visibleReasoning = computed(() => reasoning.value.filter((part) => part.text.length > 0 || isRunning(part)))

  const citations = computed<AiCitation[]>(() => props.message.metadata?.citations ?? [])

  /** A reasoning part is still running while the model writes it. */
  function isRunning(part: { state?: string }): boolean {
    return props.streaming === true && part.state === 'streaming'
  }
</script>

<template>
  <Message v-if="message.role === 'user'" align="end">
    <MessageContent>
      <Bubble align="end" variant="muted">
        <BubbleContent>
          <p class="whitespace-pre-wrap">{{ text }}</p>
        </BubbleContent>
      </Bubble>
    </MessageContent>
  </Message>

  <Message v-else>
    <MessageContent>
      <div class="flex flex-col gap-4">
        <Trace v-if="visibleReasoning.length">
          <template v-for="(part, index) in visibleReasoning" :key="index">
            <TraceLine v-if="!part.text" status="running">
              <TraceIcon>
                <LoaderCircleIcon class="animate-spin" />
              </TraceIcon>
              <TraceTitle>Thinking</TraceTitle>
            </TraceLine>
            <TraceCollapsible v-else :open="openState[`${message.id}-${index}`] ?? isRunning(part)" @update:open="openState[`${message.id}-${index}`] = $event">
              <TraceCollapsibleTrigger>
                <TraceLine :status="isRunning(part) ? 'running' : undefined">
                  <TraceIcon>
                    <LoaderCircleIcon v-if="isRunning(part)" class="animate-spin" />
                    <CircleCheckIcon v-else />
                  </TraceIcon>
                  <TraceTitle>{{ isRunning(part) ? 'Thinking' : 'Thought' }}</TraceTitle>
                </TraceLine>
              </TraceCollapsibleTrigger>
              <TraceCollapsibleContent class="whitespace-pre-wrap">
                {{ part.text }}
              </TraceCollapsibleContent>
            </TraceCollapsible>
          </template>
        </Trace>

        <AiTutorMarkdown :value="text" :streaming="streaming" />

        <Trace v-if="citations.length">
          <TraceCollapsible>
            <TraceCollapsibleTrigger>
              <TraceLine>
                <TraceIcon>
                  <BookOpenIcon />
                </TraceIcon>
                <TraceTitle>Used {{ citations.length }} {{ citations.length === 1 ? 'source' : 'sources' }}</TraceTitle>
              </TraceLine>
            </TraceCollapsibleTrigger>
            <TraceCollapsibleContent>
              <Trace>
                <NuxtLink v-for="citation in citations" :key="citation.lectureId" :to="`/learn/${courseId}/lectures/${citation.lectureId}`" :title="citation.excerpt">
                  <TraceLine>
                    <TraceTitle>{{ citation.title }}</TraceTitle>
                    <TraceIcon>
                      <ArrowUpRightIcon />
                    </TraceIcon>
                  </TraceLine>
                </NuxtLink>
              </Trace>
            </TraceCollapsibleContent>
          </TraceCollapsible>
        </Trace>

        <MessageFooter v-if="regenerable">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon-sm" aria-label="Regenerate answer" @click="emit('regenerate')">
                <RefreshCcwIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Regenerate answer</p>
            </TooltipContent>
          </Tooltip>
        </MessageFooter>
      </div>
    </MessageContent>
  </Message>
</template>
