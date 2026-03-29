import { createClient } from "@supabase/supabase-js";
import {
    createError,
    defineEventHandler,
    getHeader,
    getMethod,
    readBody,
} from "h3";

type RequestBody = {
    action?:
    | "updateUser"
    | "deleteUser"
    | "createMagasin"
    | "updateMagasin"
    | "deleteMagasin";
    payload?: Record<string, unknown>;
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

    const companyId = event.context.params?.companyId;
    if (!companyId) {
        throw createError({ statusCode: 400, statusMessage: "companyId manquant" });
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
        throw createError({ statusCode: 401, statusMessage: "Session invalide" });
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

    if (!isSuperAdmin && !isAdmin) {
        throw createError({
            statusCode: 403,
            statusMessage: "Permissions insuffisantes",
        });
    }

    if (!isSuperAdmin && requesterProfile.company_id !== companyId) {
        throw createError({
            statusCode: 403,
            statusMessage: "Vous ne pouvez gerer que votre compagnie",
        });
    }

    const method = getMethod(event);

    if (method === "GET") {
        const [usersResult, magasinsResult] = await Promise.all([
            adminClient
                .from("users")
                .select("id, auth_user_id, magasin_id, name, email, phone, roles")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false }),
            adminClient
                .from("magasins")
                .select("id, nom, adresse, telephone, email")
                .eq("company_id", companyId)
                .order("created_at", { ascending: false }),
        ]);

        if (usersResult.error) {
            throw createError({
                statusCode: 400,
                statusMessage: usersResult.error.message,
            });
        }

        if (magasinsResult.error) {
            throw createError({
                statusCode: 400,
                statusMessage: magasinsResult.error.message,
            });
        }

        return {
            users: usersResult.data ?? [],
            magasins: magasinsResult.data ?? [],
        };
    }

    if (method !== "POST") {
        throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
    }

    const body = await readBody<RequestBody>(event);
    const action = body?.action;
    const payload = body?.payload || {};

    if (!action) {
        throw createError({ statusCode: 400, statusMessage: "Action manquante" });
    }

    if (action === "updateUser") {
        const userId = String(payload.userId || "");
        if (!userId) {
            throw createError({ statusCode: 400, statusMessage: "userId manquant" });
        }

        const updates = {
            name: payload.name ? String(payload.name) : null,
            email: payload.email ? String(payload.email) : null,
            phone: payload.phone ? String(payload.phone) : null,
            roles: Array.isArray(payload.roles) ? payload.roles : [],
            magasin_id: payload.magasin_id ? String(payload.magasin_id) : null,
        };

        const { error } = await adminClient
            .from("users")
            .update(updates)
            .eq("id", userId)
            .eq("company_id", companyId);

        if (error) {
            throw createError({ statusCode: 400, statusMessage: error.message });
        }

        return { ok: true };
    }

    if (action === "deleteUser") {
        const userId = String(payload.userId || "");
        if (!userId) {
            throw createError({ statusCode: 400, statusMessage: "userId manquant" });
        }

        const { data: targetUser, error: targetUserError } = await adminClient
            .from("users")
            .select("auth_user_id")
            .eq("id", userId)
            .eq("company_id", companyId)
            .single();

        if (targetUserError || !targetUser) {
            throw createError({
                statusCode: 404,
                statusMessage: "Utilisateur introuvable",
            });
        }

        const { error: deleteProfileError } = await adminClient
            .from("users")
            .delete()
            .eq("id", userId)
            .eq("company_id", companyId);

        if (deleteProfileError) {
            throw createError({
                statusCode: 400,
                statusMessage: deleteProfileError.message,
            });
        }

        if (targetUser.auth_user_id) {
            const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
                targetUser.auth_user_id,
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

    if (action === "createMagasin") {
        const nom = String(payload.nom || "").trim();
        if (!nom) {
            throw createError({
                statusCode: 400,
                statusMessage: "Le nom du magasin est obligatoire",
            });
        }

        const { error } = await adminClient.from("magasins").insert({
            nom,
            adresse: payload.adresse ? String(payload.adresse) : null,
            telephone: payload.telephone ? String(payload.telephone) : null,
            email: payload.email ? String(payload.email) : null,
            company_id: companyId,
        });

        if (error) {
            throw createError({ statusCode: 400, statusMessage: error.message });
        }

        return { ok: true };
    }

    if (action === "updateMagasin") {
        const magasinId = String(payload.magasinId || "");
        if (!magasinId) {
            throw createError({
                statusCode: 400,
                statusMessage: "magasinId manquant",
            });
        }

        const nom = String(payload.nom || "").trim();
        if (!nom) {
            throw createError({
                statusCode: 400,
                statusMessage: "Le nom du magasin est obligatoire",
            });
        }

        const { error } = await adminClient
            .from("magasins")
            .update({
                nom,
                adresse: payload.adresse ? String(payload.adresse) : null,
                telephone: payload.telephone ? String(payload.telephone) : null,
                email: payload.email ? String(payload.email) : null,
            })
            .eq("id", magasinId)
            .eq("company_id", companyId);

        if (error) {
            throw createError({ statusCode: 400, statusMessage: error.message });
        }

        return { ok: true };
    }

    if (action === "deleteMagasin") {
        const magasinId = String(payload.magasinId || "");
        if (!magasinId) {
            throw createError({
                statusCode: 400,
                statusMessage: "magasinId manquant",
            });
        }

        const { error } = await adminClient
            .from("magasins")
            .delete()
            .eq("id", magasinId)
            .eq("company_id", companyId);

        if (error) {
            throw createError({ statusCode: 400, statusMessage: error.message });
        }

        return { ok: true };
    }

    throw createError({ statusCode: 400, statusMessage: "Action non supportee" });
});