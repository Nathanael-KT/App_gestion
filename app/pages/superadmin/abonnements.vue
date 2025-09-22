<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSupabaseClient } from "#imports";

const supabase = useSupabaseClient();
const companies = ref<
  Array<{
    id: string;
    name: string;
    subscription: {
      is_paid: boolean;
      next_due_date: string | null;
    };
  }>
>([]);
const loading = ref(true);

async function fetchCompanies() {
  loading.value = true;
  // Récupère toutes les sociétés et leur abonnement
  const { data, error } = await supabase
    .from("company_settings")
    .select("id, company_name, company_subscription(is_paid, next_due_date)");
  if (!error && Array.isArray(data)) {
    companies.value = data.map(
      (row: {
        id: string;
        company_name: string;
        company_subscription: Array<{
          is_paid: boolean;
          next_due_date: string | null;
        }>;
      }) => ({
        id: row.id,
        name: row.company_name,
        subscription: {
          is_paid: row.company_subscription?.[0]?.is_paid ?? false,
          next_due_date: row.company_subscription?.[0]?.next_due_date ?? null,
        },
      })
    );
  }
  loading.value = false;
}

async function activateSubscription(companyId: string) {
  // Active l'abonnement jusqu'au 28 du mois suivant
  const now = new Date();
  let nextDueDate;
  if (now.getDate() < 28) {
    // Si on est avant le 28, prochaine échéance = 28 du mois courant
    nextDueDate = new Date(now.getFullYear(), now.getMonth(), 28);
    // Mais si aujourd'hui est déjà le 28, on va au mois suivant
    if (now.getDate() === 28) {
      nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 28);
    }
  } else {
    // Si on est après le 28, prochaine échéance = 28 du mois suivant
    nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 28);
  }
  // Vérifie si l'abonnement existe déjà
  const { data: subData, error: subError } = await supabase
    .from("company_subscription")
    .select("id")
    .eq("company_id", companyId)
    .single<{ id: string }>();
  if (!subError && subData?.id) {
    // Update si existe
    await supabase
      .from("company_subscription")
      .update<{
        is_paid: boolean;
        next_due_date: string;
        last_payment_date: string;
      }>({
        is_paid: true,
        next_due_date: nextDueDate.toISOString().slice(0, 10),
        last_payment_date: now.toISOString().slice(0, 10),
      })
      .eq("company_id", companyId);
  } else {
    // Insert sinon
    await supabase.from("company_subscription").insert<{
      company_id: string;
      is_paid: boolean;
      next_due_date: string;
      last_payment_date: string;
    }>([
      {
        company_id: companyId,
        is_paid: true,
        next_due_date: nextDueDate.toISOString().slice(0, 10),
        last_payment_date: now.toISOString().slice(0, 10),
      },
    ]);
  }
  await fetchCompanies();
}

onMounted(fetchCompanies);
</script>

<template>
    <div class="max-w-6xl mx-auto py-10">
        <h1 class="text-3xl font-extrabold mb-8 text-center text-blue-700">
            Gestion des abonnements sociétés
        </h1>
        <div v-if="loading" class="flex justify-center items-center h-40">
            <span class="animate-pulse text-blue-500 text-lg">Chargement...</span>
        </div>
        <div v-else>
            <div class="overflow-x-auto shadow-lg rounded-lg bg-white">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-blue-50">
                        <tr>
                            <th class="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase">Société</th>
                            <th class="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase">Abonnement actif</th>
                            <th class="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase">Mois de paiement</th>
                            <th class="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase">Date de paiement</th>
                            <th class="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase">Prochaine échéance</th>
                            <th class="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-100">
                        <tr v-for="company in companies" :key="company.id" class="hover:bg-blue-50 transition">
                            <td class="px-6 py-4 font-medium text-gray-900">
                                {{ company.name }}
                            </td>
                            <td class="px-6 py-4">
                                <span
                                    :class="company.subscription.is_paid
                                        ? 'bg-green-100 text-green-700 px-2 py-1 rounded-full'
                                        : 'bg-red-100 text-red-700 px-2 py-1 rounded-full'"
                                >
                                    {{ company.subscription.is_paid ? "Oui" : "Non" }}
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                <span
                                    :class="company.subscription.is_paid
                                        ? 'text-green-700 font-semibold'
                                        : 'text-red-700 font-semibold'"
                                >
                                    {{
                                        company.subscription.is_paid &&
                                        company.subscription.next_due_date
                                            ? new Date(company.subscription.next_due_date).toLocaleString("fr-FR", { month: "long" })
                                            : "-"
                                    }}
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                {{
                                    company.subscription.is_paid &&
                                    company.subscription.next_due_date
                                        ? new Date(company.subscription.next_due_date).toISOString().slice(0, 10)
                                        : "-"
                                }}
                            </td>
                            <td class="px-6 py-4">
                                {{ company.subscription.next_due_date || "-" }}
                            </td>
                            <td class="px-6 py-4">
                                <button
                                    v-if="!company.subscription.is_paid"
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow transition"
                                    @click="activateSubscription(company.id)"
                                >
                                    Activer
                                </button>
                                <button
                                    v-else
                                    class="bg-gray-200 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
                                    disabled
                                >
                                    Actif
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
