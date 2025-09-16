<template>
  <div>
    <label for="magasin-select">Magasin :</label>
    <template v-if="isAdmin">
      <!-- Seul l'admin peut changer de magasin -->
      <select
        id="magasin-select"
        v-model="selectedMagasinId"
        @change="onChange"
      >
        <option
          v-for="magasin in magasins"
          :key="magasin.id"
          :value="magasin.id"
        >
          {{ magasin.nom }}
        </option>
      </select>
    </template>
    <template v-else>
      <!-- Les non-admins voient seulement leur magasin, pas de select -->
      <span class="font-semibold text-gray-700 ml-2">
        {{ assignedMagasinName }}
      </span>
    </template>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useMagasinStore } from "../composables/useMagasinStore";
import { useSupabaseClient } from "#imports";
import { useCurrentUser } from "../composables/useCurrentUser";

const magasinStore = useMagasinStore();
const magasins = ref<Array<{ id: string; nom: string }>>([]);
const selectedMagasinId = ref("");
const supabase = useSupabaseClient();
const { userRoles, currentUser } = useCurrentUser();

const isAdmin = ref(false);
const assignedMagasinName = ref("");

onMounted(async () => {
  const { data } = await supabase.from("magasins").select("id, nom");
  magasins.value = Array.isArray(data) ? data : [];
  magasinStore.setMagasins(magasins.value);

  // Déterminer si l'utilisateur est admin
  isAdmin.value = userRoles.value?.includes("admin");

  if (isAdmin.value) {
    // Admin : peut changer de magasin
    if (
      magasinStore.magasinId &&
      Array.isArray(magasins.value) &&
      magasins.value.length > 0 &&
      magasins.value.some((m) => m.id === magasinStore.magasinId)
    ) {
      selectedMagasinId.value = magasinStore.magasinId;
    } else if (
      Array.isArray(magasins.value) &&
      magasins.value.length > 0 &&
      magasins.value[0]
    ) {
      selectedMagasinId.value = magasins.value[0].id ?? "";
      magasinStore.setMagasinId(selectedMagasinId.value);
    }
    // Watch la sélection uniquement pour admin
    watch(
      selectedMagasinId,
      (newId) => {
        magasinStore.setMagasinId(newId);
      },
      { immediate: false }
    );
  }
});

// Synchronisation pour les non-admins : dès que magasins ou currentUser changent
watch(
  [magasins, currentUser],
  ([magasinsVal, userVal]) => {
    if (!isAdmin.value) {
      const userMagasinId =
        userVal && userVal.magasin_id ? userVal.magasin_id : null;
      if (
        userMagasinId &&
        Array.isArray(magasinsVal) &&
        magasinsVal.length > 0 &&
        magasinsVal.some((m) => m.id === userMagasinId)
      ) {
        selectedMagasinId.value = userMagasinId;
        magasinStore.setMagasinId(userMagasinId);
        assignedMagasinName.value =
          magasinsVal.find((m) => m.id === userMagasinId)?.nom || "";
      } else {
        selectedMagasinId.value = "";
        assignedMagasinName.value = "";
      }
    }
  },
  { immediate: true }
);

function onChange() {
  // La sélection n'est possible que pour les admins
}
</script>
