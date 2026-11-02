<script setup lang="ts">
  import { computed } from 'vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

  const props = defineProps<{
    videoUrl: string
    title: string
  }>()

  const embedUrl = computed(() => {
    let url: URL

    try {
      url = new URL(props.videoUrl)
    } catch {
      return null
    }

    if (url.protocol !== 'https:') return null

    let videoId: string | null = null

    if (url.hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v')
      } else {
        videoId = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null
      }
    }

    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null

    return `https://www.youtube.com/embed/${videoId}?rel=0`
  })
</script>

<template>
  <iframe v-if="embedUrl" :src="embedUrl" :title="title" class="aspect-video w-full rounded-md" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" />
  <Alert v-else>
    <AlertTitle>Video unavailable</AlertTitle>
    <AlertDescription>This lecture does not have a valid YouTube video link.</AlertDescription>
  </Alert>
</template>
