// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    'shadcn-nuxt',
    '@nuxt/icon',
    '@nuxtjs/color-mode'
  ],
  components: {
    dirs: []
  },
  imports: {
    scan: false
  },
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui'
  },
  colorMode: {
    classSuffix: ''
  },
  fonts: {
    provider: 'fontsource'
  },
  future: {
    compatibilityVersion: 5
  },
  typescript: {
    nodeTsConfig: {
      // Root-level Node config files are not covered by any generated
      // project, so the editor falls back to an inferred one without node
      // types ("Cannot find name 'process'"). Include them explicitly.
      include: ['../drizzle.config.ts'],
      compilerOptions: {
        types: ['node']
      }
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  }
})
