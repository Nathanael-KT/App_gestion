<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";

type CompanyListItem = {
  id: string;
  company_name: string | null;
  company_email: string | null;
  updated_at: string | null;
};

type EditableSettings = {
  id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  company_website: string;
  company_siret: string;
  currency: "EUR" | "USD" | "GBP" | "CHF";
  tax_rate: number;
  invoice_prefix: string;
  invoice_number_start: number;
  low_stock_threshold: number;
  critical_stock_threshold: number;
  enable_stock_alerts: boolean;
  language: "fr-FR" | "en-US" | "es-ES" | "de-DE";
  timezone: string;
  date_format: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD-MM-YYYY";
  number_format: string;
  session_timeout: number;
  enable_two_factor: boolean;
  password_min_length: number;
  enable_email_notifications: boolean;
  enable_invoice_reminders: boolean;
  enable_auto_backup: boolean;
  backup_frequency: "daily" | "weekly" | "monthly";
  backup_retention: number;
  blocked: boolean;
};

const supabase = useSupabaseClient();
const toast = useToast();

const loadingCompanies = ref(false);
const loadingSettings = ref(false);
const saving = ref(false);
const companies = ref<CompanyListItem[]>([]);
const selectedCompanyId = ref("");
const lastSavedAt = ref<string | null>(null);

const form = reactive<EditableSettings>({
  id: "",
  company_name: "",
  company_email: "",
  company_phone: "",
  company_address: "",
  company_website: "",
  company_siret: "",
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
  blocked: false,
});

const companyOptions = computed(() =>
  companies.value.map((company) => ({
    label: company.company_name || `Compagnie ${company.id.slice(0, 8)}`,
    value: company.id,
  })),
);

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

async function loadCompanies() {
  loadingCompanies.value = true;
  const { data, error } = await supabase
    .from("company_settings")
    .select("id, company_name, company_email, updated_at")
    .order("company_name", { ascending: true });

  loadingCompanies.value = false;

  if (error) {
    toast.add({
      title: "Erreur",
      description: error.message || "Impossible de charger les compagnies",
      color: "error",
    });
    return;
  }

  companies.value = Array.isArray(data)
    ? (data as unknown as CompanyListItem[])
    : [];

  if (!selectedCompanyId.value && companies.value.length > 0) {
    const firstCompany = companies.value[0];
    if (firstCompany) {
      selectedCompanyId.value = firstCompany.id;
    }
  }
}

function applySettingsToForm(raw: Record<string, unknown>) {
  form.id = String(raw.id ?? "");
  form.company_name = String(raw.company_name ?? "");
  form.company_email = String(raw.company_email ?? "");
  form.company_phone = String(raw.company_phone ?? "");
  form.company_address = String(raw.company_address ?? "");
  form.company_website = String(raw.company_website ?? "");
  form.company_siret = String(raw.company_siret ?? "");
  form.currency = (raw.currency as EditableSettings["currency"]) || "EUR";
  form.tax_rate = Number(raw.tax_rate ?? 20);
  form.invoice_prefix = String(raw.invoice_prefix ?? "INV");
  form.invoice_number_start = Number(raw.invoice_number_start ?? 1);
  form.low_stock_threshold = Number(raw.low_stock_threshold ?? 10);
  form.critical_stock_threshold = Number(raw.critical_stock_threshold ?? 5);
  form.enable_stock_alerts = Boolean(raw.enable_stock_alerts ?? true);
  form.language = (raw.language as EditableSettings["language"]) || "fr-FR";
  form.timezone = String(raw.timezone ?? "Europe/Paris");
  form.date_format =
    (raw.date_format as EditableSettings["date_format"]) || "DD/MM/YYYY";
  form.number_format = String(raw.number_format ?? "fr-FR");
  form.session_timeout = Number(raw.session_timeout ?? 60);
  form.enable_two_factor = Boolean(raw.enable_two_factor ?? false);
  form.password_min_length = Number(raw.password_min_length ?? 8);
  form.enable_email_notifications = Boolean(
    raw.enable_email_notifications ?? true,
  );
  form.enable_invoice_reminders = Boolean(raw.enable_invoice_reminders ?? true);
  form.enable_auto_backup = Boolean(raw.enable_auto_backup ?? false);
  form.backup_frequency =
    (raw.backup_frequency as EditableSettings["backup_frequency"]) || "weekly";
  form.backup_retention = Number(raw.backup_retention ?? 30);
  form.blocked = Boolean(raw.blocked ?? false);
  lastSavedAt.value = raw.updated_at ? String(raw.updated_at) : null;
}

async function loadCompanySettings(companyId: string) {
  if (!companyId) return;

  loadingSettings.value = true;
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", companyId)
    .single();

  loadingSettings.value = false;

  if (error) {
    toast.add({
      title: "Erreur",
      description: error.message || "Impossible de charger les paramètres",
      color: "error",
    });
    return;
  }

  if (data && typeof data === "object") {
    applySettingsToForm(data as Record<string, unknown>);
  }
}

function validateForm(): string | null {
  if (!form.company_name.trim()) return "Le nom de la compagnie est requis.";
  if (!form.company_email.trim()) return "L'email est requis.";
  if (form.tax_rate < 0 || form.tax_rate > 100) {
    return "Le taux de TVA doit être entre 0 et 100.";
  }
  if (form.critical_stock_threshold > form.low_stock_threshold) {
    return "Le seuil critique doit être inférieur ou égal au seuil bas.";
  }
  if (form.password_min_length < 6 || form.password_min_length > 32) {
    return "La longueur minimale du mot de passe doit être entre 6 et 32.";
  }
  return null;
}

async function saveSettings() {
  const validationError = validateForm();
  if (validationError) {
    toast.add({
      title: "Validation",
      description: validationError,
      color: "warning",
    });
    return;
  }

  saving.value = true;

  const payload = {
    company_name: form.company_name,
    company_email: form.company_email,
    company_phone: form.company_phone || null,
    company_address: form.company_address || null,
    company_website: form.company_website || null,
    company_siret: form.company_siret || null,
    currency: form.currency,
    tax_rate: form.tax_rate,
    invoice_prefix: form.invoice_prefix,
    invoice_number_start: form.invoice_number_start,
    low_stock_threshold: form.low_stock_threshold,
    critical_stock_threshold: form.critical_stock_threshold,
    enable_stock_alerts: form.enable_stock_alerts,
    language: form.language,
    timezone: form.timezone,
    date_format: form.date_format,
    number_format: form.number_format,
    session_timeout: form.session_timeout,
    enable_two_factor: form.enable_two_factor,
    password_min_length: form.password_min_length,
    enable_email_notifications: form.enable_email_notifications,
    enable_invoice_reminders: form.enable_invoice_reminders,
    enable_auto_backup: form.enable_auto_backup,
    backup_frequency: form.backup_frequency,
    backup_retention: form.backup_retention,
    blocked: form.blocked,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("company_settings")
    .update(payload)
    .eq("id", form.id);

  saving.value = false;

  if (error) {
    toast.add({
      title: "Erreur de sauvegarde",
      description: error.message || "La sauvegarde a échoué",
      color: "error",
    });
    return;
  }

  toast.add({
    title: "Sauvegardé",
    description: "Les paramètres ont été mis à jour.",
    color: "success",
  });

  await Promise.all([loadCompanies(), loadCompanySettings(form.id)]);
}

watch(selectedCompanyId, async (value) => {
  if (!value) return;
  await loadCompanySettings(value);
});

onMounted(async () => {
  await loadCompanies();
  if (selectedCompanyId.value) {
    await loadCompanySettings(selectedCompanyId.value);
  }
});
</script>

<template>
  <div class="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
    >
      <div>
        <h1 class="text-3xl font-extrabold text-blue-700">
          Paramètres Superadmin
        </h1>
        <p class="text-gray-500">
          Gérez la configuration métier, facturation, sécurité et blocage global
          des compagnies.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <USelect
          v-model="selectedCompanyId"
          :items="companyOptions"
          :loading="loadingCompanies"
          placeholder="Sélectionner une compagnie"
          class="min-w-[300px]"
        />
        <UButton
          v-if="selectedCompanyId"
          icon="heroicons:building-office-2-20-solid"
          color="neutral"
          variant="soft"
          :to="`/superadmin/company/${selectedCompanyId}`"
        >
          Voir Détail
        </UButton>
      </div>
    </div>

    <div
      v-if="loadingSettings"
      class="bg-white rounded-xl border p-8 text-center text-gray-500"
    >
      <UIcon
        name="heroicons:arrow-path-20-solid"
        class="h-8 w-8 mx-auto animate-spin"
      />
      <p class="mt-2">Chargement des paramètres...</p>
    </div>

    <div
      v-else-if="!selectedCompanyId"
      class="bg-white rounded-xl border p-8 text-center text-gray-500"
    >
      Veuillez sélectionner une compagnie.
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border p-4">
          <p class="text-xs text-gray-500 uppercase">Compagnie</p>
          <p class="text-lg font-semibold text-gray-900">
            {{ form.company_name || "-" }}
          </p>
        </div>
        <div class="bg-white rounded-xl border p-4">
          <p class="text-xs text-gray-500 uppercase">Statut global</p>
          <p
            :class="form.blocked ? 'text-red-600' : 'text-green-600'"
            class="text-lg font-semibold"
          >
            {{ form.blocked ? "Bloquée" : "Active" }}
          </p>
        </div>
        <div class="bg-white rounded-xl border p-4">
          <p class="text-xs text-gray-500 uppercase">Dernière maj</p>
          <p class="text-lg font-semibold text-gray-900">
            {{ lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "-" }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl border p-6 space-y-6">
        <h2 class="text-xl font-bold text-gray-900">Identité & Contact</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UInput
            v-model="form.company_name"
            label="Nom de la compagnie"
            required
          />
          <UInput
            v-model="form.company_email"
            label="Email"
            type="email"
            required
          />
          <UInput v-model="form.company_phone" label="Téléphone" />
          <UInput v-model="form.company_siret" label="SIRET" />
          <UInput
            v-model="form.company_website"
            label="Site web"
            class="md:col-span-2"
          />
          <UTextarea
            v-model="form.company_address"
            label="Adresse"
            :rows="2"
            class="md:col-span-2"
          />
        </div>
      </div>

      <div class="bg-white rounded-xl border p-6 space-y-6">
        <h2 class="text-xl font-bold text-gray-900">
          Facturation & Localisation
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <USelect
            v-model="form.currency"
            :items="currencyOptions"
            label="Devise"
          />
          <UInput
            v-model.number="form.tax_rate"
            type="number"
            min="0"
            max="100"
            label="TVA (%)"
          />
          <UInput v-model="form.invoice_prefix" label="Préfixe facture" />
          <UInput
            v-model.number="form.invoice_number_start"
            type="number"
            min="1"
            label="N° départ facture"
          />
          <USelect
            v-model="form.language"
            :items="languageOptions"
            label="Langue"
          />
          <UInput v-model="form.timezone" label="Fuseau horaire" />
          <USelect
            v-model="form.date_format"
            :items="dateFormatOptions"
            label="Format date"
          />
          <UInput v-model="form.number_format" label="Format nombre" />
        </div>
      </div>

      <div class="bg-white rounded-xl border p-6 space-y-6">
        <h2 class="text-xl font-bold text-gray-900">
          Stock, Sécurité & Notifications
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UInput
            v-model.number="form.low_stock_threshold"
            type="number"
            min="0"
            label="Seuil stock bas"
          />
          <UInput
            v-model.number="form.critical_stock_threshold"
            type="number"
            min="0"
            label="Seuil stock critique"
          />
          <UInput
            v-model.number="form.session_timeout"
            type="number"
            min="5"
            max="480"
            label="Timeout session (min)"
          />
          <UInput
            v-model.number="form.password_min_length"
            type="number"
            min="6"
            max="32"
            label="Mot de passe min"
          />
          <USelect
            v-model="form.backup_frequency"
            :items="backupFrequencyOptions"
            label="Fréquence backup"
          />
          <UInput
            v-model.number="form.backup_retention"
            type="number"
            min="7"
            max="365"
            label="Rétention backup (jours)"
          />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <UCheckbox
            v-model="form.enable_stock_alerts"
            label="Activer alertes stock"
          />
          <UCheckbox v-model="form.enable_two_factor" label="Activer 2FA" />
          <UCheckbox
            v-model="form.enable_email_notifications"
            label="Notifications email"
          />
          <UCheckbox
            v-model="form.enable_invoice_reminders"
            label="Rappels facture"
          />
          <UCheckbox
            v-model="form.enable_auto_backup"
            label="Backup automatique"
          />
          <UCheckbox
            v-model="form.blocked"
            label="Bloquer globalement la compagnie"
          />
        </div>
      </div>

      <div class="flex justify-end">
        <UButton
          icon="heroicons:check-circle-20-solid"
          color="primary"
          size="lg"
          :loading="saving"
          @click="saveSettings"
        >
          Enregistrer les paramètres
        </UButton>
      </div>
    </div>
  </div>
</template>
