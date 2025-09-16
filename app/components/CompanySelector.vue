<template>
  <UDropdown :items="dropdownItems" :popper="{ placement: 'bottom-start' }">
    <UButton 
      variant="ghost" 
      :loading="loading"
      class="flex items-center space-x-2"
      :class="{ 'border-red-200 bg-red-50': !currentCompany }"
    >
      <UIcon 
        name="i-heroicons-building-office" 
        class="h-4 w-4" 
        :class="currentCompany ? 'text-blue-600' : 'text-red-600'" 
      />
      <span class="hidden md:inline">
        {{ currentCompany ? currentCompany.name : 'Aucune entreprise' }}
      </span>
      <UIcon name="i-heroicons-chevron-down" class="h-4 w-4" />
    </UButton>
  </UDropdown>
</template>

<script setup lang="ts">
const { 
  currentCompany, 
  companies, 
  loading, 
  setActiveCompany, 
  fetchUserCompanies 
} = useCompany()

const toast = useToast()

// Initialize companies on mount
onMounted(async () => {
  await fetchUserCompanies()
})

// Dropdown items
const dropdownItems = computed(() => {
  const items = [
    [{
      label: 'Mes entreprises',
      slot: 'header'
    }]
  ]

  // Add company selection items
  if (companies.value.length > 0) {
    const companyItems = companies.value.map(company => ({
      label: company.name,
      avatar: company.logo_url ? { src: company.logo_url } : undefined,
      icon: currentCompany.value?.id === company.id ? 'i-heroicons-check' : 'i-heroicons-building-office',
      disabled: currentCompany.value?.id === company.id,
      click: () => handleCompanySelect(company.id)
    }))
    
    items.push(companyItems)
  } else {
    items.push([{
      label: 'Aucune entreprise disponible',
      disabled: true,
      icon: 'i-heroicons-exclamation-triangle'
    }])
  }

  // Add management actions
  items.push([
    {
      label: 'Gérer les entreprises',
      icon: 'i-heroicons-cog-6-tooth',
      to: '/entreprises'
    },
    {
      label: 'Créer une entreprise',
      icon: 'i-heroicons-plus',
      to: '/entreprises/add'
    }
  ])

  return items
})

// Handle company selection
const handleCompanySelect = async (companyId: string) => {
  if (currentCompany.value?.id === companyId) return

  try {
    const success = await setActiveCompany(companyId)
    if (success) {
      toast.add({
        title: 'Entreprise changée',
        description: 'L\'entreprise active a été mise à jour',
        color: 'green'
      })
      
      // Refresh the page to update all data
      await navigateTo(useRoute().path, { replace: true })
    }
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de changer d\'entreprise',
      color: 'red'
    })
  }
}
</script>