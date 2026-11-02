<script setup lang="ts">
  import { computed } from 'vue'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { getYouTubeVideoId } from '#shared/utils/youtube'

  const props = defineProps<{
    videoUrl: string
    title: string
  }>()

  const embedUrl = computed(() => {
    const videoId = getYouTubeVideoId(props.videoUrl)
    if (!videoId) return null
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
