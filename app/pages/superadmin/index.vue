<template>
  <div class="w-full max-w-7xl mx-auto px-3 md:px-4 py-6 md:py-8">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <UIcon name="heroicons:shield-check-20-solid" class="w-8 h-8 text-amber-500" />
          Super Admin Dashboard
        </h1>
        <p class="text-gray-500 mt-1 text-sm md:text-base">
          Vue d'ensemble globale • Contrôle total des entreprises, abonnements et accès
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          icon="i-heroicons-arrow-path"
          variant="outline"
          :loading="loadingStats"
          @click="loadStats"
        >
          Actualiser
        </UButton>
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          size="lg"
          class="shadow"
          @click="showCreateForm = true"
        >
          Nouvelle compagnie
        </UButton>
      </div>
    </div>

    <!-- KPIs Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold">Entreprises</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.totalCompanies }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ stats.activeCompanies }} actives • {{ stats.blockedCompanies }} bloquées</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <UIcon name="heroicons:building-office-2-20-solid" class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold">Utilisateurs</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ stats.totalUsers }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ stats.adminUsers }} admins</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <UIcon name="heroicons:users-20-solid" class="w-6 h-6 text-emerald-600" />
          </div>
        </div>
        <UButton
          class="mt-3"
          size="xs"
          variant="ghost"
          to="/superadmin/utilisateurs"
        >
          Gérer les utilisateurs
        </UButton>
      </div>

      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold">MRR Estimé</p>
            <p class="text-2xl font-bold text-gray-900 mt-1">{{ formatCurrency(stats.mrrCents) }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ stats.paidSubscriptions }} abonnements payés</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <UIcon name="heroicons:currency-euro-20-solid" class="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500 font-semibold">Alertes</p>
            <p class="text-2xl font-bold" :class="stats.overdueSubscriptions > 0 ? 'text-red-600' : 'text-gray-900'">
              {{ stats.overdueSubscriptions + stats.blockedCompanies }}
            </p>
            <p class="text-xs text-gray-400 mt-1">{{ stats.overdueSubscriptions }} impayés • {{ stats.blockedCompanies }} bloquées</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <UIcon name="heroicons:exclamation-triangle-20-solid" class="w-6 h-6 text-red-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary KPIs -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <UIcon name="heroicons:chart-bar-20-solid" class="w-5 h-5 text-blue-500" />
          Abonnements par statut
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Actif</span>
            <span class="font-semibold text-emerald-600">{{ stats.statusActif }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">En attente</span>
            <span class="font-semibold text-amber-600">{{ stats.statusEnAttente }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Bloqué</span>
            <span class="font-semibold text-red-600">{{ stats.statusBloque }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Inactif</span>
            <span class="font-semibold text-gray-500">{{ stats.statusInactif }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <UIcon name="heroicons:lock-closed-20-solid" class="w-5 h-5 text-amber-500" />
          Contrôle d'accès
        </h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Entreprises bloquées</span>
            <UBadge :color="stats.blockedCompanies > 0 ? 'error' : 'success'" variant="soft">
              {{ stats.blockedCompanies }}
            </UBadge>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">Menus bloqués (total)</span>
            <UBadge color="neutral" variant="soft">{{ stats.totalBlockedMenus }}</UBadge>
          </div>
          <UButton
            size="xs"
            variant="outline"
            icon="i-heroicons:adjustments-horizontal"
            to="/superadmin/abonnements"
          >
            Gérer abonnements
          </UButton>
        </div>
      </div>

      <div class="bg-white rounded-xl border p-5 shadow-sm">
        <h3 class="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <UIcon name="heroicons:clock-20-solid" class="w-5 h-5 text-purple-500" />
          Activité récente
        </h3>
        <div class="space-y-2 text-sm">
          <p class="text-gray-600">Dernière création entreprise</p>
          <p class="font-medium text-gray-900 truncate">{{ stats.lastCompanyName || "—" }}</p>
          <p class="text-xs text-gray-400">{{ stats.lastCompanyDate ? formatDate(stats.lastCompanyDate) : "Aucune" }}</p>
          <div class="pt-2 flex gap-2">
            <UButton size="xs" variant="ghost" to="/superadmin/logs">Voir logs</UButton>
            <UButton size="xs" variant="ghost" to="/superadmin/backup">Backups</UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Companies List -->
    <div class="bg-white rounded-xl border shadow-sm p-4 md:p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-900">Entreprises</h2>
        <div class="flex items-center gap-2">
          <UInput v-model="search" placeholder="Rechercher..." icon="i-heroicons-magnifying-glass" size="sm" class="w-40 md:w-64" />
        </div>
      </div>
      <CompanyCard :search="search" />
    </div>

    <!-- Create Company Modal -->
    <UModal v-model:open="showCreateForm">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-bold mb-4">Créer une nouvelle compagnie</h3>
          <form @submit.prevent="createCompany" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nom de la compagnie *</label>
              <UInput v-model="createForm.company_name" class="w-full" placeholder="Mon Entreprise SARL" />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <UInput v-model="createForm.company_phone" class="w-full" placeholder="+33..." />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <UInput v-model="createForm.company_email" type="email" class="w-full" placeholder="contact@..." />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <UInput v-model="createForm.company_address" class="w-full" placeholder="123 Rue..." />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Logo</label>
              <input type="file" accept="image/*" class="w-full border rounded-lg p-2 text-sm" @change="onFileChange" />
            </div>

            <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{{ error }}</div>

            <div class="flex justify-end gap-2 pt-2">
              <UButton type="button" color="neutral" variant="outline" @click="showCreateForm = false">Annuler</UButton>
              <UButton type="submit" color="primary" :loading="loading" icon="i-heroicons-check">Créer</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSupabaseClient } from "#imports";
import CompanyCard from "../../components/CompanyCard.vue";
import { z } from "zod";

definePageMeta({ middleware: ["auth", "superadmin"] });

const supabase = useSupabaseClient() as any;
const showCreateForm = ref(false);
const search = ref("");
const loading = ref(false);
const loadingStats = ref(false);
const error = ref("");

const createForm = ref({
  company_name: "",
  company_phone: "",
  company_address: "",
  company_email: "",
  logo_file: null as File | null,
});

const CompanySettingsSchema = z.object({
  company_name: z.string().min(2),
  company_phone: z.string().optional(),
  company_email: z.string().email(),
  company_address: z.string().optional(),
});

const stats = ref({
  totalCompanies: 0,
  activeCompanies: 0,
  blockedCompanies: 0,
  totalUsers: 0,
  adminUsers: 0,
  mrrCents: 0,
  paidSubscriptions: 0,
  overdueSubscriptions: 0,
  statusActif: 0,
  statusEnAttente: 0,
  statusBloque: 0,
  statusInactif: 0,
  totalBlockedMenus: 0,
  lastCompanyName: "",
  lastCompanyDate: "" as string | null,
});

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

async function loadStats() {
  loadingStats.value = true;
  try {
    const { data: companies, error: compErr } = await supabase
      .from("company_settings")
      .select("id, company_name, blocked, blocked_menus, created_at");

    if (!compErr && companies) {
      stats.value.totalCompanies = companies.length;
      stats.value.blockedCompanies = companies.filter((c: any) => c.blocked === true).length;
      stats.value.activeCompanies = stats.value.totalCompanies - stats.value.blockedCompanies;
      stats.value.totalBlockedMenus = companies.reduce(
        (acc: number, c: any) => acc + (Array.isArray(c.blocked_menus) ? c.blocked_menus.length : 0),
        0
      );
      const sorted = [...companies].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      if (sorted[0]) {
        stats.value.lastCompanyName = sorted[0].company_name;
        stats.value.lastCompanyDate = sorted[0].created_at;
      }
    }

    const { data: users, error: usersErr } = await supabase
      .from("users")
      .select("id, roles");

    if (!usersErr && users) {
      stats.value.totalUsers = users.length;
      stats.value.adminUsers = users.filter((u: any) => Array.isArray(u.roles) && u.roles.includes("admin")).length;
    }

    const { data: subs, error: subsErr } = await supabase
      .from("company_subscription")
      .select("id, status, is_paid, plan_id");

    if (!subsErr && subs) {
      stats.value.paidSubscriptions = subs.filter((s: any) => s.is_paid === true).length;
      stats.value.statusActif = subs.filter((s: any) => s.status === "actif").length;
      stats.value.statusEnAttente = subs.filter((s: any) => s.status === "en_attente").length;
      stats.value.statusBloque = subs.filter((s: any) => s.status === "bloque").length;
      stats.value.statusInactif = subs.filter((s: any) => s.status === "inactif" || !s.status).length;

      // Overdue = en_attente or not paid but has due date logic could be enhanced
      stats.value.overdueSubscriptions = stats.value.statusEnAttente;
    }

    // MRR from subscription_plans join
    const { data: plans } = await supabase
      .from("subscription_plans")
      .select("id, price_cents")
      .eq("is_active", true);

    const planMap = new Map<string, number>();
    if (plans) {
      for (const p of plans) planMap.set(p.id, p.price_cents);
    }

    if (subs && plans) {
      let mrr = 0;
      for (const s of subs) {
        if (s.is_paid && s.plan_id && planMap.has(s.plan_id)) {
          mrr += planMap.get(s.plan_id) || 0;
        }
      }
      stats.value.mrrCents = mrr;
    }
  } catch (e) {
    // silent
  } finally {
    loadingStats.value = false;
  }
}

onMounted(() => {
  loadStats();
});

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  createForm.value.logo_file = target.files && target.files[0] ? target.files[0] : null;
}

async function createCompany() {
  error.value = "";
  const parse = CompanySettingsSchema.safeParse({
    company_name: createForm.value.company_name,
    company_phone: createForm.value.company_phone,
    company_email: createForm.value.company_email,
    company_address: createForm.value.company_address,
  });
  if (!parse.success) {
    error.value = "Données invalides - vérifiez nom et email";
    return;
  }
  loading.value = true;
  try {
    let logoUrl = "";
    const { data: insertData, error: insertError } = await supabase
      .from("company_settings")
      .insert([parse.data])
      .select();

    if (insertError || !insertData || !insertData[0]?.id) {
      error.value = insertError?.message || "Erreur création compagnie";
      loading.value = false;
      return;
    }

    const companyId = insertData[0].id;

    if (createForm.value.logo_file) {
      const fileExt = createForm.value.logo_file.name.split(".").pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `${companyId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("logo")
        .upload(filePath, createForm.value.logo_file, {
          cacheControl: "3600",
          upsert: true,
        });
      if (uploadError) {
        error.value = uploadError.message;
        loading.value = false;
        return;
      }
      logoUrl = supabase.storage.from("logo").getPublicUrl(filePath).data.publicUrl;
      await supabase.from("company_settings").update({ logo_url: logoUrl }).eq("id", companyId);
    }

    showCreateForm.value = false;
    createForm.value = {
      company_name: "",
      company_phone: "",
      company_address: "",
      company_email: "",
      logo_file: null,
    };
    await loadStats();
    window.location.reload();
  } catch {
    error.value = "Erreur lors de la création";
  } finally {
    loading.value = false;
  }
}
</script>
