/**
 * Composable pour la gestion des rôles utilisateurs
 */

export interface Role {
  value: string;
  label: string;
  icon: string;
  iconColor: string;
  description: string;
  permissions: string[];
}

export interface Permission {
  module: string;
  actions: string[];
}

export const useRoles = () => {
  // Configuration des rôles
  const roles: Role[] = [
    {
      value: "super_admin",
      label: "Super Administrateur",
      icon: "heroicons:shield-check-20-solid",
      iconColor: "text-amber-600",
      description: "Contrôle total de la plateforme, des compagnies et des accès",
      permissions: [
        "Compagnies",
        "Utilisateurs plateforme",
        "Abonnements",
        "Logs système",
      ],
    },
    {
      value: "admin",
      label: "Administrateur",
      icon: "heroicons:shield-check-20-solid",
      iconColor: "text-red-600",
      description: "Accès complet à toutes les fonctionnalités du système",
      permissions: [
        "Gestion complète",
        "Paramètres système",
        "Utilisateurs",
        "Rapports avancés",
      ],
    },
    {
      value: "magasinier",
      label: "Magasinier",
      icon: "heroicons:cube-20-solid",
      iconColor: "text-blue-600",
      description: "Gestion du stock, réception et expédition des marchandises",
      permissions: ["Stock", "Inventaire", "Commandes", "Livraisons"],
    },
    {
      value: "employe",
      label: "Employé",
      icon: "heroicons:user-20-solid",
      iconColor: "text-green-600",
      description: "Accès de base aux fonctionnalités de consultation et vente",
      permissions: ["Consultation", "Clients", "Factures", "Rapports basiques"],
    },
  ];

  // Permissions détaillées par rôle
  const rolePermissions: Record<string, Permission[]> = {
    super_admin: [
      { module: "users", actions: ["create", "read", "update", "delete"] },
      { module: "companies", actions: ["create", "read", "update", "delete"] },
      { module: "subscriptions", actions: ["create", "read", "update", "delete"] },
      { module: "settings", actions: ["read", "update"] },
      { module: "reports", actions: ["read", "export"] },
    ],
    admin: [
      { module: "users", actions: ["create", "read", "update", "delete"] },
      { module: "products", actions: ["create", "read", "update", "delete"] },
      { module: "orders", actions: ["create", "read", "update", "delete"] },
      { module: "clients", actions: ["create", "read", "update", "delete"] },
      { module: "invoices", actions: ["create", "read", "update", "delete"] },
      { module: "reports", actions: ["read", "export"] },
      { module: "settings", actions: ["read", "update"] },
    ],
    magasinier: [
      { module: "products", actions: ["create", "read", "update"] },
      { module: "stock", actions: ["create", "read", "update"] },
      { module: "orders", actions: ["read", "update"] },
      { module: "deliveries", actions: ["create", "read", "update"] },
      { module: "clients", actions: ["read"] },
      { module: "reports", actions: ["read"] },
    ],
    employe: [
      { module: "products", actions: ["read"] },
      { module: "clients", actions: ["create", "read", "update"] },
      { module: "orders", actions: ["create", "read"] },
      { module: "invoices", actions: ["create", "read"] },
      { module: "reports", actions: ["read"] },
    ],
  };

  /**
   * Obtenir les informations d'un rôle
   */
  const getRoleInfo = (roleValue: string): Role | undefined => {
    return roles.find((role) => role.value === roleValue);
  };

  /**
   * Obtenir le libellé d'un rôle
   */
  const getRoleLabel = (roleValue: string): string => {
    return getRoleInfo(roleValue)?.label || roleValue;
  };

  /**
   * Obtenir l'icône d'un rôle
   */
  const getRoleIcon = (roleValue: string): string => {
    return getRoleInfo(roleValue)?.icon || "heroicons:user-20-solid";
  };

  /**
   * Obtenir la couleur d'un rôle
   */
  const getRoleColor = (roleValue: string): string => {
    const roleColors: Record<string, string> = {
      super_admin: "bg-purple-100 text-purple-800",
      admin: "bg-red-100 text-red-800",
      magasinier: "bg-blue-100 text-blue-800",
      employe: "bg-green-100 text-green-800",
    };
    return roleColors[roleValue] || "bg-gray-100 text-gray-800";
  };

  /**
   * Vérifier si un utilisateur a un rôle spécifique
   */
  const hasRole = (userRoles: string[], requiredRole: string): boolean => {
    return userRoles.includes(requiredRole);
  };

  /**
   * Vérifier si un utilisateur a au moins l'un des rôles requis
   */
  const hasAnyRole = (
    userRoles: string[],
    requiredRoles: string[]
  ): boolean => {
    return requiredRoles.some((role) => userRoles.includes(role));
  };

  /**
   * Vérifier si un utilisateur a tous les rôles requis
   */
  const hasAllRoles = (
    userRoles: string[],
    requiredRoles: string[]
  ): boolean => {
    return requiredRoles.every((role) => userRoles.includes(role));
  };

  /**
   * Vérifier si un utilisateur a une permission spécifique
   */
  const hasPermission = (
    userRoles: string[],
    module: string,
    action: string
  ): boolean => {
    return userRoles.some((role) => {
      const permissions = rolePermissions[role] || [];
      return permissions.some(
        (perm) => perm.module === module && perm.actions.includes(action)
      );
    });
  };

  /**
   * Obtenir toutes les permissions d'un utilisateur
   */
  const getUserPermissions = (userRoles: string[]): Permission[] => {
    const allPermissions: Permission[] = [];

    userRoles.forEach((role) => {
      const permissions = rolePermissions[role] || [];
      permissions.forEach((perm) => {
        const existing = allPermissions.find((p) => p.module === perm.module);
        if (existing) {
          // Fusionner les actions
          perm.actions.forEach((action) => {
            if (!existing.actions.includes(action)) {
              existing.actions.push(action);
            }
          });
        } else {
          allPermissions.push({ ...perm });
        }
      });
    });

    return allPermissions;
  };

  /**
   * Vérifier si un utilisateur est administrateur
   */
  const isSuperAdmin = (userRoles: string[]): boolean => {
    return hasRole(userRoles, "super_admin");
  };

  const isAdmin = (userRoles: string[]): boolean => {
    return hasRole(userRoles, "admin") || isSuperAdmin(userRoles);
  };

  /**
   * Vérifier si un utilisateur est magasinier
   */
  const isMagasinier = (userRoles: string[]): boolean => {
    return hasRole(userRoles, "magasinier");
  };

  /**
   * Vérifier si un utilisateur est employé
   */
  const isEmploye = (userRoles: string[]): boolean => {
    return hasRole(userRoles, "employe");
  };

  /**
   * Obtenir le rôle le plus élevé (pour l'affichage)
   */
  const getHighestRole = (userRoles: string[]): Role | null => {
    const roleHierarchy = ["super_admin", "admin", "magasinier", "employe"];

    for (const roleValue of roleHierarchy) {
      if (userRoles.includes(roleValue)) {
        return getRoleInfo(roleValue) || null;
      }
    }

    return null;
  };

  /**
   * Valider les rôles
   */
  const validateRoles = (rolesToValidate: string[]): boolean => {
    return rolesToValidate.every((role) =>
      roles.some((validRole) => validRole.value === role)
    );
  };

  /**
   * Obtenir les options pour un select de rôles
   */
  const getRoleOptions = () => {
    return [
      { label: "Tous les rôles", value: "" },
      ...roles.map((role) => ({
        label: role.label,
        value: role.value,
      })),
    ];
  };

  return {
    // Données
    roles,
    rolePermissions,

    // Fonctions utilitaires
    getRoleInfo,
    getRoleLabel,
    getRoleIcon,
    getRoleColor,

    // Vérification des rôles
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    getUserPermissions,

    // Raccourcis pour les rôles spécifiques
    isSuperAdmin,
    isAdmin,
    isMagasinier,
    isEmploye,

    // Utilitaires
    getHighestRole,
    validateRoles,
    getRoleOptions,
  };
};
