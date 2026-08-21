<script setup lang="ts">
import { watch } from "vue";

/**
 * Champ de recherche avec micro intégré (recherche vocale contextuelle).
 * S'utilise comme un UInput standard (v-model) et se branche sur le filtre
 * de recherche existant de la page : on dicte un mot, il remplit le champ
 * et filtre la liste (clients, commandes, stock, factures...).
 */
const model = defineModel<string>({ default: "" });

withDefaults(
  defineProps<{
    placeholder?: string;
    icon?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
  }>(),
  {
    placeholder: "Rechercher ou parler...",
    icon: "i-lucide-search",
    size: "lg",
  },
);

const voice = useVoiceSearch();
const supported = voice.supported;
const isListening = voice.isListening;

// La transcription vocale remplit le champ de recherche.
watch(
  () => voice.transcript.value,
  (val) => {
    if (val) model.value = val;
  },
);

const toggle = () => {
  if (isListening.value) {
    voice.stop();
  } else {
    model.value = "";
    voice.start();
  }
};
</script>

<template>
  <UInput
    :model-value="model"
    :placeholder="placeholder"
    :icon="icon"
    :size="size"
    class="w-full"
    @update:model-value="model = $event"
  >
    <template v-if="supported" #trailing>
      <button
        type="button"
        :title="isListening ? 'Arrêter le micro' : 'Recherche vocale'"
        :aria-label="isListening ? 'Arrêter le micro' : 'Recherche vocale'"
        class="flex items-center justify-center ms-1"
        :class="isListening ? 'text-red-500' : 'text-gray-400 hover:text-primary'"
        @click="toggle"
      >
        <UIcon
          :name="isListening ? 'i-lucide-audio-lines' : 'i-lucide-mic'"
          class="w-4 h-4"
          :class="{ 'animate-pulse': isListening }"
        />
      </button>
    </template>
  </UInput>
</template>
