<template>
  <div class="flex justify-center items-center">
    <!-- Show loading skeleton while fetching -->
    <div
      v-if="isLoading"
      class="animate-pulse bg-gray-200 rounded"
      :style="{
        height: logoSize + 'px',
        width: logoSize + 'px',
      }"
    />
    <!-- Show logo if loaded successfully -->
    <img
      v-else-if="logoUrl"
      :src="logoUrl"
      alt="Logo compagnie"
      class="object-contain rounded"
      :style="{
        height: logoSize + 'px',
        maxWidth: logoSize * 2 + 'px',
      }"
    >
    <!-- Show fallback icon only after loading completes and no logo found -->
    <div
      v-else-if="!isLoading && hasAttemptedLoad"
      class="flex items-center justify-center rounded bg-gray-100"
      :style="{
        height: logoSize + 'px',
        width: logoSize + 'px',
      }"
    >
      <UIcon 
        name="i-lucide-building-2" 
        class="text-gray-400"
        :style="{ fontSize: (logoSize * 0.5) + 'px' }"
      />
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
const isLoading = ref(false);
const hasAttemptedLoad = ref(false);

async function fetchSignedLogo() {
  if (!props.companyId) {
    logoUrl.value = null;
    hasAttemptedLoad.value = false;
    return;
  }

  try {
    isLoading.value = true;
    
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
  } catch (error) {
    console.error("Error loading company logo:", error);
    logoUrl.value = null;
  } finally {
    isLoading.value = false;
    hasAttemptedLoad.value = true;
  }
}

onMounted(fetchSignedLogo);
watch(() => props.companyId, fetchSignedLogo);
</script>
