<script setup lang="ts">
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '@lucide/vue'
import type { ModuleSummary } from '#shared/types/courses'
import { addModuleSchema } from '#shared/validation/courses'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

const props = defineProps<{
  courseId: string
  modules: ModuleSummary[]
}>()
const emit = defineEmits<{ 'update:modules': [modules: ModuleSummary[]] }>()

const modules = ref([...props.modules])
const title = ref('')
const saving = ref(false)
const errorMessage = ref('')

watch(
  () => props.modules,
  (nextModules) => {
    modules.value = [...nextModules]
  }
)

async function addModule() {
  errorMessage.value = ''
  const result = addModuleSchema.safeParse({ title: title.value })
  if (!result.success) {
    errorMessage.value =
      result.error.issues[0]?.message ?? 'Enter a valid module title.'
    return
  }

  saving.value = true
  try {
    const module = await $fetch<ModuleSummary>(
      `/api/courses/${props.courseId}/modules`,
      {
        method: 'POST',
        body: result.data
      }
    )
    modules.value = [...modules.value, module]
    emit('update:modules', modules.value)
    title.value = ''
  } catch {
    errorMessage.value = 'We could not add this module. Please try again.'
  } finally {
    saving.value = false
  }
}

async function moveModule(index: number, offset: -1 | 1) {
  const target = index + offset
  if (target < 0 || target >= modules.value.length || saving.value) return

  const previous = [...modules.value]
  const reordered = [...modules.value]
  ;[reordered[index], reordered[target]] = [
    reordered[target]!,
    reordered[index]!
  ]
  modules.value = reordered
  saving.value = true
  errorMessage.value = ''

  try {
    const saved = await $fetch<ModuleSummary[]>(
      `/api/courses/${props.courseId}/modules/reorder`,
      {
        method: 'PUT',
        body: { moduleIds: reordered.map((module) => module.id) }
      }
    )
    modules.value = saved
    emit('update:modules', saved)
  } catch {
    modules.value = previous
    errorMessage.value = 'The module order was not saved. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Curriculum modules</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col gap-5">
        <Alert v-if="errorMessage" variant="destructive">
          <AlertTitle>Curriculum update failed</AlertTitle>
          <AlertDescription>{{ errorMessage }}</AlertDescription>
        </Alert>

        <form
          class="flex flex-col gap-3 sm:flex-row sm:items-end"
          @submit.prevent="addModule"
        >
          <Field class="flex-1">
            <FieldLabel for="module-title">Add a module</FieldLabel>
            <Input
              id="module-title"
              v-model="title"
              maxlength="200"
              placeholder="Module title"
            />
          </Field>
          <Button type="submit" :disabled="saving || !title.trim()">
            <PlusIcon data-icon="inline-start" />
            Add module
          </Button>
        </form>

        <Separator />

        <ol v-if="modules.length" class="flex flex-col gap-3">
          <li v-for="(module, index) in modules" :key="module.id">
            <Card>
              <CardContent>
                <div class="flex items-center justify-between gap-4">
                  <div class="flex min-w-0 items-center gap-3">
                    <span class="text-sm text-muted-foreground"
                      >{{ index + 1 }}.</span
                    >
                    <span class="truncate font-medium">{{ module.title }}</span>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      :aria-label="`Move ${module.title} up`"
                      :disabled="index === 0 || saving"
                      @click="moveModule(index, -1)"
                    >
                      <ArrowUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      :aria-label="`Move ${module.title} down`"
                      :disabled="index === modules.length - 1 || saving"
                      @click="moveModule(index, 1)"
                    >
                      <ArrowDownIcon />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        </ol>
        <p v-else class="text-sm text-muted-foreground">
          Add modules to start organizing this course.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
