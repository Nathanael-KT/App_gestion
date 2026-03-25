import { ref, onMounted } from "vue";
import { useSupabaseClient } from "#imports";
import { useCurrentUser } from "./useCurrentUser.ts";

export function useCurrentCompany() {
  const supabase = useSupabaseClient() as any;
  const company = ref<any>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Utilise le composable utilisateur
  const { companyId, isLoadingUser } = useCurrentUser();

  const fetchCompany = async () => {
    loading.value = true;
    error.value = null;
    try {
      if (!companyId.value)
        throw new Error("Aucune company liée à l'utilisateur");
      const { data, error: companyError } = await supabase
        .from("company_settings")
        .select("*")
        .eq("id", companyId.value)
        .single();
      if (companyError) throw companyError;
      company.value = data;
    } catch (err) {
      error.value =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Erreur lors de la récupération de la company";
      company.value = null;
    } finally {
      loading.value = false;
    }
  };

  // Recharge la company quand l'utilisateur change
  onMounted(() => {
    if (!isLoadingUser.value) fetchCompany();
  });
  watch(companyId, (id) => {
    if (id) fetchCompany();
  });

  return {
    company,
    loading,
    error,
    fetchCompany,
  };
}
