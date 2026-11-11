import { inject, onScopeDispose, provide, type InjectionKey } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

type DraftRegistry = { register: (isDirty: () => boolean) => () => void }

const draftKey: InjectionKey<DraftRegistry> = Symbol('instructor drafts')

/** Own the registry and navigation guards for one instructor page. */
export function provideInstructorDrafts() {
  const drafts = new Set<() => boolean>()
  provide(draftKey, {
    register(isDirty) {
      drafts.add(isDirty)
      return () => drafts.delete(isDirty)
    }
  })

  function hasDrafts() {
    return [...drafts].some((isDirty) => isDirty())
  }

  function confirmLeaving() {
    return !hasDrafts() || window.confirm('You have unsaved changes. Leave without saving?')
  }

  onBeforeRouteLeave(() => confirmLeaving())
  onBeforeRouteUpdate((to, from) => (to.path === from.path ? true : confirmLeaving()))

  if (import.meta.client) {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDrafts()) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    onScopeDispose(() => window.removeEventListener('beforeunload', beforeUnload))
  }
}

/** Register a form or input without forwarding its state through intermediate components. */
export function useInstructorDraft(isDirty: () => boolean) {
  const registry = inject(draftKey)
  if (!registry) throw new Error('Instructor drafts require a page provider')
  onScopeDispose(registry.register(isDirty))
}
