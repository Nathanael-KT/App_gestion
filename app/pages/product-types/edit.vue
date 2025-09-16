<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import ProductTypeForm from "../../../../app/components/ProductTypeForm.vue";
import { fetchProductType, updateProductType } from "@/api/productTypes";

defineOptions({ name: "ProductTypeEdit" }); // Assume these API functions are defined

const route = useRoute();
const router = useRouter();
const toast = useToast();

const productType = ref(null);
const loading = ref(true);
const error = ref(null);

const fetchData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const id = route.params.id;
    productType.value = await fetchProductType(id);
  } catch {
    error.value = "Failed to load product type";
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const handleUpdate = async (data) => {
  loading.value = true;
  error.value = null;

  try {
    await updateProductType(productType.value.id, data);
    toast.success("Product type updated successfully");
    router.push("/product-types");
  } catch {
    error.value = "Failed to update product type";
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="container mx-auto px-4 py-2">
    <h1 class="text-2xl font-bold mb-6">Edit Product Type</h1>

    <div v-if="loading" class="flex justify-center items-center py-8">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
      />
    </div>

    <div
      v-if="error"
      class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded"
    >
      <p>{{ error }}</p>
    </div>

    <ProductTypeForm
      v-if="productType"
      :initial-data="productType"
      @submit="handleUpdate"
    />
  </div>
</template>
