/**
 * Composable client pour la reconnaissance de produit par photo (IA vision).
 */

export interface ProductSuggestion {
  name: string;
  description: string;
  category: string;
  estimated_price: number | null;
  unit: string;
  reference: string;
  keywords: string[];
}

interface VisionResponse {
  ok: boolean;
  available: boolean;
  message?: string;
  suggestion?: ProductSuggestion;
}

export const useProductVision = () => {
  const supabase = useSupabaseClient();
  const { notifyError, notifySuccess } = useErrorToast();

  const getAccessToken = async (): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Session invalide: veuillez vous reconnecter.");
    }
    return session.access_token;
  };

  /**
   * Analyse une image (File ou data URL) et renvoie une suggestion de fiche.
   * Retourne null si le service n'est pas disponible (available=false) ou en erreur.
   */
  const analyze = async (params: {
    image: File | string;
    currency?: string;
    hint?: string;
  }): Promise<{ available: boolean; suggestion?: ProductSuggestion; message?: string } | null> => {
    let image: string;
    let mimeType: string | undefined;
    if (typeof params.image === "string") {
      image = params.image;
    } else {
      mimeType = params.image.type || "image/jpeg";
      image = await fileToDataUrl(params.image);
    }

    try {
      const res = await $fetch<VisionResponse>("/api/ai/product-from-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${await getAccessToken()}` },
        body: { image, mimeType, currency: params.currency, hint: params.hint },
      });
      return { available: res.available, suggestion: res.suggestion, message: res.message };
    } catch (err) {
      notifyError(err, "Analyse de l'image impossible");
      return null;
    }
  };

  return { analyze, notifySuccess };
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(file);
  });
}
