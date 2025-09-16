<template>
  <div class="company-selector">
    <!-- Loading state -->
    <div v-if="loading" class="flex items-center space-x-2">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"/>
      <span class="text-sm text-gray-500">Chargement...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-sm text-red-600">
      {{ error }}
    </div>

    <!-- Admin view - can switch companies -->
    <div v-else-if="canManageCompanies" class="flex items-center space-x-3">
      <div class="flex items-center space-x-2">
        <UIcon name="i-lucide-building" class="w-4 h-4 text-gray-600" />
        <label for="company-select" class="text-sm font-medium text-gray-700">
          Compagnie:
        </label>
      </div>
      
      <USelectMenu
        id="company-select"
        v-model="selectedCompanyModel"
        :options="userCompanies"
        option-attribute="name"
        value-attribute="id"
        placeholder="Sélectionner une compagnie"
        class="min-w-48"
        size="sm"
      >
        <template #leading>
          <UIcon 
            name="i-lucide-building-2" 
            class="w-4 h-4" 
            :class="selectedCompanyModel ? 'text-blue-600' : 'text-gray-400'"
          />
        </template>
        
        <template #option="{ option }">
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center space-x-2">
              <UIcon name="i-lucide-building-2" class="w-4 h-4 text-blue-600" />
              <span>{{ option.name }}</span>
            </div>
            <UBadge
              v-if="option.status"
              :color="getStatusColor(option.status)"
              size="xs"
            >
              {{ getStatusLabel(option.status) }}
            </UBadge>
          </div>
        </template>
      </USelectMenu>

      <!-- Company management buttons for admins -->
      <div class="flex items-center space-x-1">
        <UButton
          icon="i-lucide-settings"
          size="xs"
          color="gray"
          variant="ghost"
          :to="`/parametres/companies/${selectedCompanyModel}`"
          title="Paramètres de la compagnie"
        />
        <UButton
          icon="i-lucide-plus"
          size="xs"
          color="blue"
          variant="ghost"
          to="/parametres/companies/add"
          title="Créer une nouvelle compagnie"
        />
      </div>
    </div>

    <!-- Non-admin view - display only -->
    <div v-else class="flex items-center space-x-2">
      <div class="flex items-center space-x-2">
        <UIcon name="i-lucide-building" class="w-4 h-4 text-gray-600" />
        <span class="text-sm font-medium text-gray-700">Compagnie:</span>
      </div>
      
      <div class="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-lg">
        <UIcon name="i-lucide-building-2" class="w-4 h-4 text-blue-600" />
        <span class="text-sm font-semibold text-gray-900">
          {{ currentCompany?.name || 'Non définie' }}
        </span>
        <UBadge
          v-if="currentCompany?.status"
          :color="getStatusColor(currentCompany.status)"
          size="xs"
        >
          {{ getStatusLabel(currentCompany.status) }}
        </UBadge>
      </div>
    </div>

    <!-- Company info tooltip -->
    <UTooltip v-if="currentCompany" class="ml-2">
      <template #trigger>
        <UIcon 
          name="i-lucide-info" 
          class="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" 
        />
      </template>
      <template #content>
        <div class="space-y-1 text-xs">
          <div><strong>Email:</strong> {{ currentCompany.email }}</div>
          <div v-if="currentCompany.phone">
            <strong>Téléphone:</strong> {{ currentCompany.phone }}
          </div>
          <div v-if="currentCompany.address">
            <strong>Adresse:</strong> {{ currentCompany.address }}
          </div>
          <div v-if="companyStats">
            <strong>Statistiques:</strong>
            {{ companyStats.users }} utilisateurs, 
            {{ companyStats.magasins }} magasins, 
            {{ companyStats.products }} produits
          </div>
        </div>
      </template>
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue';
import { useCompanyManagement } from '~/composables/useCompanyManagement';

const {
  currentCompany,
  selectedCompanyId,
  userCompanies,
  canManageCompanies,
  loading,
  error,
  selectCompany,
  getCompanyStats,
  initializeCompanyContext
} = useCompanyManagement();

// Local state for company stats
const companyStats = ref<{ users: number; magasins: number; products: number } | null>(null);

// Computed model for the select component
const selectedCompanyModel = computed({
  get: () => selectedCompanyId.value,
  set: async (value: string | null) => {
    if (value && value !== selectedCompanyId.value) {
      await selectCompany(value);
    }
  }
});

// Watch for company changes to load stats
watch(currentCompany, async (newCompany) => {
  if (newCompany?.id) {
    companyStats.value = await getCompanyStats(newCompany.id);
  } else {
    companyStats.value = null;
  }
}, { immediate: true });

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'green';
    case 'inactive': return 'gray';
    case 'suspended': return 'red';
    default: return 'gray';
  }
};

// Status label mapping
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'suspended': return 'Suspendue';
    default: return 'Inconnue';
  }
};

// Initialize on mount
onMounted(async () => {
  await initializeCompanyContext();
});

// Define component props for customization
interface Props {
  showStats?: boolean;
  showManagementButtons?: boolean;
  compact?: boolean;
}

withDefaults(defineProps<Props>(), {
  showStats: true,
  showManagementButtons: true,
  compact: false
});
</script>

<style scoped>
.company-selector {
  @apply flex items-center;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .company-selector {
    @apply flex-col items-start space-y-2;
  }
}
</style>