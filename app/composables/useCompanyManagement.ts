import { ref, computed } from "vue";

// Types for company management
export interface Company {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  siret?: string;
  logo_url?: string;
  status?: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
  settings?: Record<string, unknown>;
}

export interface CompanyStore {
  currentCompanyId: string | null;
  companies: Company[];
  selectedCompany: Company | null;
}

export const useCompanyManagement = () => {
  const supabase = useSupabaseClient();
  const { currentUser } = useCurrentUser();

  // États réactifs
  const companies = ref<Company[]>([]);
  const currentCompany = ref<Company | null>(null);
  const selectedCompanyId = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Store persistant pour la compagnie sélectionnée
  const companyStore = useState<CompanyStore>('company-store', () => ({
    currentCompanyId: null,
    companies: [],
    selectedCompany: null
  }));

  // Propriétés calculées
  const isCurrentUserAdmin = computed(() => {
    return currentUser.value?.roles?.includes('admin') || false;
  });

  const canManageCompanies = computed(() => {
    return isCurrentUserAdmin.value;
  });

  const userCompanies = computed(() => {
    if (isCurrentUserAdmin.value) {
      return companies.value;
    }
    // Non-admin users only see their own company
    return companies.value.filter(c => c.id === currentUser.value?.company_id);
  });

  // Fonction pour récupérer toutes les compagnies accessibles
  const fetchCompanies = async (): Promise<Company[]> => {
    try {
      loading.value = true;
      error.value = null;

      let query = supabase
        .from("companies")
        .select("*")
        .eq("status", "active")
        .order("name");

      // Si l'utilisateur n'est pas admin, ne récupérer que sa compagnie
      if (!isCurrentUserAdmin.value && currentUser.value?.company_id) {
        query = query.eq("id", currentUser.value.company_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      companies.value = data || [];
      companyStore.value.companies = companies.value;
      
      // Auto-sélectionner la compagnie de l'utilisateur si pas encore sélectionnée
      if (!selectedCompanyId.value && currentUser.value?.company_id) {
        await selectCompany(currentUser.value.company_id);
      }

      return companies.value;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement des compagnies";
      error.value = message;
      console.error("Erreur fetchCompanies:", err);
      return [];
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour récupérer une compagnie spécifique
  const fetchCompany = async (companyId: string): Promise<Company | null> => {
    try {
      loading.value = true;
      error.value = null;

      const { data, error: fetchError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      return data as Company;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement de la compagnie";
      error.value = message;
      console.error("Erreur fetchCompany:", err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour créer une nouvelle compagnie
  const createCompany = async (companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company | null> => {
    try {
      loading.value = true;
      error.value = null;

      // Validation des données requises
      if (!companyData.name || !companyData.email) {
        throw new Error("Le nom et l'email de la compagnie sont obligatoires");
      }

      // Vérifier l'unicité de l'email
      const { data: existingCompany } = await supabase
        .from("companies")
        .select("id")
        .eq("email", companyData.email)
        .single();

      if (existingCompany) {
        throw new Error("Une compagnie avec cet email existe déjà");
      }

      const { data, error: insertError } = await supabase
        .from("companies")
        .insert({
          ...companyData,
          status: companyData.status || 'active'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const newCompany = data as Company;
      companies.value.push(newCompany);
      companyStore.value.companies = companies.value;

      return newCompany;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la création de la compagnie";
      error.value = message;
      console.error("Erreur createCompany:", err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour mettre à jour une compagnie
  const updateCompany = async (companyId: string, updates: Partial<Company>): Promise<Company | null> => {
    try {
      loading.value = true;
      error.value = null;

      // Validation
      if (updates.email) {
        const { data: existingCompany } = await supabase
          .from("companies")
          .select("id")
          .eq("email", updates.email)
          .neq("id", companyId)
          .single();

        if (existingCompany) {
          throw new Error("Une autre compagnie avec cet email existe déjà");
        }
      }

      const { data, error: updateError } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", companyId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedCompany = data as Company;
      
      // Mettre à jour dans le state local
      const index = companies.value.findIndex(c => c.id === companyId);
      if (index !== -1) {
        companies.value[index] = updatedCompany;
      }
      
      // Mettre à jour la compagnie actuelle si c'est celle qui est modifiée
      if (currentCompany.value?.id === companyId) {
        currentCompany.value = updatedCompany;
        companyStore.value.selectedCompany = updatedCompany;
      }

      companyStore.value.companies = companies.value;

      return updatedCompany;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour de la compagnie";
      error.value = message;
      console.error("Erreur updateCompany:", err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour supprimer une compagnie
  const deleteCompany = async (companyId: string): Promise<boolean> => {
    try {
      loading.value = true;
      error.value = null;

      // Vérifier s'il y a des utilisateurs associés
      const { data: usersCount } = await supabase
        .from("users")
        .select("id", { count: 'exact' })
        .eq("company_id", companyId);

      if (usersCount && usersCount.length > 0) {
        throw new Error("Impossible de supprimer une compagnie ayant des utilisateurs associés");
      }

      const { error: deleteError } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId);

      if (deleteError) {
        throw deleteError;
      }

      // Mettre à jour l'état local
      companies.value = companies.value.filter(c => c.id !== companyId);
      companyStore.value.companies = companies.value;

      // Si c'était la compagnie sélectionnée, la déselectionner
      if (selectedCompanyId.value === companyId) {
        selectedCompanyId.value = null;
        currentCompany.value = null;
        companyStore.value.currentCompanyId = null;
        companyStore.value.selectedCompany = null;
      }

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la suppression de la compagnie";
      error.value = message;
      console.error("Erreur deleteCompany:", err);
      return false;
    } finally {
      loading.value = false;
    }
  };

  // Fonction pour sélectionner une compagnie
  const selectCompany = async (companyId: string): Promise<boolean> => {
    try {
      // Vérifier que l'utilisateur a accès à cette compagnie
      const company = companies.value.find(c => c.id === companyId);
      if (!company) {
        const fetchedCompany = await fetchCompany(companyId);
        if (!fetchedCompany) {
          throw new Error("Compagnie non trouvée ou accès non autorisé");
        }
      }

      selectedCompanyId.value = companyId;
      currentCompany.value = company || await fetchCompany(companyId);
      
      // Persister la sélection
      companyStore.value.currentCompanyId = companyId;
      companyStore.value.selectedCompany = currentCompany.value;

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la sélection de la compagnie";
      error.value = message;
      console.error("Erreur selectCompany:", err);
      return false;
    }
  };

  // Fonction pour activer/désactiver une compagnie
  const toggleCompanyStatus = async (companyId: string, status: 'active' | 'inactive' | 'suspended'): Promise<boolean> => {
    return await updateCompany(companyId, { status }) !== null;
  };

  // Fonction pour valider les données d'une compagnie
  const validateCompanyData = (companyData: Partial<Company>): string[] => {
    const errors: string[] = [];

    if (companyData.name && companyData.name.trim().length < 2) {
      errors.push("Le nom de la compagnie doit contenir au moins 2 caractères");
    }

    if (companyData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email)) {
      errors.push("Format email invalide");
    }

    if (companyData.website && !/^https?:\/\/.+/.test(companyData.website)) {
      errors.push("L'URL du site web doit commencer par http:// ou https://");
    }

    if (companyData.siret && !/^\d{14}$/.test(companyData.siret)) {
      errors.push("Le SIRET doit contenir exactement 14 chiffres");
    }

    return errors;
  };

  // Fonction pour récupérer les statistiques d'une compagnie
  const getCompanyStats = async (companyId: string) => {
    try {
      const [usersCount, magasinsCount, productsCount] = await Promise.all([
        supabase.from("users").select("id", { count: 'exact' }).eq("company_id", companyId),
        supabase.from("magasins").select("id", { count: 'exact' }).eq("company_id", companyId),
        supabase.from("products_carreaux").select("id", { count: 'exact' }).eq("company_id", companyId)
      ]);

      return {
        users: usersCount.count || 0,
        magasins: magasinsCount.count || 0,
        products: productsCount.count || 0
      };
    } catch (err) {
      console.error("Erreur lors du calcul des statistiques:", err);
      return { users: 0, magasins: 0, products: 0 };
    }
  };

  // Initialisation lors du montage
  const initializeCompanyContext = async () => {
    // Récupérer les compagnies accessibles
    await fetchCompanies();
    
    // Restaurer la sélection précédente si elle existe
    if (companyStore.value.currentCompanyId) {
      await selectCompany(companyStore.value.currentCompanyId);
    }
  };

  return {
    // États
    companies: readonly(companies),
    currentCompany: readonly(currentCompany),
    selectedCompanyId: readonly(selectedCompanyId),
    loading: readonly(loading),
    error: readonly(error),

    // Propriétés calculées
    isCurrentUserAdmin,
    canManageCompanies,
    userCompanies,

    // Actions principales
    fetchCompanies,
    fetchCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    selectCompany,
    toggleCompanyStatus,

    // Utilitaires
    validateCompanyData,
    getCompanyStats,
    initializeCompanyContext,

    // Store state
    companyStore: readonly(companyStore)
  };
};