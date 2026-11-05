<script setup lang="ts">
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { getYouTubeVideoId } from '#shared/utils/youtube'

  interface Player {
    getCurrentTime: () => number
    cueVideoById: (options: { videoId: string; startSeconds: number }) => void
    destroy: () => void
  }
  interface PlayerEvent {
    target: Player
    data: number
  }
  interface YouTubeWindow extends Window {
    YT?: { Player: new (element: HTMLElement, options: object) => Player }
    onYouTubeIframeAPIReady?: () => void
    learningYouTubeReady?: Promise<void>
  }

  const props = defineProps<{ courseId: string; lectureId: string; videoUrl: string | null; title: string; positionSeconds: number }>()
  const host = useTemplateRef<HTMLElement>('host')
  const error = shallowRef(false)
  const saveError = shallowRef(false)
  let player: Player | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let hasPlayed = false
  let disposed = false
  let saveQueue: Promise<void> = Promise.resolve()

  function loadYouTube(): Promise<void> {
    const youtubeWindow = window as YouTubeWindow
    if (youtubeWindow.YT?.Player) return Promise.resolve()
    if (youtubeWindow.learningYouTubeReady) return youtubeWindow.learningYouTubeReady
    youtubeWindow.learningYouTubeReady = new Promise<void>((resolve, reject) => {
      const previous = youtubeWindow.onYouTubeIframeAPIReady
      youtubeWindow.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve()
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => {
        youtubeWindow.learningYouTubeReady = undefined
        reject(new Error('YouTube unavailable'))
      }
      document.head.appendChild(script)
    })
    return youtubeWindow.learningYouTubeReady
  }

  function savePosition() {
    if (!player || !hasPlayed) return
    const seconds = player.getCurrentTime()
    if (!Number.isFinite(seconds) || seconds < 0) return
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

  function onStateChange(event: PlayerEvent) {
    if (event.data === 1) {
      hasPlayed = true
      if (!timer) timer = setInterval(savePosition, 10000)
    } else {
      if (timer) clearInterval(timer)
      timer = undefined
      if (event.data === 0 || event.data === 2) savePosition()
    }
  }

  onMounted(async () => {
    const videoId = props.videoUrl ? getYouTubeVideoId(props.videoUrl) : null
    if (!videoId) {
      error.value = true
      return
    }
    try {
      await loadYouTube()
      if (disposed || !host.value) return
      const youtubeWindow = window as YouTubeWindow
      if (!youtubeWindow.YT?.Player) throw new Error('YouTube unavailable')
      player = new youtubeWindow.YT.Player(host.value, {
        videoId,
        playerVars: { origin: window.location.origin, playsinline: 1 },
        events: {
          onReady: (event: PlayerEvent) => event.target.cueVideoById({ videoId, startSeconds: props.positionSeconds }),
          onStateChange,
          onError: () => {
            error.value = true
          }
        }
      })
      window.addEventListener('pagehide', savePosition)
    } catch {
      error.value = true
    }
  })

  onBeforeUnmount(() => {
    disposed = true
    if (timer) clearInterval(timer)
    savePosition()
    window.removeEventListener('pagehide', savePosition)
    player?.destroy()
  })
</script>

<template>
  <div class="flex flex-col gap-3">
    <Alert v-if="error">
      <AlertTitle>Video unavailable</AlertTitle>
      <AlertDescription>This YouTube video cannot be played here right now.</AlertDescription>
    </Alert>
    <Alert v-if="saveError">
      <AlertTitle>Playback position not saved</AlertTitle>
      <AlertDescription>Check your connection. We will try again while the video plays.</AlertDescription>
    </Alert>
    <div v-show="!error" class="aspect-video w-full overflow-hidden rounded-md [&>iframe]:size-full">
      <div ref="host" :title="title" />
    </div>
  </div>
</template>
