<script setup lang="ts">
  import type { ElementNode } from '@comark/vue'
  import { computed } from 'vue'
  import { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockCopyButton, CodeBlockHeader, CodeBlockLine, CodeBlockTitle, CodeBlockToken, useHighlightedCode } from '@/components/ui/code-block'

  const props = defineProps<{
    language?: string
    // The raw `pre` node. Comark passes it to components that declare it.
    // eslint-disable-next-line vue/prop-name-casing
    __node?: ElementNode
  }>()

  // ['pre', props, ['code', props, text]]
  const code = computed(() => {
    const child = props.__node?.[2]
    if (!Array.isArray(child)) return ''

    const text = child[2]
    return typeof text === 'string' ? text : ''
  })

  const language = computed(() => props.language ?? '')
  const lines = useHighlightedCode(code, language)
</script>

<template>
  <CodeBlock>
    <CodeBlockHeader>
      <CodeBlockTitle>{{ language || 'text' }}</CodeBlockTitle>
      <CodeBlockActions>
        <CodeBlockCopyButton :value="code" />
      </CodeBlockActions>
    </CodeBlockHeader>
    <CodeBlockContent line-numbers>
      <CodeBlockLine v-for="(line, index) in lines" :key="index">
        <CodeBlockToken v-for="(token, tokenIndex) in line" :key="tokenIndex" :token="token" />
      </CodeBlockLine>
    </CodeBlockContent>
  </CodeBlock>
</template>
