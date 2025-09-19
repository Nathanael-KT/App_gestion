<template>
  <div>
    <div v-if="loading" class="flex justify-center items-center py-8">
      <span class="text-gray-500">Chargement des compagnies...</span>
    </div>
    <div v-if="error" class="text-red-600 text-center mb-4">{{ error }}</div>

    <!-- Liste des compagnies -->
    <div
      v-if="!loading"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-for="settings in companySettingsList"
        :key="settings.id"
        class="bg-white shadow rounded-lg p-6 flex flex-col justify-between"
      >
        <div>
          <h2 class="text-xl font-bold mb-2">{{ settings.company_name }}</h2>
          <div class="mb-2 flex justify-center">
            <CompanyLogo :company-id="settings.id" :size="80" />
          </div>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-2">
          <UButton
            color="primary"
            icon="i-heroicons-eye"
            @click="selectCompany(settings.id)"
          >
            Accéder
          </UButton>
          <UButton
            color="info"
            icon="i-heroicons-inbox"
            @click="configureCompany(settings.id)"
          >
            Configurer
          </UButton>
          <UButton
            color="success"
            icon="i-heroicons-pencil-square"
            @click="editCompany(settings.id)"
          >
            Modifier
          </UButton>
          <UButton
            color="error"
            icon="i-heroicons-trash"
            @click="deleteCompany(settings.id)"
          >
            Supprimer
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal de suppression -->
    <UModal
      v-model:open="deletingCompany"
      title="Confirmer la suppression"
      :description="
        hasMagasinForCompany(deletingCompanyId || '')
          ? 'Impossible de supprimer cette compagnie car des magasins y sont rattachés.'
          : 'Voulez-vous vraiment supprimer cette compagnie ? Cette action est irréversible.'
      "
    >
      <template #footer>
        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" @click="cancelDelete">Annuler</UButton>
          <UButton
            color="error"
            :disabled="hasMagasinForCompany(deletingCompanyId || '')"
            @click="confirmDelete"
          >
            Supprimer
          </UButton>
        </div>

        <!-- Message si la compagnie a encore des magasins -->
        <div
          v-if="hasMagasinForCompany(deletingCompanyId || '')"
          class="text-red-600 mt-2 text-sm"
        >
          <p>
            Cette compagnie ne peut pas être supprimée car des magasins y sont
            actuellement associés.<br >
            Veuillez d'abord dissocier ou supprimer les magasins liés avant de
            poursuivre la suppression.
          </p>
        </div>

        <!-- Message d'erreur générique -->
        <div v-else-if="deleteError" class="text-red-600 mt-2 text-sm">
          {{ deleteError }}
        </div>
      </template>
    </UModal>

    <!-- Modal d'édition -->
    <UModal v-model:open="editingCompany">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-bold mb-4">Modifier la compagnie</h3>
          <form @submit.prevent="saveCompany">
            <UFormGroup label="Nom" class="mb-6">
              <div class="flex flex-col gap-6">
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Nom de la compagnie</label
                  >
                  <UInput
                    v-model="editForm.company_name"
                    class="w-full h-4 text-base"
                  />
                </div>
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Téléphone de la compagnie</label
                  >
                  <UInput
                    v-model="editForm.company_phone"
                    type="string"
                    class="w-full h-4 text-base"
                  />
                </div>
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Adresse de la compagnie</label
                  >
                  <UInput
                    v-model="editForm.company_address"
                    class="w-full h-4 text-base"
                  />
                </div>
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Email de la compagnie</label
                  >
                  <UInput
                    v-model="editForm.company_email"
                    type="email"
                    class="w-full h-4 text-base"
                  />
                </div>
              </div>
            </UFormGroup>
            <div>
              <label class="block text-sm font-light text-gray-700 mb-1"
                >Logo de la compagnie</label
              >
              <input
                type="file"
                accept="image/*"
                class="w-full border rounded p-2"
                @change="onLogoFileChange"
              >
              <div class="mt-2 flex justify-center">
                <img
                  v-if="editForm.logo_preview"
                  :src="editForm.logo_preview"
                  class="h-20 w-auto object-contain rounded"
                >
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <UButton type="submit" color="success" icon="i-heroicons-check"
                >Enregistrer</UButton
              >
              <UButton
                type="button"
                color="neutral"
                icon="i-heroicons-x-mark"
                @click="cancelEdit"
                >Annuler</UButton
              >
            </div>
          </form>
          <div v-if="error" class="text-red-600 mt-2">{{ error }}</div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useMagasinStore } from "../composables/useMagasinStore";
import { ref, onMounted } from "vue";
import { useSupabaseClient } from "#imports";
import { z } from "zod";

const magasinStore = useMagasinStore();

function hasMagasinForCompany(companyId: string): boolean {
  return magasinStore.magasins.some((m) => m.company_id === companyId);
}

const CompanySettingsSchema = z.object({
  id: z.string(),
  company_name: z.string(),
  company_phone: z.string().nullable(),
  company_email: z.string().email().nullable(),
  company_address: z.string().nullable(),
});

type CompanySettings = z.infer<typeof CompanySettingsSchema> & {
  logo_url?: string | null;
};

const supabase = useSupabaseClient<CompanySettings>();
const companySettingsList = ref<CompanySettings[]>([]);
const editingCompany = ref(false);
const editingCompanyId = ref<string | null>(null);
const deletingCompany = ref(false);
const deletingCompanyId = ref<string | null>(null);

const editForm = ref<
  Partial<CompanySettings> & { logo_file?: File | null; logo_preview?: string }
>({
  logo_file: null,
  logo_preview: "",
});

const deleteError = ref("");
const loading = ref(false);
const error = ref("");

// Charger les compagnies + logo signé
async function fetchCompanySettings() {
  loading.value = true;
  error.value = "";
  const { data, error: supaError } = await supabase
    .from("company_settings")
    .select();

  if (!supaError && Array.isArray(data)) {
    const parsedData = data
      .map((item) => {
        const parse = CompanySettingsSchema.safeParse(item);
        return parse.success ? parse.data : null;
      })
      .filter(Boolean) as CompanySettings[];

    companySettingsList.value = parsedData;
  } else {
    error.value = supaError?.message || "Erreur lors du chargement";
  }
  loading.value = false;
}

function cancelDelete() {
  deletingCompany.value = false;
  deletingCompanyId.value = null;
  deleteError.value = "";
}

function selectCompany(id: string) {
  navigateTo(`/superadmin/company/${id}`);
}

function configureCompany(id: string) {
  navigateTo(`/superadmin/settings/${id}`);
}

function editCompany(id: string) {
  const settings = companySettingsList.value.find((s) => s.id === id);
  if (settings) {
    editingCompany.value = true;
    editingCompanyId.value = id;
    editForm.value = {
      ...settings,
      logo_file: null,
      logo_preview: settings.logo_url || "",
    };
  }
}

function deleteCompany(id: string) {
  deletingCompany.value = true;
  deletingCompanyId.value = id;
}

function confirmDelete() {
  if (deletingCompanyId.value) {
    performDeleteCompany(deletingCompanyId.value);
  }
}

// Suppression
const performDeleteCompany = async (id: string) => {
  if (!id) return;

  // 1. Supprimer la compagnie en base
  const { error: supaError } = await supabase
    .from("company_settings")
    .delete()
    .eq("id", id);

  if (!supaError) {
    // 2. Supprimer le logo associé dans le bucket
    try {
      // Lister les fichiers du dossier {companyId}/
      const { data: files, error: listError } = await supabase.storage
        .from("logo")
        .list(id, { limit: 100 });

      if (!listError && files && files.length > 0) {
        // Construire les chemins complets
        const paths = files.map((f) => `${id}/${f.name}`);

        // Supprimer tous les fichiers
        const { error: removeError } = await supabase.storage
          .from("logo")
          .remove(paths);

        if (removeError) {
          console.error(
            "Erreur lors de la suppression des fichiers logo:",
            removeError.message
          );
        }
      }
    } catch (err) {
      console.error("Erreur interne suppression bucket:", err);
    }

    // 3. Rafraîchir la liste
    await fetchCompanySettings();
    deletingCompany.value = false;
    deletingCompanyId.value = null;
    deleteError.value = "";
  } else {
    // Gestion des erreurs contraintes FK
    if (
      supaError.message.includes("violates foreign key constraint") ||
      supaError.message.includes("magasins_company_id_fkey")
    ) {
      deleteError.value =
        "Impossible de supprimer cette compagnie car elle possède des magasins rattachés.";
    } else {
      deleteError.value = supaError.message;
    }
  }
};

// Edition / Upload logo
function onLogoFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] || null;
  if (file) {
    editForm.value.logo_file = file;
    editForm.value.logo_preview = URL.createObjectURL(file);
  }
}

async function saveCompany() {
  if (!editingCompany.value || !editingCompanyId.value) return;
  const parse = CompanySettingsSchema.safeParse(editForm.value);
  if (!parse.success) {
    error.value = "Données invalides";
    return;
  }

  const updateData: Partial<CompanySettings> & { logo_url?: string } = {
    ...parse.data,
  };

  let logoUrl = "";
  if (editForm.value.logo_file) {
    try {
      const fileExt = editForm.value.logo_file.name.split(".").pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `${editingCompanyId.value}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("logo")
        .upload(filePath, editForm.value.logo_file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        error.value = uploadError.message;
        return;
      }

      const { data: signed } = await supabase.storage
        .from("logo")
        .createSignedUrl(filePath, 60 * 60);

      logoUrl = signed?.signedUrl || "";
      updateData.logo_url = logoUrl;
    } catch {
      error.value = "Erreur lors de l'upload du logo.";
      return;
    }
  }

  const { error: supaError } = await supabase
    .from("company_settings")
    .update(updateData)
    .eq("id", editingCompanyId.value);

  if (!supaError) {
    await fetchCompanySettings();
    editingCompany.value = false;
    editingCompanyId.value = null;
  } else {
    error.value = supaError.message;
  }
}

function cancelEdit() {
  editingCompany.value = false;
  editingCompanyId.value = null;
  error.value = "";
}

onMounted(fetchCompanySettings);
</script>
