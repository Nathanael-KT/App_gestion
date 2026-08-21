import { logger } from "./useLogger";
/* eslint-disable @typescript-eslint/no-explicit-any */
// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSABLE POUR LA GESTION DE CAISSE AVEC VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════
import { useCurrentUser } from "./useCurrentUser";
import { useCompanySettings } from "./useCompanySettings";



export const useCashManagement = () => {

  const {
  companyId,
  isLoadingUser,
  loadCurrentUser,
} = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();


onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
    if (companyId.value) await fetchCompanySettings(companyId.value);

  useCashManagement();
});

  const supabase = useSupabaseClient();
  const { currentUser } = useCurrentUser();
  const toast = useToast();

  // État réactif
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS DE CAISSE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Enregistrer une entrée d'argent
   */
  const processCashIn = async (cashInData: {
    amount: number;
    reason: string;
    note?: string;
    magasin_id?: string;
  }) => {
    try {
      loading.value = true;
      error.value = null;

      const { data, error: supabaseError } = await (supabase as any)
        .from("cash_transactions")
        .insert({
          created_by: currentUser.value?.id || null,
          type: "in",
          amount: cashInData.amount,
          reason: cashInData.reason,
          source: "Caisse principale",
          note: cashInData.note,
          magasin_id: cashInData.magasin_id,
        })
        .select();

      if (supabaseError) throw supabaseError;

      toast.add({
        title: "Entrée d'argent enregistrée",
        description: `${formatCurrency(
          cashInData.amount
        )} ajouté(s) à la caisse`,
        color: "success",
      });

      return data;
    } catch (err: any) {
      logger.error("Erreur lors de l'enregistrement de l'entrée:", err);
      error.value = "Impossible d'enregistrer l'entrée d'argent";

      toast.add({
        title: "Erreur",
        description: error.value || "Erreur inconnue",
        color: "error",
      });

      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Enregistrer une sortie d'argent
   */
  const processCashOut = async (cashOutData: {
    amount: number;
    reason: string;
    note?: string;
    magasin_id?: string;
  }) => {
    try {
      loading.value = true;
      error.value = null;

      const { data, error: supabaseError } = await (supabase as any)
        .from("cash_transactions")
        .insert({
          created_by: currentUser.value?.id || null,
          type: "out",
          amount: cashOutData.amount,
          reason: cashOutData.reason,
          recipient: "Non spécifié",
          note: cashOutData.note,
          magasin_id: cashOutData.magasin_id,
        })
        .select();

      if (supabaseError) throw supabaseError;

      toast.add({
        title: "Sortie d'argent enregistrée",
        description: `${formatCurrency(
          cashOutData.amount
        )} retiré(s) de la caisse`,
        color: "warning",
      });

      return data;
    } catch (err: unknown) {
      logger.error("Erreur lors de l'enregistrement de la sortie:", err);
      error.value = "Impossible d'enregistrer la sortie d'argent";

      toast.add({
        title: "Erreur",
        description: error.value,
        color: "error",
      });

      throw err;
    } finally {
      loading.value = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPTAGES DE CAISSE AVEC VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Enregistrer un comptage de caisse avec validation
   */
  const saveCashCount = async (countData: {
    date: string; // Ajouter le paramètre date
    expectedAmount: number;
    actualAmount: number;
    difference: number;
    bills: Record<string, number>;
    coins: Record<string, number>;
    note?: string;
    magasin_id?: string;
  }) => {
    try {
      loading.value = true;
      error.value = null;

      // Vérifier s'il existe déjà un comptage pour cette date ET ce magasin
      const { data: existingCounts, count } = await (supabase as any)
        .from("cash_counts")
        .select("id, date, magasin_id", { count: "exact" })
        .eq("date", countData.date)
        .eq("magasin_id", countData.magasin_id);

      // Si plusieurs comptages existent, c'est un problème de données
      if (count && count > 1) {
        logger.warn(
          `⚠️ ATTENTION: ${count} comptages trouvés pour ${countData.date}!`
        );
        toast.add({
          title: "Données incohérentes détectées",
          description: `${count} comptages existent pour ${countData.date}. Contactez l'administrateur.`,
          color: "error",
        });

        error.value =
          "Données incohérentes: plusieurs comptages pour cette date";
        throw new Error(error.value);
      }

      const existingCount =
        existingCounts && existingCounts.length > 0 ? existingCounts[0] : null;

      let result;

      if (existingCount) {
        // Mettre à jour le comptage existant
        const { data, error: supabaseError } = await (supabase as any)
          .from("cash_counts")
          .update({
            expected_amount: countData.expectedAmount,
            actual_amount: countData.actualAmount,
            difference: countData.difference,
            bills_detail: countData.bills,
            coins_detail: countData.coins,
            note: countData.note, // Correction: utiliser 'note' au lieu de 'notes'
            counted_by: currentUser.value?.id || null,
            updated_at: new Date().toISOString(), // Ajouter timestamp de mise à jour
            magasin_id: countData.magasin_id,
          })
          .eq("id", existingCount.id)
          .select();

        if (supabaseError) throw supabaseError;
        result = data;
      } else {
        // Créer un nouveau comptage avec vérification de contrainte unique
        const { data, error: supabaseError } = await (supabase as any)
          .from("cash_counts")
          .insert({
            date: countData.date,
            expected_amount: countData.expectedAmount,
            actual_amount: countData.actualAmount,
            difference: countData.difference,
            bills_detail: countData.bills,
            coins_detail: countData.coins,
            note: countData.note,
            counted_by: currentUser.value?.id,
            magasin_id: countData.magasin_id,
          })
          .select()
          .single();

        if (supabaseError) {
          // Vérifier si c'est une erreur de contrainte unique
          if (
            supabaseError.code === "23505" ||
            supabaseError.message?.includes("duplicate")
          ) {
            error.value = "Un comptage existe déjà pour cette date";
            toast.add({
              title: "Comptage déjà effectué",
              description:
                "Un comptage a déjà été effectué pour cette date. Rechargement...",
              color: "warning",
            });
            throw new Error(error.value);
          }
          throw supabaseError;
        }
        result = data;
      }

      toast.add({
        title: existingCount ? "Comptage mis à jour" : "Comptage enregistré",
        description: `Comptage : ${formatCurrency(countData.actualAmount)}`,
        color: "success",
      });

      return result;
    } catch (err: unknown) {
      logger.error("Erreur lors de l'enregistrement du comptage:", err);
      error.value = "Impossible d'enregistrer le comptage";

      toast.add({
        title: "Erreur",
        description: error.value,
        color: "error",
      });

      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Obtenir le comptage d'une journée spécifique
   */
  const getCashCountByDate = async (date: string) => {
    try {
      loading.value = true;
      const { data, error } = await (supabase as any)
        .from("cash_counts")
        .select("*")
        .eq("date", date)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data;
    } catch (err) {
      logger.error("Erreur lors de la récupération du comptage:", err);
      error.value = "Erreur lors de la récupération du comptage";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Valider un comptage de caisse
   */
  const validateCashCount = async (countId: string, note?: string) => {
    try {
      loading.value = true;

      const { data, error } = await (supabase as any)
        .from("cash_counts")
        .update({
          note: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", countId)
        .select()
        .single();

      if (error) throw error;

      toast.add({
        title: "Comptage mis à jour",
        description: "Le comptage a été mis à jour",
        color: "success",
      });

      return data;
    } catch (err) {
      logger.error("Erreur lors de la mise à jour du comptage:", err);
      error.value = "Erreur lors de la mise à jour du comptage";
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Obtenir l'historique des comptages
   */
  const getCashCountHistory = async (days = 30) => {
    try {
      loading.value = true;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await (supabase as any).rpc(
        "get_cash_count_history",
        {
          start_date: startDate.toISOString().split("T")[0],
          end_date: new Date().toISOString().split("T")[0],
        }
      );

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error(
        "Erreur lors de la récupération de l'historique des comptages:",
        err
      );
      error.value = "Erreur lors de la récupération de l'historique";
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * Obtenir l'historique complet de caisse
   */
  const getCompleteCashHistory = async (days = 30) => {
    try {
      loading.value = true;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await (supabase as any).rpc(
        "get_complete_cash_history",
        {
          start_date: startDate.toISOString().split("T")[0],
          end_date: new Date().toISOString().split("T")[0],
        }
      );

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error(
        "Erreur lors de la récupération de l'historique complet:",
        err
      );
      error.value = "Erreur lors de la récupération de l'historique complet";
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * Obtenir l'historique administrateur avec détails utilisateur
   * (Réservé aux administrateurs)
   */
  const getAdminCashHistory = async (
    startDate: string,
    endDate: string,
    userId?: string,
    operationType?: string
  ) => {
    try {
      loading.value = true;
      const operations: any[] = [];

      // Charger les comptages avec informations utilisateur
      if (
        !operationType ||
        operationType === "all" ||
        operationType === "count"
      ) {
        const { data: countsData, error: countsError } = await (supabase as any)
          .from("cash_counts")
          .select(
            `
            *,
            users:counted_by (
              id,
              name,
              email
            )
          `
          )
          .gte("date", startDate)
          .lte("date", endDate)
          .order("created_at", { ascending: false });

        if (countsError) throw countsError;

        if (countsData) {
          countsData.forEach((count: any) => {
            if (!userId || userId === "all" || userId === count.counted_by) {
              operations.push({
                id: count.id,
                type: "count",
                date: count.created_at,
                amount: count.actual_amount,
                expectedAmount: count.expected_amount,
                difference: count.difference,
                note: count.note,
                user: count.users,
                userId: count.counted_by,
                details: {
                  bills: count.bills_detail,
                  coins: count.coins_detail,
                  countType: count.count_type,
                  countDate: count.date,
                },
              });
            }
          });
        }
      }

      // Charger les transactions avec informations utilisateur
      if (
        !operationType ||
        operationType === "all" ||
        operationType === "transaction" ||
        operationType === "cash_in" ||
        operationType === "cash_out"
      ) {
        const { data: transactionsData, error: transactionsError } = await (
          supabase as any
        )
          .from("cash_transactions")
          .select(
            `
            *,
            users:created_by (
              id,
              name,
              email
            )
          `
          )
          .gte("created_at", startDate + "T00:00:00")
          .lte("created_at", endDate + "T23:59:59")
          .order("created_at", { ascending: false });

        if (transactionsError) throw transactionsError;

        if (transactionsData) {
          transactionsData.forEach((transaction: any) => {
            const isMatchingType =
              !operationType ||
              operationType === "all" ||
              operationType === "transaction" ||
              (operationType === "cash_in" && transaction.type === "in") ||
              (operationType === "cash_out" && transaction.type === "out");

            if (
              isMatchingType &&
              (!userId || userId === "all" || userId === transaction.created_by)
            ) {
              operations.push({
                id: transaction.id,
                type: transaction.type === "in" ? "cash_in" : "cash_out",
                date: transaction.created_at,
                amount: Math.abs(transaction.amount),
                note: transaction.note,
                reason: transaction.reason,
                user: transaction.users,
                userId: transaction.created_by,
                details: {
                  source: transaction.source,
                  recipient: transaction.recipient,
                  transactionType: transaction.type,
                },
              });
            }
          });
        }
      }

      // Trier par date (plus récent en premier)
      operations.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return operations;
    } catch (err) {
      logger.error(
        "Erreur lors de la récupération de l'historique administrateur:",
        err
      );
      error.value =
        "Erreur lors de la récupération de l'historique administrateur";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Format des montants en euros
   */
  const formatCurrency = (value: number) => {
  const currency = companySettings?.value?.currency;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

  /**
   * Calculer le total d'un comptage (billets + pièces)
   */
  const calculateCountTotal = (
    bills: Record<string, number>,
    coins: Record<string, number>
  ): number => {
    let total = 0;

    // Calculer le total des billets
    Object.entries(bills).forEach(([denomination, count]) => {
      total += parseFloat(denomination) * (count || 0);
    });

    // Calculer le total des pièces
    Object.entries(coins).forEach(([denomination, count]) => {
      total += parseFloat(denomination) * (count || 0);
    });

    return Math.round(total * 100) / 100; // Arrondir à 2 décimales
  };

  /**
   * Vérifier l'existence des tables de caisse
   */
  const checkCashTablesExist = async (): Promise<boolean> => {
    try {
      await (supabase as any).from("cash_transactions").select("id").limit(1);
      return true;
    } catch (error) {
      logger.error("Les tables de caisse n'existent pas:", error);
      return false;
    }
  };

  /**
   * Nettoyer les doublons de comptage (fonction d'administration)
   */
  const cleanDuplicateCashCounts = async () => {
    try {
      loading.value = true;

      // Récupérer tous les comptages avec doublons
      const { data: allCounts } = await (supabase as any)
        .from("cash_counts")
        .select("id, date, created_at")
        .order("date", { ascending: true });

      if (!allCounts || allCounts.length === 0) {
        toast.add({
          title: "Aucun comptage trouvé",
          description: "Aucun comptage à nettoyer",
          color: "info",
        });
        return { cleaned: 0, kept: 0 };
      }

      // Grouper par date
      const countsByDate = allCounts.reduce(
        (acc: Record<string, any[]>, count: any) => {
          if (!acc[count.date]) {
            acc[count.date] = [];
          }
          acc[count.date]!.push(count);
          return acc;
        },
        {}
      );

      let totalCleaned = 0;
      let totalKept = 0;

      // Pour chaque date ayant des doublons, garder le plus récent
      for (const [date, counts] of Object.entries(countsByDate)) {
        const countsArray = counts as Array<{ id: string; created_at: string }>;

        if (countsArray.length > 1) {
          // Trier par date de création (plus récent en premier)
          countsArray.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );

          // Garder le premier (plus récent), supprimer les autres
          const toKeep = countsArray[0];
          const toDelete = countsArray.slice(1);

          if (toKeep) {
            logger.debug(
              `Date ${date}: Garder ${toKeep.id}, supprimer ${toDelete.length} doublons`
            );

            // Supprimer les doublons
            for (const duplicate of toDelete) {
              const { error: deleteError } = await (supabase as any)
                .from("cash_counts")
                .delete()
                .eq("id", duplicate.id);

              if (deleteError) {
                logger.error(
                  `Erreur lors de la suppression de ${duplicate.id}:`,
                  deleteError
                );
              } else {
                totalCleaned++;
              }
            }
          }

          totalKept++;
        } else {
          totalKept++;
        }
      }

      toast.add({
        title: "Nettoyage terminé",
        description: `${totalCleaned} doublons supprimés, ${totalKept} comptages conservés`,
        color: "success",
      });

      return { cleaned: totalCleaned, kept: totalKept };
    } catch (err) {
      logger.error("Erreur lors du nettoyage des doublons:", err);
      error.value = "Erreur lors du nettoyage des doublons";
      toast.add({
        title: "Erreur de nettoyage",
        description: error.value,
        color: "error",
      });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Vérifier l'intégrité des données de comptage
   */
  const checkCashCountIntegrity = async () => {
    try {
      loading.value = true;

      // Faire la vérification manuellement
      const { data: allCounts } = await (supabase as any)
        .from("cash_counts")
        .select("date")
        .order("date");

      if (allCounts) {
        const dateGroups = allCounts.reduce(
          (acc: Record<string, number>, count: any) => {
            acc[count.date] = (acc[count.date] || 0) + 1;
            return acc;
          },
          {}
        );

        const duplicates = Object.entries(dateGroups)
          .filter(([_, count]) => (count as number) > 1)
          .map(([date, count]) => ({ date, count: count as number }));

        return {
          hasDuplicates: duplicates.length > 0,
          duplicates,
          totalCounts: allCounts.length,
          uniqueDates: Object.keys(dateGroups).length,
        };
      }

      return null;
    } catch (err) {
      logger.error("Erreur lors de la vérification d'intégrité:", err);
      error.value = "Erreur lors de la vérification d'intégrité";
      return null;
    } finally {
      loading.value = false;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONSTANTES
  // ═══════════════════════════════════════════════════════════════════════════════

  const CASH_TRANSACTION_REASONS = {
    IN: [
      "Vente comptant",
      "Remboursement client",
      "Fond de caisse",
      "Autre entrée",
    ],
    OUT: ["Achat fournisseur", "Frais divers", "Remboursement", "Autre sortie"],
  };

  const DENOMINATIONS = {
    bills: [500, 200, 100, 50, 20, 10, 5],
    coins: [2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01],
  };

  return {
    // État
    loading: readonly(loading),
    error: readonly(error),

    // Actions principales
    processCashIn,
    processCashOut,
    saveCashCount,

    // Fonctions d'historique et comptages
    getCashCountByDate,
    validateCashCount,
    getCashCountHistory,
    getCompleteCashHistory,
    getAdminCashHistory, // Nouvelle fonction pour l'historique admin
    cleanDuplicateCashCounts,
    checkCashCountIntegrity,

    // Utilitaires
    formatCurrency,
    calculateCountTotal,
    checkCashTablesExist,

    // Constantes
    CASH_TRANSACTION_REASONS,
    DENOMINATIONS,
  };
};
