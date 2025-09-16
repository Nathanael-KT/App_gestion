<!-- components/CartonCalculator.vue -->
<script setup>
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

const calculateCartons = (product) => {
  const stock = parseFloat(product?.stock);
  const nbr_pieces = parseFloat(product?.nbr_pieces);
  const longueur = parseFloat(product?.longueur);
  const largeur = parseFloat(product?.largeur);
  const conditionnement_calculer = parseFloat(longueur * largeur) * nbr_pieces;

  const totalPieces = Math.floor(stock / conditionnement_calculer);
  const remainingPieces = calculateRemainingPieces(product);

  return {
    totalCartons: totalPieces,
    remainingPieces: remainingPieces,
    piecesPerCarton: nbr_pieces,
    conditionnement_calculer: conditionnement_calculer,
  };
};



const calculateRemainingPieces = (product) => {
  const stock = parseFloat(product?.stock);
  const nbr_pieces = parseFloat(product?.nbr_pieces);
  const longueur = parseFloat(product?.longueur);
  const largeur = parseFloat(product?.largeur);
  const conditionnement_calculer = parseFloat(
    (longueur * largeur * nbr_pieces).toFixed(3)
  );

  if (nbr_pieces <= 0) return 0;

  const remainingStock =
    stock -
    Math.floor(stock / conditionnement_calculer) * conditionnement_calculer;
  const decimalPart = remainingStock / conditionnement_calculer;

  return Math.floor(decimalPart * nbr_pieces);
};
</script>

<template>
  <span v-if="showOnlyConditionnement">
    {{ calculateCartons(product).conditionnement_calculer.toFixed(2) }} m²
  </span>
  <span v-else>
    {{ calculateCartons(product).totalCartons }} cartons et
    {{ calculateCartons(product).remainingPieces }} pièces
  </span>
</template>
