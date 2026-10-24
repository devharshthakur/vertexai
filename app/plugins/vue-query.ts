import type {
  DehydratedState,
  VueQueryPluginOptions
} from '@tanstack/vue-query'
import {
  dehydrate,
  hydrate,
  QueryClient,
  VueQueryPlugin
} from '@tanstack/vue-query'

/**
 * Installs Vue Query and transfers its cache from the server render to the
 * browser so hydrated queries start with the data that rendered the page.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const vueQueryState = useState<DehydratedState | null>('vue-query')

  // A new client per server request, and one shared client in the browser.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5000
      }
    }
  })

  const options: VueQueryPluginOptions = { queryClient }

  nuxtApp.vueApp.use(VueQueryPlugin, options)

  if (import.meta.server) {
    nuxtApp.hooks.hook('app:rendered', () => {
      vueQueryState.value = dehydrate(queryClient)
    })
  }

  if (import.meta.client && vueQueryState.value !== null) {
    hydrate(queryClient, vueQueryState.value)
  }
})
