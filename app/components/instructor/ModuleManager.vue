<script setup lang="ts">
  import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from '@lucide/vue'
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { toast } from 'vue-sonner'
  import type { ModuleSummary } from '#shared/types/courses'
  import LectureManager from '@/components/instructor/LectureManager.vue'
  import { useInstructorDraft } from '@/composables/useInstructorDrafts'
  import { addModuleSchema } from '#shared/validation/courses'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
  import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty'
  import { Field, FieldError, FieldLabel } from '@/components/ui/field'
  import { Input } from '@/components/ui/input'
  import { Separator } from '@/components/ui/separator'
  import { Spinner } from '@/components/ui/spinner'

  const props = defineProps<{ courseId: string }>()
  const modules = defineModel<ModuleSummary[]>('modules', { required: true })

  const form = useForm({
    defaultValues: { title: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: addModuleSchema },
    onSubmit: async ({ value }) => {
      try {
        await addModule(value)
        form.reset()
      } catch {
        // The mutation reports the failure.
      }
    }
  })
  useInstructorDraft(() => !form.state.isDefaultValue)

  /** Subscribe to the title so the submit button enables as the user types. */
  const title = form.useSelector((state) => state.values.title)

  const { mutateAsync: addModule, isPending: isAdding } = useMutation({
    mutationFn: (values: { title: string }) =>
      $fetch<ModuleSummary>(`/api/courses/${props.courseId}/modules`, {
        method: 'POST',
        body: values
      }),
    onSuccess: (module) => {
      modules.value = [...modules.value, module]
      toast.success('Module added.')
    },
    onError: () => {
      toast.error('We could not add this module. Please try again.')
    }
  })

  const { mutateAsync: reorderModules, isPending: isReordering } = useMutation({
    mutationFn: (moduleIds: string[]) =>
      $fetch<ModuleSummary[]>(`/api/courses/${props.courseId}/modules/reorder`, {
        method: 'PUT',
        body: { moduleIds }
      }),
    onMutate: (moduleIds) => {
      const previous = [...modules.value]
      const byId = new Map(modules.value.map((module) => [module.id, module]))
      modules.value = moduleIds.flatMap((id) => {
        const module = byId.get(id)
        return module ? [module] : []
      })
      return { previous }
    },
    onSuccess: (saved) => {
      // The reorder endpoint returns module summaries without their lecture
      // lists, so keep the lectures already loaded instead of clearing them.
      const lecturesByModule = new Map(modules.value.map((module) => [module.id, module.lectures]))
      modules.value = saved.map((module) => ({
        ...module,
        lectures: lecturesByModule.get(module.id) ?? module.lectures
      }))
      toast.success('Module order saved.')
    },
    onError: (_error, _moduleIds, context) => {
      if (context?.previous) modules.value = context.previous
      toast.error('The module order was not saved. Please try again.')
    }
  })

  async function moveModule(index: number, offset: -1 | 1) {
    const target = index + offset
    if (target < 0 || target >= modules.value.length || isReordering.value) return

    const reordered = [...modules.value]
    ;[reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!]

    try {
      await reorderModules(reordered.map((module) => module.id))
    } catch {
      // The mutation restores the previous order.
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
        <form class="flex flex-col gap-3 sm:flex-row sm:items-start" novalidate @submit.prevent="form.handleSubmit()">
          <form.Field name="title">
            <template #default="{ field }">
              <Field class="flex-1" :data-invalid="!field.state.meta.isValid">
                <FieldLabel for="module-title">Add a module</FieldLabel>
                <Input id="module-title" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" :disabled="isAdding" maxlength="200" placeholder="Module title" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
              </Field>
            </template>
          </form.Field>
          <Button type="submit" class="sm:mt-6" :disabled="isAdding || !title.trim()">
            <Spinner v-if="isAdding" data-icon="inline-start" />
            <PlusIcon v-else data-icon="inline-start" />
            Add module
          </Button>
        </form>

        <Separator />

        <ol v-if="modules.length" class="flex flex-col gap-3">
          <li v-for="(module, index) in modules" :key="module.id">
            <Card>
              <CardContent>
                <div class="flex flex-col gap-5">
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex min-w-0 items-center gap-3">
                      <span class="text-sm text-muted-foreground">{{ index + 1 }}.</span>
                      <span class="truncate font-medium">{{ module.title }}</span>
                    </div>
                    <div class="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" :aria-label="`Move ${module.title} up`" :disabled="index === 0 || isReordering" @click="moveModule(index, -1)">
                        <ArrowUpIcon data-icon="inline-start" />
                      </Button>
                      <Button variant="ghost" size="icon" :aria-label="`Move ${module.title} down`" :disabled="index === modules.length - 1 || isReordering" @click="moveModule(index, 1)">
                        <ArrowDownIcon data-icon="inline-start" />
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <LectureManager v-model:lectures="module.lectures" :course-id="props.courseId" :module-id="module.id" />
                </div>
              </CardContent>
            </Card>
          </li>
        </ol>
        <Empty v-else>
          <EmptyHeader>
            <EmptyDescription>Add modules to start organizing this course.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    </CardContent>
  </Card>
</template>
