<script setup lang="ts">
import { ref } from "vue";
import { useProductVision, type ProductSuggestion } from "~/composables/useProductVision";

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{
  apply: [suggestion: ProductSuggestion];
}>();

const props = defineProps<{
  currency?: string;
  hint?: string;
}>();

const { analyze } = useProductVision();

const preview = ref<string>("");
const fileInput = ref<HTMLInputElement | null>(null);
const loading = ref(false);
const suggestion = ref<ProductSuggestion | null>(null);
const unavailable = ref<string | null>(null);

const onPick = () => fileInput.value?.click();

const onFile = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    unavailable.value = "Image trop volumineuse (max 5 Mo).";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    preview.value = String(reader.result);
  };
  reader.readAsDataURL(file);
  suggestion.value = null;
  unavailable.value = null;
  await run(file);
};

const run = async (image: File | string) => {
  loading.value = true;
  unavailable.value = null;
  suggestion.value = null;
  const res = await analyze({ image, currency: props.currency, hint: props.hint });
  loading.value = false;
  if (!res) return;
  if (!res.available) {
    unavailable.value = res.message ?? "Service non configuré.";
    return;
  }
  if (res.suggestion) suggestion.value = res.suggestion;
};

const applySuggestion = () => {
  if (suggestion.value) {
    emit("apply", suggestion.value);
    open.value = false;
    reset();
  }
};

const reset = () => {
  preview.value = "";
  suggestion.value = null;
  unavailable.value = null;
  if (fileInput.value) fileInput.value.value = "";
};

watch(open, (isOpen) => {
  if (!isOpen) reset();
});
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <div class="p-5">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-scan-line" class="w-6 h-6 text-primary" />
          <h3 class="text-lg font-bold">Scanner un produit</h3>
        </div>

        <p class="text-sm text-gray-500 mb-4">
          Prenez ou choisissez une photo du produit : l'IA pré-remplit la fiche
          (nom, description, catégorie, prix estimé).
        </p>

        <!-- Zone image -->
        <div
          class="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors"
          @click="onPick"
        >
          <img
            v-if="preview"
            :src="preview"
            alt="Aperçu"
            class="max-h-48 mx-auto rounded-lg shadow"
          >
          <div v-else class="py-8 text-gray-400">
            <UIcon name="i-lucide-camera" class="w-12 h-12 mx-auto mb-2" />
            <p class="text-sm">Cliquez pour prendre ou choisir une photo</p>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          @change="onFile"
        >

        <!-- États -->
        <div v-if="loading" class="mt-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <UIcon name="i-lucide-loader-circle" class="w-4 h-4 animate-spin" />
          Analyse de l'image en cours...
        </div>

        <UAlert
          v-if="unavailable"
          icon="i-lucide-info"
          color="warning"
          variant="subtle"
          :title="unavailable"
          class="mt-4"
        />

        <!-- Résultat -->
        <div v-if="suggestion" class="mt-4 space-y-3">
          <UCard variant="subtle" :ui="{ body: 'space-y-2' }">
            <div class="flex justify-between gap-2">
              <span class="text-xs text-gray-500">Nom</span>
              <span class="font-semibold text-right">{{ suggestion.name }}</span>
            </div>
            <div v-if="suggestion.reference" class="flex justify-between gap-2">
              <span class="text-xs text-gray-500">Référence</span>
              <span class="font-mono text-sm">{{ suggestion.reference }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-xs text-gray-500">Catégorie</span>
              <span>{{ suggestion.category || "—" }}</span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-xs text-gray-500">Prix estimé</span>
              <span class="font-semibold">
                {{ suggestion.estimated_price != null ? `${Number(suggestion.estimated_price).toFixed(2)} ${currency || ""}` : "—" }}
              </span>
            </div>
            <div class="flex justify-between gap-2">
              <span class="text-xs text-gray-500">Unité</span>
              <span>{{ suggestion.unit }}</span>
            </div>
            <div v-if="suggestion.description" class="pt-1">
              <span class="text-xs text-gray-500">Description</span>
              <p class="text-sm text-gray-700">{{ suggestion.description }}</p>
            </div>
          </UCard>

          <div class="flex gap-2">
            <UButton
              color="primary"
              icon="i-lucide-wand-2"
              label="Remplir le formulaire"
              block
              @click="applySuggestion"
            />
            <UButton
              variant="ghost"
              icon="i-lucide-refresh-cw"
              label="Recommencer"
              @click="onPick"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
