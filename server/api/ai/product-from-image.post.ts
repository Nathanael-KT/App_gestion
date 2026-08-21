import { createError, defineEventHandler, readBody } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

interface RequestBody {
  /** Image en data URL (data:image/...;base64,...) ou base64 brut. */
  image: string;
  mimeType?: string;
  currency?: string;
  /** Indice catégorie connue (ex: "carrelage", "robinetterie"). */
  hint?: string;
}

interface ProductSuggestion {
  name: string;
  description: string;
  category: string;
  estimated_price: number | null;
  unit: string;
  reference: string;
  keywords: string[];
}

const FALLBACK_UNITS = ["pièce", "m²", "ml", "kg", "litre", "pack"];

/**
 * Analyse une photo de produit via un modèle de vision (OpenAI-compatible)
 * et renvoie une fiche produit pré-remplie (nom, description, catégorie,
 * prix estimé, unité, référence, mots-clés).
 *
 * Si aucune clé API n'est configurée, renvoie { available: false } pour que
 * l'UI puisse informer l'utilisateur sans planter.
 */
export default defineEventHandler(async (event) => {
  const { adminClient, companyId } = await requireAdmin(event, [
    "admin",
    "magasinier",
    "super_admin",
  ]);

  const config = useRuntimeConfig(event);
  const apiKey = config.visionApiKey as string;
  const apiUrl = (config.visionApiUrl as string) || "https://api.openai.com/v1/chat/completions";
  const model = (config.visionApiModel as string) || "gpt-4o-mini";

  if (!apiKey) {
    return {
      ok: true,
      available: false,
      message:
        "La reconnaissance par photo n'est pas configurée. Ajoutez VISION_API_KEY dans les variables d'environnement pour l'activer.",
    };
  }

  const body = await readBody<RequestBody>(event);
  if (!body?.image) {
    throw createError({ statusCode: 400, statusMessage: "Image manquante" });
  }

  // Normaliser en data URL si base64 brut reçu
  let dataUrl = body.image;
  if (!dataUrl.startsWith("data:")) {
    const mime = body.mimeType || "image/jpeg";
    dataUrl = `data:${mime};base64,${dataUrl}`;
  }

  // Limiter la taille (évite les payloads énormes) ~ 5 Mo base64
  if (dataUrl.length > 7 * 1024 * 1024) {
    throw createError({
      statusCode: 413,
      statusMessage: "Image trop volumineuse (max 5 Mo)",
    });
  }

  const currency = body.currency || "EUR";
  const hint = body.hint ? `Contexte: ${body.hint}.` : "";

  const prompt = `Tu es un assistant qui crée des fiches produits pour un logiciel de gestion de stock.
Analyse la photo du produit et renvoie UNIQUEMENT un objet JSON valide avec ces champs:
- "name": nom commercial clair et concis (max 60 caractères)
- "description": description commerciale de 2 à 4 phrases (matière, usage, caractéristiques visibles)
- "category": catégorie produit suggérée (un seul libellé)
- "estimated_price": estimation du prix de vente unitaire indicatif (nombre), dans la devise ${currency}
- "unit": unité de vente parmi ${FALLBACK_UNITS.map((u) => `"${u}"`).join(", ")}
- "reference": code de référence court généré (ex: 3-5 majuscules + chiffres, sans espaces)
- "keywords": tableau de 3 à 6 mots-clés
${hint}
Réponds en français. Pas de texte hors du JSON.`;

  let completion: Response;
  try {
    completion = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: "system", content: "Tu réponds uniquement en JSON valide." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage:
        "Impossible de joindre le service de vision. Réessayez ultérieurement.",
    });
  }

  if (!completion.ok) {
    const detail = await completion.text().catch(() => "");
    throw createError({
      statusCode: 502,
      statusMessage: `Erreur du service de vision (${completion.status}). ${detail.slice(0, 200)}`,
    });
  }

  const data = (await completion.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";

  const suggestion = parseSuggestion(content);
  if (!suggestion) {
    throw createError({
      statusCode: 502,
      statusMessage: "Réponse du service de vision illisible. Réessayez.",
    });
  }

  // Journalisation simple (sans données sensibles) pour audit.
  try {
    await adminClient.from("cash_anomalies").insert({
      company_id: companyId,
      type: "vision_scan",
      severity: "low",
      title: "Scan produit par photo",
      description: `Fiche générée pour "${suggestion.name}" (catégorie: ${suggestion.category}).`,
      metadata: { source: "product-from-image", category: suggestion.category },
      status: "resolved",
    });
  } catch {
    // La journalisation est optionnelle : on ignore les échecs.
  }

  return { ok: true, available: true, suggestion };
});

function parseSuggestion(content: string): ProductSuggestion | null {
  if (!content) return null;
  let text = content.trim();
  // Retirer d'éventuels encadrages markdown ```json ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) text = fence[1].trim();
  // Extraire le premier objet JSON si du texte surrounds
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) text = text.slice(first, last + 1);

  try {
    const obj = JSON.parse(text) as Partial<ProductSuggestion>;
    return {
      name: String(obj.name ?? "").slice(0, 120),
      description: String(obj.description ?? ""),
      category: String(obj.category ?? ""),
      estimated_price:
        obj.estimated_price != null && Number.isFinite(Number(obj.estimated_price))
          ? Number(obj.estimated_price)
          : null,
      unit: FALLBACK_UNITS.includes(String(obj.unit))
        ? String(obj.unit)
        : "pièce",
      reference: String(obj.reference ?? "").replace(/\s+/g, "").slice(0, 40),
      keywords: Array.isArray(obj.keywords)
        ? obj.keywords.map(String).slice(0, 8)
        : [],
    };
  } catch {
    return null;
  }
}
