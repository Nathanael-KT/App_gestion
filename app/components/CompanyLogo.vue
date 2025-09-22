<template>
  <div class="flex justify-center items-center">
    <img
      v-if="logoUrl"
      :src="logoUrl"
      alt="Logo compagnie"
      class="object-contain rounded"
      :style="{
        height: logoSize + 'px',
        maxWidth: logoSize * 2 + 'px',
      }"
    >
    <div
      v-else
      class="flex items-center justify-center border rounded text-gray-400 text-xs"
      :style="{
        height: size + 'px',
        width: size + 'px',
      }"
    >
      Pas de logo
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useSupabaseClient } from "#imports";

const props = defineProps<{
  companyId: string;
  expireIn?: number;
  size?: number; // taille en pixels
}>();

// valeur par défaut si size n’est pas fourni
const logoSize = computed(() => props.size ?? 64);

const supabase = useSupabaseClient();
const logoUrl = ref<string | null>(null);

async function fetchSignedLogo() {
  if (!props.companyId) {
    logoUrl.value = null;
    return;
  }

  const possiblePaths = [
    `${props.companyId}/logo.jpg`,
    `${props.companyId}/logo.png`,
    `${props.companyId}/logo.jpeg`,
  ];

  let signedUrl: string | null = null;

  for (const path of possiblePaths) {
    const { data, error } = await supabase.storage
      .from("logo")
      .createSignedUrl(path, props.expireIn || 60 * 60);

    if (!error && data?.signedUrl) {
      signedUrl = data.signedUrl;
      break;
    }
  }

  logoUrl.value = signedUrl;
}

onMounted(fetchSignedLogo);
watch(() => props.companyId, fetchSignedLogo);
</script>
