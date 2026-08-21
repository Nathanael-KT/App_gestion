/**
 * Recherche et navigation vocales (Web Speech API) + catalogue de commandes.
 *
 * - useVoiceSearch() : encapsule SpeechRecognition (start/stop, transcript).
 * - VOICE_COMMANDS : catalogue des commandes de navigation (réutilisé par le
 *   palette de commandes clavier/souris du VoiceSearchModal).
 * - matchVoiceCommand() : associe une phrase parlée (ou tapée) à la meilleure
 *   commande du catalogue (correspondance par mots-clés, tolérante aux accents).
 */

export interface VoiceCommand {
  id: string;
  label: string;
  keywords: string[];
  path: string;
  icon: string;
  /** Si défini, la commande n'est visible qu'aux utilisateurs ayant un de ces rôles. */
  roles?: string[];
}

/** Catalogue des commandes de navigation (mots-clés en français). */
export const VOICE_COMMANDS: VoiceCommand[] = [
  { id: "home", label: "Accueil / Tableau de bord", keywords: ["accueil", "tableau", "dashboard", "home"], path: "/", icon: "i-lucide-home" },
  { id: "stock", label: "Stock / Produits", keywords: ["stock", "produit", "produits", "inventaire", "articles"], path: "/stock", icon: "i-lucide-package" },
  { id: "stock-add", label: "Ajouter un produit", keywords: ["nouveau produit", "ajouter produit", "creer produit", "scanner produit"], path: "/stock/add", icon: "i-lucide-package-plus", roles: ["admin", "magasinier"] },
  { id: "categories", label: "Catégories de produits", keywords: ["categorie", "categories", "type", "types"], path: "/stock/categories", icon: "i-lucide-tags", roles: ["admin", "magasinier"] },
  { id: "clients", label: "Clients", keywords: ["client", "clients", "customers"], path: "/client", icon: "i-lucide-users" },
  { id: "client-add", label: "Nouveau client", keywords: ["nouveau client", "ajouter client", "creer client"], path: "/client/add", icon: "i-lucide-user-plus" },
  { id: "commandes", label: "Commandes", keywords: ["commande", "commandes", "order", "orders"], path: "/commande", icon: "i-lucide-shopping-bag" },
  { id: "commande-add", label: "Nouvelle commande", keywords: ["nouvelle commande", "creer commande"], path: "/commande/add", icon: "i-lucide-plus-circle" },
  { id: "livraison", label: "Livraisons", keywords: ["livraison", "livraisons", "livrer", "delivery"], path: "/commande/livraison", icon: "i-lucide-truck" },
  { id: "factures", label: "Factures", keywords: ["facture", "factures", "invoice"], path: "/facture", icon: "i-lucide-file-text" },
  { id: "caisse", label: "Caisse", keywords: ["caisse", "encaisser", "checkout", "caissier"], path: "/caisse", icon: "i-lucide-cash-register" },
  { id: "qr-pay", label: "Paiement par QR code", keywords: ["paiement qr", "qr", "qrcode", "mobile money", "paiement code", "mtn", "orange money"], path: "/caisse/qr-pay", icon: "i-lucide-qr-code" },
  { id: "anomalies", label: "Anti-fraude / Anomalies", keywords: ["anomalie", "anomalies", "fraude", "anti-fraude", "ecart caisse", "vigilance"], path: "/caisse/anomalies", icon: "i-lucide-shield-alert", roles: ["admin"] },
  { id: "rapports", label: "Rapports", keywords: ["rapport", "rapports", "report", "statistique", "statistiques"], path: "/rapports/ventes", icon: "i-lucide-chart-bar" },
  { id: "rapport-stock", label: "Rapport de stock", keywords: ["rapport stock", "etat stock"], path: "/rapports/stock", icon: "i-lucide-chart-bar" },
  { id: "rapport-ventes", label: "Rapport des ventes", keywords: ["rapport vente", "rapport ventes", "ventes"], path: "/rapports/ventes", icon: "i-lucide-chart-bar" },
  { id: "financing", label: "Avance de trésorerie", keywords: ["avance", "tresorerie", "financement", "credit", "cash advance", "argent"], path: "/financing", icon: "i-lucide-banknote", roles: ["admin"] },
  { id: "utilisateurs", label: "Utilisateurs", keywords: ["utilisateur", "utilisateurs", "equipe", "staff"], path: "/utilisateurs", icon: "i-lucide-user-cog", roles: ["admin"] },
  { id: "parametres", label: "Paramètres", keywords: ["parametre", "parametres", "reglage", "reglages", "configuration"], path: "/parametres/general", icon: "i-lucide-settings", roles: ["admin"] },
  { id: "magasins", label: "Magasins", keywords: ["magasin", "magasins", "boutique", "boutiques"], path: "/parametres/Magasin", icon: "i-lucide-store", roles: ["admin"] },
  { id: "abonnement", label: "Abonnement", keywords: ["abonnement", "facturation abonnement", "plan"], path: "/parametres/abonnement", icon: "i-lucide-credit-card", roles: ["admin"] },
  { id: "profil", label: "Mon profil", keywords: ["profil", "mon compte", "compte"], path: "/profile", icon: "i-lucide-user" },
  { id: "aide", label: "Aide / Documentation", keywords: ["aide", "documentation", "manuel", "guide"], path: "/aide/documentation", icon: "i-lucide-help-circle" },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .trim();
}

/**
 * Associe un texte (parlé ou tapé) à la meilleure commande du catalogue.
 * Score = longueur du mot-clé correspondant trouvé dans le texte (le plus
 * spécifique gagne). Retourne null si aucune correspondance.
 */
export function matchVoiceCommand(text: string): VoiceCommand | null {
  const t = normalize(text);
  if (!t) return null;
  let best: { cmd: VoiceCommand; score: number } | null = null;
  for (const cmd of VOICE_COMMANDS) {
    for (const kw of cmd.keywords) {
      const nk = normalize(kw);
      if (t.includes(nk)) {
        const score = nk.length;
        if (!best || score > best.score) best = { cmd, score };
      }
    }
  }
  return best?.cmd ?? null;
}

export const useVoiceSearch = () => {
  const isListening = ref(false);
  const transcript = ref("");
  const interim = ref("");
  const error = ref<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recognition: any = null;

  const supported = computed(() => {
    if (typeof window === "undefined") return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });

  const config = useRuntimeConfig();
  const lang = (config.public.voiceSearchLang as string) || "fr-FR";

  const ensureRecognition = () => {
    if (!supported.value || recognition) return recognition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res) continue;
        const txt = res[0]?.transcript ?? "";
        // On suppose le dernier index = final quand l'API l'indique ; fallback robuste.
        finalText += txt;
        interimText += txt;
      }
      interim.value = interimText;
      transcript.value = finalText.trim();
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      error.value =
        e?.error === "not-allowed"
          ? "Microphone bloqué. Autorisez l'accès au micro dans votre navigateur."
          : e?.error === "no-speech"
            ? "Aucune parole détectée. Réessayez."
            : "Erreur de reconnaissance vocale.";
      isListening.value = false;
    };
    recognition.onend = () => {
      isListening.value = false;
    };
    return recognition;
  };

  const start = () => {
    error.value = null;
    transcript.value = "";
    interim.value = "";
    const rec = ensureRecognition();
    if (!rec) return;
    try {
      rec.start();
      isListening.value = true;
    } catch {
      // start() peut lever si déjà démarré ; on ignore.
    }
  };

  const stop = () => {
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
    isListening.value = false;
  };

  return {
    supported,
    isListening: readonly(isListening),
    transcript: readonly(transcript),
    interim: readonly(interim),
    error: readonly(error),
    start,
    stop,
  };
};
