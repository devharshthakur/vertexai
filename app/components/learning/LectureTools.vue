<script setup lang="ts">
  import { shallowRef } from 'vue'
  import type { LectureBookmark, LectureNote } from '#shared/types/learning'
  import { createLectureBookmarkSchema, createLectureNoteSchema, updateLectureNoteSchema } from '#shared/validation/learning'
  import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
  import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
  import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
  import { Separator } from '@/components/ui/separator'
  import { Textarea } from '@/components/ui/textarea'
  import { revalidateLogic, useForm } from '@tanstack/vue-form'

  const props = defineProps<{
    courseId: string
    lectureId: string
    getCurrentTime: () => number | null
  }>()
  const emit = defineEmits<{ seek: [timestampSeconds: number] }>()

  const lectureUrl = computed(() => `/api/courses/${props.courseId}/lectures/${props.lectureId}`)
  const { data: notes, pending: notesPending, error: notesError, refresh: refreshNotes } = await useFetch<LectureNote[]>(() => `${lectureUrl.value}/notes`, { default: () => [] })
  const { data: bookmarks, pending: bookmarksPending, error: bookmarksError, refresh: refreshBookmarks } = await useFetch<LectureBookmark[]>(() => `${lectureUrl.value}/bookmarks`, { default: () => [] })
  const editingNoteId = shallowRef<string | null>(null)
  const errorMessage = shallowRef('')
  const savingBookmark = shallowRef(false)
  const loading = computed(() => notesPending.value || bookmarksPending.value)
  const loadFailed = computed(() => Boolean(notesError.value || bookmarksError.value))

  const noteForm = useForm({
    defaultValues: { content: '' },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: updateLectureNoteSchema },
    onSubmit: async ({ value }) => {
      errorMessage.value = ''
      try {
        if (editingNoteId.value) {
          const input = updateLectureNoteSchema.parse({ content: value.content })
          await $fetch(`${lectureUrl.value}/notes/${editingNoteId.value}`, { method: 'PUT', body: input })
        } else {
          const timestampSeconds = props.getCurrentTime()
          if (timestampSeconds === null) {
            errorMessage.value = 'The video player is not ready, so a timestamp cannot be captured yet.'
            return
          }
          const input = createLectureNoteSchema.parse({ content: value.content, timestampSeconds })
          await $fetch(`${lectureUrl.value}/notes`, { method: 'POST', body: input })
        }
        editingNoteId.value = null
        noteForm.reset()
        await refreshNotes()
      } catch {
        errorMessage.value = 'We could not save the note. Please try again.'
      }
    }
  })

  function formatTimestamp(seconds: number) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}` : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
  }

  function editNote(note: LectureNote) {
    errorMessage.value = ''
    editingNoteId.value = note.id
    noteForm.setFieldValue('content', note.content)
  }

  function cancelEditing() {
    editingNoteId.value = null
    noteForm.reset()
    errorMessage.value = ''
  }

  async function deleteNote(note: LectureNote) {
    errorMessage.value = ''
    try {
      await $fetch(`${lectureUrl.value}/notes/${note.id}`, { method: 'DELETE' })
      if (editingNoteId.value === note.id) cancelEditing()
      await refreshNotes()
    } catch {
      errorMessage.value = 'We could not delete the note. Please try again.'
    }
  }

  async function addBookmark() {
    errorMessage.value = ''
    const timestampSeconds = props.getCurrentTime()
    const result = createLectureBookmarkSchema.safeParse({ timestampSeconds })
    if (!result.success) {
      errorMessage.value = timestampSeconds === null ? 'The video player is not ready, so a timestamp cannot be captured yet.' : 'The current video position is invalid.'
      return
    }

    savingBookmark.value = true
    try {
      await $fetch(`${lectureUrl.value}/bookmarks`, { method: 'POST', body: result.data })
      await refreshBookmarks()
    } catch {
      errorMessage.value = 'We could not add the bookmark. Please try again.'
    } finally {
      savingBookmark.value = false
    }
  }

  async function deleteBookmark(bookmark: LectureBookmark) {
    errorMessage.value = ''
    try {
      await $fetch(`${lectureUrl.value}/bookmarks/${bookmark.id}`, { method: 'DELETE' })
      await refreshBookmarks()
    } catch {
      errorMessage.value = 'We could not delete the bookmark. Please try again.'
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
        <Alert v-if="errorMessage || loadFailed" variant="destructive">
          <AlertTitle>{{ loadFailed ? 'Lecture tools could not be loaded' : 'Lecture tool update failed' }}</AlertTitle>
          <AlertDescription>{{ errorMessage || 'Refresh the page and try again.' }}</AlertDescription>
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
              <Button type="submit" :disabled="isSubmitting">{{
                isSubmitting ? 'Saving…'
                : editingNoteId ? 'Save note'
                : 'Add note'
              }}</Button>
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
            <Button type="button" variant="outline" size="sm" :disabled="savingBookmark" @click="addBookmark">{{ savingBookmark ? 'Saving…' : 'Bookmark current time' }}</Button>
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
