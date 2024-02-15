// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    'nuxt-vuefire',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxt/ui',
  ],
  vuefire: {
    config: JSON.parse(import.meta.env.FIREBASE_CONFIG || '{}'),
  },
  ui: {
    icons: ['heroicons', 'mdi'],
  },
  app: {
    head: {
      titleTemplate: '%s %separator %siteName',
      templateParams: {
        siteName: 'Anhzf Labs',
        separator: ' - ',
      },
    },
  },
});
