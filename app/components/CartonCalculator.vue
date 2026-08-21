<!-- components/CartonCalculator.vue -->
<script setup>
import { calculateCartons } from "~/utils/cartonCalculator";

defineProps({
  product: {
    type: Object,
    required: true,
  },
  showOnlyConditionnement: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <span v-if="showOnlyConditionnement">
    {{ calculateCartons(product).conditionnementCalculer.toFixed(2) }} m²
  </span>
  <span v-else>
    {{ calculateCartons(product).totalCartons }} cartons et
    {{ calculateCartons(product).remainingPieces }} pièces
  </span>
</template>
