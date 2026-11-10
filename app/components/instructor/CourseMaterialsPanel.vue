<script setup lang="ts">
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Input } from '@/components/ui/input'
  import type { CourseMaterialSummary } from '#shared/types/course-materials'
  import type { ModuleSummary } from '#shared/types/courses'
  import { COURSE_MATERIAL_EXTENSIONS, MAX_COURSE_MATERIAL_BYTES } from '#shared/validation/course-materials'

  const props = defineProps<{ courseId: string; modules: ModuleSummary[] }>()
  const { data: materials, pending, error, refresh } = await useFetch<CourseMaterialSummary[]>(() => `/api/courses/${props.courseId}/materials`, { default: () => [] })
  const errorMessage = shallowRef('')
  const uploading = shallowRef(false)
  const removingId = shallowRef<string | null>(null)
  const acceptedExtensions = COURSE_MATERIAL_EXTENSIONS.join(',')

  function materialsFor(moduleId: string, lectureId: string | null): CourseMaterialSummary[] {
    return (materials.value ?? []).filter((material) => material.moduleId === moduleId && material.lectureId === lectureId)
  }

  function formatSize(sizeBytes: number): string {
    if (sizeBytes < 1024) return `${sizeBytes} B`
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(0)} KB`
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MiB`
  }

  function materialUrl(materialId: string): string {
    return `/api/courses/${props.courseId}/materials/${materialId}`
  }

  async function uploadFile(event: Event, moduleId: string, lectureId: string | null) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    errorMessage.value = ''
    if (file.size > MAX_COURSE_MATERIAL_BYTES) {
      errorMessage.value = 'Files must be 100 MiB or smaller.'
      input.value = ''
      return
    }

    const body = new FormData()
    body.set('file', file)
    body.set('moduleId', moduleId)
    if (lectureId) body.set('lectureId', lectureId)

    uploading.value = true
    try {
      await $fetch(`/api/courses/${props.courseId}/materials`, { method: 'POST', body })
      await refresh()
    } catch {
      errorMessage.value = 'We could not upload this material. Check its file type and size, then try again.'
    } finally {
      uploading.value = false
      input.value = ''
    }
  }

  async function removeMaterial(material: CourseMaterialSummary) {
    if (!window.confirm(`Remove ${material.originalFilename}?`)) return
    errorMessage.value = ''
    removingId.value = material.id
    try {
      await $fetch(materialUrl(material.id), { method: 'DELETE' })
      await refresh()
    } catch {
      errorMessage.value = 'We could not remove this material. Please try again.'
    } finally {
      removingId.value = null
    }
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Course materials</CardTitle>
      <CardDescription>Upload PDF, PowerPoint, or video files to a module or lecture. Each file can be up to 100 MiB.</CardDescription>
    </CardHeader>
    <CardContent>
      <Alert v-if="errorMessage" variant="destructive" class="mb-4">
        <AlertTitle>Material update failed</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>
      <Alert v-if="error" variant="destructive" class="mb-4">
        <AlertTitle>Materials could not be loaded</AlertTitle>
        <AlertDescription>Please refresh the page and try again.</AlertDescription>
      </Alert>
      <p v-if="pending" class="text-sm text-muted-foreground" aria-live="polite">Loading materials…</p>
      <Empty v-else-if="modules.length === 0">
        <EmptyHeader>
          <EmptyTitle>No course modules yet</EmptyTitle>
          <EmptyDescription>Add a module in Course curriculum before attaching materials.</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <div v-else class="flex flex-col gap-6">
        <section v-for="module in modules" :key="module.id" class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 class="font-medium">{{ module.title }}</h3>
            <Input :aria-label="`Upload material to ${module.title}`" :accept="acceptedExtensions" type="file" :disabled="uploading" @change="uploadFile($event, module.id, null)" />
          </div>
          <ul v-if="materialsFor(module.id, null).length" class="flex flex-col gap-2">
            <li v-for="material in materialsFor(module.id, null)" :key="material.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <span class="min-w-0 truncate"
                >{{ material.originalFilename }} <span class="text-muted-foreground">· {{ formatSize(material.sizeBytes) }}</span></span
              >
              <div class="flex items-center gap-2">
                <Button variant="link" size="sm" as-child>
                  <a :href="materialUrl(material.id)" :download="material.originalFilename">Download</a>
                </Button>
                <Button variant="ghost" size="sm" :disabled="removingId === material.id" @click="removeMaterial(material)">Remove</Button>
              </div>
            </li>
          </ul>
          <div v-for="lecture in module.lectures" :key="lecture.id" class="ml-4 flex flex-col gap-3 border-l pl-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h4 class="text-sm font-medium">{{ lecture.title }}</h4>
              <Input :aria-label="`Upload material to ${lecture.title}`" :accept="acceptedExtensions" type="file" :disabled="uploading" @change="uploadFile($event, module.id, lecture.id)" />
            </div>
            <ul v-if="materialsFor(module.id, lecture.id).length" class="flex flex-col gap-2">
              <li v-for="material in materialsFor(module.id, lecture.id)" :key="material.id" class="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <span class="min-w-0 truncate"
                  >{{ material.originalFilename }} <span class="text-muted-foreground">· {{ formatSize(material.sizeBytes) }}</span></span
                >
                <div class="flex items-center gap-2">
                  <Button variant="link" size="sm" as-child>
                    <a :href="materialUrl(material.id)" :download="material.originalFilename">Download</a>
                  </Button>
                  <Button variant="ghost" size="sm" :disabled="removingId === material.id" @click="removeMaterial(material)">Remove</Button>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </CardContent>
  </Card>
</template>
