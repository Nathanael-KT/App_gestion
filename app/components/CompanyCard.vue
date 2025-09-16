<template>
  <div>
    <div v-if="loading" class="flex justify-center items-center py-8">
      <span class="text-gray-500">Chargement des compagnies...</span>
    </div>
    <div v-if="error" class="text-red-600 text-center mb-4">{{ error }}</div>
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
        </div>
        <div class="mt-4 flex gap-2">
          <UButton
            color="primary"
            icon="i-heroicons-eye"
            @click="selectCompany(settings.id)"
          >
            Accéder
          </UButton>
          <UButton
            color="success"
            icon="i-heroicons-pencil-square"
            @click="editCompany(settings.id)"
          >
            Modifier
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal d'édition -->
    <UModal v-model:open="editingCompany">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-bold mb-4">Modifier la compagnie</h3>
          <form @submit.prevent="saveCompany">
            <UFormGroup label="Nom" class="mb-6">
              <div class="flex flex-col gap-6">
              <div>
                <label class="block text-sm font-light text-gray-700 mb-1">Nom de la compagnie</label>
                <UInput v-model="editForm.company_name" class="w-full h-4 text-base" />
              </div>
              <div>
                <label class="block text-sm font-light text-gray-700 mb-1">Téléphone de la compagnie</label>
                <UInput v-model="editForm.company_phone" type="string" class="w-full h-4 text-base" />
              </div>
              <div>
                <label class="block text-sm font-light text-gray-700 mb-1">Adresse de la compagnie</label>
                <UInput v-model="editForm.company_address" class="w-full h-4 text-base" />
              </div>
              <div>
                <label class="block text-sm font-light text-gray-700 mb-1">Email de la compagnie</label>
                <UInput v-model="editForm.company_email" type="email" class="w-full h-4 text-base" />
              </div>
              </div>
            </UFormGroup>
            <div class="flex justify-end gap-2 mt-4">
              <UButton type="submit" color="success" icon="i-heroicons-check">
                Enregistrer
              </UButton>
              <UButton
                type="button"
                color="neutral"
                icon="i-heroicons-x-mark"
                @click="cancelEdit"
              >
                Annuler
              </UButton>
            </div>
          </form>
          <div v-if="error" class="text-red-600 mt-2">{{ error }}</div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSupabaseClient } from "#imports";
import { z } from "zod";

const CompanySettingsSchema = z.object({
  id: z.string(),
   company_name: z.string(),
   company_phone: z.string(),
   company_email: z.string().email(),
  // company_website: z.string().url(),
   company_address: z.string(),
  // company_siret: z.string().min(14).max(14),

  // Ajoute ici d'autres champs si besoin
});

type CompanySettings = z.infer<typeof CompanySettingsSchema>;

const supabase = useSupabaseClient<CompanySettings>();
const companySettingsList = ref<CompanySettings[]>([]);
const editingCompany = ref(false);
const editingCompanyId = ref<string | null>(null);
const editForm = ref<Partial<CompanySettings>>({});
const loading = ref(false);
const error = ref("");

async function fetchCompanySettings() {
  loading.value = true;
  error.value = "";
  const { data, error: supaError } = await supabase
    .from("company_settings")
    .select();
  if (!supaError && Array.isArray(data)) {
    companySettingsList.value = data
      .map((item) => {
        const parse = CompanySettingsSchema.safeParse(item);
        return parse.success ? parse.data : null;
      })
      .filter(Boolean) as CompanySettings[];
  } else {
    error.value = supaError?.message || "Erreur lors du chargement";
  }
  loading.value = false;
}

function selectCompany(id: string) {
  // Ici tu peux router ou changer l'état global pour afficher les données de la compagnie choisie
  void id;
}

function editCompany(id: string) {
  const settings = companySettingsList.value.find((s) => s.id === id);
  if (settings) {
    editingCompany.value = true;
    editingCompanyId.value = id;
    editForm.value = { ...settings };
  }
}

async function saveCompany() {
  if (!editingCompany.value || !editingCompanyId.value) return;
  const parse = CompanySettingsSchema.safeParse(editForm.value);
  if (!parse.success) {
    error.value = "Données invalides";
    return;
  }
  const { error: supaError } = await supabase
    .from("company_settings")
    .update(parse.data)
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

<!-- Les composants UButton, UInput, UFormGroup, UModal doivent être disponibles via Nuxt UI (Nuxt 3 UI). -->

<style scoped></style>
