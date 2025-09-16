<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Gestion des Entreprises</h1>
      <UButton 
        to="/entreprises/add" 
        icon="i-heroicons-plus"
        color="primary"
      >
        Ajouter une entreprise
      </UButton>
    </div>

    <div v-if="loading" class="text-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 mx-auto" />
      <p class="mt-2 text-gray-600">Chargement des entreprises...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-800">Erreur: {{ error }}</p>
    </div>

    <div v-else-if="companies.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-building-office" class="h-16 w-16 mx-auto text-gray-400" />
      <h3 class="mt-4 text-lg font-medium text-gray-900">Aucune entreprise</h3>
      <p class="mt-2 text-gray-600">Commencez par créer votre première entreprise.</p>
      <UButton 
        to="/entreprises/add" 
        class="mt-4"
        icon="i-heroicons-plus"
      >
        Créer une entreprise
      </UButton>
    </div>

    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <UCard 
        v-for="company in companies" 
        :key="company.id"
        class="hover:shadow-lg transition-shadow"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div v-if="company.logo_url" class="h-10 w-10 rounded-lg overflow-hidden">
                <img :src="company.logo_url" :alt="company.name" class="h-full w-full object-cover" >
              </div>
              <div v-else class="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <UIcon name="i-heroicons-building-office" class="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">{{ company.name }}</h3>
                <p class="text-sm text-gray-600">{{ company.email }}</p>
              </div>
            </div>
            <UBadge 
              :color="company.is_active ? 'green' : 'red'"
              variant="soft"
            >
              {{ company.is_active ? 'Active' : 'Inactive' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-2">
          <div v-if="company.siret" class="flex items-center text-sm text-gray-600">
            <UIcon name="i-heroicons-identification" class="h-4 w-4 mr-2" />
            SIRET: {{ company.siret }}
          </div>
          <div v-if="company.phone" class="flex items-center text-sm text-gray-600">
            <UIcon name="i-heroicons-phone" class="h-4 w-4 mr-2" />
            {{ company.phone }}
          </div>
          <div v-if="company.address" class="flex items-center text-sm text-gray-600">
            <UIcon name="i-heroicons-map-pin" class="h-4 w-4 mr-2" />
            {{ company.address }}
          </div>
          <div class="flex items-center text-sm text-gray-600">
            <UIcon name="i-heroicons-star" class="h-4 w-4 mr-2" />
            Plan: {{ company.subscription_plan }}
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center">
            <div class="flex space-x-2">
              <UButton 
                :to="`/entreprises/edit/${company.id}`"
                size="sm"
                color="gray"
                variant="soft"
                icon="i-heroicons-pencil"
              >
                Modifier
              </UButton>
              <UButton 
                v-if="currentCompany?.id !== company.id"
                size="sm"
                color="primary"
                variant="soft"
                :loading="settingActive === company.id"
                @click="handleSetActive(company.id)"
              >
                Sélectionner
              </UButton>
            </div>
            <div class="flex items-center space-x-2">
              <UBadge 
                v-if="currentCompany?.id === company.id"
                color="blue"
              >
                Active
              </UBadge>
              <UButton 
                size="sm"
                color="red"
                variant="soft"
                icon="i-heroicons-trash"
                :disabled="currentCompany?.id === company.id"
                @click="handleDelete(company)"
              />
            </div>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Delete confirmation modal -->
    <UModal v-model="showDeleteModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Confirmer la suppression</h3>
        </template>
        
        <p class="text-gray-600">
          Êtes-vous sûr de vouloir supprimer l'entreprise "{{ companyToDelete?.name }}" ? 
          Cette action est irréversible et supprimera toutes les données associées.
        </p>

        <template #footer>
          <div class="flex justify-end space-x-2">
            <UButton color="gray" @click="showDeleteModal = false">
              Annuler
            </UButton>
            <UButton 
              color="red" 
              :loading="deleting"
              @click="confirmDelete"
            >
              Supprimer
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Company } from '~/types/company'

definePageMeta({
  title: 'Gestion des Entreprises',
  requiresAuth: true
})

const { 
  companies, 
  currentCompany,
  loading, 
  error, 
  fetchAllCompanies, 
  deleteCompany, 
  setActiveCompany 
} = useCompany()

const toast = useToast()

// Local state
const settingActive = ref<string | null>(null)
const showDeleteModal = ref(false)
const companyToDelete = ref<Company | null>(null)
const deleting = ref(false)

// Load companies on mount
onMounted(async () => {
  await fetchAllCompanies()
})

// Handle setting active company
const handleSetActive = async (companyId: string) => {
  settingActive.value = companyId
  try {
    const success = await setActiveCompany(companyId)
    if (success) {
      toast.add({
        title: 'Succès',
        description: 'Entreprise active mise à jour',
        color: 'green'
      })
    }
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de changer d\'entreprise',
      color: 'red'
    })
  } finally {
    settingActive.value = null
  }
}

// Handle delete confirmation
const handleDelete = (company: Company) => {
  companyToDelete.value = company
  showDeleteModal.value = true
}

// Confirm delete
const confirmDelete = async () => {
  if (!companyToDelete.value) return
  
  deleting.value = true
  try {
    await deleteCompany(companyToDelete.value.id)
    toast.add({
      title: 'Succès',
      description: 'Entreprise supprimée avec succès',
      color: 'green'
    })
    showDeleteModal.value = false
    companyToDelete.value = null
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de supprimer l\'entreprise',
      color: 'red'
    })
  } finally {
    deleting.value = false
  }
}
</script>