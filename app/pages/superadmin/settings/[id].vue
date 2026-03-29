<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div>
          <div
            class="h-14 w-14 rounded-full overflow-hidden flex items-center justify-center bg-white shadow border border-gray-200"
          >
            <CompanyLogo
              :company-id="companyId"
              :size="56"
              class="object-cover h-full w-full"
            />
          </div>
        </div>
        <div>
          <h1 class="text-3xl font-extrabold text-blue-700 mb-1">
            Paramètres de la compagnie
          </h1>
          <p class="text-gray-500">
            Gérez les utilisateurs et magasins associés à cette compagnie.
          </p>
        </div>
      </div>
      <div class="flex gap-4">
        <UButton
          icon="heroicons:user-plus-20-solid"
          size="lg"
          color="secondary"
          class="rounded-full shadow"
          @click="openUserForm"
          >Nouvel utilisateur</UButton
        >
        <UButton
          icon="heroicons:plus-20-solid"
          size="lg"
          color="primary"
          class="rounded-full shadow"
          @click="openMagasinForm"
          >Ajouter magasin</UButton
        >
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Utilisateurs -->
      <div
        class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-8"
      >
        <h2
          class="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2"
        >
          <UIcon
            name="heroicons:users-20-solid"
            class="h-7 w-7 text-blue-600"
          />
          Utilisateurs
        </h2>
        <div class="flex items-center justify-between mb-6">
          <span class="text-base text-blue-700 font-semibold"
            >{{ users.length }} utilisateur{{
              users.length > 1 ? "s" : ""
            }}</span
          >
        </div>
        <div v-if="loadingUsers" class="py-8 text-center">
          <UIcon
            name="heroicons:arrow-path-20-solid"
            class="h-8 w-8 mx-auto animate-spin text-blue-400"
          />
          <p class="mt-2 text-blue-500">Chargement des utilisateurs...</p>
        </div>
        <div v-else>
          <div v-if="users.length === 0" class="py-8 text-center text-blue-400">
            Aucun utilisateur
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="user in users"
              :key="user.id"
              class="bg-white rounded-xl shadow flex items-center justify-between px-5 py-4"
            >
              <div class="flex items-center gap-3">
                <div
                  class="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center font-bold text-blue-700 text-lg border"
                >
                  {{ getInitials(user.name || user.email) }}
                </div>
                <div>
                  <div class="font-semibold text-gray-900">
                    {{ user.name || user.email }}
                  </div>
                  <div class="text-xs text-gray-500">{{ user.email }}</div>
                  <div class="flex gap-1 mt-1">
                    <span
                      v-for="role in user.roles"
                      :key="role"
                      class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 shadow"
                      >{{ getRoleLabel(role) }}</span
                    >
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <UButton
                  icon="heroicons:pencil-square-20-solid"
                  size="sm"
                  color="primary"
                  class="rounded-full"
                  @click="editUser(user)"
                  >Modifier</UButton
                >
                <UButton
                  icon="heroicons:trash-20-solid"
                  size="sm"
                  color="error"
                  class="rounded-full"
                  @click="confirmDeleteUser(user)"
                  >Supprimer</UButton
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Magasins -->
      <div
        class="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border border-green-200 p-8"
      >
        <h2
          class="text-xl font-bold text-green-900 mb-6 flex items-center gap-2"
        >
          <UIcon
            name="heroicons:building-storefront-20-solid"
            class="h-7 w-7 text-green-600"
          />
          Magasins
        </h2>
        <div class="flex items-center justify-between mb-6">
          <span class="text-base text-green-700 font-semibold"
            >{{ magasins.length }} magasin{{
              magasins.length > 1 ? "s" : ""
            }}</span
          >
        </div>
        <div v-if="loadingMagasins" class="py-8 text-center">
          <UIcon
            name="heroicons:arrow-path-20-solid"
            class="h-8 w-8 mx-auto animate-spin text-green-400"
          />
          <p class="mt-2 text-green-500">Chargement des magasins...</p>
        </div>
        <div v-else>
          <div
            v-if="magasins.length === 0"
            class="py-8 text-center text-green-400"
          >
            Aucun magasin
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="magasin in magasins"
              :key="magasin.id"
              class="bg-white rounded-xl shadow flex items-center justify-between px-5 py-4"
            >
              <div>
                <div class="font-semibold text-gray-900">{{ magasin.nom }}</div>
                <div class="text-xs text-gray-500">{{ magasin.adresse }}</div>
                <div class="text-xs text-gray-500">{{ magasin.telephone }}</div>
                <div class="text-xs text-gray-500">{{ magasin.email }}</div>
              </div>
              <div class="flex gap-2">
                <UButton
                  icon="heroicons:pencil-square-20-solid"
                  size="sm"
                  color="warning"
                  class="rounded-full"
                  @click="editMagasin(magasin)"
                  >Modifier</UButton
                >
                <UButton
                  icon="heroicons:trash-20-solid"
                  size="sm"
                  color="error"
                  class="rounded-full"
                  @click="confirmDeleteMagasin(magasin)"
                  >Supprimer</UButton
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal utilisateur -->
    <UModal
      v-model:open="showUserForm"
      :title="userForm.id ? 'Modifier utilisateur' : 'Nouvel utilisateur'"
      :ui="{ footer: 'justify-end', body: 'p-8' }"
    >
      <template #body>
        <form class="space-y-10" @submit.prevent="saveUser">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <UFormField label="Nom complet" required class="">
              <UInput
                v-model="userForm.name"
                placeholder="Entrez le nom complet"
                class="rounded-xl shadow-sm"
              />
            </UFormField>
            <UFormField label="Adresse email" required class="">
              <UInput
                v-model="userForm.email"
                type="email"
                placeholder="exemple@domaine.com"
                class="rounded-xl shadow-sm"
              />
            </UFormField>
            <UFormField label="Téléphone" class="">
              <UInput
                v-model="userForm.phone"
                placeholder="Numéro de téléphone"
                class="rounded-xl shadow-sm"
              />
            </UFormField>
            <UFormField
              v-if="!userForm.id"
              label="Mot de passe"
              required
              class=""
            >
              <UInput
                v-model="userForm.password"
                type="password"
                placeholder="Minimum 8 caractères"
                class="rounded-xl shadow-sm"
              />
            </UFormField>
            <UFormField label="Magasin associé" required class="">
              <USelect
                v-model="userForm.magasin_id"
                :items="magasins.map((m) => ({ label: m.nom, value: m.id }))"
                placeholder="Sélectionner un magasin"
                class="rounded-xl shadow-sm"
              />
            </UFormField>
          </div>

          <UFormField label="Rôles" required class="">
            <div class="flex gap-4 flex-wrap">
              <UCheckbox
                v-for="role in availableRoles"
                :key="role.value"
                :model-value="userForm.roles.includes(role.value)"
                :label="role.label"
                class="rounded-lg px-4 py-2 shadow"
                @update:model-value="
                  (checked) => {
                    if (checked) {
                      if (!userForm.roles.includes(role.value))
                        userForm.roles.push(role.value);
                    } else {
                      userForm.roles = userForm.roles.filter(
                        (r) => r !== role.value,
                      );
                    }
                  }
                "
              />
            </div>
          </UFormField>
          <div class="flex justify-end gap-6 mt-10">
            <UButton
              type="submit"
              color="success"
              icon="heroicons-check-20-solid"
              size="lg"
              class="rounded-full px-8 shadow-lg"
              >{{ userForm.id ? "Mettre à jour" : "Enregistrer" }}</UButton
            >
            <UButton
              type="button"
              color="neutral"
              icon="heroicons-x-mark-20-solid"
              size="lg"
              class="rounded-full px-8 shadow-lg"
              @click="showUserForm = false"
              >Annuler</UButton
            >
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal magasin -->
    <UModal
      v-model:open="showMagasinForm"
      :title="magasinForm.id ? 'Modifier magasin' : 'Ajouter magasin'"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <form class="space-y-6" @submit.prevent="saveMagasin">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <UFormField label="Nom du magasin" required>
              <UInput
                v-model="magasinForm.nom"
                placeholder="Nom du magasin"
                type="text"
              />
            </UFormField>
            <UFormField label="Adresse">
              <UInput
                v-model="magasinForm.adresse"
                placeholder="Adresse du magasin"
                type="text"
              />
            </UFormField>
            <UFormField label="Téléphone">
              <UInput
                v-model="magasinForm.telephone"
                placeholder="Téléphone du magasin"
                type="tel"
              />
            </UFormField>
            <UFormField label="Email">
              <UInput
                v-model="magasinForm.email"
                placeholder="Email du magasin"
                type="email"
              />
            </UFormField>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <UButton
              type="submit"
              color="success"
              icon="heroicons-check-20-solid"
              >Enregistrer</UButton
            >
            <UButton
              type="button"
              color="neutral"
              icon="heroicons-x-mark-20-solid"
              @click="showMagasinForm = false"
              >Annuler</UButton
            >
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useSupabaseClient } from "#imports";
import { useRoute } from "vue-router";

const route = useRoute();
const companyId = route.params.id as string;
const supabase = useSupabaseClient();

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Session invalide: veuillez vous reconnecter.");
  }

  return session.access_token;
}

async function callSettingsApi<T = unknown>(
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<T> {
  if (!companyId) {
    throw new Error("Identifiant compagnie manquant dans l'URL.");
  }

  const token = await getAccessToken();
  return await $fetch<T>(`/api/superadmin/settings/${companyId}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });
}

// Utilisateurs
interface User {
  magasin_id: string | null;
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  roles: string[];
}
const users = ref<User[]>([]);
const loadingUsers = ref(false);
const showUserForm = ref(false);
const userForm = reactive({
  id: null as string | null,
  name: "",
  email: "",
  phone: "",
  password: "",
  roles: [] as string[],
  magasin_id: "",
});

// Magasins
interface Magasin {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
}
const magasins = ref<Magasin[]>([]);
const loadingMagasins = ref(false);
const showMagasinForm = ref(false);
const magasinForm = reactive({
  id: null as string | null,
  nom: "",
  adresse: "",
  telephone: "",
  email: "",
});

// Rôles disponibles
const availableRoles = [
  { value: "admin", label: "Administrateur" },
  { value: "magasinier", label: "Magasinier" },
  { value: "employe", label: "Employé" },
];

function getRoleLabel(role: string) {
  const found = availableRoles.find((r) => r.value === role);
  return found ? found.label : role;
}
function getInitials(name: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Chargement utilisateurs
async function loadUsers() {
  loadingUsers.value = true;
  try {
    const response = await callSettingsApi<{ users: User[] }>("GET");
    users.value = Array.isArray(response?.users) ? response.users : [];
  } catch (error) {
    console.error("[superadmin settings] loadUsers API error:", error);
    users.value = [];
  } finally {
    loadingUsers.value = false;
  }
}

// Chargement magasins
async function loadMagasins() {
  loadingMagasins.value = true;
  try {
    const response = await callSettingsApi<{ magasins: Magasin[] }>("GET");
    magasins.value = Array.isArray(response?.magasins) ? response.magasins : [];
  } catch (error) {
    console.error("[superadmin settings] loadMagasins API error:", error);
    magasins.value = [];
  } finally {
    loadingMagasins.value = false;
  }
}

async function loadAllData() {
  loadingUsers.value = true;
  loadingMagasins.value = true;
  try {
    const response = await callSettingsApi<{
      users: User[];
      magasins: Magasin[];
    }>("GET");
    users.value = Array.isArray(response?.users) ? response.users : [];
    magasins.value = Array.isArray(response?.magasins) ? response.magasins : [];
  } catch (error) {
    console.error("[superadmin settings] loadAllData API error:", error);
    users.value = [];
    magasins.value = [];
    alert("Impossible de charger les données utilisateurs/magasins.");
  } finally {
    loadingUsers.value = false;
    loadingMagasins.value = false;
  }
}

// User CRUD
function openUserForm() {
  userForm.id = null;
  userForm.name = "";
  userForm.email = "";
  userForm.phone = "";
  userForm.password = "";
  userForm.roles = [];
  userForm.magasin_id = "";
  showUserForm.value = true;
}
function editUser(user: User) {
  userForm.id = user.id;
  userForm.name = user.name || "";
  userForm.email = user.email;
  userForm.phone = user.phone || "";
  userForm.password = "";
  userForm.roles = [...user.roles];
  userForm.magasin_id = user.magasin_id || "";
  showUserForm.value = true;
}
async function saveUser() {
  if (
    !userForm.name ||
    !userForm.email ||
    userForm.roles.length === 0 ||
    !userForm.magasin_id
  ) {
    alert(
      "Veuillez remplir tous les champs obligatoires (nom, email, magasin, roles).",
    );
    return;
  }

  if (!userForm.id && (!userForm.password || userForm.password.length < 8)) {
    alert(
      "Le mot de passe est obligatoire (8 caractères minimum) pour un nouvel utilisateur.",
    );
    return;
  }

  if (!userForm.id) {
    // Création via route serveur (service role) pour respecter RLS + Auth.
    try {
      const token = await getAccessToken();

      await $fetch("/api/superadmin/create-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: {
          companyId,
          email: userForm.email,
          password: userForm.password,
          name: userForm.name,
          phone: userForm.phone || null,
          roles: userForm.roles,
          magasin_id: userForm.magasin_id,
        },
      });

      await loadUsers();
      showUserForm.value = false;

      userForm.id = null;
      userForm.name = "";
      userForm.email = "";
      userForm.phone = "";
      userForm.password = "";
      userForm.roles = [];
      userForm.magasin_id = "";
    } catch (error) {
      console.error("[superadmin settings] saveUser create error:", error);
      alert(
        error instanceof Error ? error.message : "Erreur création utilisateur",
      );
    }
  } else {
    // Edition via API serveur (évite blocages RLS superadmin multi-company)
    try {
      await callSettingsApi("POST", {
        action: "updateUser",
        payload: {
          userId: userForm.id,
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone || null,
          roles: userForm.roles,
          magasin_id: userForm.magasin_id,
        },
      });
      await loadUsers();
      showUserForm.value = false;
    } catch (error) {
      console.error("[superadmin settings] saveUser update error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour de l'utilisateur",
      );
    }
  }
}
function confirmDeleteUser(user: User) {
  if (!confirm("Confirmer la suppression de cet utilisateur ?")) return;
  callSettingsApi("POST", {
    action: "deleteUser",
    payload: {
      userId: user.id,
    },
  })
    .then(() => {
      void loadUsers();
    })
    .catch((error) => {
      console.error("[superadmin settings] delete user error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression",
      );
    });
}

// Magasin CRUD
function openMagasinForm() {
  magasinForm.id = null;
  magasinForm.nom = "";
  magasinForm.adresse = "";
  magasinForm.telephone = "";
  magasinForm.email = "";
  showMagasinForm.value = true;
}
function editMagasin(magasin: Magasin) {
  magasinForm.id = magasin.id;
  magasinForm.nom = magasin.nom;
  magasinForm.adresse = magasin.adresse || "";
  magasinForm.telephone = magasin.telephone || "";
  magasinForm.email = magasin.email || "";
  showMagasinForm.value = true;
}
async function saveMagasin() {
  if (!magasinForm.nom) {
    alert("Le nom du magasin est obligatoire.");
    return;
  }
  if (!magasinForm.id) {
    // Création via API serveur (résout RLS sur table magasins)
    try {
      await callSettingsApi("POST", {
        action: "createMagasin",
        payload: {
          nom: magasinForm.nom,
          adresse: magasinForm.adresse || null,
          telephone: magasinForm.telephone || null,
          email: magasinForm.email || null,
        },
      });
      await loadMagasins();
      showMagasinForm.value = false;
    } catch (error) {
      console.error("[superadmin settings] saveMagasin create error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la création du magasin",
      );
    }
  } else {
    // Edition via API serveur (résout RLS sur table magasins)
    try {
      await callSettingsApi("POST", {
        action: "updateMagasin",
        payload: {
          magasinId: magasinForm.id,
          nom: magasinForm.nom,
          adresse: magasinForm.adresse || null,
          telephone: magasinForm.telephone || null,
          email: magasinForm.email || null,
        },
      });
      await loadMagasins();
      showMagasinForm.value = false;
    } catch (error) {
      console.error("[superadmin settings] saveMagasin update error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la mise à jour du magasin",
      );
    }
  }
}
function confirmDeleteMagasin(magasin: Magasin) {
  if (!confirm("Confirmer la suppression de ce magasin ?")) return;
  callSettingsApi("POST", {
    action: "deleteMagasin",
    payload: {
      magasinId: magasin.id,
    },
  })
    .then(() => {
      void loadMagasins();
    })
    .catch((error) => {
      console.error("[superadmin settings] delete magasin error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression",
      );
    });
}

onMounted(() => {
  void loadAllData();
});
</script>
