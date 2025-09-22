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

    router.push("/product-types");
  } catch {
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
</template>
