import type { Company } from '~/types/company'

export const useCompany = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  
  // Reactive state for current company
  const currentCompany = ref<Company | null>(null)
  const companies = ref<Company[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get all companies (admin only)
  const fetchAllCompanies = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true })
      
      if (fetchError) throw fetchError
      
      companies.value = data || []
      return data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      error.value = errorMessage
      console.error('Error fetching companies:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Get user's companies
  const fetchUserCompanies = async () => {
    if (!user.value) return []
    
    loading.value = true
    error.value = null
    
    try {
      // First get user's company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_user_id', user.value.id)
        .single()
      
      if (userError) throw userError
      
      if (!userData?.company_id) {
        companies.value = []
        return []
      }
      
      // Then get the company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userData.company_id)
        .single()
      
      if (companyError) throw companyError
      
      const userCompanies = companyData ? [companyData] : []
      companies.value = userCompanies
      
      // Set as current company if not already set
      if (userCompanies.length > 0 && !currentCompany.value) {
        currentCompany.value = userCompanies[0]
      }
      
      return userCompanies
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      error.value = errorMessage
      console.error('Error fetching user companies:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Create a new company
  const createCompany = async (companyData: Partial<Company>) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: createError } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single()
      
      if (createError) throw createError
      
      // Add to companies list
      companies.value.push(data)
      
      return data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      error.value = errorMessage
      console.error('Error creating company:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a company
  const updateCompany = async (id: string, updates: Partial<Company>) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: updateError } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      // Update in companies list
      const index = companies.value.findIndex(c => c.id === id)
      if (index !== -1) {
        companies.value[index] = data
      }
      
      // Update current company if it's the one being updated
      if (currentCompany.value?.id === id) {
        currentCompany.value = data
      }
      
      return data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      error.value = errorMessage
      console.error('Error updating company:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete a company
  const deleteCompany = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      
      // Remove from companies list
      companies.value = companies.value.filter(c => c.id !== id)
      
      // Clear current company if it was deleted
      if (currentCompany.value?.id === id) {
        currentCompany.value = null
      }
      
      return true
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      error.value = errorMessage
      console.error('Error deleting company:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Set active company for current user
  const setActiveCompany = async (companyId: string) => {
    if (!user.value) {
      error.value = 'User not authenticated'
      return false
    }
    
    loading.value = true
    error.value = null
    
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ company_id: companyId })
        .eq('auth_user_id', user.value.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      // Find and set the current company
      const company = companies.value.find(c => c.id === companyId)
      if (company) {
        currentCompany.value = company
      }
      
      return true
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      error.value = errorMessage
      console.error('Error setting active company:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // Get company by ID
  const getCompanyById = async (id: string) => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) throw fetchError
      
      return data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      error.value = errorMessage
      console.error('Error fetching company:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  // Initialize - fetch user companies on mount
  onMounted(async () => {
    if (user.value) {
      await fetchUserCompanies()
    }
  })

  // Watch for user changes
  watch(user, async (newUser) => {
    if (newUser) {
      await fetchUserCompanies()
    } else {
      currentCompany.value = null
      companies.value = []
    }
  })

  return {
    currentCompany: readonly(currentCompany),
    companies: readonly(companies),
    loading: readonly(loading),
    error: readonly(error),
    fetchAllCompanies,
    fetchUserCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    setActiveCompany,
    getCompanyById
  }
}