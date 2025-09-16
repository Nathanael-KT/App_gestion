<script setup>
// Toast pour les notifications
const toast = useToast();

// Utilisation du composable useCompanySettings
const {
  settings,
  loading,
  error,
  fetchCompanySettings,
  updateSettings,
  resetToDefault,
  validateSettings,
} = useCompanySettings();

// État pour la sauvegarde
const saving = ref(false);

// Paramètres locaux pour le formulaire (mapping des noms de propriétés)
const generalSettings = computed({
  get: () => ({
    companyName: settings.value?.company_name || "",
    companyEmail: settings.value?.company_email || "",
    companyPhone: settings.value?.company_phone || "",
    companyAddress: settings.value?.company_address || "",
    companyWebsite: settings.value?.company_website || "",
    currency: settings.value?.currency || "EUR",
    taxRate: settings.value?.tax_rate || 20,
    invoicePrefix: settings.value?.invoice_prefix || "FACT-",
    invoiceNumberStart: settings.value?.invoice_number_start || 1000,
    lowStockThreshold: settings.value?.low_stock_threshold || 10,
    criticalStockThreshold: settings.value?.critical_stock_threshold || 5,
    enableStockAlerts: settings.value?.enable_stock_alerts || true,
    language: settings.value?.language || "fr-FR",
    timezone: settings.value?.timezone || "Europe/Paris",
    dateFormat: settings.value?.date_format || "DD/MM/YYYY",
    numberFormat: settings.value?.number_format || "fr-FR",
    sessionTimeout: settings.value?.session_timeout || 60,
    enableTwoFactor: settings.value?.enable_two_factor || false,
    passwordMinLength: settings.value?.password_min_length || 8,
    enableEmailNotifications:
      settings.value?.enable_email_notifications || true,
    enableInvoiceReminders: settings.value?.enable_invoice_reminders || true,
    enableAutoBackup: settings.value?.enable_auto_backup || false,
    backupFrequency: settings.value?.backup_frequency || "weekly",
    backupRetention: settings.value?.backup_retention || 30,
  }),
  set: (_newValue) => {
    // Cette fonction sera utilisée pour les modifications locales si nécessaire
    // mais nous préférons utiliser updateSettings directement
  },
});

// Options pour les listes déroulantes
const currencyOptions = [
  { label: "Euro (Fcfa)", value: "EUR" },
  { label: "Dollar US ($)", value: "USD" },
  { label: "Livre Sterling (£)", value: "GBP" },
  { label: "Franc Suisse (CHF)", value: "CHF" },
  { label: "Franc CFA (XOF)", value: "XOF" },
];

const languageOptions = [
  { label: "Français", value: "fr-FR" },
  { label: "English", value: "en-US" },
  { label: "Español", value: "es-ES" },
  { label: "Deutsch", value: "de-DE" },
];

const timezoneOptions = [
  { label: "Europe/Paris", value: "Europe/Paris" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "America/Los_Angeles", value: "America/Los_Angeles" },
];

const dateFormatOptions = [
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
  { label: "DD-MM-YYYY", value: "DD-MM-YYYY" },
];

const backupFrequencyOptions = [
  { label: "Quotidienne", value: "daily" },
  { label: "Hebdomadaire", value: "weekly" },
  { label: "Mensuelle", value: "monthly" },
];

// Charger les paramètres
const loadSettings = async () => {
  try {
    await fetchCompanySettings();

    if (error.value) {
      throw new Error(error.value);
    }

    toast.add({
      title: "Paramètres chargés",
      description: "Les paramètres ont été chargés avec succès",
      icon: "i-heroicons-check-circle",
      color: "green",
      timeout: 3000,
    });
  } catch (err) {
    toast.add({
      title: "Erreur de chargement",
      description: err.message || "Impossible de charger les paramètres",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
      timeout: 5000,
    });
  }
};

// Sauvegarder les paramètres
const saveSettings = async () => {
  saving.value = true;
  try {
    // Validation basique
    if (!generalSettings.value.companyName.trim()) {
      throw new Error("Le nom de l'entreprise est requis");
    }

    if (!generalSettings.value.companyEmail.trim()) {
      throw new Error("L'email de l'entreprise est requis");
    }

    // Utiliser la validation du composable
    const validationErrors = validateSettings({
      company_name: generalSettings.value.companyName,
      company_email: generalSettings.value.companyEmail,
      tax_rate: generalSettings.value.taxRate,
      invoice_number_start: generalSettings.value.invoiceNumberStart,
      password_min_length: generalSettings.value.passwordMinLength,
      session_timeout: generalSettings.value.sessionTimeout,
      backup_retention: generalSettings.value.backupRetention,
      critical_stock_threshold: generalSettings.value.criticalStockThreshold,
      low_stock_threshold: generalSettings.value.lowStockThreshold,
    });

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(", "));
    }

    // Mapper les données pour le composable
    const settingsToUpdate = {
      company_name: generalSettings.value.companyName,
      company_email: generalSettings.value.companyEmail,
      company_phone: generalSettings.value.companyPhone,
      company_address: generalSettings.value.companyAddress,
      company_website: generalSettings.value.companyWebsite,
      currency: generalSettings.value.currency,
      tax_rate: generalSettings.value.taxRate,
      invoice_prefix: generalSettings.value.invoicePrefix,
      invoice_number_start: generalSettings.value.invoiceNumberStart,
      low_stock_threshold: generalSettings.value.lowStockThreshold,
      critical_stock_threshold: generalSettings.value.criticalStockThreshold,
      enable_stock_alerts: generalSettings.value.enableStockAlerts,
      language: generalSettings.value.language,
      timezone: generalSettings.value.timezone,
      date_format: generalSettings.value.dateFormat,
      number_format: generalSettings.value.numberFormat,
      session_timeout: generalSettings.value.sessionTimeout,
      enable_two_factor: generalSettings.value.enableTwoFactor,
      password_min_length: generalSettings.value.passwordMinLength,
      enable_email_notifications:
        generalSettings.value.enableEmailNotifications,
      enable_invoice_reminders: generalSettings.value.enableInvoiceReminders,
      enable_auto_backup: generalSettings.value.enableAutoBackup,
      backup_frequency: generalSettings.value.backupFrequency,
      backup_retention: generalSettings.value.backupRetention,
    };

    const success = await updateSettings(settingsToUpdate);

    if (!success) {
      throw new Error(error.value || "Erreur lors de la sauvegarde");
    }

    toast.add({
      title: "Paramètres sauvegardés",
      description: "Les paramètres ont été mis à jour avec succès",
      icon: "i-heroicons-check-circle",
      color: "green",
      timeout: 3000,
    });
  } catch (err) {
    toast.add({
      title: "Erreur de sauvegarde",
      description: err.message || "Erreur lors de la sauvegarde",
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
      timeout: 5000,
    });
  } finally {
    saving.value = false;
  }
};

// Réinitialiser aux valeurs par défaut
const resetToDefaults = async () => {
  if (
    confirm(
      "Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ?"
    )
  ) {
    try {
      const success = await resetToDefault();

      if (!success) {
        throw new Error(error.value || "Erreur lors de la réinitialisation");
      }

      toast.add({
        title: "Réinitialisation effectuée",
        description:
          "Les paramètres ont été réinitialisés aux valeurs par défaut",
        icon: "i-heroicons-arrow-path",
        color: "blue",
        timeout: 3000,
      });
    } catch (err) {
      toast.add({
        title: "Erreur de réinitialisation",
        description: err.message || "Erreur lors de la réinitialisation",
        icon: "i-heroicons-exclamation-triangle",
        color: "red",
        timeout: 5000,
      });
    }
  }
};

// Charger les paramètres au montage
onMounted(async () => {
  await loadSettings();
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">Paramètres Généraux</h1>
      <p class="text-gray-600">
        Configurez les paramètres généraux de votre application
      </p>
    </div>

    <!-- Actions rapides -->
    <div class="flex flex-wrap gap-4 mb-8">
      <UButton
        :loading="loading"
        color="primary"
        icon="i-heroicons-arrow-down-tray"
        @click="loadSettings"
      >
        Recharger
      </UButton>

      <UButton
        :loading="saving"
        color="green"
        icon="i-heroicons-check"
        @click="saveSettings"
      >
        Sauvegarder
      </UButton>

      <UButton
        color="orange"
        variant="outline"
        icon="i-heroicons-arrow-path"
        @click="resetToDefaults"
      >
        Réinitialiser
      </UButton>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary-500"
      />
      <span class="ml-3 text-gray-600">Chargement des paramètres...</span>
    </div>

    <div v-else class="space-y-8">
      <!-- Informations de l'entreprise -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2
          class="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-building-office"
            class="w-5 h-5 text-blue-500"
          />
          Informations de l'Entreprise
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UInput
            v-model="generalSettings.companyName"
            label="Nom de l'entreprise"
            placeholder="Nom de votre entreprise"
            required
          />

          <UInput
            v-model="generalSettings.companyEmail"
            label="Email"
            type="email"
            placeholder="contact@entreprise.com"
            required
          />

          <UInput
            v-model="generalSettings.companyPhone"
            label="Téléphone"
            placeholder="+33 1 23 45 67 89"
          />

          <UInput
            v-model="generalSettings.companyWebsite"
            label="Site web"
            placeholder="https://www.entreprise.com"
          />

          <div class="md:col-span-2">
            <UTextarea
              v-model="generalSettings.companyAddress"
              label="Adresse"
              placeholder="Adresse complète de l'entreprise"
              :rows="3"
            />
          </div>
        </div>
      </div>

      <!-- Paramètres de facturation -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2
          class="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-document-text"
            class="w-5 h-5 text-green-500"
          />
          Paramètres de Facturation
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <USelect
            v-model="generalSettings.currency"
            label="Devise"
            :items="currencyOptions"
            placeholder="Sélectionner une devise"
          />

          <UInput
            v-model.number="generalSettings.taxRate"
            label="Taux de TVA (%)"
            type="number"
            min="0"
            max="100"
            step="0.1"
          />

          <UInput
            v-model="generalSettings.invoicePrefix"
            label="Préfixe facture"
            placeholder="FACT-"
          />

          <UInput
            v-model.number="generalSettings.invoiceNumberStart"
            label="Numéro de départ"
            type="number"
            min="1"
          />
        </div>
      </div>

      <!-- Paramètres de stock -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2
          class="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2"
        >
          <UIcon name="i-heroicons-cube" class="w-5 h-5 text-purple-500" />
          Gestion du Stock
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UInput
            v-model.number="generalSettings.lowStockThreshold"
            label="Seuil stock faible"
            type="number"
            min="0"
            help="Seuil pour les alertes de stock faible"
          />

          <UInput
            v-model.number="generalSettings.criticalStockThreshold"
            label="Seuil stock critique"
            type="number"
            min="0"
            help="Seuil pour les alertes de stock critique"
          />

          <div class="flex items-center pt-6">
            <UCheckbox
              v-model="generalSettings.enableStockAlerts"
              label="Activer les alertes de stock"
            />
          </div>
        </div>
      </div>

      <!-- Paramètres d'affichage -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2
          class="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-cog-6-tooth"
            class="w-5 h-5 text-orange-500"
          />
          Affichage et Localisation
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <USelect
            v-model="generalSettings.language"
            label="Langue"
            :items="languageOptions"
            placeholder="Sélectionner une langue"
          />

          <USelect
            v-model="generalSettings.timezone"
            label="Fuseau horaire"
            :items="timezoneOptions"
            placeholder="Sélectionner un fuseau"
          />

          <USelect
            v-model="generalSettings.dateFormat"
            label="Format de date"
            :items="dateFormatOptions"
            placeholder="Sélectionner un format"
          />

          <UInput
            v-model="generalSettings.numberFormat"
            label="Format numérique"
            placeholder="fr-FR"
            readonly
          />
        </div>
      </div>

      <!-- Paramètres de sécurité -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2
          class="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2"
        >
          <UIcon name="i-heroicons-shield-check" class="w-5 h-5 text-red-500" />
          Sécurité
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UInput
            v-model.number="generalSettings.sessionTimeout"
            label="Timeout session (min)"
            type="number"
            min="5"
            max="480"
            help="Durée avant déconnexion automatique"
          />

          <UInput
            v-model.number="generalSettings.passwordMinLength"
            label="Longueur min. mot de passe"
            type="number"
            min="6"
            max="20"
            help="Nombre minimum de caractères"
          />

          <div class="flex items-center pt-6">
            <UCheckbox
              v-model="generalSettings.enableTwoFactor"
              label="Authentification à deux facteurs"
              help="Sécurité renforcée (en développement)"
            />
          </div>
        </div>
      </div>

      <!-- Paramètres de notification -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2
          class="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2"
        >
          <UIcon name="i-heroicons-bell" class="w-5 h-5 text-yellow-500" />
          Notifications
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-4">
            <UCheckbox
              v-model="generalSettings.enableEmailNotifications"
              label="Notifications par email"
              help="Recevoir les notifications importantes"
            />

            <UCheckbox
              v-model="generalSettings.enableStockAlerts"
              label="Alertes de stock"
              help="Notifications de stock faible/critique"
            />

            <UCheckbox
              v-model="generalSettings.enableInvoiceReminders"
              label="Rappels de factures"
              help="Rappels pour les factures impayées"
            />
          </div>
        </div>
      </div>

      <!-- Paramètres de sauvegarde -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2
          class="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2"
        >
          <UIcon
            name="i-heroicons-cloud-arrow-up"
            class="w-5 h-5 text-indigo-500"
          />
          Sauvegarde et Archive
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="flex items-center">
            <UCheckbox
              v-model="generalSettings.enableAutoBackup"
              label="Sauvegarde automatique"
              help="Sauvegarde régulière des données"
            />
          </div>

          <USelect
            v-model="generalSettings.backupFrequency"
            label="Fréquence de sauvegarde"
            :items="backupFrequencyOptions"
            :disabled="!generalSettings.enableAutoBackup"
          />

          <UInput
            v-model.number="generalSettings.backupRetention"
            label="Rétention (jours)"
            type="number"
            min="7"
            max="365"
            :disabled="!generalSettings.enableAutoBackup"
            help="Durée de conservation des sauvegardes"
          />
        </div>
      </div>
    </div>

    <!-- Actions finales -->
    <div class="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
      <UButton
        color="gray"
        variant="outline"
        icon="i-heroicons-arrow-path"
        @click="resetToDefaults"
      >
        Réinitialiser
      </UButton>

      <UButton
        :loading="saving"
        size="lg"
        color="primary"
        icon="i-heroicons-check"
        @click="saveSettings"
      >
        Sauvegarder les Paramètres
      </UButton>
    </div>
  </div>
</template>
