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
  app: {
    head: {
      title: 'VertexAI',
      meta: [
        {
          name: 'description',
          content:
            'An AI-augmented learning management system with a tutor that knows your course.'
        }
      ]
    }
  },
  fonts: {
    provider: 'fontsource',
    // `--font-sans` already gets Inter detected, but that only resolves the
    // default weight; declaring the family pins the weights the UI uses and
    // keeps the download to the two subsets the app needs.
    families: [
      {
        name: 'Inter',
        weights: [400, 500, 600, 700],
        subsets: ['latin', 'latin-ext']
      }
    ]
  },
  future: {
    compatibilityVersion: 5
  },
  typescript: {
    nodeTsConfig: {
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
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        '@lucide/vue',
        '@tanstack/vue-form',
        '@vueuse/core',
        'better-auth/client/plugins',
        'better-auth/vue',
        'class-variance-authority',
        'cn',
        'reka-ui',
        'zod'
      ]
    }
  }
})
