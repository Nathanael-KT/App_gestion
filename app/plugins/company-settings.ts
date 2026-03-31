// plugins/company-settings.ts
/**
 * Plugin qui charge les paramètres de la compagnie pour l'utilisateur connecté
 * Les paramètres sont disponibles via nuxtApp.$companySettings
 */

export default defineNuxtPlugin(async (nuxtApp) => {
    try {
        const supabase = useSupabaseClient();

        // 1. Récupérer l'utilisateur authentifié
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            console.debug("[company-settings plugin] No authenticated user");
            return;
        }

        // 2. Récupérer l'utilisateur depuis la base de données pour obtenir company_id
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("company_id")
            .eq("auth_user_id", user.id)
            .single();

        if (userError || !userData?.company_id) {
            console.debug(
                "[company-settings plugin] Could not find user company_id:",
                userError?.message
            );
            return;
        }

        // 3. Récupérer les paramètres de la compagnie
        const { data: companySettings, error: settingsError } = await supabase
            .from("company_settings")
            .select("*")
            .eq("id", userData.company_id)
            .single();

        if (settingsError) {
            console.warn(
                "[company-settings plugin] Could not fetch company settings:",
                settingsError.message
            );
            return;
        }

        // 4. Fournir les paramètres via NuxtApp
        if (companySettings) {
            nuxtApp.provide("companySettings", companySettings);
            const settings = companySettings as Record<string, unknown>;
            console.debug("[company-settings plugin] Company settings loaded:", {
                company_name: settings.company_name,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                blocked: (settings as any).blocked,
            });
        }
    } catch (error) {
        console.error("[company-settings plugin] Unexpected error:", error);
        // Fail silently - ne pas bloquer le démarrage de l'app
    }
});
