import { useMutation } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import type { Ref } from 'vue'

type OptimisticReorderOptions<T extends { id: string }> = {
  /** The list model the caller renders; the mutation writes the optimistic and saved order back to it. */
  items: Ref<T[]>
  /** Sends the new ID order and returns the order the server persisted. */
  reorderFn: (ids: string[]) => Promise<T[]>
  successMessage: string
  errorMessage: string
  /**
   * Maps the saved list onto the current one when the endpoint omits fields the
   * caller still holds (for example, a module's nested lecture list).
   */
  mergeSaved?: (saved: T[], current: T[]) => T[]
}

/**
 * Owns the optimistic reorder request for an instructor list: snapshot the
 * current order, show the new one, then merge the saved order or roll back with
 * a toast. Reordering is a one-step swap, so the caller only names the index and
 * the direction instead of rebuilding the mutation for every list.
 */
export function useOptimisticReorder<T extends { id: string }>(options: OptimisticReorderOptions<T>) {
  const { items, reorderFn, successMessage, errorMessage, mergeSaved } = options

  const { mutate, isPending } = useMutation<T[], Error, string[], { previous: T[] }>({
    mutationFn: (ids) => reorderFn(ids),
    onMutate: (ids) => {
      const previous = [...items.value]
      const byId = new Map(items.value.map((item) => [item.id, item]))
      items.value = ids.flatMap((id) => {
        const item = byId.get(id)
        return item ? [item] : []
      })
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) items.value = context.previous
      toast.error(errorMessage)
    },
    onSuccess: (saved) => {
      items.value = mergeSaved ? mergeSaved(saved, items.value) : saved
      toast.success(successMessage)
    }
  })

  function move(index: number, offset: -1 | 1) {
    const target = index + offset
    if (target < 0 || target >= items.value.length || isPending.value) return

    const reordered = [...items.value]
    ;[reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!]

    mutate(reordered.map((item) => item.id))
  }

  return { isReordering: isPending, move }
}
