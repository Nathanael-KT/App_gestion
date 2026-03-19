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
    // "@nuxthub/core",
    "@nuxt/image",
    "@pinia/nuxt",
  ],
  css: ["~/assets/css/main.css"],

  // Runtime Nitro neutre (Vercel detecte automatiquement le preset en CI)
  nitro: {
    serveStatic: true,
  },

  // SSR requis pour le rendu serveur
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
    // Variables côté serveur (sensibles) - AUCUNE clé service_role exposée !
    // supabaseServiceKey: SUPPRIMÉ pour sécurité multi-tenant

    public: {
      // Variables côté client (publiques) - avec fallbacks multiples
      supabaseUrl:
        process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabaseKey:
        process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_KEY,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
    },
  },

  // Configuration Supabase
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "",
      exclude: ["/vente"],
    },
  },
});
