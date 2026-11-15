<script setup lang="ts">
  import { AwardIcon } from '@lucide/vue'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import type { CertificateSummary } from '#shared/types/achievements'

  const { certificate } = defineProps<{ certificate: CertificateSummary }>()

  const issued = computed(() => new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(certificate.issuedAt)))
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>
        <span class="flex items-center gap-2">
          <AwardIcon class="size-5 text-primary" aria-hidden="true" />
          Course complete
        </span>
      </CardTitle>
      <CardDescription>You finished {{ certificate.courseTitle }}. Your certificate is ready.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col items-start gap-3">
        <p class="text-sm text-muted-foreground">Issued {{ issued }}</p>
        <Button as-child>
          <a :href="`/api/certificates/${certificate.id}/file`" download>Download certificate (PDF)</a>
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
