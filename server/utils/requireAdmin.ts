import { createClient } from "@supabase/supabase-js";
import { createError, getHeader, type H3Event } from "h3";

/**
 * Extrait le token Bearer de l'en-tête Authorization.
 */
function extractBearerToken(authHeader?: string): string | null {
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) return null;
    return token;
}

type RequireAdminResult = {
    userId: string;
    email: string | null;
    roles: string[];
    companyId: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adminClient: ReturnType<typeof createClient<any>>;
};

/**
 * Vérifie que la requête porte un token Supabase valide et que
 * l'utilisateur authentifié possède le rôle "admin" ou "super_admin".
 *
 * Lève une erreur HTTP 401 (token manquant/invalide) ou 403 (rôle insuffisant)
 * si la vérification échoue. À appeler en tout début de handler pour tout
 * endpoint sensible (backup, administration, cron déclenché manuellement).
 *
 * @param event - L'événement H3 de la requête en cours.
 * @param allowedRoles - Rôles autorisés (par défaut: admin et super_admin).
 */
export async function requireAdmin(
    event: H3Event,
    allowedRoles: string[] = ["admin", "super_admin"]
): Promise<RequireAdminResult> {
    const runtimeConfig = useRuntimeConfig(event);

    const supabaseUrl =
        process.env.SUPABASE_URL ||
        process.env.NUXT_PUBLIC_SUPABASE_URL ||
        process.env.NUXT_SUPABASE_URL ||
        runtimeConfig.public?.supabaseUrl;

    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        runtimeConfig.supabaseServiceRoleKey;

    if (!supabaseUrl || !serviceRoleKey) {
        throw createError({
            statusCode: 500,
            statusMessage:
                "Configuration Supabase manquante: URL ou clé service_role introuvable",
        });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = getHeader(event, "authorization");
    const accessToken = extractBearerToken(authHeader);
    if (!accessToken) {
        throw createError({
            statusCode: 401,
            statusMessage: "Authentification requise: token manquant",
        });
    }

    const {
        data: { user: requester },
        error: authError,
    } = await adminClient.auth.getUser(accessToken);

    if (authError || !requester) {
        throw createError({
            statusCode: 401,
            statusMessage: "Session invalide ou expirée",
        });
    }

    const { data: profile, error: profileError } = await adminClient
        .from("users")
        .select("roles, company_id")
        .eq("auth_user_id", requester.id)
        .maybeSingle();

    if (profileError || !profile) {
        throw createError({
            statusCode: 403,
            statusMessage: "Profil utilisateur introuvable",
        });
    }

    const roles = Array.isArray(profile.roles) ? (profile.roles as string[]) : [];
    const hasAllowedRole = roles.some((role) => allowedRoles.includes(role));

    if (!hasAllowedRole) {
        throw createError({
            statusCode: 403,
            statusMessage: `Accès refusé. Rôle requis: ${allowedRoles.join(" ou ")}`,
        });
    }

    return {
        userId: requester.id,
        email: requester.email ?? null,
        roles,
        companyId: (profile.company_id as string | null) ?? null,
        adminClient,
    };
}
