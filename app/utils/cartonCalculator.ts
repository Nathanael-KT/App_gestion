/**
 * Calcul du nombre de cartons et de pièces restantes disponibles en stock
 * pour un produit vendu au m² et conditionné par cartons.
 *
 * Extrait de app/components/CartonCalculator.vue pour être testable
 * unitairement (voir tests/cartonCalculator.test.ts).
 */

export interface CartonProduct {
  stock?: number | string;
  nbr_pieces?: number | string;
  longueur?: number | string;
  largeur?: number | string;
}

export interface CartonCalculationResult {
  totalCartons: number;
  remainingPieces: number;
  piecesPerCarton: number;
  conditionnementCalculer: number;
}

/**
 * Calcule le conditionnement (surface totale en m² d'un carton complet).
 * Retourne 0 si les données sont invalides/manquantes (au lieu de NaN),
 * pour éviter une division par zéro dans les calculs suivants.
 */
function computeConditionnement(product: CartonProduct): number {
  const nbrPieces = Number(product?.nbr_pieces);
  const longueur = Number(product?.longueur);
  const largeur = Number(product?.largeur);

  if (
    !Number.isFinite(nbrPieces) ||
    !Number.isFinite(longueur) ||
    !Number.isFinite(largeur)
  ) {
    return 0;
  }

  return longueur * largeur * nbrPieces;
}

export function calculateRemainingPieces(product: CartonProduct): number {
  const stock = Number(product?.stock);
  const nbrPieces = Number(product?.nbr_pieces);
  const conditionnementCalculer = Number(
    computeConditionnement(product).toFixed(3)
  );

  if (!Number.isFinite(stock) || nbrPieces <= 0 || conditionnementCalculer <= 0) {
    return 0;
  }

  const remainingStock =
    stock -
    Math.floor(stock / conditionnementCalculer) * conditionnementCalculer;
  const decimalPart = remainingStock / conditionnementCalculer;

  return Math.floor(decimalPart * nbrPieces);
}

export function calculateCartons(
  product: CartonProduct
): CartonCalculationResult {
  const stock = Number(product?.stock);
  const nbrPieces = Number(product?.nbr_pieces);
  const conditionnementCalculer = computeConditionnement(product);

  const totalCartons =
    Number.isFinite(stock) && conditionnementCalculer > 0
      ? Math.floor(stock / conditionnementCalculer)
      : 0;

  return {
    totalCartons,
    remainingPieces: calculateRemainingPieces(product),
    piecesPerCarton: Number.isFinite(nbrPieces) ? nbrPieces : 0,
    conditionnementCalculer,
  };
}
