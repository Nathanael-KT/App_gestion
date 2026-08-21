/**
 * Affiche une erreur en toast (au lieu d'un bandeau inline ou d'un alert()
 * natif). Extrait automatiquement le message métier des erreurs HTTP
 * (h3/FetchError renvoient le vrai message dans data.statusMessage), pour ne
 * jamais afficher de dump technique du type "[POST] /api/...: 403 ...".
 */
export function useErrorToast() {
  const toast = useToast();

  const extractErrorMessage = (err: unknown, fallback: string): string => {
    const e = err as {
      data?: { statusMessage?: string; message?: string };
      statusMessage?: string;
      message?: string;
    } | null;
    return (
      e?.data?.statusMessage ||
      e?.data?.message ||
      e?.statusMessage ||
      e?.message ||
      fallback
    );
  };

  const notifyError = (err: unknown, fallback = "Une erreur est survenue") => {
    toast.add({
      title: "Erreur",
      description: extractErrorMessage(err, fallback),
      color: "error",
    });
  };

  const notifySuccess = (title: string, description?: string) => {
    toast.add({ title, description, color: "success" });
  };

  return { notifyError, notifySuccess, extractErrorMessage };
}
