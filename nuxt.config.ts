// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  future: {
    compatibilityVersion: 5
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false }
})
