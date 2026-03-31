<template>
  <div class="flex items-center text-white text-sm">
    <span class="hidden sm:inline opacity-75">Magasin :</span>
    <span class="font-semibold text-white ml-1 sm:ml-2 max-w-[100px] sm:max-w-[140px] truncate">
      <span v-if="assignedMagasinName">{{ assignedMagasinName }}</span>
      <span v-else aria-label="Aucun magasin sélectionné">—</span>
    </span>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useMagasinStore } from "../composables/useMagasinStore";
import { useCurrentUser } from "../composables/useCurrentUser";

const assignedMagasinName = ref("");
const { magasinId } = useCurrentUser();
const magasinStore = useMagasinStore();
const supabase = useSupabaseClient();
const magasins = ref<Array<{ id: string; nom: string; company_id: string }>>(
  [],
);

onMounted(async () => {
  // Charger tous les magasins
  const { data } = await supabase
    .from("magasins")
    .select("id, nom, company_id");
  magasins.value = Array.isArray(data)
    ? data.filter((m): m is { id: string; nom: string; company_id: string } =>
        Boolean(m.company_id),
      )
    : [];
  magasinStore.setMagasins(magasins.value);

  // Sélectionner automatiquement le magasin de l'utilisateur
  if (
    magasinId.value &&
    Array.isArray(magasins.value) &&
    magasins.value.length > 0 &&
    magasins.value.some((m) => m.id === magasinId.value)
  ) {
    assignedMagasinName.value =
      magasins.value.find((m) => m.id === magasinId.value)?.nom || "";
    magasinStore.setMagasinId(magasinId.value);
  } else {
    assignedMagasinName.value = "";
    magasinStore.setMagasinId("");
  }
});

watch(
  [magasinId, magasins],
  ([id, list]) => {
    if (
      id &&
      Array.isArray(list) &&
      list.length > 0 &&
      list.some((m) => m.id === id)
    ) {
      assignedMagasinName.value = list.find((m) => m.id === id)?.nom || "";
      magasinStore.setMagasinId(id);
    } else {
      assignedMagasinName.value = "";
      magasinStore.setMagasinId("");
    }
  },
  { immediate: true },
);
</script>
