<template>
  <div class="p-6 max-w-2xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Créer une nouvelle entreprise</h1>
      <p class="text-gray-600 mt-2">Remplissez les informations de votre entreprise</p>
    </div>

    <UCard>
      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Company Name -->
          <UFormGroup label="Nom de l'entreprise *" required>
            <UInput 
              v-model="form.name" 
              placeholder="Mon Entreprise SARL"
              :error="errors.name"
              required
            />
          </UFormGroup>

          <!-- Email -->
          <UFormGroup label="Email *" required>
            <UInput 
              v-model="form.email" 
              type="email"
              placeholder="contact@monentreprise.com"
              :error="errors.email"
              required
            />
          </UFormGroup>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- SIRET -->
          <UFormGroup label="Numéro SIRET">
            <UInput 
              v-model="form.siret" 
              placeholder="12345678901234"
              :error="errors.siret"
            />
          </UFormGroup>

          <!-- Phone -->
          <UFormGroup label="Téléphone">
            <UInput 
              v-model="form.phone" 
              type="tel"
              placeholder="+33 1 23 45 67 89"
              :error="errors.phone"
            />
          </UFormGroup>
        </div>

        <!-- Address -->
        <UFormGroup label="Adresse">
          <UTextarea 
            v-model="form.address" 
            placeholder="123 Rue de la Paix, 75001 Paris"
            :error="errors.address"
            rows="3"
          />
        </UFormGroup>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Website -->
          <UFormGroup label="Site web">
            <UInput 
              v-model="form.website" 
              type="url"
              placeholder="https://monentreprise.com"
              :error="errors.website"
            />
          </UFormGroup>

          <!-- Subscription Plan -->
          <UFormGroup label="Plan d'abonnement">
            <USelect 
              v-model="form.subscription_plan" 
              :options="subscriptionOptions"
              placeholder="Sélectionner un plan"
            />
          </UFormGroup>
        </div>

        <!-- Logo URL -->
        <UFormGroup label="URL du logo">
          <UInput 
            v-model="form.logo_url" 
            type="url"
            placeholder="https://monentreprise.com/logo.png"
            :error="errors.logo_url"
          />
          <template #help>
            <p class="text-sm text-gray-500">URL d'une image pour le logo de votre entreprise</p>
          </template>
        </UFormGroup>

        <!-- Active Status -->
        <UFormGroup label="Statut">
          <UCheckbox 
            v-model="form.is_active" 
            label="Entreprise active"
            help="Une entreprise inactive ne peut pas être utilisée"
          />
        </UFormGroup>

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t">
          <UButton 
            type="button" 
            color="gray" 
            @click="$router.go(-1)"
          >
            Annuler
          </UButton>
          <UButton 
            type="submit" 
            :loading="loading"
            :disabled="!isFormValid"
          >
            Créer l'entreprise
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { Company } from '~/types/company'

definePageMeta({
  title: 'Créer une entreprise',
  requiresAuth: true
})

const { createCompany, loading, error } = useCompany()
const toast = useToast()
const router = useRouter()

// Form data
const form = reactive({
  name: '',
  email: '',
  siret: '',
  phone: '',
  address: '',
  website: '',
  logo_url: '',
  subscription_plan: 'basic' as const,
  is_active: true
})

// Form validation errors
const errors = reactive({
  name: '',
  email: '',
  siret: '',
  phone: '',
  address: '',
  website: '',
  logo_url: ''
})

// Subscription plan options
const subscriptionOptions = [
  { label: 'Basic', value: 'basic' },
  { label: 'Premium', value: 'premium' },
  { label: 'Enterprise', value: 'enterprise' }
]

// Computed
const isFormValid = computed(() => {
  return form.name.trim() !== '' && 
         form.email.trim() !== '' && 
         isValidEmail(form.email)
})

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateForm(): boolean {
  // Reset errors
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = ''
  })

  let isValid = true

  // Validate required fields
  if (!form.name.trim()) {
    errors.name = 'Le nom de l\'entreprise est requis'
    isValid = false
  }

  if (!form.email.trim()) {
    errors.email = 'L\'email est requis'
    isValid = false
  } else if (!isValidEmail(form.email)) {
    errors.email = 'Format d\'email invalide'
    isValid = false
  }

  // Validate SIRET format if provided
  if (form.siret && form.siret.length !== 14) {
    errors.siret = 'Le SIRET doit contenir 14 chiffres'
    isValid = false
  }

  // Validate URLs if provided
  if (form.website && !form.website.startsWith('http')) {
    errors.website = 'L\'URL doit commencer par http:// ou https://'
    isValid = false
  }

  if (form.logo_url && !form.logo_url.startsWith('http')) {
    errors.logo_url = 'L\'URL doit commencer par http:// ou https://'
    isValid = false
  }

  return isValid
}

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    await createCompany({
      name: form.name.trim(),
      email: form.email.trim(),
      siret: form.siret.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      website: form.website.trim() || null,
      logo_url: form.logo_url.trim() || null,
      subscription_plan: form.subscription_plan,
      is_active: form.is_active
    })

    toast.add({
      title: 'Succès',
      description: 'Entreprise créée avec succès',
      color: 'green'
    })

    // Redirect to companies list
    await router.push('/entreprises')
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Impossible de créer l\'entreprise'
    toast.add({
      title: 'Erreur',
      description: errorMessage,
      color: 'red'
    })
  }
}

// Watch for API errors
watch(error, (newError) => {
  if (newError) {
    toast.add({
      title: 'Erreur',
      description: newError,
      color: 'red'
    })
  }
})
</script>