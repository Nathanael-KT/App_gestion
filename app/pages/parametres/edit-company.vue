<script setup>

const supabase = useSupabaseClient();
const toast = useToast();
const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings, loading, error, fetchCompanySettings, validateSettings } =
  useCompanySettings();

const saving = ref(false);
const form = ref({});

const currencyOptions = [
  { label: "Euro (EUR)", value: "EUR" },
  { label: "Dollar US (USD)", value: "USD" },
  { label: "Livre Sterling (GBP)", value: "GBP" },
  { label: "Franc Suisse (CHF)", value: "CHF" },
];
const languageOptions = [
  { label: "Français", value: "fr-FR" },
  { label: "Anglais", value: "en-US" },
  { label: "Espagnol", value: "es-ES" },
  { label: "Allemand", value: "de-DE" },
];
const timezoneOptions = [
  { label: "Europe/Paris", value: "Europe/Paris" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "Africa/Abidjan", value: "Africa/Abidjan" },
];
const dateFormatOptions = [
  { label: "JJ/MM/AAAA", value: "DD/MM/YYYY" },
  { label: "MM/JJ/AAAA", value: "MM/DD/YYYY" },
  { label: "AAAA-MM-JJ", value: "YYYY-MM-DD" },
  { label: "JJ-MM-AAAA", value: "DD-MM-YYYY" },
];
const backupFrequencyOptions = [
  { label: "Quotidien", value: "daily" },
  { label: "Hebdomadaire", value: "weekly" },
  { label: "Mensuel", value: "monthly" },
];

const syncFormWithSettings = () => {
  if (!settings.value) return;
  Object.keys(settings.value).forEach((key) => {
    form.value[key] = settings.value[key];
  });
};

const loadSettings = async () => {
  if (isLoadingUser.value) await loadCurrentUser();
  if (!companyId.value) {
    toast.add({
      title: "Erreur utilisateur",
      description: "Impossible de récupérer la company de l'utilisateur.",
      color: "red",
    });
    return;
  }
  try {
    await fetchCompanySettings(companyId.value);
    if (error.value) throw new Error(error.value);
    syncFormWithSettings();
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

const saveSettings = async () => {
  saving.value = true;
  try {
    if (!form.value.company_name?.trim())
      throw new Error("Le nom de l'entreprise est requis");
    if (!form.value.company_email?.trim())
      throw new Error("L'email de l'entreprise est requis");
    const validationErrors = validateSettings(form.value);
    if (validationErrors.length > 0)
      throw new Error(validationErrors.join(", "));
    // Ajoute l'id de la company avant la sauvegarde
    form.value.id = companyId.value;
    // Utilise upsertCompanySettings pour la sauvegarde
    const success = await upsertCompanySettings(form.value);
    if (!success)
      throw new Error(error.value || "Erreur lors de la sauvegarde");
    toast.add({
      title: "Paramètres sauvegardés",
      description: "Les paramètres ont été mis à jour avec succès",
      icon: "i-heroicons-check-circle",
      color: "green",
      timeout: 3000,
    });
    await fetchCompanySettings(companyId.value);
    syncFormWithSettings();
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

const upsertCompanySettings = async (updatedSettings) => {
  const settingId = updatedSettings.id;
  if (!settingId) {
    throw new Error("Impossible de mettre à jour : id manquant");
  }
  // Mise à jour uniquement
  const { error: updateError } = await supabase
    .from("company_settings")
    .update(updatedSettings)
    .eq("id", settingId)
    .select()
    .single();
  if (updateError) {
    throw new Error(updateError.message);
  }
  return true;
};

onMounted(loadSettings);
</script>

<template>
  <div class="w-full min-h-screen bg-white">
    <div v-if="loading" class="flex justify-center items-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-10 h-10 animate-spin text-primary-500"
      />
      <span class="ml-4 text-lg text-gray-600 font-semibold"
        >Chargement des paramètres...</span
      >
    </div>
    <div v-else class="w-full">
      <div
        class="bg-gradient-to-br from-blue-50 to-white rounded-none shadow-xl p-0 border-b border-blue-100"
      >
        <div class="px-0 py-8">
          <h2
            class="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3 pl-8"
          >
            <UIcon
              name="i-heroicons-building-office"
              class="w-10 h-10 text-blue-500"
            />
            Modifier les informations de l'entreprise
          </h2>
          <!-- Identité -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-8">
            <UInput
              v-model="form.company_name"
              label="Nom de l'entreprise"
              required
              icon="i-heroicons-building-office"
            />
            <UInput
              v-model="form.company_siret"
              label="SIRET"
              icon="i-heroicons-identification"
            />
            <UTextarea
              v-model="form.company_address"
              label="Adresse"
              :rows="2"
              icon="i-heroicons-map-pin"
              class="md:col-span-2"
            />
          </div>
          <!-- Contact -->
          <h3
            class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2 pl-8"
          >
            <UIcon name="i-heroicons-envelope" class="w-6 h-6 text-blue-400" />
            Contact
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-8">
            <UInput
              v-model="form.company_email"
              label="Email"
              type="email"
              required
              icon="i-heroicons-envelope"
            />
            <UInput
              v-model="form.company_phone"
              label="Téléphone"
              icon="i-heroicons-phone"
            />
            <UInput
              v-model="form.company_website"
              label="Site web"
              icon="i-heroicons-globe-alt"
            />
          </div>
          <!-- Paramètres techniques -->
          <h3
            class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2 pl-8"
          >
            <UIcon
              name="i-heroicons-cog-6-tooth"
              class="w-6 h-6 text-blue-400"
            />
            Paramètres techniques
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-8">
            <USelect
              v-model="form.currency"
              :items="currencyOptions"
              label="Devise"
              icon="i-heroicons-currency-euro"
            />
            <UInput
              v-model="form.tax_rate"
              label="Taux de TVA (%)"
              type="number"
              min="0"
              max="100"
              icon="i-heroicons-receipt-percent"
            />
            <UInput
              v-model="form.invoice_prefix"
              label="Préfixe Facture"
              icon="i-heroicons-document-text"
            />
            <UInput
              v-model="form.invoice_number_start"
              label="Numéro de départ Facture"
              type="number"
              min="1"
              icon="i-heroicons-hashtag"
            />
            <USelect
              v-model="form.language"
              :items="languageOptions"
              label="Langue"
              icon="i-heroicons-language"
            />
            <USelect
              v-model="form.timezone"
              :items="timezoneOptions"
              label="Fuseau horaire"
              icon="i-heroicons-clock"
            />
            <USelect
              v-model="form.date_format"
              :items="dateFormatOptions"
              label="Format de date"
              icon="i-heroicons-calendar"
            />
            <UInput
              v-model="form.number_format"
              label="Format de nombre"
              icon="i-heroicons-calculator"
            />
          </div>
          <!-- Stock -->
          <h3
            class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2 pl-8"
          >
            <UIcon
              name="i-heroicons-archive-box"
              class="w-6 h-6 text-blue-400"
            />
            Gestion du stock
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-8">
            <UInput
              v-model="form.low_stock_threshold"
              label="Seuil bas de stock"
              type="number"
              min="0"
              icon="i-heroicons-arrow-trending-down"
            />
            <UInput
              v-model="form.critical_stock_threshold"
              label="Seuil critique de stock"
              type="number"
              min="0"
              icon="i-heroicons-exclamation-circle"
            />
            <UCheckbox
              v-model="form.enable_stock_alerts"
              label="Activer les alertes de stock"
              icon="i-heroicons-bell"
              class="md:col-span-2"
            />
          </div>
          <!-- Sécurité -->
          <h3
            class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2 pl-8"
          >
            <UIcon
              name="i-heroicons-lock-closed"
              class="w-6 h-6 text-blue-400"
            />
            Sécurité
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-8">
            <UCheckbox
              v-model="form.enable_two_factor"
              label="Activer la double authentification"
              icon="i-heroicons-lock-closed"
            />
            <UInput
              v-model="form.password_min_length"
              label="Longueur min. mot de passe"
              type="number"
              min="6"
              max="20"
              icon="i-heroicons-key"
            />
            <UInput
              v-model="form.session_timeout"
              label="Timeout session (min)"
              type="number"
              min="5"
              max="480"
              icon="i-heroicons-stopwatch"
            />
          </div>
          <!-- Notifications -->
          <h3
            class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2 pl-8"
          >
            <UIcon name="i-heroicons-bell" class="w-6 h-6 text-blue-400" />
            Notifications
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-8">
            <UCheckbox
              v-model="form.enable_email_notifications"
              label="Notifications email"
              icon="i-heroicons-envelope-open"
            />
            <UCheckbox
              v-model="form.enable_invoice_reminders"
              label="Rappels de facture"
              icon="i-heroicons-bell-alert"
            />
          </div>
          <!-- Sauvegarde -->
          <h3
            class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2 pl-8"
          >
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-6 h-6 text-blue-400"
            />
            Sauvegarde
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 px-8">
            <UCheckbox
              v-model="form.enable_auto_backup"
              label="Activer la sauvegarde automatique"
              icon="i-heroicons-arrow-path"
            />
            <USelect
              v-model="form.backup_frequency"
              :items="backupFrequencyOptions"
              label="Fréquence sauvegarde"
              icon="i-heroicons-calendar-days"
            />
            <UInput
              v-model="form.backup_retention"
              label="Rétention sauvegarde (jours)"
              type="number"
              min="7"
              max="365"
              icon="i-heroicons-archive-box"
            />
          </div>
          <div
            class="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 px-8"
          >
            <UButton
              :loading="saving"
              size="lg"
              color="primary"
              icon="i-heroicons-check"
              class="rounded-full shadow-md px-6 py-2 font-bold text-base"
              @click="saveSettings"
            >
              Sauvegarder les Modifications
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
