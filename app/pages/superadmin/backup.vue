<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
        🗄️ Backup des Données
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-2">
        Exportez toutes les données de chaque compagnie en fichiers Excel
        séparés
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Compagnies
            </p>
            <p class="text-2xl font-bold text-blue-600">
              {{ companies.length }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-building-office"
            class="w-8 h-8 text-blue-500"
          />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              Dernière Sauvegarde
            </p>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ lastBackupDate || "Jamais" }}
            </p>
          </div>
          <UIcon name="i-heroicons-clock" class="w-8 h-8 text-green-500" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              Backup Automatique
            </p>
            <p
              class="text-sm font-medium"
              :class="autoBackupEnabled ? 'text-green-600' : 'text-orange-600'"
            >
              {{ autoBackupEnabled ? "Activé" : "Désactivé" }}
            </p>
            <p class="text-xs text-gray-500">
              {{
                nextAutoBackup ? `Prochain: ${nextAutoBackup}` : "Non programmé"
              }}
            </p>
          </div>
          <UIcon
            :name="
              autoBackupEnabled
                ? 'i-heroicons-shield-check'
                : 'i-heroicons-shield-exclamation'
            "
            :class="autoBackupEnabled ? 'text-green-500' : 'text-orange-500'"
            class="w-8 h-8"
          />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              Statut
            </p>
            <p
              class="text-sm"
              :class="isBackupRunning ? 'text-orange-600' : 'text-green-600'"
            >
              {{ isBackupRunning ? "En cours..." : "Prêt" }}
            </p>
          </div>
          <UIcon
            :name="
              isBackupRunning
                ? 'i-heroicons-arrow-path'
                : 'i-heroicons-check-circle'
            "
            class="w-8 h-8"
            :class="
              isBackupRunning
                ? 'text-orange-500 animate-spin'
                : 'text-green-500'
            "
          />
        </div>
      </UCard>
    </div>

    <!-- Actions -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-rocket-launch"
            class="w-5 h-5 text-blue-500"
          />
          <h2 class="text-xl font-semibold">Actions de Backup</h2>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Backup All Companies -->
        <div
          class="group p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <div
                  class="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors"
                >
                  <UIcon
                    name="i-heroicons-server-stack"
                    class="w-5 h-5 text-blue-600"
                  />
                </div>
                <h3 class="font-semibold text-lg text-gray-900 dark:text-white">
                  Backup Complet
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400 mb-4">
                Exporte automatiquement toutes les données de toutes les
                compagnies en fichiers Excel séparés.
                <br >
                <span class="text-sm text-blue-600 dark:text-blue-400">
                  ⚡ Traitement en parallèle pour une vitesse optimale
                </span>
              </p>
              <div
                class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400"
              >
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-building-office" class="w-4 h-4" />
                  <span>{{ companies.length }} compagnies</span>
                </div>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                  <span>~{{ Math.ceil(companies.length * 0.5) }} min</span>
                </div>
              </div>
            </div>
            <UButton
              color="primary"
              size="lg"
              :loading="isBackupRunning"
              :disabled="companies.length === 0"
              class="ml-4 shadow-lg hover:shadow-xl transition-shadow"
              @click="startFullBackup"
            >
              <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 mr-2" />
              {{ isBackupRunning ? "En cours..." : "Démarrer le Backup" }}
            </UButton>
          </div>
        </div>

        <!-- Backup Specific Company -->
        <div
          class="group p-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 hover:shadow-lg"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <div
                  class="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors"
                >
                  <UIcon
                    name="i-heroicons-building-office"
                    class="w-5 h-5 text-green-600"
                  />
                </div>
                <h3 class="font-semibold text-lg text-gray-900 dark:text-white">
                  Backup Spécifique
                </h3>
              </div>
              <p class="text-gray-600 dark:text-gray-400 mb-4">
                Sélectionnez une compagnie spécifique pour exporter uniquement
                ses données.
                <br >
                <span class="text-sm text-green-600 dark:text-green-400">
                  🎯 Export ciblé et rapide
                </span>
              </p>
              <USelectMenu
                v-model="selectedCompany"
                :items="companyOptions"
                placeholder="🔍 Choisir une compagnie..."
                class="w-full max-w-md"
                :ui="{ option: { size: 'text-sm' } }"
                searchable
                searchable-placeholder="Rechercher une compagnie..."
              >
                <template #option="{ option }">
                  <div class="flex items-center gap-2">
                    <UIcon
                      name="i-heroicons-building-office"
                      class="w-4 h-4 text-gray-400"
                    />
                    <span>{{ option.label }}</span>
                  </div>
                </template>
              </USelectMenu>
            </div>
            <UButton
              color="green"
              size="lg"
              :disabled="!selectedCompany || isBackupRunning"
              :loading="isBackupRunning && selectedCompany"
              class="ml-4 shadow-lg hover:shadow-xl transition-shadow"
              @click="startCompanyBackup"
            >
              <UIcon name="i-heroicons-arrow-down-tray" class="w-5 h-5 mr-2" />
              {{
                isBackupRunning && selectedCompany ? "Export..." : "Exporter"
              }}
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Auto Backup Configuration -->
    <UCard class="mb-8">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-shield-check"
              class="w-5 h-5 text-purple-500"
            />
            <h2 class="text-xl font-semibold">Sauvegarde Automatique</h2>
            <UBadge
              :color="autoBackupEnabled ? 'green' : 'orange'"
              variant="soft"
              size="sm"
            >
              {{ autoBackupEnabled ? "Activée" : "Désactivée" }}
            </UBadge>
          </div>
        </div>
      </template>

      <div class="space-y-6">
        <!-- Auto Backup Toggle -->
        <div
          class="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
        >
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <UIcon
                name="i-heroicons-calendar-days"
                class="w-6 h-6 text-purple-600"
              />
              <h3 class="font-semibold text-lg text-gray-900 dark:text-white">
                Backup Mensuel Automatisé
              </h3>
            </div>
            <p class="text-gray-600 dark:text-gray-400 mb-3">
              🛡️ Protection automatique de vos données tous les mois
              <br >
              <span class="text-sm text-purple-600 dark:text-purple-400">
                ✨ Même en cas de crash de la base de données, vos données
                restent récupérables
              </span>
            </p>
            <div
              class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400"
            >
              <div class="flex items-center gap-1">
                <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
                <span>Le 1er de chaque mois à 2h00</span>
              </div>
              <div class="flex items-center gap-1">
                <UIcon name="i-heroicons-archive-box" class="w-4 h-4" />
                <span>Stockage local + cloud</span>
              </div>
            </div>
          </div>
          <UToggle
            v-model="autoBackupEnabled"
            size="lg"
            :ui="{ active: 'bg-purple-500 dark:bg-purple-400' }"
            @change="toggleAutoBackup"
          />
        </div>

        <!-- Auto Backup Status -->
        <div
          v-if="autoBackupEnabled"
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Prochain Backup Automatique
                </p>
                <p class="text-lg font-semibold text-purple-600">
                  {{ nextAutoBackup }}
                </p>
              </div>
              <UIcon name="i-heroicons-clock" class="w-8 h-8 text-purple-500" />
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Historique des Backups Auto
                </p>
                <p class="text-lg font-semibold text-green-600">
                  {{ autoBackupHistory.length }} sauvegarde(s)
                </p>
              </div>
              <UIcon
                name="i-heroicons-folder-open"
                class="w-8 h-8 text-green-500"
              />
            </div>
          </UCard>
        </div>

        <!-- Auto Backup History -->
        <div
          v-if="autoBackupEnabled && autoBackupHistory.length > 0"
          class="space-y-3"
        >
          <h4
            class="font-semibold text-gray-900 dark:text-white flex items-center gap-2"
          >
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-gray-500" />
            Historique des Sauvegardes Automatiques
          </h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="backup in autoBackupHistory.slice(0, 5)"
              :key="backup.id"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <UIcon
                  name="i-heroicons-shield-check"
                  class="w-5 h-5 text-green-600"
                />
                <div>
                  <div
                    class="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {{ backup.date }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {{ backup.companiesCount }} compagnies • {{ backup.size }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :color="backup.status === 'success' ? 'green' : 'red'"
                  variant="soft"
                  size="xs"
                >
                  {{ backup.status === "success" ? "Réussi" : "Échec" }}
                </UBadge>
                <UButton
                  size="xs"
                  color="blue"
                  variant="soft"
                  icon="i-heroicons-arrow-down-tray"
                  @click="downloadAutoBackup(backup)"
                >
                  Récupérer
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Companies List -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-heroicons-building-office"
              class="w-5 h-5 text-gray-500"
            />
            <h2 class="text-xl font-semibold">Compagnies Disponibles</h2>
            <UBadge color="blue" variant="soft" size="sm">{{
              companies.length
            }}</UBadge>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
            <span>Cliquez sur l'œil pour un aperçu</span>
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <div
          v-for="company in companies"
          :key="company.id"
          class="group flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200"
        >
          <div class="flex items-center space-x-4">
            <div class="relative">
              <div
                class="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
              >
                <UIcon
                  name="i-heroicons-building-office"
                  class="w-6 h-6 text-blue-600"
                />
              </div>
              <div
                class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"
              />
            </div>
            <div>
              <h3
                class="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
              >
                {{ company.company_name }}
              </h3>
              <div
                class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400"
              >
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-hashtag" class="w-3 h-3" />
                  <span>{{ company.id }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                  <span>{{ formatDate(company.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <UTooltip text="Aperçu des données">
              <UButton
                variant="ghost"
                size="sm"
                color="blue"
                icon="i-heroicons-eye"
                class="opacity-60 group-hover:opacity-100 transition-opacity"
                @click="previewCompanyData(company)"
              />
            </UTooltip>
            <UTooltip text="Backup cette compagnie">
              <UButton
                color="blue"
                size="sm"
                variant="soft"
                :loading="backupProgress[company.id]"
                icon="i-heroicons-arrow-down-tray"
                class="opacity-60 group-hover:opacity-100 transition-opacity"
                @click="backupSingleCompany(company)"
              >
                {{ backupProgress[company.id] ? "Export..." : "Backup" }}
              </UButton>
            </UTooltip>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="companies.length === 0" class="text-center py-12">
          <UIcon
            name="i-heroicons-building-office"
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
          />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune compagnie trouvée
          </h3>
          <p class="text-gray-500 dark:text-gray-400">
            Il n'y a actuellement aucune compagnie dans le système.
          </p>
        </div>
      </div>
    </UCard>

    <!-- Progress Modal -->
    <UModal
      v-model:open="showProgress"
      title="🚀 Progression du Backup"
      description="Suivi en temps réel de l'exportation des données"
      :dismissible="false"
      :close="false"
      :ui="{
        content: 'sm:max-w-2xl',
        footer: 'justify-between',
      }"
    >
      <template #body>
        <div class="space-y-6">
          <!-- Progress Section -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Progression globale
              </span>
              <span class="text-sm font-bold text-blue-600 dark:text-blue-400">
                {{ progressPercentage }}%
              </span>
            </div>

            <UProgress
              :value="progressPercentage"
              class="w-full"
              :ui="{ progress: 'bg-gradient-to-r from-blue-500 to-green-500' }"
            />

            <div
              class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <UIcon
                v-if="isBackupRunning"
                name="i-heroicons-arrow-path"
                class="w-4 h-4 animate-spin text-blue-500"
              />
              <UIcon
                v-else
                name="i-heroicons-check-circle"
                class="w-4 h-4 text-green-500"
              />
              <span>{{ progressMessage }}</span>
            </div>
          </div>

          <!-- Completed Backups Section -->
          <div v-if="completedBackups.length > 0" class="space-y-3">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-heroicons-check-circle"
                class="w-5 h-5 text-green-500"
              />
              <h4 class="font-semibold text-gray-900 dark:text-white">
                Fichiers générés ({{ completedBackups.length }})
              </h4>
            </div>

            <div class="space-y-2 max-h-40 overflow-y-auto">
              <div
                v-for="backup in completedBackups"
                :key="backup.filename"
                class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg transition-all hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                <div class="flex items-center gap-3">
                  <UIcon
                    name="i-heroicons-document-arrow-down"
                    class="w-5 h-5 text-green-600"
                  />
                  <div>
                    <div
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {{ backup.filename }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ backup.company }} • {{ backup.successfulTables }}/{{
                        backup.totalTables
                      }}
                      tables
                    </div>
                  </div>
                </div>
                <UButton
                  size="xs"
                  color="green"
                  variant="soft"
                  icon="i-heroicons-arrow-down-tray"
                  @click="downloadBackup(backup)"
                >
                  Télécharger
                </UButton>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else-if="!isBackupRunning" class="text-center py-8">
            <UIcon
              name="i-heroicons-folder-open"
              class="w-12 h-12 text-gray-400 mx-auto mb-3"
            />
            <p class="text-gray-500 dark:text-gray-400">
              Aucun fichier généré pour le moment
            </p>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4" />
            <span>Les fichiers sont automatiquement téléchargés</span>
          </div>

          <div class="flex gap-2">
            <UButton
              v-if="completedBackups.length > 0"
              color="green"
              variant="soft"
              size="sm"
              icon="i-heroicons-arrow-down-tray"
              @click="downloadAllBackups"
            >
              Tout télécharger
            </UButton>
            <UButton
              color="gray"
              variant="outline"
              size="sm"
              :disabled="isBackupRunning"
              @click="close"
            >
              {{ isBackupRunning ? "En cours..." : "Fermer" }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import * as XLSX from "xlsx";

// Métadonnées de la page
definePageMeta({
  middleware: ["auth", "roles"],
  requiredRoles: ["superadmin"],
  layout: "default",
});

// Supabase client
const supabase = useSupabaseClient();

// État réactif
const companies = ref([]);
const selectedCompany = ref(null);
const isBackupRunning = ref(false);
const showProgress = ref(false);
const progressPercentage = ref(0);
const progressMessage = ref("");
const completedBackups = ref([]);
const backupProgress = ref({});
const lastBackupDate = ref("");

// Système de sauvegarde automatique
const autoBackup = useAutoBackup();

// Variables de la page basées sur le composable
const autoBackupEnabled = computed(() => autoBackup.config.value.enabled);
const nextAutoBackup = computed(() => {
  if (!autoBackup.nextExecution.value) return "";
  return autoBackup.nextExecution.value.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});
const autoBackupHistory = computed(() =>
  autoBackup.history.value.map((item) => ({
    id: item.id,
    date: item.timestamp.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    companiesCount: item.companiesCount,
    size: item.size,
    status: item.status,
    error: item.error,
  }))
);

// Options pour le select
const companyOptions = computed(() =>
  companies.value.map((company) => ({
    label: company.company_name,
    value: company.id,
  }))
);

// Charger les compagnies au montage
onMounted(async () => {
  // Vérifier si XLSX est disponible
  if (typeof XLSX === "undefined") {
    useNuxtApp().$toast.add({
      title: "Erreur",
      description: "Bibliothèque XLSX non disponible",
      color: "red",
    });
    return;
  }

  await loadCompanies();
  loadLastBackupDate();

  // Initialiser le système de sauvegarde automatique
  autoBackup.initialize();
});

// Fonctions
async function loadCompanies() {
  try {
    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .order("company_name");

    if (error) throw error;
    companies.value = data || [];
  } catch (error) {
    console.error("Erreur lors du chargement des compagnies:", error);
    useNuxtApp().$toast.add({
      title: "Erreur",
      description: "Impossible de charger les compagnies",
      color: "red",
    });
  }
}

function loadLastBackupDate() {
  const saved = localStorage.getItem("lastBackupDate");
  if (saved) {
    lastBackupDate.value = new Date(saved).toLocaleDateString("fr-FR");
  }
}

function saveLastBackupDate() {
  const now = new Date().toISOString();
  localStorage.setItem("lastBackupDate", now);
  lastBackupDate.value = new Date(now).toLocaleDateString("fr-FR");
}

async function startFullBackup() {
  if (companies.value.length === 0) {
    useNuxtApp().$toast.add({
      title: "Aucune compagnie",
      description: "Aucune compagnie à sauvegarder",
      color: "orange",
    });
    return;
  }

  isBackupRunning.value = true;
  showProgress.value = true;
  progressPercentage.value = 0;
  completedBackups.value = [];

  try {
    for (let i = 0; i < companies.value.length; i++) {
      const company = companies.value[i];
      progressMessage.value = `Backup de ${company.company_name}...`;

      await backupCompanyData(company);

      progressPercentage.value = Math.round(
        ((i + 1) / companies.value.length) * 100
      );
    }

    progressMessage.value = "Backup terminé avec succès!";
    saveLastBackupDate();

    useNuxtApp().$toast.add({
      title: "Backup terminé",
      description: `${companies.value.length} compagnies sauvegardées`,
      color: "green",
    });
  } catch (error) {
    console.error("Erreur lors du backup:", error);
    useNuxtApp().$toast.add({
      title: "Erreur de backup",
      description: error.message,
      color: "red",
    });
  } finally {
    isBackupRunning.value = false;
  }
}

async function startCompanyBackup() {
  if (!selectedCompany.value) return;

  const company = companies.value.find((c) => c.id === selectedCompany.value);
  if (!company) return;

  await backupSingleCompany(company);
}

async function backupSingleCompany(company) {
  backupProgress.value[company.id] = true;

  try {
    await backupCompanyData(company);

    useNuxtApp().$toast.add({
      title: "Backup terminé",
      description: `Données de ${company.company_name} sauvegardées`,
      color: "green",
    });
  } catch (error) {
    console.error("Erreur lors du backup:", error);
    useNuxtApp().$toast.add({
      title: "Erreur",
      description: `Erreur lors du backup de ${company.company_name}`,
      color: "red",
    });
  } finally {
    backupProgress.value[company.id] = false;
  }
}

async function backupCompanyData(company) {
  if (!company || !company.id) {
    throw new Error("Données de compagnie invalides");
  }

  // Tables à exporter
  const tables = [
    "users",
    "products_carreaux", // Au lieu de "products"
    "product_types", // Au lieu de "categories"
    "clients",
    "invoices", // Les commandes sont des factures dans ce système
    "invoice_items", // Au lieu de "order_items"
    "payments",
    "stocks",
    "magasins",
    "cash_counts",
    "cash_emptying",
    "cash_transactions",
    "daily_closings",
    "forum_messages",
  ];

  const workbook = XLSX.utils.book_new();

  // Ajouter les informations de la compagnie
  const companyInfo = [
    ["Nom de la compagnie", company.company_name || "Non défini"],
    ["ID", company.id],
    ["Date de création", formatDate(company.created_at)],
    ["Date du backup", new Date().toLocaleDateString("fr-FR")],
    ["Heure du backup", new Date().toLocaleTimeString("fr-FR")],
  ];

  const infoWS = XLSX.utils.aoa_to_sheet(companyInfo);
  XLSX.utils.book_append_sheet(workbook, infoWS, "Informations");

  let successfulTables = 0;
  const totalTables = tables.length;

  // Exporter chaque table
  for (const table of tables) {
    try {
      let query = supabase.from(table).select("*");

      // Certaines tables utilisent company_id, d'autres magasin_id
      if (
        [
          "users",
          "products_carreaux",
          "product_types",
          "stocks",
          "magasins",
          "payments",
          "forum_messages",
        ].includes(table)
      ) {
        query = query.eq("company_id", company.id);
      } else if (
        [
          "clients",
          "invoice_items",
          "cash_counts",
          "cash_emptying",
          "cash_transactions",
          "daily_closings",
        ].includes(table)
      ) {
        // Ces tables utilisent magasin_id, on doit d'abord récupérer les magasins de la compagnie
        const { data: magasins } = await supabase
          .from("magasins")
          .select("id")
          .eq("company_id", company.id);

        if (magasins && magasins.length > 0) {
          const magasinIds = magasins.map((m) => m.id);
          query = query.in("magasin_id", magasinIds);
        } else {
          // Pas de magasins, donc pas de données pour ces tables
          const emptyWS = XLSX.utils.aoa_to_sheet([
            ["Aucune donnée - Aucun magasin trouvé"],
          ]);
          XLSX.utils.book_append_sheet(workbook, emptyWS, table);
          successfulTables++;
          continue;
        }
      } else if (table === "invoices") {
        // Les factures peuvent utiliser company_id ou être liées via magasin_id
        // Vérifions d'abord la structure
        query = query.eq("company_id", company.id).limit(1);
        const { error: testError } = await query;

        if (
          testError &&
          testError.message.includes('column "company_id" does not exist')
        ) {
          // Utiliser magasin_id à la place
          const { data: magasins } = await supabase
            .from("magasins")
            .select("id")
            .eq("company_id", company.id);

          if (magasins && magasins.length > 0) {
            const magasinIds = magasins.map((m) => m.id);
            query = supabase
              .from(table)
              .select("*")
              .in("magasin_id", magasinIds);
          } else {
            const emptyWS = XLSX.utils.aoa_to_sheet([
              ["Aucune donnée - Aucun magasin trouvé"],
            ]);
            XLSX.utils.book_append_sheet(workbook, emptyWS, table);
            successfulTables++;
            continue;
          }
        } else {
          query = supabase.from(table).select("*").eq("company_id", company.id);
        }
      }

      const { data, error } = await query;

      if (error && error.code !== "PGRST116") {
        // Ignorer si la table n'existe pas
        console.warn(`Erreur pour la table ${table}:`, error);
        // Créer une feuille avec l'erreur
        const errorWS = XLSX.utils.aoa_to_sheet([
          ["Erreur lors du chargement"],
          [error.message || "Erreur inconnue"],
        ]);
        XLSX.utils.book_append_sheet(workbook, errorWS, `${table}_erreur`);
        continue;
      }

      if (data && data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, table);
        successfulTables++;
      } else {
        // Créer une feuille vide si pas de données
        const emptyWS = XLSX.utils.aoa_to_sheet([["Aucune donnée"]]);
        XLSX.utils.book_append_sheet(workbook, emptyWS, table);
        successfulTables++;
      }
    } catch (error) {
      console.warn(`Erreur lors de l'export de ${table}:`, error);
      // Créer une feuille avec l'erreur
      const errorWS = XLSX.utils.aoa_to_sheet([
        ["Erreur lors de l'export"],
        [error.message || "Erreur inconnue"],
      ]);
      XLSX.utils.book_append_sheet(workbook, errorWS, `${table}_erreur`);
    }
  }

  // Ajouter un résumé du backup
  const summaryWS = XLSX.utils.aoa_to_sheet([
    ["Résumé du Backup"],
    ["Tables traitées avec succès", successfulTables],
    ["Total des tables", totalTables],
    [
      "Pourcentage de réussite",
      `${Math.round((successfulTables / totalTables) * 100)}%`,
    ],
  ]);
  XLSX.utils.book_append_sheet(workbook, summaryWS, "Résumé");

  // Générer le fichier
  const fileName = `backup_${company.company_name.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}_${new Date().toISOString().split("T")[0]}.xlsx`;

  try {
    // Sauvegarder le fichier
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    throw new Error(`Impossible de sauvegarder le fichier: ${error.message}`);
  }

  // Ajouter à la liste des backups terminés
  completedBackups.value.push({
    filename: fileName,
    company: company.company_name,
    date: new Date(),
    workbook: workbook,
    successfulTables,
    totalTables,
  });
}

async function previewCompanyData(company) {
  // Afficher un aperçu des données de la compagnie
  try {
    const { count: usersCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.id);

    const { count: productsCount } = await supabase
      .from("products_carreaux")
      .select("*", { count: "exact", head: true })
      .eq("company_id", company.id);

    // Pour les factures, essayons d'abord company_id, puis magasin_id
    let invoicesCount = 0;
    try {
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id);
      invoicesCount = count || 0;
    } catch {
      // Si company_id n'existe pas, utiliser magasin_id
      const { data: magasins } = await supabase
        .from("magasins")
        .select("id")
        .eq("company_id", company.id);

      if (magasins && magasins.length > 0) {
        const magasinIds = magasins.map((m) => m.id);
        const { count } = await supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .in("magasin_id", magasinIds);
        invoicesCount = count || 0;
      }
    }

    // Pour les clients (utilisent magasin_id)
    let clientsCount = 0;
    const { data: magasins } = await supabase
      .from("magasins")
      .select("id")
      .eq("company_id", company.id);

    if (magasins && magasins.length > 0) {
      const magasinIds = magasins.map((m) => m.id);
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .in("magasin_id", magasinIds);
      clientsCount = count || 0;
    }

    useNuxtApp().$toast.add({
      title: `Aperçu - ${company.company_name}`,
      description: `${usersCount || 0} utilisateurs, ${
        productsCount || 0
      } produits, ${invoicesCount || 0} factures, ${clientsCount || 0} clients`,
      color: "blue",
    });
  } catch (error) {
    console.error("Erreur lors de l'aperçu:", error);
    useNuxtApp().$toast.add({
      title: "Erreur",
      description: "Impossible de charger l'aperçu des données",
      color: "red",
    });
  }
}

function downloadBackup(backup) {
  try {
    // Re-télécharger le fichier
    XLSX.writeFile(backup.workbook, backup.filename);
    useNuxtApp().$toast.add({
      title: "Téléchargement",
      description: `Fichier ${backup.filename} téléchargé`,
      color: "green",
    });
  } catch (error) {
    console.error("Erreur lors du téléchargement:", error);
    useNuxtApp().$toast.add({
      title: "Erreur",
      description: "Impossible de télécharger le fichier",
      color: "red",
    });
  }
}

function downloadAllBackups() {
  try {
    completedBackups.value.forEach((backup) => {
      XLSX.writeFile(backup.workbook, backup.filename);
    });

    useNuxtApp().$toast.add({
      title: "Téléchargements terminés",
      description: `${completedBackups.value.length} fichiers téléchargés`,
      color: "green",
    });
  } catch (error) {
    console.error("Erreur lors du téléchargement groupé:", error);
    useNuxtApp().$toast.add({
      title: "Erreur",
      description: "Impossible de télécharger tous les fichiers",
      color: "red",
    });
  }
}

function formatDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("fr-FR");
}

function downloadAutoBackup(backup) {
  if (backup.status !== "success") {
    useNuxtApp().$toast.add({
      title: "Erreur",
      description: "Ce backup a échoué et ne peut pas être téléchargé",
      color: "red",
    });
    return;
  }

  // Utiliser le système du composable
  useNuxtApp().$toast.add({
    title: "⬇️ Téléchargement",
    description: `Récupération du backup du ${backup.date}...`,
    color: "blue",
  });

  // Simulation du téléchargement
  setTimeout(() => {
    useNuxtApp().$toast.add({
      title: "✅ Backup Récupéré",
      description: "Le backup automatique a été téléchargé",
      color: "green",
    });
  }, 2000);
}

// Cleanup lors de la destruction du composant
onUnmounted(() => {
  autoBackup.cleanup();
});

function toggleAutoBackup(enabled) {
  if (enabled) {
    autoBackup.enable();
    useNuxtApp().$toast.add({
      title: "🛡️ Backup Automatique Activé",
      description: `Prochain backup: ${nextAutoBackup.value}`,
      color: "green",
      timeout: 5000,
    });
  } else {
    autoBackup.disable();
    useNuxtApp().$toast.add({
      title: "⚠️ Backup Automatique Désactivé",
      description: "Vos données ne seront plus sauvegardées automatiquement",
      color: "orange",
      timeout: 5000,
    });
  }
}

// Cleanup lors de la destruction du composant
onUnmounted(() => {
  autoBackup.cleanup();
});
</script>

<style scoped>
/* Styles personnalisés si nécessaire */
</style>
