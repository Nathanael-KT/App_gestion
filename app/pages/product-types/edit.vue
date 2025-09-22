<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast, useSupabaseClient } from "#imports";

defineOptions({ name: "ProductTypeEdit" });

const route = useRoute();
const router = useRouter();
const toast = useToast();
const supabase = useSupabaseClient();

const productType = ref({
  name: "",
  id: null,
});
const loading = ref(true);
const error = ref(null);
const name = ref("");

const fetchData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const id = route.params.id;
    const { data, error: fetchError } = await supabase
      .from("product_types")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    productType.value = data;
    name.value = data.name;
  } catch {
    error.value = "Failed to load product type";
    toast.add({
      title: "Erreur",
      description: error.value,
      color: "red",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    loading.value = false;
  }
};

const handleUpdate = async () => {
  if (!name.value.trim()) {
    toast.add({
      title: "Erreur",
      description: "Le nom est requis",
      color: "red",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const { error: updateError } = await supabase
      .from("product_types")
      .update({ name: name.value.trim() })
      .eq("id", productType.value.id);

    if (updateError) {
      throw updateError;
    }

    toast.add({
      title: "Succès",
      description: "Type de produit modifié avec succès",
      color: "green",
      icon: "i-heroicons-check-circle",
    });
  } catch (err) {
    error.value = "Failed to update product type";
    toast.add({
      title: "Erreur",
      description: error.value,
      color: "red",
      icon: "i-heroicons-x-circle",
    });
    toast.success("Product type updated successfully");
    router.push("/product-types");
  } catch (err) {
    error.value = "Failed to update product type";
    toast.add({
      title: "Erreur",
      description: error.value,
      color: "red",
      icon: "i-heroicons-x-circle",
    });
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="container mx-auto px-4 py-2">
    <h1 class="text-2xl font-bold mb-6">Modifier le Type de Produit</h1>

    <div v-if="loading" class="flex justify-center items-center py-8">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
      />
    </div>

    <UAlert
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="subtle"
      title="Erreur"
      :description="error"
      class="mb-6"
    />

    <UCard v-if="productType && !loading" class="max-w-md">
      <template #header>
        <h3 class="text-lg font-semibold">Informations du Type</h3>
      </template>

      <UFormGroup label="Nom du type" class="mb-4">
        <UInput
          v-model="name"
          placeholder="Entrez le nom du type de produit"
          :disabled="loading"
        />
      </UFormGroup>

      <template #footer>
        <div class="flex gap-2">
          <UButton
            label="Annuler"
            variant="ghost"
            @click="router.push('/product-types')"
          />
          <UButton
            label="Modifier"
            color="primary"
            :loading="loading"
            @click="handleUpdate"
          />
        </div>
      </template>
    </UCard>
  </div>

    <div v-if="!loading && productType.id" class="max-w-md">
      <form class="space-y-4" @submit.prevent="handleUpdate">
        <div>
          <label
            for="name"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Name
          </label>
          <input
            id="name"
            v-model="productType.name"
            type="text"
            required
            class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="loading"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {{ loading ? "Updating..." : "Update" }}
          </button>

          <button
            type="button"
            class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            @click="router.push('/product-types')"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
