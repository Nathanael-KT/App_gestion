import { ref, computed } from "vue";

// Types pour les paramètres de l'entreprise
export interface CompanySettings {
  blocked_menus?: string[];
  blocked?: boolean; // Statut de blocage global
  id?: string;
  company_name?: string;
  company_email?: string;
  company_phone?: string;
  company_address?: string;
  company_website?: string;
  company_siret?: string;
  currency?: "EUR" | "USD" | "GBP" | "CHF";
  tax_rate?: number;
  invoice_prefix?: string;
  invoice_number_start?: number;
  low_stock_threshold?: number;
  critical_stock_threshold?: number;
  enable_stock_alerts?: boolean;
  language?: "fr-FR" | "en-US" | "es-ES" | "de-DE";
  timezone?: string;
  date_format?: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD-MM-YYYY";
  number_format?: string;
  session_timeout?: number;
  enable_two_factor?: boolean;
  password_min_length?: number;
  enable_email_notifications?: boolean;
  enable_invoice_reminders?: boolean;
  enable_auto_backup?: boolean;
  backup_frequency?: "daily" | "weekly" | "monthly";
  backup_retention?: number;
  updated_at?: string;
}

export const useCompanySettings = () => {
  const supabase = useSupabaseClient() as any;

  // États réactifs
  const settings = ref<CompanySettings | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Valeurs par défaut pour les nouveaux paramètres
  const defaultSettings: CompanySettings = {
    blocked: false,
    currency: "EUR",
    tax_rate: 20,
    invoice_prefix: "INV",
    invoice_number_start: 1,
    low_stock_threshold: 10,
    critical_stock_threshold: 5,
    enable_stock_alerts: true,
    language: "fr-FR",
    timezone: "Europe/Paris",
    date_format: "DD/MM/YYYY",
    number_format: "fr-FR",
    session_timeout: 60,
    enable_two_factor: false,
    password_min_length: 8,
    enable_email_notifications: true,
    enable_invoice_reminders: true,
    enable_auto_backup: false,
    backup_frequency: "weekly",
    backup_retention: 30,
  };

  // Propriétés calculées
  const isConfigured = computed(() => {
    return (
      settings.value &&
      settings.value.company_name &&
      settings.value.company_email
    );
  });

  const hasLowStockAlert = computed(() => {
    return (
      settings.value?.enable_stock_alerts && settings.value?.low_stock_threshold
    );
  });

  const formattedTaxRate = computed(() => {
    return settings.value?.tax_rate ? `${settings.value.tax_rate}%` : "0%";
  });

  // Fonction pour récupérer les paramètres de l'entreprise
  const fetchCompanySettings = async (
    companyId?: string,
  ): Promise<CompanySettings | null> => {
    try {
      loading.value = true;
      error.value = null;

      if (!companyId) {
        error.value = "Aucun companyId fourni";
        return null;
      }

      const { data, error: fetchError } = await supabase
        .from("company_settings")
        .select("*")
        .eq("id", companyId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // Aucun enregistrement trouvé, retourner les paramètres par défaut
          console.log(
            "Aucun paramètre trouvé pour cette société, utilisation des valeurs par défaut",
          );
          settings.value = { ...defaultSettings };
          return settings.value;
        }
        throw fetchError;
      }

      settings.value = data as CompanySettings;
      return data as CompanySettings;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des paramètres";
      error.value = message;
      console.error("Erreur fetchCompanySettings:", err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour créer ou mettre à jour les paramètres
  const upsertCompanySettings = async (
    updatedSettings: Partial<CompanySettings>,
  ): Promise<boolean> => {
    try {
      loading.value = true;
      error.value = null;

      // Validation des données
      if (
        updatedSettings.tax_rate &&
        (updatedSettings.tax_rate < 0 || updatedSettings.tax_rate > 100)
      ) {
        throw new Error("Le taux de TVA doit être entre 0 et 100%");
      }

      if (
        updatedSettings.critical_stock_threshold &&
        updatedSettings.low_stock_threshold
      ) {
        if (
          updatedSettings.critical_stock_threshold >
          updatedSettings.low_stock_threshold
        ) {
          throw new Error(
            "Le seuil critique doit être inférieur ou égal au seuil bas",
          );
        }
      }

      // Mise à jour uniquement (jamais d'insert)
      if (!updatedSettings.id) {
        throw new Error("Impossible de mettre à jour : id manquant");
      }
      const { data: updateData, error: updateError } = await supabase
        .from("company_settings")
        .update(updatedSettings)
        .eq("id", updatedSettings.id)
        .select()
        .single();

      if (updateError) throw updateError;
      settings.value = updateData as CompanySettings;
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la sauvegarde des paramètres";
      error.value = message;
      console.error("Erreur upsertCompanySettings:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour mettre à jour des paramètres spécifiques
  const updateSettings = async (
    partialSettings: Partial<CompanySettings>,
  ): Promise<boolean> => {
    if (!settings.value) {
      await fetchCompanySettings();
    }

    const currentSettings = settings.value || {};
    const mergedSettings = { ...currentSettings, ...partialSettings };

    return await upsertCompanySettings(mergedSettings);
  };

  // Fonction pour supprimer les paramètres de l'entreprise
  const deleteCompanySettings = async (): Promise<boolean> => {
    try {
      loading.value = true;
      error.value = null;

      if (!settings.value?.id) {
        throw new Error("Aucun paramètre à supprimer");
      }

      const { error: deleteError } = await supabase
        .from("company_settings")
        .delete()
        .eq("id", settings.value.id);

      if (deleteError) {
        throw deleteError;
      }

      // Réinitialiser l'état local
      settings.value = null;
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression des paramètres";
      error.value = message;
      console.error("Erreur deleteCompanySettings:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour réinitialiser les paramètres aux valeurs par défaut
  const resetToDefault = async (): Promise<boolean> => {
    try {
      loading.value = true;
      error.value = null;

      const success = await upsertCompanySettings(defaultSettings);
      if (success) {
        await fetchCompanySettings();
      }
      return success;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la réinitialisation";
      error.value = message;
      console.error("Erreur resetToDefault:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour valider les paramètres
  const validateSettings = (
    settingsToValidate: Partial<CompanySettings>,
  ): string[] => {
    const errors: string[] = [];

    if (
      settingsToValidate.company_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settingsToValidate.company_email)
    ) {
      errors.push("Format email invalide");
    }

    if (
      settingsToValidate.tax_rate &&
      (settingsToValidate.tax_rate < 0 || settingsToValidate.tax_rate > 100)
    ) {
      errors.push("Le taux de TVA doit être entre 0 et 100%");
    }

    if (
      settingsToValidate.invoice_number_start &&
      settingsToValidate.invoice_number_start < 1
    ) {
      errors.push("Le numéro de départ des factures doit être supérieur à 0");
    }

    if (
      settingsToValidate.password_min_length &&
      (settingsToValidate.password_min_length < 6 ||
        settingsToValidate.password_min_length > 20)
    ) {
      errors.push(
        "La longueur minimale du mot de passe doit être entre 6 et 20 caractères",
      );
    }

    if (
      settingsToValidate.session_timeout &&
      (settingsToValidate.session_timeout < 5 ||
        settingsToValidate.session_timeout > 480)
    ) {
      errors.push("Le timeout de session doit être entre 5 et 480 minutes");
    }

    if (
      settingsToValidate.backup_retention &&
      (settingsToValidate.backup_retention < 7 ||
        settingsToValidate.backup_retention > 365)
    ) {
      errors.push("La rétention de sauvegarde doit être entre 7 et 365 jours");
    }

    if (
      settingsToValidate.critical_stock_threshold &&
      settingsToValidate.low_stock_threshold &&
      settingsToValidate.critical_stock_threshold >
      settingsToValidate.low_stock_threshold
    ) {
      errors.push("Le seuil critique doit être inférieur ou égal au seuil bas");
    }

    return errors;
  };

  // Fonction pour exporter les paramètres
  const exportSettings = (): string => {
    if (!settings.value) return "";
    return JSON.stringify(settings.value, null, 2);
  };

  // Fonction pour importer les paramètres
  const importSettings = async (jsonSettings: string): Promise<boolean> => {
    try {
      const importedSettings = JSON.parse(
        jsonSettings,
      ) as Partial<CompanySettings>;
      const validationErrors = validateSettings(importedSettings);

      if (validationErrors.length > 0) {
        error.value = validationErrors.join(", ");
        return false;
      }

      return await upsertCompanySettings(importedSettings);
    } catch {
      error.value = "Format JSON invalide";
      return false;
    }
  };

  // Fonction utilitaire pour obtenir un paramètre spécifique
  const getSetting = <K extends keyof CompanySettings>(
    key: K,
  ): CompanySettings[K] => {
    return settings.value?.[key] ?? defaultSettings[key];
  };

  // Fonction pour mettre à jour un seul paramètre
  const updateSingleSetting = async <K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K],
  ): Promise<boolean> => {
    const partialSettings = { [key]: value } as Partial<CompanySettings>;
    return await updateSettings(partialSettings);
  };

  return {
    // États
    settings: readonly(settings),
    loading: readonly(loading),
    error: readonly(error),

    // Propriétés calculées
    isConfigured,
    hasLowStockAlert,
    formattedTaxRate,
    defaultSettings,

    // Méthodes principales
    fetchCompanySettings,
    upsertCompanySettings,
    updateSettings,
    deleteCompanySettings,
    resetToDefault,

    // Méthodes utilitaires
    validateSettings,
    exportSettings,
    importSettings,
    getSetting,
    updateSingleSetting,
  };
};
