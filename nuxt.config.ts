// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

const videoJsElements = new Set(['video-player', 'video-neutral-skin'])

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts', 'shadcn-nuxt', '@nuxt/icon', '@nuxtjs/color-mode'],
  components: {
    dirs: []
  },
  imports: {
    scan: false
  },
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => videoJsElements.has(tag)
    }
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
          content: 'An AI-augmented learning management system with a tutor that knows your course.'
        }
      ]
    }
  },
  fonts: {
    provider: 'fontsource',
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
      include: ['../drizzle.config.ts', '../eslint.config.mjs', '../prettier.config.js', '../.nano-staged.mjs', '../scripts/*.ts', '../seed/*.ts'],
      compilerOptions: {
        types: ['node'],
        checkJs: true,
        module: 'ESNext',
        moduleResolution: 'Bundler'
      }
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@lucide/vue', '@tanstack/vue-form', '@tanstack/vue-query', '@videojs/html/video/neutral-skin', '@videojs/html/video/player', '@vueuse/core', 'better-auth/client/plugins', 'better-auth/vue', 'class-variance-authority', 'cn', 'reka-ui', 'zod']
    }
  }
})
