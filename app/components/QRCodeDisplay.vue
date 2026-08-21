<script setup lang="ts">
import QRCode from "qrcode";

const props = withDefaults(defineProps<{ value: string; size?: number }>(), {
  size: 256,
});

const dataUrl = ref("");

const render = async () => {
  if (!props.value) {
    dataUrl.value = "";
    return;
  }
  try {
    dataUrl.value = await QRCode.toDataURL(props.value, {
      width: props.size,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    });
  } catch {
    dataUrl.value = "";
  }
};

watch(() => [props.value, props.size], render, { immediate: true });
onMounted(render);
</script>

<template>
  <div class="inline-block bg-white p-3 rounded-xl shadow">
    <img
      v-if="dataUrl"
      :src="dataUrl"
      :width="size"
      :height="size"
      alt="QR code de paiement"
      class="block"
    >
    <div
      v-else
      class="flex items-center justify-center text-gray-400"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin" />
    </div>
  </div>
</template>
