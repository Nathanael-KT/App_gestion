<template>
  <div class="container mx-auto px-4 py-2">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Gestion des Types de Produits</h1>

    <div class="mb-6 flex justify-between items-center">
      <UButton
        icon="i-lucide-plus"
        color="success"
        label="Ajouter un Type de Produit"
        to="/product-types/add"
      />
      <UButton
        :loading="loading"
        icon="i-lucide-refresh-cw"
        label="Actualiser"
        color="primary"
        @click="fetchProductTypes"
      />
    </div>

    <UAlert
      v-if="error"
      icon="i-heroicons-exclamation-triangle"
      color="red"
      variant="subtle"
      title="Erreur"
      :description="error"
      class="mb-4"
    />

    <UTable
      v-if="!loading && productTypes.length"
      :rows="productTypes"
      :columns="columns"
      class="shadow rounded-lg"
    >
      <template #actions="{ row }">
        <div class="flex justify-center gap-2">
          <UButton
            color="blue"
            variant="link"
            icon="i-lucide-pencil"
            :to="`/product-types/edit/${row.id}`"
          />
          <UButton
            color="red"
            variant="link"
            icon="i-lucide-trash"
            @click="openDeleteModal(row)"
          />
        </div>
      </template>
    </UTable>

    <div
      v-if="!loading && !productTypes.length"
      class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
    >
      <p class="text-gray-500 text-lg">Aucun type de produit disponible.</p>
    </div>

    <UModal v-model:open="isDeleteModalOpen">
      <template #header>
        <h4 class="text-base font-medium text-gray-800">Confirmer la suppression</h4>
      </template>
      <div class="text-gray-600">
        Êtes-vous sûr de vouloir supprimer le type <strong>{{ typeToDelete?.name }}</strong> ?
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Annuler" variant="ghost" @click="isDeleteModalOpen = false" />
          <UButton label="Supprimer" color="red" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useToast, useSupabaseClient } from '#imports'

const productTypes = ref([])
const loading = ref(false)
const error = ref(null)
const isDeleteModalOpen = ref(false)
const typeToDelete = ref(null)

const toast = useToast()
const supabase = useSupabaseClient()

const columns = [
  { key: 'name', label: 'Nom' },
  { key: 'actions', label: 'Actions', class: 'text-center' }
]

const fetchProductTypes = async () => {
  loading.value = true
  error.value = null

  const { data, error: fetchError } = await supabase.from('product_types').select('*')

  if (fetchError) {
    error.value = fetchError.message
  } else {
    productTypes.value = data
  }

  loading.value = false
}

const openDeleteModal = (type) => {
  typeToDelete.value = type
  isDeleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!typeToDelete.value?.id) return

  const { error: deleteError } = await supabase
    .from('product_types')
    .delete()
    .eq('id', typeToDelete.value.id)

  if (deleteError) {
    toast.add({
      title: 'Erreur',
      description: deleteError.message,
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  } else {
    toast.add({
      title: 'Succès',
      description: 'Type de produit supprimé avec succès.',
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })
    await fetchProductTypes()
  }

  isDeleteModalOpen.value = false
  typeToDelete.value = null
}

onMounted(fetchProductTypes)
</script>
