import process from "node:process";

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
    // "@nuxthub/core", // Désactivé pour Deno Deploy
    "@nuxt/image",
    "@pinia/nuxt",
  ],
  css: ["~/assets/css/main.css"],

  // Configuration pour Deno Deploy
  nitro: {
    preset: "deno-server",
    serveStatic: true,
  },

  // SSR requis pour Deno Deploy
  ssr: true,

  // Optimisations de build
  build: {
    transpile: ["@supabase/supabase-js"],
  },

  // Configuration Vite pour jsPDF
  vite: {
    build: {
      target: "es2022",
    },
    optimizeDeps: {
      include: ["jspdf"],
    },
  },

  runtimeConfig: {
    // Variables côté serveur (sensibles)
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

    public: {
      // Variables côté client (publiques)
      supabaseUrl:
        process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey:
        process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
    },
  },

  // Configuration Supabase
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/",
      exclude: ["/vente"],
    },
  },
});
