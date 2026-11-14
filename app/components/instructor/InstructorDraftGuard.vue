<script setup lang="ts">
  import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
  import { useInstructorDraftGuard } from '@/composables/useInstructorDrafts'
  import { Button } from '@/components/ui/button'

  const { pending, resolve } = useInstructorDraftGuard()

  /** Closing the dialog by any path keeps the editor open. */
  const open = computed({
    get: () => pending.value !== null,
    set: (value) => {
      if (!value) resolve(false)
    }
  })

  /**
   * The dialog closes because `pending` clears, not because this button is a
   * close primitive; resolving first lets the pending navigation continue.
   */
  function discardChanges() {
    resolve(true)
  }
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
        <AlertDialogDescription> You have unsaved changes on this page. Leaving now discards them. </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep editing</AlertDialogCancel>
        <Button variant="destructive" @click="discardChanges">Discard changes</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
