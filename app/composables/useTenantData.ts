/**
 * Composable for tenant-aware data operations
 * Ensures all database operations are filtered by the current company
 */
export const useTenantData = () => {
  const supabase = useSupabaseClient()
  const { currentCompany } = useCompany()
  const toast = useToast()

  // Helper to check if user has a company
  const requiresCompany = () => {
    if (!currentCompany.value) {
      toast.add({
        title: 'Entreprise requise',
        description: 'Vous devez sélectionner une entreprise pour accéder à ces données',
        color: 'red'
      })
      return false
    }
    return true
  }

  // Generic function to fetch data filtered by company
  const fetchTenantData = async <T>(
    table: string, 
    options: {
      select?: string
      filters?: Record<string, unknown>
      orderBy?: { column: string; ascending?: boolean }
    } = {}
  ): Promise<T[]> => {
    if (!requiresCompany()) return []

    try {
      let query = supabase
        .from(table)
        .select(options.select || '*')
        .eq('company_id', currentCompany.value!.id)

      // Apply additional filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        })
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error fetching tenant data from ${table}:`, error)
      toast.add({
        title: 'Erreur de chargement',
        description: `Impossible de charger les données: ${errorMessage}`,
        color: 'red'
      })
      return []
    }
  }

  // Generic function to create data with company association
  const createTenantData = async <T>(
    table: string,
    data: Omit<T, 'id' | 'created_at' | 'updated_at' | 'company_id'>
  ): Promise<T | null> => {
    if (!requiresCompany()) return null

    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert([{
          ...data,
          company_id: currentCompany.value!.id
        }])
        .select()
        .single()

      if (error) throw error
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error creating tenant data in ${table}:`, error)
      toast.add({
        title: 'Erreur de création',
        description: `Impossible de créer l'élément: ${errorMessage}`,
        color: 'red'
      })
      return null
    }
  }

  // Generic function to update data with company verification
  const updateTenantData = async <T>(
    table: string,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> => {
    if (!requiresCompany()) return null

    try {
      // First verify the record belongs to the current company
      const { data: existing, error: fetchError } = await supabase
        .from(table)
        .select('company_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      if (existing.company_id !== currentCompany.value!.id) {
        throw new Error('Vous n\'avez pas l\'autorisation de modifier cet élément')
      }

      // Perform the update
      const { data: result, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .eq('company_id', currentCompany.value!.id)
        .select()
        .single()

      if (error) throw error
      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error updating tenant data in ${table}:`, error)
      toast.add({
        title: 'Erreur de mise à jour',
        description: `Impossible de mettre à jour l'élément: ${errorMessage}`,
        color: 'red'
      })
      return null
    }
  }

  // Generic function to delete data with company verification
  const deleteTenantData = async (
    table: string,
    id: string
  ): Promise<boolean> => {
    if (!requiresCompany()) return false

    try {
      // First verify the record belongs to the current company
      const { data: existing, error: fetchError } = await supabase
        .from(table)
        .select('company_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      if (existing.company_id !== currentCompany.value!.id) {
        throw new Error('Vous n\'avez pas l\'autorisation de supprimer cet élément')
      }

      // Perform the deletion
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('company_id', currentCompany.value!.id)

      if (error) throw error
      return true
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Error deleting tenant data from ${table}:`, error)
      toast.add({
        title: 'Erreur de suppression',
        description: `Impossible de supprimer l'élément: ${errorMessage}`,
        color: 'red'
      })
      return false
    }
  }

  // Get single record by ID with company verification
  const getTenantDataById = async <T>(
    table: string,
    id: string,
    select = '*'
  ): Promise<T | null> => {
    if (!requiresCompany()) return null

    try {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq('id', id)
        .eq('company_id', currentCompany.value!.id)
        .single()

      if (error) throw error
      return data
    } catch (error: unknown) {
      console.error(`Error fetching tenant data by ID from ${table}:`, error)
      return null
    }
  }

  // Count records for current company
  const countTenantData = async (
    table: string,
    filters: Record<string, unknown> = {}
  ): Promise<number> => {
    if (!requiresCompany()) return 0

    try {
      let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.value!.id)

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const { count, error } = await query

      if (error) throw error
      return count || 0
    } catch (error: unknown) {
      console.error(`Error counting tenant data in ${table}:`, error)
      return 0
    }
  }

  return {
    currentCompany: readonly(currentCompany),
    requiresCompany,
    fetchTenantData,
    createTenantData,
    updateTenantData,
    deleteTenantData,
    getTenantDataById,
    countTenantData
  }
}