<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  VOICE_COMMANDS,
  matchVoiceCommand,
  useVoiceSearch,
  type VoiceCommand,
} from "~/composables/useVoiceSearch";

const open = defineModel<boolean>("open", { default: false });
const router = useRouter();
const { userRoles } = useCurrentUser();

const query = ref("");
const selectedIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const voice = useVoiceSearch();
const { supported: voiceSupported, isListening, transcript, error: voiceError } = voice;

// Commandes visibles selon les rôles de l'utilisateur
const visibleCommands = computed(() =>
  VOICE_COMMANDS.filter(
    (c) => !c.roles || c.roles.some((r) => userRoles.value.includes(r)),
  ),
);

const filtered = computed<VoiceCommand[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return visibleCommands.value;
  // D'abord la commande vocale exacte si elle matche, puis filtrage textuel.
  const matched = matchVoiceCommand(q);
  const list = visibleCommands.value.filter((c) => {
    const hay = (c.label + " " + c.keywords.join(" ")).toLowerCase();
    return hay.includes(q);
  });
  // Place la commande matchée en tête si présente dans la liste filtrée
  if (matched) {
    const reordered = list.filter((c) => c.id !== matched.id);
    return [matched, ...reordered];
  }
  return list;
});

watch(filtered, () => {
  selectedIndex.value = 0;
});

// Quand la transcription vocale est finalisée, on la met dans le champ et
// on exécute automatiquement la commande reconnue.
watch(transcript, (val) => {
  if (val) {
    query.value = val;
  }
});
watch(isListening, (listening) => {
  if (!listening && transcript.value) {
    const cmd = matchVoiceCommand(transcript.value);
    if (cmd) runCommand(cmd);
  }
});

const runCommand = (cmd: VoiceCommand) => {
  open.value = false;
  router.push(cmd.path);
};

const onKeydown = (e: KeyboardEvent) => {
  if (!filtered.value.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % filtered.value.length;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex.value =
      (selectedIndex.value - 1 + filtered.value.length) % filtered.value.length;
  } else if (e.key === "Enter") {
    e.preventDefault();
    const cmd = filtered.value[selectedIndex.value];
    if (cmd) runCommand(cmd);
  }
};

const toggleVoice = () => {
  if (isListening.value) voice.stop();
  else {
    query.value = "";
    voice.start();
  }
};

// Focus le champ à l'ouverture
watch(open, (isOpen) => {
  if (isOpen) {
    query.value = "";
    selectedIndex.value = 0;
    setTimeout(() => inputRef.value?.focus(), 50);
  } else {
    voice.stop();
  }
});
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <div class="p-4">
        <!-- Champ + micro -->
        <div class="flex items-center gap-2 border-b border-gray-200 pb-3">
          <UIcon name="i-lucide-search" class="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Rechercher ou dire une commande..."
            class="flex-1 outline-none text-lg bg-transparent"
            @keydown="onKeydown"
          >
          <UButton
            v-if="voiceSupported"
            :color="isListening ? 'error' : 'primary'"
            :variant="isListening ? 'solid' : 'soft'"
            size="sm"
            square
            :aria-label="isListening ? 'Arrêter le micro' : 'Parler'"
            @click="toggleVoice"
          >
            <UIcon
              :name="isListening ? 'i-lucide-mic-off' : 'i-lucide-mic'"
              class="w-5 h-5"
              :class="{ 'animate-pulse': isListening }"
            />
          </UButton>
        </div>

        <!-- Indicateur vocal -->
        <div v-if="isListening" class="py-2 px-1 text-sm text-primary flex items-center gap-2">
          <UIcon name="i-lucide-audio" class="w-4 h-4 animate-pulse" />
          <span>Écoute en cours... {{ voice.interim }}</span>
        </div>
        <p v-else-if="voiceError" class="py-2 px-1 text-sm text-red-600">{{ voiceError }}</p>
        <p v-else-if="transcript" class="py-2 px-1 text-sm text-gray-500">
          Vous avez dit : « {{ transcript }} »
        </p>

        <!-- Liste des commandes -->
        <div class="mt-2 max-h-80 overflow-y-auto">
          <button
            v-for="(cmd, i) in filtered"
            :key="cmd.id"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
            :class="i === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100'"
            @click="runCommand(cmd)"
            @mouseenter="selectedIndex = i"
          >
            <UIcon :name="cmd.icon" class="w-5 h-5 flex-shrink-0" />
            <span class="text-sm font-medium">{{ cmd.label }}</span>
          </button>
          <p v-if="!filtered.length" class="text-center text-sm text-gray-400 py-6">
            Aucune commande trouvée.
          </p>
        </div>

        <!-- Aide -->
        <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
          <span><kbd class="font-mono">↑↓</kbd> naviguer</span>
          <span><kbd class="font-mono">Entrée</kbd> ouvrir</span>
          <span><kbd class="font-mono">Échap</kbd> fermer</span>
          <span v-if="voiceSupported">🎤 dites « caisse », « factures », « nouveau client »...</span>
        </div>
      </div>
    </template>
  </UModal>
</template>
