<script setup lang="ts">
  import { useMutation } from '@tanstack/vue-query'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'
  import { toast } from 'vue-sonner'
  import type { LectureBookmark, LectureNote } from '#shared/types/learning'
  import { createLectureBookmarkSchema, createLectureNoteSchema, updateLectureNoteSchema } from '#shared/validation/learning'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Separator } from '@/components/ui/separator'
  import { Spinner } from '@/components/ui/spinner'
  import { Textarea } from '@/components/ui/textarea'

  const props = defineProps<{
    courseId: string
    lectureId: string
    getCurrentTime: () => number | null
  }>()
  const emit = defineEmits<{ seek: [timestampSeconds: number] }>()

  const lectureUrl = computed(() => `/api/courses/${props.courseId}/lectures/${props.lectureId}`)
  const notesRequest = useFetch<LectureNote[]>(() => `${lectureUrl.value}/notes`, { default: () => [] })
  const bookmarksRequest = useFetch<LectureBookmark[]>(() => `${lectureUrl.value}/bookmarks`, { default: () => [] })
  const [{ data: notes, pending: notesPending, error: notesError, refresh: refreshNotes }, { data: bookmarks, pending: bookmarksPending, error: bookmarksError, refresh: refreshBookmarks }] = await Promise.all([notesRequest, bookmarksRequest])
  const editingNoteId = shallowRef<string | null>(null)
  const loading = computed(() => notesPending.value || bookmarksPending.value)
  const loadFailed = computed(() => Boolean(notesError.value || bookmarksError.value))

  const noteForm = useForm({
    defaultValues: { content: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: updateLectureNoteSchema },
    onSubmit: async ({ value }) => {
      const timestampSeconds = editingNoteId.value ? null : props.getCurrentTime()
      if (!editingNoteId.value && timestampSeconds === null) {
        toast.warning('The video player is not ready, so a timestamp cannot be captured yet.')
        return
      }

      try {
        await saveNote({ content: value.content, timestampSeconds })
      } catch {
        // The mutation reports the failure.
      }
    }
  })

  const { mutateAsync: saveNote } = useMutation({
    mutationFn: ({ content, timestampSeconds }: { content: string; timestampSeconds: number | null }) => {
      if (editingNoteId.value) {
        const input = updateLectureNoteSchema.parse({ content })
        return $fetch(`${lectureUrl.value}/notes/${editingNoteId.value}`, { method: 'PUT', body: input })
      }

      const input = createLectureNoteSchema.parse({ content, timestampSeconds })
      return $fetch(`${lectureUrl.value}/notes`, { method: 'POST', body: input })
    },
    onSuccess: async () => {
      toast.success(editingNoteId.value ? 'Note updated.' : 'Note added.')
      editingNoteId.value = null
      noteForm.reset()
      await refreshNotes()
    },
    onError: () => {
      toast.error('We could not save the note. Please try again.')
    }
  })

  const { mutateAsync: deleteNoteRequest } = useMutation({
    mutationFn: (note: LectureNote) => $fetch(`${lectureUrl.value}/notes/${note.id}`, { method: 'DELETE' }),
    onSuccess: async (_result, note) => {
      if (editingNoteId.value === note.id) cancelEditing()
      await refreshNotes()
      toast.success('Note deleted.')
    },
    onError: () => {
      toast.error('We could not delete the note. Please try again.')
    }
  })

  const { mutateAsync: addBookmarkRequest, isPending: isAddingBookmark } = useMutation({
    mutationFn: (payload: { timestampSeconds: number }) =>
      $fetch(`${lectureUrl.value}/bookmarks`, {
        method: 'POST',
        body: payload
      }),
    onSuccess: async () => {
      await refreshBookmarks()
      toast.success('Bookmark added.')
    },
    onError: () => {
      toast.error('We could not add the bookmark. Please try again.')
    }
  })

  const { mutateAsync: deleteBookmarkRequest } = useMutation({
    mutationFn: (bookmark: LectureBookmark) => $fetch(`${lectureUrl.value}/bookmarks/${bookmark.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await refreshBookmarks()
      toast.success('Bookmark removed.')
    },
    onError: () => {
      toast.error('We could not remove the bookmark. Please try again.')
    }
  })

  function formatTimestamp(seconds: number) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}` : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }

  function editNote(note: LectureNote) {
    editingNoteId.value = note.id
    noteForm.setFieldValue('content', note.content)
  }

  function cancelEditing() {
    editingNoteId.value = null
    noteForm.reset()
  }

  async function deleteNote(note: LectureNote) {
    try {
      await deleteNoteRequest(note)
    } catch {
      // The mutation reports the failure.
    }
  }

  async function addBookmark() {
    const timestampSeconds = props.getCurrentTime()
    const result = createLectureBookmarkSchema.safeParse({ timestampSeconds })
    if (!result.success) {
      toast.warning(timestampSeconds === null ? 'The video player is not ready, so a timestamp cannot be captured yet.' : 'The current video position is invalid.')
      return
    }

    try {
      await addBookmarkRequest(result.data)
    } catch {
      // The mutation reports the failure.
    }
  }

  async function deleteBookmark(bookmark: LectureBookmark) {
    try {
      await deleteBookmarkRequest(bookmark)
    } catch {
      // The mutation reports the failure.
    }
  }
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Lecture notes &amp; bookmarks</CardTitle>
      <CardDescription>Save your thoughts and return to useful moments in this lecture.</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-col gap-5">
        <Alert v-if="loadFailed" variant="destructive">
          <AlertTitle>Lecture tools could not be loaded</AlertTitle>
          <AlertDescription>Refresh the page and try again.</AlertDescription>
        </Alert>

        <form class="flex flex-col gap-3" novalidate @submit.prevent="noteForm.handleSubmit()">
          <FieldGroup>
            <noteForm.Field name="content">
              <template #default="{ field }">
                <Field :data-invalid="!field.state.meta.isValid">
                  <FieldLabel :for="`lecture-note-${lectureId}`">{{ editingNoteId ? 'Edit note' : 'Add a timestamped note' }}</FieldLabel>
                  <Textarea :id="`lecture-note-${lectureId}`" :model-value="field.state.value" :aria-invalid="!field.state.meta.isValid" maxlength="10000" placeholder="What do you want to remember?" @update:model-value="(value) => field.handleChange(String(value))" @blur="field.handleBlur" />
                  <FieldError v-if="!field.state.meta.isValid" :errors="field.state.meta.errors" />
                </Field>
              </template>
            </noteForm.Field>
          </FieldGroup>
          <div class="flex flex-wrap gap-2">
            <noteForm.Subscribe v-slot="{ isSubmitting }">
              <Button type="submit" :disabled="isSubmitting">
                <Spinner v-if="isSubmitting" data-icon="inline-start" />
                {{
                  isSubmitting ? 'Saving…'
                  : editingNoteId ? 'Save note'
                  : 'Add note'
                }}
              </Button>
              <Button v-if="editingNoteId" type="button" variant="outline" :disabled="isSubmitting" @click="cancelEditing">Cancel</Button>
            </noteForm.Subscribe>
          </div>
        </form>

        <Separator />

        <section class="flex flex-col gap-3" aria-labelledby="lecture-notes-heading">
          <h3 id="lecture-notes-heading" class="font-semibold">Your notes</h3>
          <p v-if="loading" class="text-sm text-muted-foreground" role="status">Loading notes…</p>
          <p v-else-if="notesError" class="text-sm text-muted-foreground">Notes could not be loaded.</p>
          <Empty v-else-if="notes?.length === 0">
            <EmptyHeader>
              <EmptyTitle>No notes yet</EmptyTitle>
              <EmptyDescription>Add a note to remember an idea from this lecture.</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <ul v-else class="flex flex-col gap-3">
            <li v-for="note in notes" :key="note.id" class="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0">
              <div class="flex flex-wrap items-center gap-2">
                <Button type="button" variant="link" size="sm" @click="emit('seek', note.timestampSeconds)">{{ formatTimestamp(note.timestampSeconds) }}</Button>
                <div class="ml-auto flex gap-1">
                  <Button type="button" variant="ghost" size="sm" :disabled="Boolean(editingNoteId) && editingNoteId !== note.id" @click="editNote(note)">Edit</Button>
                  <Button type="button" variant="ghost" size="sm" @click="deleteNote(note)">Delete</Button>
                </div>
              </div>
              <p class="text-sm whitespace-pre-wrap">{{ note.content }}</p>
            </li>
          </ul>
        </section>

        <Separator />

        <section class="flex flex-col gap-3" aria-labelledby="lecture-bookmarks-heading">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 id="lecture-bookmarks-heading" class="font-semibold">Bookmarks</h3>
            <Button type="button" variant="outline" size="sm" :disabled="isAddingBookmark" @click="addBookmark">
              <Spinner v-if="isAddingBookmark" data-icon="inline-start" />
              {{ isAddingBookmark ? 'Saving…' : 'Bookmark current time' }}
            </Button>
          </div>
          <p v-if="loading" class="text-sm text-muted-foreground" role="status">Loading bookmarks…</p>
          <p v-else-if="bookmarksError" class="text-sm text-muted-foreground">Bookmarks could not be loaded.</p>
          <Empty v-else-if="bookmarks?.length === 0">
            <EmptyHeader>
              <EmptyTitle>No bookmarks yet</EmptyTitle>
              <EmptyDescription>Bookmark a moment to return to it later.</EmptyDescription>
            </EmptyHeader>
          </Empty>
          <ul v-else class="flex flex-col gap-2">
            <li v-for="bookmark in bookmarks" :key="bookmark.id" class="flex items-center justify-between gap-2">
              <Button type="button" variant="link" size="sm" @click="emit('seek', bookmark.timestampSeconds)">{{ formatTimestamp(bookmark.timestampSeconds) }}</Button>
              <Button type="button" variant="ghost" size="sm" :aria-label="`Remove bookmark at ${formatTimestamp(bookmark.timestampSeconds)}`" @click="deleteBookmark(bookmark)">Remove</Button>
            </li>
          </ul>
        </section>
      </div>
    </CardContent>
  </Card>
</template>
