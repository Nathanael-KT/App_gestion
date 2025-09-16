import { ref } from "vue";
import { useSupabaseClient, useSupabaseUser } from "#imports";

export type UserPreferences = {
  user_id: string;
  theme: "light" | "dark";
  language: "fr" | "en";
  notifications: boolean;
};

export function useUserPreferences() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const preferences = ref<UserPreferences | null>(null);
  const loading = ref(false);

  async function fetchPreferences() {
    if (!user.value) return;
    loading.value = true;
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.value.id)
      .single();
    if (!error && data) {
      preferences.value = data as UserPreferences;
    }
    loading.value = false;
  }

  async function savePreferences(newPrefs: Partial<UserPreferences>) {
    if (!user.value) return;
    // Cast en tableau pour éviter l'erreur de typage Supabase
    const { error } = await supabase
      .from("user_preferences")
      .upsert([{ user_id: user.value.id, ...newPrefs }]);
    if (!error) {
      await fetchPreferences();
    }
  }

  return {
    preferences,
    loading,
    fetchPreferences,
    savePreferences,
  };
}
