// plugins/company-settings.ts
export default defineNuxtPlugin(async (nuxtApp) => {
    try {
        const supabase = useSupabaseClient() as any;
        const user = await useAsyncData('currentUser', async () => {
            const { data } = await supabase.auth.getUser();
            return data.user;
        });

        if (!user.data.value) {
            console.log('[company-settings plugin] No authenticated user');
            return;
        }

        // Récupérer l'utilisateur depuis la base de données pour obtenir company_id
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('company_id')
            .eq('auth_user_id', user.data.value.id)
            .single();

        if (userError || !userData?.company_id) {
            console.log('[company-settings plugin] Could not find user company_id', userError);
            return;
        }

        // Récupérer les paramètres de la compagnie
        const { data: companySettings, error: settingsError } = await supabase
            .from('company_settings')
            .select('*')
            .eq('id', userData.company_id)
            .single();

        if (settingsError) {
            console.log('[company-settings plugin] Could not fetch company settings', settingsError);
            return;
        }

        // Fournir les paramètres via NuxtApp
        nuxtApp.provide('companySettings', companySettings || {});
        console.log('[company-settings plugin] Company settings loaded:', {
            company_name: companySettings?.company_name,
            blocked: companySettings?.blocked,
        });
    } catch (error) {
        console.error('[company-settings plugin] Error:', error);
    }
});
