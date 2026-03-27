import { createClient } from "@supabase/supabase-js";
import { createError, defineEventHandler, getHeader, readBody } from "h3";

type CreateUserBody = {
    companyId: string;
    email: string;
    password: string;
    name: string;
    phone?: string | null;
    roles: string[];
    magasin_id: string;
};

function extractBearerToken(authHeader?: string): string | null {
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
}

export default defineEventHandler(async (event) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw createError({
            statusCode: 500,
            statusMessage: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant",
        });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = getHeader(event, "authorization");
    const accessToken = extractBearerToken(authHeader);
    if (!accessToken) {
        throw createError({ statusCode: 401, statusMessage: "Token manquant" });
    }

    const {
        data: { user: requester },
        error: authError,
    } = await adminClient.auth.getUser(accessToken);

    if (authError || !requester) {
        throw createError({
            statusCode: 401,
            statusMessage: "Session invalide",
        });
    }

    const body = await readBody<CreateUserBody>(event);

    if (
        !body?.companyId ||
        !body?.email ||
        !body?.password ||
        !body?.name ||
        !body?.magasin_id ||
        !Array.isArray(body?.roles) ||
        body.roles.length === 0
    ) {
        throw createError({
            statusCode: 400,
            statusMessage: "Champs requis manquants",
        });
    }

    if (body.password.length < 8) {
        throw createError({
            statusCode: 400,
            statusMessage: "Le mot de passe doit contenir au moins 8 caracteres",
        });
    }

    const { data: requesterProfile, error: requesterError } = await adminClient
        .from("users")
        .select("company_id, roles")
        .eq("auth_user_id", requester.id)
        .single();

    if (requesterError || !requesterProfile) {
        throw createError({
            statusCode: 403,
            statusMessage: "Profil demandeur introuvable",
        });
    }

    const requesterRoles = Array.isArray(requesterProfile.roles)
        ? requesterProfile.roles
        : [];

    const isSuperAdmin = requesterRoles.includes("super_admin");
    const isAdmin = requesterRoles.includes("admin");

    if (!isAdmin && !isSuperAdmin) {
        throw createError({
            statusCode: 403,
            statusMessage: "Permissions insuffisantes",
        });
    }

    if (!isSuperAdmin && requesterProfile.company_id !== body.companyId) {
        throw createError({
            statusCode: 403,
            statusMessage: "Vous ne pouvez creer des utilisateurs que pour votre compagnie",
        });
    }

    const { data: magasin, error: magasinError } = await adminClient
        .from("magasins")
        .select("id")
        .eq("id", body.magasin_id)
        .eq("company_id", body.companyId)
        .single();

    if (magasinError || !magasin) {
        throw createError({
            statusCode: 400,
            statusMessage: "Magasin invalide pour cette compagnie",
        });
    }

    const { data: createdAuth, error: createAuthError } =
        await adminClient.auth.admin.createUser({
            email: body.email,
            password: body.password,
            email_confirm: true,
            user_metadata: {
                name: body.name,
                phone: body.phone || null,
                roles: body.roles,
                company_id: body.companyId,
                magasin_id: body.magasin_id,
            },
        });

    if (createAuthError || !createdAuth.user) {
        throw createError({
            statusCode: 400,
            statusMessage: createAuthError?.message || "Creation Auth impossible",
        });
    }

    const { error: upsertError } = await adminClient.from("users").upsert(
        {
            auth_user_id: createdAuth.user.id,
            email: body.email,
            name: body.name,
            phone: body.phone || null,
            roles: body.roles,
            company_id: body.companyId,
            magasin_id: body.magasin_id,
        },
        {
            onConflict: "auth_user_id",
        },
    );

    if (upsertError) {
        await adminClient.auth.admin.deleteUser(createdAuth.user.id);
        throw createError({
            statusCode: 400,
            statusMessage: upsertError.message || "Creation profil impossible",
        });
    }

    return {
        ok: true,
        userId: createdAuth.user.id,
    };
});