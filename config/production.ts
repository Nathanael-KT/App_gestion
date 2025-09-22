// Configuration d'optimisation pour la production avec Deno Deploy

export const productionOptimizations = {
  // Optimisations Nuxt pour Deno Deploy
  nuxtOptimizations: {
    // Préfetching intelligent
    router: {
      prefetchLinks: false, // Désactiver pour économiser la bande passante
    },

    // Optimisation des bundles
    build: {
      splitChunks: {
        layouts: true,
        pages: true,
        commons: true,
      },
    },

    // Compression et minification
    compilerOptions: {
      target: "es2020",
      strict: true,
    },
  },

  // Optimisations Supabase
  supabaseOptimizations: {
    // Configuration client optimisée
    clientOptions: {
      realtime: {
        // Désactiver realtime sur les pages qui n'en ont pas besoin
        enabled: false,
      },
      global: {
        // Headers optimisés
        headers: {
          apikey: "your-anon-key",
          "Content-Type": "application/json",
        },
      },
    },

    // Policies RLS optimisées pour la performance
    rlsPolicies: {
      // Utiliser des index sur les colonnes fréquemment filtrées
      // Exemple: CREATE INDEX idx_company_id ON products(company_id);
    },
  },

  // Monitoring et logging
  monitoring: {
    // Configuration des logs pour Deno Deploy
    logLevel: "info",
    enableMetrics: true,

    // Alerts de performance
    performanceThresholds: {
      responseTime: 1000, // ms
      errorRate: 0.1, // 10%
      availability: 0.99, // 99%
    },
  },

  // Cache strategy
  caching: {
    // Cache statique pour les assets
    staticCache: 86400, // 24 heures

    // Cache API pour les données peu volatiles
    apiCache: {
      products: 3600, // 1 heure
      users: 1800, // 30 minutes
      settings: 7200, // 2 heures
    },
  },
};

// Middleware de performance pour surveiller les métriques
export function performanceMiddleware() {
  return defineEventHandler(async (event) => {
    const start = Date.now();

    // Log de la requête
    console.log(
      `[${new Date().toISOString()}] ${event.node.req.method} ${
        event.node.req.url
      }`
    );

    // Continuer avec le handler normal
    const response = await event;

    // Log du temps de réponse
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] Response time: ${duration}ms`);

    // Alert si le temps de réponse est trop élevé
    if (
      duration >
      productionOptimizations.monitoring.performanceThresholds.responseTime
    ) {
      console.warn(
        `⚠️ Slow response detected: ${duration}ms for ${event.node.req.url}`
      );
    }

    return response;
  });
}
