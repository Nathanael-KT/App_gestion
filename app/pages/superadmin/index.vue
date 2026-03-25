<template>
  <div class="w-full max-w-7xl mx-auto px-2 py-8">
    <div
      class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 w-full max-w-full"
    >
      <div>
        <h1 class="text-3xl font-extrabold text-blue-700 mb-1">
          Gestion des compagnies
        </h1>
        <p class="text-gray-500">
          Créez, modifiez et configurez vos compagnies depuis cet espace dédié
          superadmin.
        </p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        size="lg"
        class="shadow-lg"
        @click="showCreateForm = true"
      >
        Créer une compagnie
      </UButton>
    </div>

    <!-- Affichage des compagnies -->
    <CompanyCard />

    <!-- Modal de création de compagnie -->
    <UModal v-model:open="showCreateForm">
      <template #content>
        <div class="p-4">
          <h3 class="text-lg font-bold mb-4">Créer une nouvelle compagnie</h3>
          <form @submit.prevent="createCompany">
            <UFormField label="Nom" class="mb-6">
              <div class="flex flex-col gap-6">
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Nom de la compagnie</label
                  >
                  <UInput
                    v-model="createForm.company_name"
                    class="w-full h-4 text-base"
                  />
                </div>
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Téléphone de la compagnie</label
                  >
                  <UInput
                    v-model="createForm.company_phone"
                    type="string"
                    class="w-full h-4 text-base"
                  />
                </div>
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Adresse de la compagnie</label
                  >
                  <UInput
                    v-model="createForm.company_address"
                    class="w-full h-4 text-base"
                  />
                </div>
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Email de la compagnie</label
                  >
                  <UInput
                    v-model="createForm.company_email"
                    type="email"
                    class="w-full h-4 text-base"
                  />
                </div>
                <div>
                  <label class="block text-sm font-light text-gray-700 mb-1"
                    >Logo de la compagnie</label
                  >c
                  <input
                    type="file"
                    accept="image/*"
                    class="w-full border rounded p-2"
                    @change="
                      (e) => {
                        const target = e.target as HTMLInputElement;
                        createForm.logo_file =
                          target && target.files && target.files[0]
                            ? target.files[0]
                            : null;
                      }
                    "
                  />
                </div>
              </div>
            </UFormField>
            <div class="flex justify-end gap-2 mt-4">
              <UButton type="submit" color="success" icon="i-heroicons-check">
                Créer
              </UButton>
              <UButton
                type="button"
                color="neutral"
                icon="i-heroicons-x-mark"
                @click="showCreateForm = false"
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
import { ref } from "vue";
import { useSupabaseClient } from "#imports";
import CompanyCard from "../../components/CompanyCard.vue";
import { z } from "zod";

const showCreateForm = ref(false);
const createForm = ref({
  company_name: "",
  company_phone: "",
  company_address: "",
  company_email: "",
  logo_file: null as File | null,
});
const error = ref("");
const loading = ref(false);
const supabase = useSupabaseClient() as any;

const CompanySettingsSchema = z.object({
  company_name: z.string(),
  company_phone: z.string(),
  company_email: z.string().email(),
  company_address: z.string(),
});

async function createCompany() {
  error.value = "";
  const parse = CompanySettingsSchema.safeParse(createForm.value);
  if (!parse.success) {
    error.value = "Données invalides";
    return;
  }
  loading.value = true;
  let logoUrl = "";
  if (createForm.value.logo_file) {
    try {
      // Création de la compagnie pour récupérer l'id
      const { data: insertData, error: insertError } = await supabase
        .from("company_settings")
        .insert([parse.data])
        .select();
      if (insertError || !insertData || !insertData[0]?.id) {
        error.value =
          insertError?.message || "Erreur lors de la création de la compagnie.";
        loading.value = false;
        return;
      }
      const companyId = insertData[0].id;
      // Upload du logo dans le bucket 'logo'
      const fileExt = createForm.value.logo_file.name.split(".").pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `${companyId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("logo")
        .upload(filePath, createForm.value.logo_file, {
          cacheControl: "3600",
          upsert: true,
        });
      if (uploadError) {
        error.value = uploadError.message;
        loading.value = false;
        return;
      }
      logoUrl = supabase.storage.from("logo").getPublicUrl(filePath)
        .data.publicUrl;
      // Mise à jour de la compagnie avec l'URL du logo
      await supabase
        .from("company_settings")
        .update({ logo_url: logoUrl })
        .eq("id", companyId);
      showCreateForm.value = false;
      window.location.reload();
      loading.value = false;
      return;
    } catch {
      error.value = "Erreur lors de l'upload du logo.";
      loading.value = false;
      return;
    }
  } else {
    // Si pas de logo, on insère normalement
    const { error: supaError } = await supabase
      .from("company_settings")
      .insert([parse.data]);
    loading.value = false;
    if (!supaError) {
      showCreateForm.value = false;
      window.location.reload();
    } else {
      error.value = supaError.message;
    }
  }
}
</script>

<style scoped>
/* Ajoutez ici vos styles spécifiques à la page superadmin */
</style>

<!-- ici c'est la page superadmin pour gere les compagnies -->
