import { describe, it, expect } from "vitest";
import {
  evaluateSubscriptionAccess,
  computeBlockedMenus,
  SUBSCRIPTION_GRACE_PERIOD_DAYS,
  ALL_APP_MENUS,
} from "../app/utils/subscriptionAccess";

const NOW = new Date("2026-08-21T12:00:00Z");

describe("evaluateSubscriptionAccess (issue #89)", () => {
  it("aucun abonnement → payment_required (nouvelle entreprise)", () => {
    expect(evaluateSubscriptionAccess(null, NOW)).toBe("payment_required");
    expect(evaluateSubscriptionAccess(undefined, NOW)).toBe(
      "payment_required",
    );
  });

  it("abonnement inactif / jamais payé → payment_required", () => {
    expect(
      evaluateSubscriptionAccess({ is_paid: false, status: "inactif" }, NOW),
    ).toBe("payment_required");
  });

  it("en attente de paiement → payment_required", () => {
    expect(
      evaluateSubscriptionAccess(
        { is_paid: false, status: "en_attente", next_due_date: "2026-08-20" },
        NOW,
      ),
    ).toBe("payment_required");
  });

  it("payé et échéance future → granted", () => {
    expect(
      evaluateSubscriptionAccess(
        { is_paid: true, status: "actif", next_due_date: "2026-09-28" },
        NOW,
      ),
    ).toBe("granted");
  });

  it("payé et échéance = aujourd'hui → granted", () => {
    expect(
      evaluateSubscriptionAccess(
        { is_paid: true, status: "actif", next_due_date: "2026-08-21" },
        NOW,
      ),
    ).toBe("granted");
  });

  it("échéance dépassée mais dans le jour de grâce → granted", () => {
    // échéance hier : encore dans la grâce de SUBSCRIPTION_GRACE_PERIOD_DAYS
    expect(
      evaluateSubscriptionAccess(
        {
          is_paid: true,
          status: "actif",
          next_due_date: "2026-08-20",
        },
        NOW,
      ),
    ).toBe("granted");
    expect(SUBSCRIPTION_GRACE_PERIOD_DAYS).toBe(1);
  });

  it("échéance dépassée au-delà du jour de grâce → overdue", () => {
    expect(
      evaluateSubscriptionAccess(
        { is_paid: true, status: "actif", next_due_date: "2026-08-19" },
        NOW,
      ),
    ).toBe("overdue");
  });

  it("mois non payé après échéance → overdue (pas d'accès)", () => {
    // Cas typique issue #89 : is_paid encore true (dernier mois payé) mais
    // la nouvelle échéance est largement dépassée.
    expect(
      evaluateSubscriptionAccess(
        { is_paid: true, status: "en_attente", next_due_date: "2026-08-01" },
        NOW,
      ),
    ).toBe("overdue");
  });

  it("abonnement bloqué → blocked", () => {
    expect(
      evaluateSubscriptionAccess(
        { is_paid: false, status: "bloque", next_due_date: "2026-08-01" },
        NOW,
      ),
    ).toBe("blocked");
  });

  it("payé sans échéance connue (activation manuelle) → granted", () => {
    expect(
      evaluateSubscriptionAccess(
        { is_paid: true, status: "actif", next_due_date: null },
        NOW,
      ),
    ).toBe("granted");
  });

  it("période gratuite accordée par le super_admin → granted tant que l'échéance est future", () => {
    expect(
      evaluateSubscriptionAccess(
        { is_paid: true, status: "actif", next_due_date: "2026-08-28" },
        NOW,
      ),
    ).toBe("granted");
    // … puis overdue une fois la période offerte dépassée
    expect(
      evaluateSubscriptionAccess(
        { is_paid: true, status: "actif", next_due_date: "2026-08-10" },
        NOW,
      ),
    ).toBe("overdue");
  });
});

describe("computeBlockedMenus", () => {
  it("null ou vide → aucun menu bloqué (tous accessibles)", () => {
    expect(computeBlockedMenus(null)).toEqual([]);
    expect(computeBlockedMenus(undefined)).toEqual([]);
    expect(computeBlockedMenus([])).toEqual([]);
  });

  it("offre restreinte → seuls les menus non inclus sont bloqués", () => {
    const blocked = computeBlockedMenus([
      "Accueil",
      "Stock",
      "Clients",
      "Commandes",
      "Facture",
      "Paramètres",
      "Aide",
    ]);
    expect(blocked).toEqual([
      "Caisse",
      "Utilisateurs",
      "Rapports",
      "Discussion",
    ]);
    // Tous les menus connus sont soit autorisés, soit bloqués (pas de perte)
    expect(blocked.length + 7).toBe(ALL_APP_MENUS.length);
  });

  it("tous les menus autorisés → aucun blocage", () => {
    expect(computeBlockedMenus([...ALL_APP_MENUS])).toEqual([]);
  });

  it("les valeurs inconnues sont ignorées", () => {
    const blocked = computeBlockedMenus(["Accueil", "MenuQuiNexistePas"]);
    expect(blocked).not.toContain("MenuQuiNexistePas");
    expect(blocked).toContain("Stock");
    expect(blocked).not.toContain("Accueil");
  });
});
