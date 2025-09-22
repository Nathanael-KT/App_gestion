<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useCurrentUser } from "../composables/useCurrentUser";
const showNotifications = ref(false);
const router = useRouter();
const { currentUser } = useCurrentUser();

const props = defineProps<{
  notifications?: Array<{
    id: string;
    type: string;
    message: string;
    time?: string;
  }>;
  hasCountForDate?: boolean;
}>();

const showCaisseModal = ref(false);
const dynamicNotifications = ref<
  Array<{ id: string; type: string; message: string; time?: string }>
>([]);

onMounted(() => {
  setInterval(() => {
    const now = new Date();
    // afficher l'heure dans la console pour le debug
    console.log("Heure actuelle :", now.toLocaleTimeString());
    console.log("Vérification de l'heure pour les notifications");
    // Notification à 14h
    if (now.getHours() === 14 && now.getMinutes() === 25) {
      if (
        typeof window !== "undefined" &&
        !window.localStorage.getItem("caisseNotifShown")
      ) {
        dynamicNotifications.value.unshift({
          id: "caisse-14h",
          type: "caisse",
          message: "Comptage de la caisse à effectuer !",
          time: now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
        window.localStorage.setItem("caisseNotifShown", "1");
      }
    }
    // Modal obligatoire à 14h 30
    if (now.getHours() === 14 && now.getMinutes() === 30) {
      showCaisseModal.value = true;
    }
  }, 30000); // vérifie toutes les 30s
});

function getIcon(type: string) {
  if (type === "caisse") return "heroicons:clock-20-solid";
  if (type === "stock") return "heroicons:exclamation-triangle-20-solid";
  if (type === "forum") return "heroicons:chat-bubble-left-20-solid";
  return "heroicons:bell-20-solid";
}

function goToForum() {
  const userId = currentUser.value?.id || "default";
  if (typeof window !== "undefined") {
    window.localStorage.setItem("forumNotificationSeen_" + userId, "1");
  }
  router.push("/Forum");
}

function goToCaisse() {
    showCaisseModal.value = false;
    router.push("/caisse");
}

// Grouper les alertes de stock et forum en une seule notification chacune
const groupedNotifications = computed(() => {
  const allNotifications = [
    ...dynamicNotifications.value,
    ...((props.notifications ?? []) as Array<{
      id: string;
      type: string;
      message: string;
      time?: string;
    }>),
  ];
  const stockNotifs = allNotifications.filter((n) => n.type === "stock");
  const forumNotifs = allNotifications.filter((n) => n.type === "forum");
  const otherNotifs = allNotifications.filter(
    (n) => n.type !== "stock" && n.type !== "forum"
  );
  const result = [...otherNotifs];
  if (stockNotifs.length > 0) {
    result.unshift({
      id: "stock-grouped",
      type: "stock",
      message: `${stockNotifs.length} produit${
        stockNotifs.length > 1 ? "s" : ""
      } en stock critique`,
      time: stockNotifs[0]?.time,
    });
  }
  // Afficher la notification forum seulement si elle n'a pas été vue
  let forumSeen = false;
  if (typeof window !== "undefined") {
    forumSeen =
      window.localStorage.getItem(
        "forumNotificationSeen_" + (currentUser.value?.id || "default")
      ) === "1";
  }
  if (forumNotifs.length > 0 && !forumSeen) {
    result.unshift({
      id: "forum-grouped",
      type: "forum",
      message: `Nouveau${forumNotifs.length > 1 ? "x" : ""} message${
        forumNotifs.length > 1 ? "s" : ""
      } dans le forum`,
      time: forumNotifs[0]?.time,
    });
  }
  return result;
});

const notificationCount = computed(() => groupedNotifications.value.length);

function goToStock() {
  router.push("/stock");
}
</script>

<template>
  <div class="relative">
    <button
      class="hidden lg:flex items-center text-white hover:bg-white/10 p-2 rounded-lg transition-colors relative"
      aria-label="Notifications"
      @click="showNotifications = !showNotifications"
    >
      <UIcon name="heroicons:bell-20-solid" class="h-6 w-6" />
      <span
        v-if="notificationCount > 0"
        class="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white"
        >{{ notificationCount }}</span
      >
    </button>
    <!-- Menu notifications -->
    <div
      v-if="showNotifications"
      class="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-xl z-50 border border-gray-200"
    >
      <div class="p-4 border-b font-bold text-gray-700">Notifications</div>
      <ul class="max-h-80 overflow-y-auto">
        <li
          v-for="notif in groupedNotifications"
          :key="notif.id"
          class="px-4 py-3 border-b last:border-b-0 flex items-center gap-3"
        >
          <span
            :class="{
              'text-yellow-500': notif.type === 'caisse',
              'text-red-500': notif.type === 'stock',
              'text-blue-500': notif.type === 'forum',
            }"
          >
            <UIcon :name="getIcon(notif.type)" class="h-5 w-5" />
          </span>
          <span
            v-if="notif.type === 'caisse'"
            title="Aller au comptage caisse"
            class="flex-1 cursor-pointer underline text-yellow-600"
            @click="goToCaisse"
          >
            {{ notif.message }}
          </span>
          <span
            v-if="notif.type === 'stock'"
            title="Voir les produits en stock critique"
            class="flex-1 cursor-pointer underline"
            @click="goToStock"
          >
            {{ notif.message }}
          </span>
          <span
            v-else-if="notif.type === 'forum'"
            title="Voir les nouveaux messages du forum"
            class="flex-1 cursor-pointer underline text-blue-600"
            @click="goToForum"
          >
            {{ notif.message }}
          </span>
          <span v-else class="flex-1">{{ notif.message }}</span>
          <span v-if="notif.time" class="text-xs text-gray-400">{{
            notif.time
          }}</span>
        </li>
        <li
          v-if="(notifications ?? []).length === 0"
          class="px-4 py-6 text-center text-gray-400"
        >
          Aucune notification
        </li>
      </ul>
    </div>

    <div
      v-if="showCaisseModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center border-4 border-red-600"
      >
        <h2 class="text-2xl font-bold text-red-600 mb-4">
          Comptage caisse obligatoire !
        </h2>
        <p class="mb-6 text-lg">
          Il est 14h 30, vous devez effectuer le comptage de la caisse.
        </p>
        <button
          class="bg-red-600 text-white px-6 py-3 rounded-lg font-bold text-lg shadow hover:bg-red-700"
          @click="goToCaisse"
        >
          Aller compter la caisse
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ajoutez ici le style si besoin */
</style>
