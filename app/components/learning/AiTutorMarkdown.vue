<script setup lang="ts">
  import { Markdown } from '@comark/vue'
  import AiTutorCodeBlock from './AiTutorCodeBlock.vue'

  defineProps<{
    /** The answer text, still growing while the reply streams. */
    value: string
    /** True while the answer is still streaming. */
    streaming?: boolean
  }>()

  /** Fenced code blocks render as the code block component instead of `pre`. */
  const components = { pre: AiTutorCodeBlock }
</script>

<template>
  <div class="typeset">
    <Suspense>
      <Markdown :value="value" :components="components" :streaming="streaming" :caret="streaming" />
      <template #fallback>
        <p class="text-muted-foreground">Reading the answer…</p>
      </template>
    </Suspense>
  </div>
</template>
