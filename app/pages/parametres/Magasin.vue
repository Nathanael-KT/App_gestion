<script setup>
import { ref, reactive, onMounted } from "vue";
import { useCurrentUser } from "../../composables/useCurrentUser";

const supabase = useSupabaseClient();
const toast = useToast();
const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  await loadMagasins();
});

// États
const magasins = ref([]);
const loading = ref(false);
const error = ref(null);
const showForm = ref(false);
const editMode = ref(false);
const currentMagasin = reactive({
  id: null,
  nom: "",
  adresse: "",
  telephone: "",
  email: "",
});

// Charger la liste des magasins
const loadMagasins = async () => {
  loading.value = true;
  error.value = null;
  try {
    let data = [];
    let supaError = null;
    if (
      companyId.value &&
      companyId.value !== "null" &&
      companyId.value !== "" &&
      companyId.value !== undefined
    ) {
      const result = await supabase
        .from("magasins")
        .select("id, nom, adresse, telephone, email")
        .eq("company_id", companyId.value); // Filtrer par company_id
      data = result.data;
      supaError = result.error;
    } else {
      supaError = { message: "companyId invalide" };
    }
    if (supaError) throw supaError;
    // Tri côté client pour éviter l'erreur 400
    magasins.value = (data || []).sort((a, b) => a.nom.localeCompare(b.nom));
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// Ouvrir le formulaire pour ajouter
const openAddForm = () => {
  editMode.value = false;
  Object.assign(currentMagasin, {
    id: null,
    nom: "",
    adresse: "",
    telephone: "",
    email: "",
  });
  showForm.value = true;
};

// Ouvrir le formulaire pour éditer
const openEditForm = (magasin) => {
  editMode.value = true;
  Object.assign(currentMagasin, magasin);
  showForm.value = true;
};

// Fermer le formulaire
const closeForm = () => {
  showForm.value = false;
  error.value = null;
};

// Ajouter ou éditer un magasin
const saveMagasin = async () => {
  if (!currentMagasin.nom.trim()) {
    error.value = "Le nom du magasin est obligatoire.";
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    if (editMode.value && currentMagasin.id) {
      // Update
      let updateError = null;
      if (
        companyId.value &&
        companyId.value !== "null" &&
        companyId.value !== "" &&
        companyId.value !== undefined
      ) {
        const result = await supabase
          .from("magasins")
          .update({
            nom: currentMagasin.nom,
            adresse: currentMagasin.adresse,
            telephone: currentMagasin.telephone,
            email: currentMagasin.email,
            company_id: companyId.value,
          })
          .eq("id", currentMagasin.id);
        updateError = result.error;
      } else {
        updateError = { message: "companyId invalide" };
      }
      if (updateError) throw updateError;
      toast.add({
        title: "Modifié",
        description: "Magasin modifié avec succès.",
        color: "green",
      });
    } else {
      // Insert
      let insertError = null;
      if (
        companyId.value &&
        companyId.value !== "null" &&
        companyId.value !== "" &&
        companyId.value !== undefined
      ) {
        const result = await supabase.from("magasins").insert({
          nom: currentMagasin.nom,
          adresse: currentMagasin.adresse,
          telephone: currentMagasin.telephone,
          email: currentMagasin.email,
          company_id: companyId.value,
        });
        insertError = result.error;
      } else {
        insertError = { message: "companyId invalide" };
      }
      if (insertError) throw insertError;
      toast.add({
        title: "Ajouté",
        description: "Magasin ajouté avec succès.",
        color: "green",
      });
    }
    closeForm();
    await loadMagasins();
  } catch (err) {
    error.value = err.message;
    toast.add({ title: "Erreur", description: err.message, color: "red" });
  } finally {
    loading.value = false;
  }
};

// Supprimer un magasin
const deleteMagasin = async (id) => {
  if (!confirm("Confirmer la suppression de ce magasin ?")) return;
  loading.value = true;
  error.value = null;
  try {
    const { error: deleteError } = await supabase
      .from("magasins")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;
    toast.add({
      title: "Supprimé",
      description: "Magasin supprimé.",
      color: "green",
    });
    await loadMagasins();
  } catch (err) {
    error.value = err.message;
    toast.add({ title: "Erreur", description: err.message, color: "red" });
  } finally {
    loading.value = false;
  }
};

onMounted(loadMagasins);
</script>

<template>
  <div class="w-full max-w-7xl mx-auto px-2 py-8">
    <div
      class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 w-full max-w-full"
    >
      <div>
        <h1 class="text-3xl font-extrabold text-blue-700 mb-1">
          Gestion des magasins
        </h1>
        <p class="text-gray-500">
          Créez, modifiez et supprimez vos points de vente facilement.
        </p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        size="lg"
        class="shadow-lg"
        @click="openAddForm"
      >
        Ajouter un magasin
      </UButton>
    </div>

    <UAlert v-if="error" color="red" :title="error" class="mb-4" />

    <div v-if="loading" class="flex flex-col items-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mb-4"
      />
      <p class="text-lg text-blue-700">Chargement des magasins...</p>
    </div>

    <div v-else>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white rounded-xl shadow-lg">
          <thead class="bg-gradient-to-r from-blue-100 to-blue-200">
            <tr>
              <th class="px-6 py-3 text-left font-semibold text-blue-700">
                Nom
              </th>
              <th class="px-6 py-3 text-left font-semibold text-blue-700">
                Adresse
              </th>
              <th class="px-6 py-3 text-left font-semibold text-blue-700">
                Téléphone
              </th>
              <th class="px-6 py-3 text-left font-semibold text-blue-700">
                Email
              </th>
              <th class="px-6 py-3 text-center font-semibold text-blue-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="magasin in magasins"
              :key="magasin.id"
              class="hover:bg-blue-50 transition"
            >
              <td class="px-6 py-4 text-gray-900 font-medium">
                {{ magasin.nom }}
              </td>
              <td class="px-6 py-4 text-gray-700">{{ magasin.adresse }}</td>
              <td class="px-6 py-4 text-gray-700">{{ magasin.telephone }}</td>
              <td class="px-6 py-4 text-gray-700">{{ magasin.email }}</td>
              <td class="px-6 py-4 text-center flex gap-2 justify-center">
                <UButton
                  icon="i-heroicons-pencil"
                  color="primary"
                  variant="soft"
                  size="sm"
                  class="rounded-full"
                  @click="openEditForm(magasin)"
                  >Modifier</UButton
                >
                <UButton
                  icon="i-heroicons-trash"
                  color="red"
                  variant="soft"
                  size="sm"
                  class="rounded-full"
                  @click="deleteMagasin(magasin.id)"
                  >Supprimer</UButton
                >
                <UButton
                  icon="i-heroicons-arrow-path"
                  color="blue"
                  variant="soft"
                  size="sm"
                  class="rounded-full"
                  @click="switchMagasin(magasin.id)"
                  >Basculer</UButton
                >
              </td>
            </tr>
            <tr v-if="magasins.length === 0">
              <td colspan="5" class="text-center py-6 text-gray-400 text-lg">
                Aucun magasin trouvé.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Formulaire modal -->
    <UModal
      v-model:open="showForm"
      :title="editMode ? 'Modifier un magasin' : 'Ajouter un magasin'"
      description="Saisissez les informations du magasin."
      :close="{ color: 'primary', variant: 'soft' }"
      close-icon="i-lucide-x"
      :overlay="true"
      :transition="true"
      :fullscreen="false"
      :dismissible="true"
      class="rounded-xl shadow-2xl"
    >
      <template #body>
        <form class="space-y-6" @submit.prevent="saveMagasin">
          <UFormGroup label="Nom du magasin" required>
            <UInput
              v-model="currentMagasin.nom"
              placeholder="Nom du magasin"
              size="lg"
              class="rounded-lg"
            />
          </UFormGroup>
          <UFormGroup label="Adresse">
            <UInput
              v-model="currentMagasin.adresse"
              placeholder="Adresse"
              size="lg"
              class="rounded-lg"
            />
          </UFormGroup>
          <UFormGroup label="Téléphone">
            <UInput
              v-model="currentMagasin.telephone"
              placeholder="Téléphone"
              size="lg"
              class="rounded-lg"
            />
          </UFormGroup>
          <UFormGroup label="Email">
            <UInput
              v-model="currentMagasin.email"
              placeholder="Email"
              size="lg"
              class="rounded-lg"
            />
          </UFormGroup>
          <div class="flex justify-end gap-4 mt-8">
            <UButton
              color="gray"
              variant="soft"
              size="lg"
              class="rounded-full"
              @click="closeForm"
              >Annuler</UButton
            >
            <UButton
              color="primary"
              type="submit"
              :loading="loading"
              size="lg"
              class="rounded-full"
            >
              {{ editMode ? "Enregistrer" : "Ajouter" }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
