<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Gestion des rôles par compagnie</h1>
    <div v-if="loading" class="text-gray-500">Chargement...</div>
    <div v-else>
      <div
        v-for="company in companies"
        :key="company.id"
        class="mb-8 p-4 border rounded-lg bg-white shadow"
      >
        <h2 class="text-xl font-semibold mb-2">{{ company.name }}</h2>
        <table class="w-full text-left border">
          <thead>
            <tr class="bg-gray-100">
              <th class="p-2">Utilisateur</th>
              <th class="p-2">Rôle</th>
              <th class="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in company.users" :key="user.id">
              <td class="p-2">{{ user.name }}</td>
              <td class="p-2">{{ user.role }}</td>
              <td class="p-2">
                <select
                  v-model="user.action"
                  class="border rounded px-2 py-1"
                  @change="updateUserAction(company.id, user.id, user.action)"
                >
                  <option value="view">View uniquement</option>
                  <option value="update">Accès complet (update)</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSupabaseClient } from "#imports";
const supabase = useSupabaseClient();
const loading = ref(true);
const companies = ref<
  Array<{
    id: string;
    name: string;
    users: Array<{ id: string; name: string; role: string; action: string }>;
  }>
>([]);
const feedback = ref("");

async function fetchCompaniesWithUsers() {
  loading.value = true;
  feedback.value = "";
  // Récupère toutes les compagnies
  const { data: companyData, error: companyError } = await supabase
    .from("company_settings")
    .select("id, company_name");
  if (companyError) {
    feedback.value = "Erreur chargement compagnies";
    loading.value = false;
    return;
  }
  // Récupère tous les utilisateurs et leurs rôles/actions par compagnie
  const { data: userRolesData, error: userRolesError } = await supabase
    .from("user_company_roles")
    .select("company_id, user_id, action, role, users(name)");
  if (userRolesError) {
    feedback.value = "Erreur chargement utilisateurs";
    loading.value = false;
    return;
  }
  // Structure les données pour affichage
  companies.value = (companyData || []).map((company: any) => {
    const users = (userRolesData || [])
      .filter((ur: any) => ur.company_id === company.id)
      .map((ur: any) => ({
        id: ur.user_id,
        name: ur.users?.name || ur.user_id,
        role: ur.role,
        action: ur.action,
      }));
    return {
      id: company.id,
      name: company.company_name,
      users,
    };
  });
  loading.value = false;
}

async function updateUserAction(
  companyId: string,
  userId: string,
  action: string
) {
  feedback.value = "";
  const { error } = await supabase
    .from("user_company_roles")
    .update({ action })
    .eq("company_id", companyId)
    .eq("user_id", userId);
  if (error) {
    feedback.value = "Erreur lors de la mise à jour";
  } else {
    feedback.value = "Action mise à jour avec succès";
  }
}

onMounted(fetchCompaniesWithUsers);
</script>

<style scoped>
table {
  border-collapse: collapse;
}
th,
td {
  border: 1px solid #e5e7eb;
}
</style>
