<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { v4 as uuidv4 } from "uuid";
import { useCompanySettings } from "../../../composables/useCompanySettings";

const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (companyId.value) await fetchCompanySettings(companyId.value);
});

const route = useRoute();
const productId = route.params.id;

const product = ref({
  name: "",
  stock: "",
  longueur: "",
  largeur: "",
  type_produit: "",
  price: "",
  reference: "",
  description: "",
  nbr_pieces: "",
  unite: "pièce",
  is_surface_product: false,
  image_url: "",
});
const imageFile = ref(null);
const imagePreview = ref("");
const fileInputRef = ref(null);
const imagePath = ref("");
const typeProduits = ref([]);
const loading = ref(false);
const error = ref(null);

const supabase = useSupabaseClient();
const toast = useToast();
const { userRoles } = useCurrentUser();

const uniteOptions = [
  { value: "pièce", label: "Pièce" },
  { value: "m²", label: "Mètre carré (m²)" },
  { value: "ml", label: "Mètre linéaire (ml)" },
  { value: "kg", label: "Kilogramme (kg)" },
  { value: "litre", label: "Litre (L)" },
  { value: "pack", label: "Pack/Lot" },
];

const fetchProductTypes = async () => {
  try {
    const { data, error: fetchError } = await supabase
      .from("product_types")
      .select("id, name");
    if (fetchError) throw fetchError;
    typeProduits.value = data || [];
  } catch (err) {
    error.value =
      err.message || "Erreur lors de la récupération des types de produits.";
    toast.error(error.value);
  }
};

const fetchProduct = async () => {
  loading.value = true;
  try {
    const { data, error: fetchError } = await supabase
      .from("products_carreaux")
      .select("*")
      .eq("id", productId)
      .single();
    if (fetchError) throw fetchError;
    if (!data) throw new Error("Produit introuvable");
    product.value = {
      ...data,
      stock: data.stock?.toString() || "",
      price: data.price?.toString() || "",
      longueur: data.longueur?.toString() || "",
      largeur: data.largeur?.toString() || "",
      nbr_pieces: data.nbr_pieces?.toString() || "",
      is_surface_product: !!(data.longueur && data.largeur),
    };
    imagePath.value = data.image_url || "";
    if (data.image_url) {
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(`product-images/${data.image_url}`);
      imagePreview.value = urlData?.publicUrl || "";
    }
  } catch (err) {
    error.value = err.message || "Erreur lors du chargement du produit.";
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const onTypeChange = () => {
  const selectedType = typeProduits.value.find(
    (type) => type.id === product.value.type_produit
  );
  if (selectedType) {
    const surfaceKeywords = [
      "carreau",
      "dalle",
      "carrelage",
      "parquet",
      "lame",
    ];
    const isSurfaceProduct = surfaceKeywords.some((keyword) =>
      selectedType.name.toLowerCase().includes(keyword)
    );
    if (isSurfaceProduct) {
      product.value.is_surface_product = true;
      product.value.unite = "m²";
    }
  }
};

onMounted(() => {
  fetchProductTypes();
  fetchProduct();
});

const onImageSelected = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast.add({
      title: "Erreur",
      description: "L'image ne doit pas dépasser 5 Mo.",
      icon: "i-heroicons-exclamation-triangle",
      color: "error",
      timeout: 2000,
    });
    return;
  }
  imageFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
};

const updateProduct = async () => {
  loading.value = true;
  error.value = null;
  try {
    if (
      !product.value.name ||
      !product.value.reference ||
      !product.value.description ||
      !product.value.type_produit ||
      !product.value.stock ||
      !product.value.price
    ) {
      throw new Error(
        "Les champs nom, référence, description, type, stock et prix sont obligatoires."
      );
    }
    if (product.value.is_surface_product) {
      if (
        !product.value.longueur ||
        !product.value.largeur ||
        !product.value.nbr_pieces
      ) {
        throw new Error(
          "Pour les produits de surface, les dimensions et le nombre de pièces sont obligatoires."
        );
      }
    }
    const typeExists = typeProduits.value.some(
      (type) => type.id === product.value.type_produit
    );
    if (!typeExists) {
      throw new Error("Le type de produit sélectionné est invalide.");
    }
    if (!supabase) throw new Error("Supabase client non initialisé");
    let imagePathToSave = imagePath.value;
    if (imageFile.value) {
      const file = imageFile.value;
      const fileExt = file.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const storagePath = `product-images/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(storagePath, file, { upsert: true });
      if (uploadError)
        throw new Error("Erreur upload image: " + uploadError.message);
      imagePathToSave = fileName;
    }
    const productData = {
      name: product.value.name,
      reference: product.value.reference,
      description: product.value.description,
      type_produit: product.value.type_produit,
      stock: parseFloat(product.value.stock),
      price: parseFloat(product.value.price),
      unite: product.value.unite,
      image_url: imagePathToSave,
    };
    if (product.value.is_surface_product) {
      productData.longueur = parseFloat(product.value.longueur);
      productData.largeur = parseFloat(product.value.largeur);
      productData.nbr_pieces = parseInt(product.value.nbr_pieces);
    }
    const { error: supabaseError } = await supabase
      .from("products_carreaux")
      .update(productData)
      .eq("id", productId);
    if (supabaseError) throw supabaseError;
    toast.add({
      title: "Succès",
      description: "Produit modifié avec succès.",
      icon: "i-heroicons-check-circle",
      color: "success",
      timeout: 1000,
    });
    await navigateTo("/stock");
  } catch (err) {
    error.value = err.message || "Erreur lors de la modification du produit";
    toast.add({
      title: "Erreur",
      description: error.value,
      icon: "i-heroicons-exclamation-triangle",
      color: "error",
      timeout: 1000,
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="container mx-auto px-4 py-2">
    <div v-if="userRoles?.includes('employe')" class="text-center py-12">
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-16 h-16 text-red-500 mx-auto mb-4"
      />
      <h2 class="text-xl font-bold text-red-600 mb-2">Accès refusé</h2>
      <p class="text-gray-600 mb-4">
        Cette action est réservée aux administrateurs et magasiniers.
      </p>
      <UButton label="Retour" to="/stock" />
    </div>
    <div v-else>
      <UButton
        class="mb-6"
        label="Retour à la liste"
        variant="ghost"
        icon="i-lucide-arrow-left-circle"
        to="/stock"
      />
      <UCard class="bg-white shadow-md rounded-lg p-6">
        <template #header>
          <div>
            <h1 class="text-2xl font-bold text-center sm:text-left">
              Modifier le produit
            </h1>
            <p class="text-gray-600 text-center sm:text-left mt-1">
              Carreaux, robinets, sanitaires et tous types de produits
            </p>
          </div>
        </template>
        <UForm
          class="mt-4"
          :loading="loading"
          :error="error"
          :success="!error && !loading"
          :success-message="'Produit modifié avec succès.'"
          :error-message="error"
          @submit.prevent="updateProduct"
        >
          <UCard variant="subtle" :ui="{ body: 'space-y-4' }">
            <template #header>
              <h3 class="font-semibold text-center sm:text-left">
                Informations de base
              </h3>
            </template>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormField label="Nom du produit" name="nom" required>
                <UInput
                  v-model="product.name"
                  type="text"
                  placeholder="Nom du produit"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Code de référence"
                name="code_reference"
                required
              >
                <UInput
                  v-model="product.reference"
                  placeholder="Code de référence"
                  class="w-full"
                />
              </UFormField>
            </div>
            <UFormField label="Description" name="description" required>
              <UTextarea
                v-model="product.description"
                type="text"
                placeholder="Décrivez le produit..."
                :rows="4"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Photo du produit" name="image">
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="block w-full border rounded p-2"
                @change="onImageSelected"
              />
              <div v-if="imagePreview" class="mt-2">
                <img
                  :src="imagePreview"
                  alt="Aperçu"
                  class="max-h-32 rounded shadow"
                />
              </div>
            </UFormField>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Type de produit" name="type" required>
                <select
                  v-model="product.type_produit"
                  class="bg-white w-full rounded px-3 py-2 border"
                  style="border-color: #f3f4f6"
                  @change="onTypeChange"
                >
                  <option disabled value="">Sélectionnez un type</option>
                  <option
                    v-for="type in typeProduits"
                    :key="type.id"
                    :value="type.id"
                  >
                    {{ type.name }}
                  </option>
                </select>
              </UFormField>
              <UFormField label="Unité de mesure" name="unite" required>
                <select
                  v-model="product.unite"
                  class="bg-white w-full rounded px-3 py-2 border"
                  style="border-color: #f3f4f6"
                >
                  <option
                    v-for="unite in uniteOptions"
                    :key="unite.value"
                    :value="unite.value"
                  >
                    {{ unite.label }}
                  </option>
                </select>
              </UFormField>
            </div>
            <div class="flex items-center space-x-2">
              <input
                id="surface-product"
                v-model="product.is_surface_product"
                type="checkbox"
                class="rounded border-gray-300"
              />
              <label for="surface-product" class="text-sm text-gray-700">
                Ce produit nécessite des dimensions (longueur, largeur) - Ex:
                carreaux, dalles
              </label>
            </div>
          </UCard>
          <UCard class="mt-4" variant="subtle" :ui="{ body: 'space-y-4' }">
            <template #header>
              <h3 class="font-semibold text-center sm:text-left">
                Données du stock
              </h3>
            </template>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField
                :label="`Stock disponible (${product.unite})`"
                name="stock"
                required
              >
                <UInput
                  v-model="product.stock"
                  type="number"
                  step="0.01"
                  :placeholder="`Stock en ${product.unite}`"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                :label="`Prix unitaire (${companySettings?.currency})`"
                name="prix"
                required
              >
                <UInput
                  v-model="product.price"
                  type="number"
                  step="0.01"
                  :placeholder="`Prix unitaire (${companySettings?.currency})`"
                  class="w-full"
                />
              </UFormField>
            </div>
            <div v-if="product.is_surface_product" class="border-t pt-4 mt-4">
              <h4 class="font-medium mb-3 text-gray-700">
                Dimensions et conditionnement
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <UFormField label="Longueur (m)" name="longueur" required>
                  <UInput
                    v-model="product.longueur"
                    type="number"
                    step="0.01"
                    placeholder="Longueur (m)"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Largeur (m)" name="largeur" required>
                  <UInput
                    v-model="product.largeur"
                    type="number"
                    step="0.01"
                    placeholder="Largeur (m)"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="Pièces par carton"
                  name="nombre_pieces"
                  required
                >
                  <UInput
                    v-model="product.nbr_pieces"
                    type="number"
                    placeholder="Nombre de pièces"
                    class="w-full"
                  />
                </UFormField>
              </div>
              <div
                v-if="product.longueur && product.largeur"
                class="mt-3 p-3 bg-blue-50 rounded-lg"
              >
                <p class="text-sm text-blue-800">
                  <strong>Surface par pièce:</strong>
                  {{
                    (
                      parseFloat(product.longueur) * parseFloat(product.largeur)
                    ).toFixed(3)
                  }}
                  m²
                </p>
                <p v-if="product.nbr_pieces" class="text-sm text-blue-800">
                  <strong>Surface par carton:</strong>
                  {{
                    (
                      parseFloat(product.longueur) *
                      parseFloat(product.largeur) *
                      parseInt(product.nbr_pieces)
                    ).toFixed(2)
                  }}
                  m²
                </p>
              </div>
            </div>
          </UCard>
        </UForm>
        <div class="text-2xl flex justify-end mt-6">
          <UButton
            label="Enregistrer les modifications"
            icon="i-lucide-check-check"
            color="primary"
            :disabled="
              loading ||
              !(userRoles.includes('admin') || userRoles.includes('magasinier'))
            "
            :loading="loading"
            size="lg"
            @click="updateProduct"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
