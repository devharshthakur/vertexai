// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts', 'shadcn-nuxt'],
  shadcn: {
    prefix: '',
    componentDir: '@/components/ui'
  },
  fonts: {
    provider: 'fontsource'
  },
  future: {
    compatibilityVersion: 5
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()]
  }
})
