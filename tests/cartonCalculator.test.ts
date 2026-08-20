import { describe, it, expect } from "vitest";
import {
  calculateCartons,
  calculateRemainingPieces,
} from "../app/utils/cartonCalculator";

describe("calculateCartons", () => {
  it("calcule le nombre de cartons complets et le conditionnement", () => {
    // 1 carton = 0.5 * 0.5 * 10 pièces = 2.5 m² par carton
    const product = { stock: 10, nbr_pieces: 10, longueur: 0.5, largeur: 0.5 };
    const result = calculateCartons(product);

    expect(result.conditionnementCalculer).toBeCloseTo(2.5);
    expect(result.totalCartons).toBe(4); // 10 / 2.5 = 4
    expect(result.piecesPerCarton).toBe(10);
  });

  it("retourne 0 carton si le stock est inférieur à un conditionnement complet", () => {
    const product = { stock: 1, nbr_pieces: 10, longueur: 0.5, largeur: 0.5 };
    const result = calculateCartons(product);

    expect(result.totalCartons).toBe(0);
  });

  it("ne plante pas et retourne 0 quand les dimensions sont manquantes (bug corrigé)", () => {
    // Avant l'extraction, un produit sans longueur/largeur produisait
    // NaN / Infinity dans le template (division par zéro silencieuse).
    const product = { stock: 10 };
    const result = calculateCartons(product);

    expect(result.totalCartons).toBe(0);
    expect(result.conditionnementCalculer).toBe(0);
    expect(Number.isFinite(result.totalCartons)).toBe(true);
  });

  it("gère un stock à 0", () => {
    const product = { stock: 0, nbr_pieces: 10, longueur: 0.5, largeur: 0.5 };
    const result = calculateCartons(product);

    expect(result.totalCartons).toBe(0);
    expect(result.remainingPieces).toBe(0);
  });

  it("accepte des valeurs numériques fournies en chaîne (cas Supabase/formulaire)", () => {
    const product = {
      stock: "10",
      nbr_pieces: "10",
      longueur: "0.5",
      largeur: "0.5",
    };
    const result = calculateCartons(product);

    expect(result.totalCartons).toBe(4);
  });
});

describe("calculateRemainingPieces", () => {
  it("calcule les pièces restantes après le dernier carton complet", () => {
    // conditionnement = 2.5 m²/carton, 10 pièces/carton -> 0.25 m²/pièce
    // stock = 11 -> 4 cartons (10) + 1 m² restant = 4 pièces restantes
    const product = { stock: 11, nbr_pieces: 10, longueur: 0.5, largeur: 0.5 };
    expect(calculateRemainingPieces(product)).toBe(4);
  });

  it("retourne 0 si nbr_pieces est à 0 ou négatif", () => {
    const product = { stock: 10, nbr_pieces: 0, longueur: 0.5, largeur: 0.5 };
    expect(calculateRemainingPieces(product)).toBe(0);
  });

  it("retourne 0 si le conditionnement est nul (dimensions manquantes)", () => {
    const product = { stock: 10, nbr_pieces: 10 };
    expect(calculateRemainingPieces(product)).toBe(0);
  });

  it("retourne 0 quand le stock correspond exactement à des cartons entiers", () => {
    const product = { stock: 5, nbr_pieces: 10, longueur: 0.5, largeur: 0.5 };
    expect(calculateRemainingPieces(product)).toBe(0);
  });
});
