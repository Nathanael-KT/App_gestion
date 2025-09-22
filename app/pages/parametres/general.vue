<script setup>
import { useCurrentUser } from "../../composables/useCurrentUser";
import { useCompanySettings } from "../../composables/useCompanySettings";
import { useRouter } from "vue-router";

const router = useRouter();
const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings, loading, error, fetchCompanySettings } = useCompanySettings();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (!companyId.value) return;
  await fetchCompanySettings(companyId.value);
});

const goToEdit = () => {
  router.push({ path: "/parametres/edit-company" });
};
</script>

<template>
  <div
    class="w-full min-h-screen bg-gradient-to-br from-blue-50 to-white px-0 py-0"
  >
    <div v-if="loading" class="flex justify-center items-center py-16">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-10 h-10 animate-spin text-primary-500"
      />
      <span class="ml-4 text-xl text-gray-600 font-semibold"
        >Chargement des informations...</span
      >
    </div>
    <div v-else-if="error" class="flex flex-col items-center py-16">
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-10 h-10 text-red-500 mb-2"
      />
      <span class="text-lg text-red-600">{{ error }}</span>
    </div>
    <div v-else-if="settings" class="w-full">
      <div class="bg-white rounded-none shadow-xl p-0 border-b border-blue-100">
        <div class="px-0 py-8">
          <h2
            class="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3 pl-8"
          >
            <UIcon
              name="i-heroicons-building-office"
              class="w-10 h-10 text-blue-500"
            />
            Informations de la société
          </h2>
          <!-- Identité -->
          <div class="mb-8 px-8">
            <h3
              class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-identification"
                class="w-6 h-6 text-blue-400"
              />
              Identité
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Nom</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.company_name ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >SIRET</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.company_siret ?? "-" }}
                </div>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Adresse</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.company_address ?? "-" }}
                </div>
              </div>
            </div>
          </div>
          <!-- Contact -->
          <div class="mb-8 px-8">
            <h3
              class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-envelope"
                class="w-6 h-6 text-blue-400"
              />
              Contact
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Email</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.company_email ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Téléphone</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.company_phone ?? "-" }}
                </div>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Site web</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.company_website ?? "-" }}
                </div>
              </div>
            </div>
          </div>
          <!-- Paramètres techniques -->
          <div class="mb-8 px-8">
            <h3
              class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-cog-6-tooth"
                class="w-6 h-6 text-blue-400"
              />
              Paramètres techniques
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Devise</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.currency ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Taux de TVA (%)</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.tax_rate ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Préfixe Facture</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.invoice_prefix ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Numéro de départ Facture</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.invoice_number_start ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Langue</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.language ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Fuseau horaire</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.timezone ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Format de date</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.date_format ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Format de nombre</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.number_format ?? "-" }}
                </div>
              </div>
            </div>
          </div>
          <!-- Stock -->
          <div class="mb-8 px-8">
            <h3
              class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-archive-box"
                class="w-6 h-6 text-blue-400"
              />
              Gestion du stock
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Seuil bas de stock</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.low_stock_threshold ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Seuil critique de stock</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.critical_stock_threshold ?? "-" }}
                </div>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Alertes de stock</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.enable_stock_alerts ? "Oui" : "Non" }}
                </div>
              </div>
            </div>
          </div>
          <!-- Sécurité -->
          <div class="mb-8 px-8">
            <h3
              class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-lock-closed"
                class="w-6 h-6 text-blue-400"
              />
              Sécurité
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Double authentification</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.enable_two_factor ? "Oui" : "Non" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Longueur min. mot de passe</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.password_min_length ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Timeout session (min)</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.session_timeout ?? "-" }}
                </div>
              </div>
            </div>
          </div>
          <!-- Notifications -->
          <div class="mb-8 px-8">
            <h3
              class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-bell" class="w-6 h-6 text-blue-400" />
              Notifications
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Notifications email</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.enable_email_notifications ? "Oui" : "Non" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Rappels de facture</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.enable_invoice_reminders ? "Oui" : "Non" }}
                </div>
              </div>
            </div>
          </div>
          <!-- Sauvegarde -->
          <div class="mb-8 px-8">
            <h3
              class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-6 h-6 text-blue-400"
              />
              Sauvegarde
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Sauvegarde automatique</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.enable_auto_backup ? "Oui" : "Non" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Fréquence sauvegarde</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.backup_frequency ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Rétention sauvegarde (jours)</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  {{ settings.backup_retention ?? "-" }}
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Logo de la société</label
                >
                <CompanyLogo
                  :class="'flex justify-start'"
                  :company-id="settings.id"
                  :size="50"
                />
              </div>
            </div>
          </div>
          <!-- Dernière modification -->
          <div class="mb-8 px-8">
            <h3
              class="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2"
            >
              <UIcon name="i-heroicons-clock" class="w-6 h-6 text-blue-400" />
              Dernière modification
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Date</label
                >
                <div
                  class="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-800"
                >
                  <span v-if="settings.updated_at">{{
                    new Date(settings.updated_at).toLocaleString()
                  }}</span>
                  <span v-else>-</span>
                </div>
              </div>
            </div>
          </div>
          <div
            class="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200 px-8"
          >
            <UButton
              size="lg"
              color="primary"
              icon="i-heroicons-pencil-square"
              class="rounded-full shadow-md px-6 py-2 font-bold text-base"
              @click="goToEdit"
            >
              Modifier la société
            </UButton>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="flex flex-col items-center py-16">
      <UIcon
        name="i-heroicons-information-circle"
        class="w-10 h-10 text-blue-400 mb-2"
      />
      <span class="text-lg text-gray-500"
        >Aucune information de société trouvée.</span
      >
    </div>
  </div>
</template>
