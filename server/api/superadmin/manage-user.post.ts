import { createError, defineEventHandler, readBody } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

type ManageAction = "update" | "delete" | "resetPassword";

type ManageUserBody = {
  action?: ManageAction;
  userId?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  roles?: string[];
  magasin_id?: string | null;
  newPassword?: string;
};

const ALLOWED_ROLES = ["admin", "magasinier", "employe", "super_admin"] as const;
const ADMIN_ASSIGNABLE_ROLES = ["admin", "magasinier", "employe"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Service de gestion des utilisateurs (update / delete / resetPassword).
 * Accessible aux admin (leur compagnie) et super_admin (tous les comptes).
 */
export default defineEventHandler(async (event) => {
  const { adminClient, roles, userId: requesterAuthId } = await requireAdmin(
    event,
    ["admin", "super_admin"],
  );

  const isSuperAdmin = roles.includes("super_admin");
  const body = await readBody<ManageUserBody>(event);
  const action = body?.action;
  const targetId = String(body?.userId || "");

  if (!action || !targetId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Action et userId sont requis",
    });
  }

  const { data: target, error: targetError } = await adminClient
    .from("users")
    .select("id, auth_user_id, email, name, phone, roles, company_id, magasin_id")
    .eq("id", targetId)
    .maybeSingle();

  if (targetError || !target) {
    throw createError({
      statusCode: 404,
      statusMessage: "Utilisateur introuvable",
    });
  }

  if (!isSuperAdmin) {
    const { data: requesterProfile } = await adminClient
      .from("users")
      .select("company_id")
      .eq("auth_user_id", requesterAuthId)
      .maybeSingle();

    if (
      !requesterProfile?.company_id ||
      requesterProfile.company_id !== target.company_id
    ) {
      throw createError({
        statusCode: 403,
        statusMessage: "Vous ne pouvez gérer que les utilisateurs de votre compagnie",
      });
    }
  }

  const targetRoles = Array.isArray(target.roles) ? target.roles : [];
  const isTargetSuperAdmin = targetRoles.includes("super_admin");

  if (!isSuperAdmin && isTargetSuperAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Un administrateur ne peut pas gérer un super_admin",
    });
  }

  if (action === "update") {
    const nextRoles = Array.isArray(body.roles) ? body.roles : targetRoles;

    for (const role of nextRoles) {
      if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
        throw createError({
          statusCode: 400,
          statusMessage: `Rôle non autorisé: ${role}`,
        });
      }
      if (
        !isSuperAdmin &&
        !(ADMIN_ASSIGNABLE_ROLES as readonly string[]).includes(role)
      ) {
        throw createError({
          statusCode: 403,
          statusMessage: `Vous ne pouvez pas attribuer le rôle ${role}`,
        });
      }
    }

    if (nextRoles.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Au moins un rôle est requis",
      });
    }

    const nextEmail = body.email ? String(body.email).trim().toLowerCase() : target.email;
    if (!EMAIL_REGEX.test(nextEmail)) {
      throw createError({ statusCode: 400, statusMessage: "Email invalide" });
    }

    const updates: Record<string, unknown> = {
      name: body.name !== undefined ? body.name : target.name,
      email: nextEmail,
      phone: body.phone !== undefined ? body.phone : target.phone,
      roles: nextRoles,
    };

    if (body.magasin_id !== undefined && !isTargetSuperAdmin) {
      updates.magasin_id = body.magasin_id;
    }

    const { error: updateError } = await adminClient
      .from("users")
      .update(updates)
      .eq("id", targetId);

    if (updateError) {
      throw createError({ statusCode: 400, statusMessage: updateError.message });
    }

    if (target.auth_user_id && nextEmail !== target.email) {
      await adminClient.auth.admin.updateUserById(target.auth_user_id, {
        email: nextEmail,
      });
    }

    return { ok: true };
  }

  if (action === "delete") {
    if (target.auth_user_id === requesterAuthId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Vous ne pouvez pas supprimer votre propre compte",
      });
    }

    if (isTargetSuperAdmin) {
      const { data: otherAdmins, error: countError } = await adminClient
        .from("users")
        .select("id")
        .contains("roles", ["super_admin"])
        .neq("id", targetId);

      if (countError) {
        throw createError({ statusCode: 400, statusMessage: countError.message });
      }

      if (!otherAdmins || otherAdmins.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "Impossible de supprimer le dernier super administrateur",
        });
      }
    }

    const { error: deleteProfileError } = await adminClient
      .from("users")
      .delete()
      .eq("id", targetId);

    if (deleteProfileError) {
      throw createError({
        statusCode: 400,
        statusMessage: deleteProfileError.message,
      });
    }

    if (target.auth_user_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
        target.auth_user_id,
      );
      if (deleteAuthError) {
        throw createError({
          statusCode: 400,
          statusMessage: deleteAuthError.message,
        });
      }
    }

    return { ok: true };
  }

  if (action === "resetPassword") {
    const newPassword = String(body.newPassword || "");
    if (newPassword.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: "Le mot de passe doit contenir au moins 8 caractères",
      });
    }

    if (!target.auth_user_id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Ce profil n'est pas lié à un compte d'authentification",
      });
    }

    const { error: passwordError } = await adminClient.auth.admin.updateUserById(
      target.auth_user_id,
      { password: newPassword },
    );

    if (passwordError) {
      throw createError({
        statusCode: 400,
        statusMessage: passwordError.message,
      });
    }

    return { ok: true };
  }

  throw createError({ statusCode: 400, statusMessage: "Action non supportée" });
});
