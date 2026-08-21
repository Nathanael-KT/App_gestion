import process from "node:process";

const supabaseUrl =
  process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey =
  process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NUXT_PUBLIC_SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  "";

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
    // Variables côté serveur (sensibles) - non exposées au client
    supabaseServiceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      "",

    // === Innovation : Vision IA (photo -> fiche produit) ===
    // Clé API compatible OpenAI Vision (OpenAI, OpenRouter, Ollama, etc.)
    visionApiKey: process.env.VISION_API_KEY || process.env.OPENAI_API_KEY || "",
    visionApiUrl:
      process.env.VISION_API_URL ||
      "https://api.openai.com/v1/chat/completions",
    visionApiModel: process.env.VISION_API_MODEL || "gpt-4o-mini",

    // === Innovation : Mobile Money (MTN MoMo / Orange Money) ===
    mtnMomoSubscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || "",
    mtnMomoApiUser: process.env.MTN_MOMO_API_USER || "",
    mtnMomoApiKey: process.env.MTN_MOMO_API_KEY || "",
    mtnMomoBaseUrl:
      process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com",
    mtnMomoEnvironment: process.env.MTN_MOMO_ENVIRONMENT || "sandbox",
    orangeMoneyClientId: process.env.ORANGE_MONEY_CLIENT_ID || "",
    orangeMoneyClientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET || "",
    orangeMoneyBaseUrl:
      process.env.ORANGE_MONEY_BASE_URL ||
      "https://api.orange.com/orange-money-webpay/dev/v1",
    orangeMoneyMerchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY || "",

    // === Innovation : Avance de trésorerie (cash advance) ===
    financingPartnerApiUrl: process.env.FINANCING_PARTNER_API_URL || "",
    financingPartnerApiKey: process.env.FINANCING_PARTNER_API_KEY || "",

    public: {
      // Variables côté client (publiques) - avec fallbacks multiples
      supabaseUrl,
      supabaseKey,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || process.env.SITE_URL || "",
      // Feature flags (activables sans redéployer la logique métier)
      enableProductVision: process.env.NUXT_PUBLIC_ENABLE_PRODUCT_VISION !== "false",
      enableVoiceSearch: process.env.NUXT_PUBLIC_ENABLE_VOICE_SEARCH !== "false",
      enableQrPayment: process.env.NUXT_PUBLIC_ENABLE_QR_PAYMENT !== "false",
      enableCashAdvance: process.env.NUXT_PUBLIC_ENABLE_CASH_ADVANCE !== "false",
      enableAnomalyDetection:
        process.env.NUXT_PUBLIC_ENABLE_ANOMALY_DETECTION !== "false",
      // Langue par défaut pour la reconnaissance vocale
      voiceSearchLang: process.env.NUXT_PUBLIC_VOICE_SEARCH_LANG || "fr-FR",
    },
  },

  // Configuration Supabase
  supabase: {
    url: supabaseUrl,
    key: supabaseKey,
    types: "~~/types/database.types.ts",
    redirectOptions: {
      login: "/login",
      callback: "",
      // /paiement/* = page de paiement client publique (QR code)
      exclude: [
        "/vente",
        "/auth/",
        "/auth/reset-password",
        "/paiement/",
      ],
    },
  },
});
