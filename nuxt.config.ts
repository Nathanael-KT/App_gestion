export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4,
  },
  modules: [
    "@nuxt/ui",
    "@nuxt/eslint",
    "@nuxtjs/supabase",
    "@nuxthub/core",
    "@nuxt/image",
    "@pinia/nuxt",
  ],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY
    }
  },
})