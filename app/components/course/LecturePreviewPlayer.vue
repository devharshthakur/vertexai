<script setup lang="ts">
  import '@videojs/html/video/player'
  import '@videojs/html/video/neutral-skin'
  import type { VideoPlayerElement } from '@videojs/html/video'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

  defineProps<{ videoUrl: string; title: string }>()
  const player = useTemplateRef<VideoPlayerElement>('player')
  const error = shallowRef(false)
  let unsubscribe: (() => void) | undefined

  onMounted(() => {
    const store = player.value?.store
    if (!store) {
      error.value = true
      return
    }

    const sync = () => {
      error.value = Boolean(store.error)
    }

    sync()
    unsubscribe = store.subscribe(sync)
  })

  onBeforeUnmount(() => unsubscribe?.())
</script>

<template>
  <div class="flex flex-col gap-3">
    <Alert v-if="error">
      <AlertTitle>Video unavailable</AlertTitle>
      <AlertDescription>This lecture video cannot be played here right now.</AlertDescription>
    </Alert>
    <video-player v-show="!error" ref="player">
      <video-neutral-skin>
        <video :src="videoUrl" :aria-label="title" playsinline preload="metadata" />
      </video-neutral-skin>
    </video-player>
  </div>
</template>
