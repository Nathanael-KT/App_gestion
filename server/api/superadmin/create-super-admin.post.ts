import { createError, defineEventHandler, readBody } from "h3";
import { requireAdmin } from "../../utils/requireAdmin";

type CreateSuperAdminBody = {
  email?: string;
  password?: string;
  name?: string;
  phone?: string | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Service dédié : crée un compte plateforme super_admin
 * (sans compagnie ni magasin) via le client service_role.
 */
export default defineEventHandler(async (event) => {
  const { adminClient } = await requireAdmin(event, ["super_admin"]);

  const body = await readBody<CreateSuperAdminBody>(event);
  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(body?.password || "");
  const name = String(body?.name || "").trim();
  const phone = body?.phone ? String(body.phone).trim() : null;

  if (!email || !password || !name) {
    throw createError({
      statusCode: 400,
      statusMessage: "Nom, email et mot de passe sont requis",
    });
  }

  if (!EMAIL_REGEX.test(email)) {
    throw createError({ statusCode: 400, statusMessage: "Email invalide" });
  }

  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le mot de passe doit contenir au moins 8 caractères",
    });
  }

  const { data: existingUser } = await adminClient
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingUser) {
    throw createError({
      statusCode: 409,
      statusMessage: "Un utilisateur avec cet email existe déjà",
    });
  }

  const { data: createdAuth, error: createAuthError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        phone,
        roles: ["super_admin"],
        company_id: null,
        magasin_id: null,
      },
    });

  if (createAuthError || !createdAuth.user) {
    throw createError({
      statusCode: 400,
      statusMessage:
        createAuthError?.message || "Création du compte Auth impossible",
    });
  }

  const { data: profile, error: upsertError } = await adminClient
    .from("users")
    .upsert(
      {
        auth_user_id: createdAuth.user.id,
        email,
        name,
        phone,
        roles: ["super_admin"],
        company_id: null,
        magasin_id: null,
      },
      { onConflict: "auth_user_id" },
    )
    .select("id, auth_user_id, name, email, phone, roles, created_at")
    .single();

  if (upsertError) {
    await adminClient.auth.admin.deleteUser(createdAuth.user.id);
    throw createError({
      statusCode: 400,
      statusMessage: upsertError.message || "Création du profil impossible",
    });
  }

  return {
    ok: true,
    userId: createdAuth.user.id,
    user: profile,
  };
});
