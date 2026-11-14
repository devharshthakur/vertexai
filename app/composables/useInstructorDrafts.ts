import { useEventListener } from '@vueuse/core'
import { inject, onScopeDispose, provide, shallowRef, type InjectionKey, type ShallowRef } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

type DraftRegistry = { register: (isDirty: () => boolean) => () => void }

type PendingNavigation = { resolve: (allowed: boolean) => void }

type DraftGuard = {
  pending: Readonly<ShallowRef<PendingNavigation | null>>
  resolve: (allowed: boolean) => void
}

const draftKey: InjectionKey<DraftRegistry> = Symbol('instructor drafts')
const guardKey: InjectionKey<DraftGuard> = Symbol('instructor draft guard')

/**
 * Own the registry, navigation guards, and confirmation dialog state for one
 * instructor page. The dialog itself is rendered by `InstructorDraftGuard` so
 * the page keeps a single, accessible confirmation surface.
 */
export function provideInstructorDrafts() {
  const drafts = new Set<() => boolean>()
  const pending = shallowRef<PendingNavigation | null>(null)

  provide(draftKey, {
    register(isDirty) {
      drafts.add(isDirty)
      return () => drafts.delete(isDirty)
    }
  })

  const guard: DraftGuard = {
    pending,
    resolve(allowed) {
      const current = pending.value
      pending.value = null
      current?.resolve(allowed)
    }
  }
  provide(guardKey, guard)

  function hasDrafts() {
    return [...drafts].some((isDirty) => isDirty())
  }

  function confirmLeaving() {
    if (!hasDrafts()) return true
    // A second navigation may arrive while the dialog is open; keep the
    // first prompt and block the duplicate instead of stacking dialogs.
    if (pending.value) return false
    return new Promise<boolean>((resolve) => {
      pending.value = { resolve }
    })
  }

  onBeforeRouteLeave(() => confirmLeaving())
  onBeforeRouteUpdate((to, from) => (to.path === from.path ? true : confirmLeaving()))

  if (import.meta.client) {
    useEventListener(window, 'beforeunload', (event) => {
      if (!hasDrafts()) return
      event.preventDefault()
    })
  }
}

/** Register a form or input without forwarding its state through intermediate components. */
export function useInstructorDraft(isDirty: () => boolean) {
  const registry = inject(draftKey)
  if (!registry) throw new Error('Instructor drafts require a page provider')
  onScopeDispose(registry.register(isDirty))
}

/** Read and settle the pending navigation prompt for the page's confirmation dialog. */
export function useInstructorDraftGuard() {
  const guard = inject(guardKey)
  if (!guard) throw new Error('Instructor draft guard requires a page provider')
  return guard
}
