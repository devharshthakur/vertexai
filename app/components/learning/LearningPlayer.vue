<script setup lang="ts">
  import '@videojs/html/video/player'
  import '@videojs/html/video/neutral-skin'
  import type { VideoPlayerElement } from '@videojs/html/video'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

  const props = defineProps<{ courseId: string; lectureId: string; videoUrl: string | null; title: string; positionSeconds: number }>()
  const player = useTemplateRef<VideoPlayerElement>('player')
  const error = shallowRef(false)
  const saveError = shallowRef(false)
  let unsubscribe: (() => void) | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let hasPlayed = false
  let saveQueue: Promise<void> = Promise.resolve()

  function startTimer() {
    if (!timer) timer = setInterval(savePosition, 10000)
  }

  function stopTimer() {
    if (timer) clearInterval(timer)
    timer = undefined
  }

  function savePosition() {
    if (!hasPlayed) return
    const seconds = getCurrentTime()
    if (seconds === null) return
    const positionSeconds = Math.min(86400, Math.floor(seconds))
    saveQueue = saveQueue.then(async () => {
      try {
        const response = await fetch(`/api/courses/${props.courseId}/lectures/${props.lectureId}/progress`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          keepalive: true,
          body: JSON.stringify({ action: 'position', positionSeconds })
        })
        saveError.value = !response.ok
      } catch {
        saveError.value = true
      }
    })
  }

  function getCurrentTime(): number | null {
    const seconds = player.value?.store.currentTime
    if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return null
    return Math.min(86400, Math.floor(seconds))
  }

  function seekTo(seconds: number) {
    const store = player.value?.store
    if (!store || !Number.isFinite(seconds) || seconds < 0) return
    void store.seek(Math.min(86400, Math.floor(seconds))).catch(() => {
      error.value = true
    })
  }

  defineExpose({ getCurrentTime, seekTo })

  onMounted(() => {
    const store = player.value?.store
    if (!props.videoUrl || !store) {
      error.value = true
      return
    }

    let resumed = false
    let wasPaused = true
    let ended = false

    const sync = () => {
      error.value = Boolean(store.error)
      if (store.error) stopTimer()

      if (!resumed && store.duration > 0) {
        resumed = true
        const startSeconds = Math.min(props.positionSeconds, Math.max(0, store.duration - 1))
        if (startSeconds > 0) void store.seek(startSeconds).catch(() => {})
      }

      const paused = store.paused
      if (wasPaused && !paused) {
        hasPlayed = true
        startTimer()
      } else if (!wasPaused && paused) {
        stopTimer()
        savePosition()
      }
      wasPaused = paused

      if (!ended && store.ended) {
        ended = true
        stopTimer()
        if (!paused) savePosition()
      }
    }

    sync()
    unsubscribe = store.subscribe(sync)
    window.addEventListener('pagehide', savePosition)
  })

  onBeforeUnmount(() => {
    savePosition()
    stopTimer()
    unsubscribe?.()
    window.removeEventListener('pagehide', savePosition)
  })
</script>

<template>
  <div class="flex flex-col gap-3">
    <Alert v-if="error">
      <AlertTitle>Video unavailable</AlertTitle>
      <AlertDescription>This lecture video cannot be played here right now.</AlertDescription>
    </Alert>
    <Alert v-if="saveError">
      <AlertTitle>Playback position not saved</AlertTitle>
      <AlertDescription>Check your connection. We will try again while the video plays.</AlertDescription>
    </Alert>
    <video-player v-show="!error" ref="player">
      <video-neutral-skin>
        <video v-if="videoUrl" :src="videoUrl" :aria-label="title" playsinline preload="metadata" />
      </video-neutral-skin>
    </video-player>
  </div>
</template>
