import { describe, it, expect } from "vitest";
import { useRoles } from "../app/composables/useRoles";

describe("useRoles", () => {
  const {
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    getUserPermissions,
    isAdmin,
    isMagasinier,
    isEmploye,
    getHighestRole,
    validateRoles,
    getRoleLabel,
    getRoleColor,
  } = useRoles();

  describe("hasRole / hasAnyRole / hasAllRoles", () => {
    it("hasRole détecte correctement la présence d'un rôle", () => {
      expect(hasRole(["admin", "employe"], "admin")).toBe(true);
      expect(hasRole(["employe"], "admin")).toBe(false);
      expect(hasRole([], "admin")).toBe(false);
    });

    it("hasAnyRole retourne true si au moins un rôle correspond", () => {
      expect(hasAnyRole(["employe"], ["admin", "employe"])).toBe(true);
      expect(hasAnyRole(["magasinier"], ["admin", "employe"])).toBe(false);
    });

    it("hasAllRoles exige la présence de tous les rôles requis", () => {
      expect(hasAllRoles(["admin", "employe"], ["admin", "employe"])).toBe(
        true
      );
      expect(hasAllRoles(["admin"], ["admin", "employe"])).toBe(false);
    });
  });

  describe("hasPermission — vérification d'accès module/action (sécurité)", () => {
    it("admin a le droit de supprimer des utilisateurs", () => {
      expect(hasPermission(["admin"], "users", "delete")).toBe(true);
    });

    it("employe n'a PAS le droit de supprimer des utilisateurs", () => {
      expect(hasPermission(["employe"], "users", "delete")).toBe(false);
    });

    it("magasinier n'a pas accès en écriture aux factures", () => {
      // magasinier n'a aucune permission déclarée sur le module "invoices"
      expect(hasPermission(["magasinier"], "invoices", "create")).toBe(
        false
      );
    });

    it("employe peut créer des factures mais pas les mettre à jour", () => {
      expect(hasPermission(["employe"], "invoices", "create")).toBe(true);
      expect(hasPermission(["employe"], "invoices", "update")).toBe(false);
    });

    it("un utilisateur sans rôle connu n'a aucune permission", () => {
      expect(hasPermission(["role_inexistant"], "products", "read")).toBe(
        false
      );
      expect(hasPermission([], "products", "read")).toBe(false);
    });

    it("cumule les permissions de plusieurs rôles", () => {
      // employe seul ne peut pas supprimer, mais avec admin en plus, oui
      expect(
        hasPermission(["employe", "admin"], "clients", "delete")
      ).toBe(true);
    });
  });

  describe("getUserPermissions — fusion des permissions", () => {
    it("fusionne les actions sans doublon pour un utilisateur multi-rôles", () => {
      const perms = getUserPermissions(["employe", "magasinier"]);
      const productsPerm = perms.find((p) => p.module === "products");

      expect(productsPerm).toBeDefined();
      // employe: read ; magasinier: create, read, update -> fusion sans doublon
      expect(productsPerm!.actions.sort()).toEqual(
        ["create", "read", "update"].sort()
      );
    });

    it("retourne un tableau vide pour un utilisateur sans rôle valide", () => {
      expect(getUserPermissions([])).toEqual([]);
    });
  });

  describe("isAdmin / isMagasinier / isEmploye", () => {
    it("identifie correctement chaque rôle", () => {
      expect(isAdmin(["admin"])).toBe(true);
      expect(isAdmin(["employe"])).toBe(false);
      expect(isMagasinier(["magasinier"])).toBe(true);
      expect(isEmploye(["employe"])).toBe(true);
    });
  });

  describe("getHighestRole — hiérarchie pour l'affichage", () => {
    it("priorise admin sur les autres rôles", () => {
      const role = getHighestRole(["employe", "admin", "magasinier"]);
      expect(role?.value).toBe("admin");
    });

    it("retourne magasinier si pas admin", () => {
      const role = getHighestRole(["employe", "magasinier"]);
      expect(role?.value).toBe("magasinier");
    });

    it("retourne null si aucun rôle valide", () => {
      expect(getHighestRole([])).toBeNull();
      expect(getHighestRole(["role_inconnu"])).toBeNull();
    });
  });

  describe("validateRoles", () => {
    it("valide une liste de rôles connus", () => {
      expect(validateRoles(["admin", "employe"])).toBe(true);
    });

    it("rejette une liste contenant un rôle inconnu", () => {
      expect(validateRoles(["admin", "role_bidon"])).toBe(false);
    });

    it("une liste vide est considérée valide (aucun rôle invalide)", () => {
      expect(validateRoles([])).toBe(true);
    });
  });

  describe("getRoleLabel / getRoleColor — affichage", () => {
    it("retourne le libellé français attendu", () => {
      expect(getRoleLabel("admin")).toBe("Administrateur");
      expect(getRoleLabel("magasinier")).toBe("Magasinier");
    });

    it("retourne la valeur brute si le rôle est inconnu", () => {
      expect(getRoleLabel("xyz")).toBe("xyz");
    });

    it("retourne une couleur par défaut pour un rôle inconnu", () => {
      expect(getRoleColor("xyz")).toBe("bg-gray-100 text-gray-800");
    });
  });
});
