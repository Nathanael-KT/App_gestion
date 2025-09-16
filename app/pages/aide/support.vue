<script setup>
// États
const loading = ref(false);
const selectedCategory = ref("all");
const searchQuery = ref("");
const showContactForm = ref(false);
const contactForm = ref({
  name: "",
  email: "",
  category: "general",
  subject: "",
  message: "",
  priority: "normal",
});

// Toast pour les notifications
const toast = useToast();

// Categories d'aide
const categories = [
  { label: "Toutes", value: "all", icon: "i-heroicons-squares-2x2" },
  {
    label: "Général",
    value: "general",
    icon: "i-heroicons-information-circle",
  },
  { label: "Stock", value: "inventory", icon: "i-heroicons-cube" },
  { label: "Factures", value: "invoices", icon: "i-heroicons-document-text" },
  { label: "Clients", value: "clients", icon: "i-heroicons-users" },
  {
    label: "Technique",
    value: "technical",
    icon: "i-heroicons-wrench-screwdriver",
  },
];

// Priorités pour le formulaire
const priorities = [
  { label: "Faible", value: "low", color: "green" },
  { label: "Normal", value: "normal", color: "blue" },
  { label: "Urgent", value: "high", color: "orange" },
  { label: "Critique", value: "critical", color: "red" },
];

// FAQ - Questions fréquemment posées
const faqItems = [
  {
    id: 1,
    category: "general",
    question: "Comment puis-je commencer à utiliser l'application ?",
    answer:
      "Pour commencer, connectez-vous avec vos identifiants. Vous arriverez sur le tableau de bord principal où vous pourrez accéder à toutes les fonctionnalités : gestion des stocks, clients, factures, et rapports.",
    popular: true,
  },
  {
    id: 2,
    category: "inventory",
    question: "Comment ajouter un nouveau produit au stock ?",
    answer:
      'Rendez-vous dans la section "Stock" puis cliquez sur "Ajouter". Remplissez les informations du produit : nom, description, prix, quantité initiale, et type de produit. N\'oubliez pas de sauvegarder.',
    popular: true,
  },
  {
    id: 3,
    category: "inventory",
    question: "Comment gérer les alertes de stock faible ?",
    answer:
      "Les alertes apparaissent automatiquement quand un produit atteint un seuil critique (≤5 unités) ou faible (≤10 unités). Consultez le rapport de stock pour voir tous les produits nécessitant un réapprovisionnement.",
    popular: false,
  },
  {
    id: 4,
    category: "invoices",
    question: "Comment créer une nouvelle facture ?",
    answer:
      'Allez dans "Factures" > "Ajouter". Sélectionnez un client existant ou créez-en un nouveau. Ajoutez les produits avec leurs quantités. Le total se calcule automatiquement. Sauvegardez en brouillon ou validez directement.',
    popular: true,
  },
  {
    id: 5,
    category: "invoices",
    question: "Comment marquer une facture comme payée ?",
    answer:
      'Ouvrez la facture concernée et changez le statut de "En attente" à "Payée". Le stock a déjà été ajusté lors de la création de la commande.',
    popular: false,
  },
  {
    id: 6,
    category: "clients",
    question: "Comment ajouter un nouveau client ?",
    answer:
      'Dans la section "Clients", cliquez sur "Ajouter un client". Remplissez les informations obligatoires (nom, email) et optionnelles (téléphone, adresse). Le client sera disponible pour les factures.',
    popular: false,
  },
  {
    id: 7,
    category: "technical",
    question: "L'application est lente, que faire ?",
    answer:
      "Vérifiez votre connexion internet. Actualisez la page avec F5. Si le problème persiste, videz le cache de votre navigateur ou contactez le support technique.",
    popular: false,
  },
  {
    id: 8,
    category: "technical",
    question: "Je ne peux pas me connecter, que faire ?",
    answer:
      'Vérifiez vos identifiants. Assurez-vous que Caps Lock n\'est pas activé. Si vous avez oublié votre mot de passe, utilisez la fonction "Mot de passe oublié" ou contactez votre administrateur.',
    popular: true,
  },
  {
    id: 9,
    category: "general",
    question: "Comment puis-je exporter mes données ?",
    answer:
      'Les fonctions d\'export sont disponibles dans chaque section (stocks, factures, clients). Utilisez le bouton "Exporter" pour télécharger vos données au format CSV ou PDF.',
    popular: false,
  },
  {
    id: 10,
    category: "invoices",
    question: "Comment annuler une facture ?",
    answer:
      "Une fois qu'une facture est payée, elle ne peut plus être modifiée directement. Contactez le support pour les cas exceptionnels nécessitant une annulation.",
    popular: false,
  },
];

// Ressources d'aide rapide
const quickHelp = [
  {
    title: "Guide de démarrage",
    description: "Découvrez les fonctionnalités principales en 5 minutes",
    icon: "i-heroicons-play-circle",
    color: "blue",
    action: "guide",
  },
  {
    title: "Raccourcis clavier",
    description: "Gagnez du temps avec les raccourcis essentiels",
    icon: "i-heroicons-command-line",
    color: "purple",
    action: "shortcuts",
  },
  {
    title: "Vidéos tutoriels",
    description: "Apprenez visuellement avec nos tutoriels vidéo",
    icon: "i-heroicons-video-camera",
    color: "green",
    action: "videos",
  },
  {
    title: "Documentation",
    description: "Consultez la documentation complète",
    icon: "i-heroicons-document-text",
    color: "orange",
    action: "docs",
  },
];

// Informations de contact
const contactInfo = {
  email: "Jeobrandevcode@gmail.com",
  phone: "+33 7 69 10 96 26",
  hours: "Lun-Ven : 9h-18h",
  response: "< 48h en moyenne",
};

// FAQ filtrées
const filteredFAQ = computed(() => {
  let filtered = faqItems;

  // Filtre par catégorie
  if (selectedCategory.value !== "all") {
    filtered = filtered.filter(
      (item) => item.category === selectedCategory.value
    );
  }

  // Filtre par recherche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// FAQ populaires
const popularFAQ = computed(() => {
  return faqItems.filter((item) => item.popular).slice(0, 3);
});

// Soumettre le formulaire de contact
const submitContactForm = async () => {
  loading.value = true;

  try {
    // Validation simple
    if (
      !contactForm.value.name ||
      !contactForm.value.email ||
      !contactForm.value.subject ||
      !contactForm.value.message
    ) {
      throw new Error("Veuillez remplir tous les champs obligatoires");
    }

    // Simulation de l'envoi (remplacer par vraie API)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.add({
      title: "Message envoyé !",
      description: "Nous vous répondrons dans les plus brefs délais.",
      icon: "i-heroicons-check-circle",
      color: "green",
      timeout: 5000,
    });

    // Réinitialiser le formulaire
    contactForm.value = {
      name: "",
      email: "",
      category: "general",
      subject: "",
      message: "",
      priority: "normal",
    };
    showContactForm.value = false;
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: error.message,
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
      timeout: 5000,
    });
  } finally {
    loading.value = false;
  }
};

// Actions pour l'aide rapide
const handleQuickAction = (action) => {
  switch (action) {
    case "guide":
      toast.add({
        title: "Guide de démarrage",
        description: "Redirection vers le guide...",
        icon: "i-heroicons-book-open",
        color: "blue",
      });
      break;
    case "shortcuts":
      toast.add({
        title: "Raccourcis clavier",
        description: "Ctrl+S: Sauvegarder | Ctrl+N: Nouveau | Esc: Fermer",
        icon: "i-heroicons-command-line",
        color: "purple",
        timeout: 8000,
      });
      break;
    case "videos":
      toast.add({
        title: "Tutoriels vidéo",
        description: "Redirection vers la playlist YouTube...",
        icon: "i-heroicons-video-camera",
        color: "green",
      });
      break;
    case "docs":
      toast.add({
        title: "Documentation",
        description: "Ouverture de la documentation...",
        icon: "i-heroicons-document-text",
        color: "orange",
      });
      break;
  }
};
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-800 mb-4">
        Centre d'Aide & Support
      </h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">
        Trouvez rapidement des réponses à vos questions ou contactez notre
        équipe de support
      </p>
    </div>

    <!-- Aide rapide -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <div
        v-for="help in quickHelp"
        :key="help.action"
        :class="[
          'bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-t-4',
          `border-${help.color}-500 hover:border-${help.color}-600`,
        ]"
        @click="handleQuickAction(help.action)"
      >
        <div class="flex items-center mb-4">
          <UIcon :name="help.icon" :class="`w-8 h-8 text-${help.color}-500`" />
          <h3 class="text-lg font-semibold text-gray-800 ml-3">
            {{ help.title }}
          </h3>
        </div>
        <p class="text-gray-600 text-sm">{{ help.description }}</p>
      </div>
    </div>

    <!-- Questions populaires -->
    <div
      class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 mb-12"
    >
      <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <UIcon name="i-heroicons-fire" class="w-6 h-6 text-orange-500" />
        Questions Populaires
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="faq in popularFAQ"
          :key="faq.id"
          class="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          @click="searchQuery = faq.question.split(' ').slice(0, 3).join(' ')"
        >
          <h4 class="font-semibold text-gray-800 mb-3 line-clamp-2">
            {{ faq.question }}
          </h4>
          <p class="text-gray-600 text-sm line-clamp-3">{{ faq.answer }}</p>
          <div
            class="mt-3 text-blue-500 text-sm font-medium flex items-center gap-1"
          >
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4" />
            Voir plus
          </div>
        </div>
      </div>
    </div>

    <!-- Section principale -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- FAQ -->
      <div class="lg:col-span-2">
        <div class="bg-white rounded-lg shadow-md">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">
              Questions Fréquentes
            </h2>

            <!-- Barre de recherche -->
            <div class="mb-4">
              <UInput
                v-model="searchQuery"
                placeholder="Rechercher dans la FAQ..."
                icon="i-heroicons-magnifying-glass"
                size="lg"
                class="w-full"
              />
            </div>

            <!-- Filtres par catégorie -->
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="category in categories"
                :key="category.value"
                :variant="
                  selectedCategory === category.value ? 'solid' : 'soft'
                "
                :color="
                  selectedCategory === category.value ? 'primary' : 'gray'
                "
                size="sm"
                :icon="category.icon"
                @click="selectedCategory = category.value"
              >
                {{ category.label }}
              </UButton>
            </div>
          </div>

          <!-- Liste des FAQ -->
          <div class="p-6">
            <div v-if="filteredFAQ.length" class="space-y-4">
              <UAccordion
                :items="
                  filteredFAQ.map((faq) => ({
                    label: faq.question,
                    content: faq.answer,
                    defaultOpen: false,
                  }))
                "
              />
            </div>

            <div v-else class="text-center py-12">
              <UIcon
                name="i-heroicons-question-mark-circle"
                class="w-16 h-16 text-gray-300 mx-auto mb-4"
              />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                Aucun résultat trouvé
              </h3>
              <p class="text-gray-500 mb-4">
                Essayez avec d'autres mots-clés ou catégories
              </p>
              <UButton
                variant="outline"
                color="gray"
                icon="i-heroicons-arrow-path"
                @click="
                  searchQuery = '';
                  selectedCategory = 'all';
                "
              >
                Réinitialiser la recherche
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact et Support -->
      <div class="space-y-6">
        <!-- Informations de contact -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3
            class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-phone" class="w-5 h-5 text-blue-500" />
            Nous Contacter
          </h3>

          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-envelope"
                class="w-5 h-5 text-gray-400"
              />
              <div>
                <p class="font-medium text-gray-800">{{ contactInfo.email }}</p>
                <p class="text-sm text-gray-600">Email</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-phone" class="w-5 h-5 text-gray-400" />
              <div>
                <p class="font-medium text-gray-800">{{ contactInfo.phone }}</p>
                <p class="text-sm text-gray-600">Téléphone</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-clock" class="w-5 h-5 text-gray-400" />
              <div>
                <p class="font-medium text-gray-800">{{ contactInfo.hours }}</p>
                <p class="text-sm text-gray-600">Horaires</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-chat-bubble-left-right"
                class="w-5 h-5 text-gray-400"
              />
              <div>
                <p class="font-medium text-gray-800">
                  {{ contactInfo.response }}
                </p>
                <p class="text-sm text-gray-600">Temps de réponse</p>
              </div>
            </div>
          </div>

          <UButton
            class="w-full mt-6"
            color="primary"
            size="lg"
            icon="i-heroicons-paper-airplane"
            @click="showContactForm = true"
          >
            Envoyer un Message
          </UButton>
        </div>

        <!-- Statut du système -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3
            class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-signal" class="w-5 h-5 text-green-500" />
            Statut du Système
          </h3>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Application</span>
              <UBadge color="green" variant="soft">Opérationnel</UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Base de données</span>
              <UBadge color="green" variant="soft">Opérationnel</UBadge>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">API</span>
              <UBadge color="green" variant="soft">Opérationnel</UBadge>
            </div>
          </div>

          <p class="text-sm text-gray-500 mt-4">
            Dernière mise à jour : {{ new Date().toLocaleString("fr-FR") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Modal de contact -->
    <UModal
      v-model:open="showContactForm"
      title="Contactez le Support"
      description="Décrivez votre problème ou question et nous vous répondrons rapidement"
      :close="{
        color: 'gray',
        variant: 'ghost',
        icon: 'i-heroicons-x-mark',
      }"
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="submitContactForm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UInput
              v-model="contactForm.name"
              label="Nom complet"
              placeholder="Votre nom"
              required
            />
            <UInput
              v-model="contactForm.email"
              label="Email"
              type="email"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <USelect
              v-model="contactForm.category"
              label="Catégorie"
              :items="categories.filter((c) => c.value !== 'all')"
              placeholder="Sélectionnez une catégorie"
            />
            <USelect
              v-model="contactForm.priority"
              label="Priorité"
              :items="
                priorities.map((p) => ({ label: p.label, value: p.value }))
              "
              placeholder="Niveau de priorité"
            />
          </div>

          <UInput
            v-model="contactForm.subject"
            label="Sujet"
            placeholder="Résumé de votre demande"
            required
          />

          <UTextarea
            v-model="contactForm.message"
            label="Message"
            placeholder="Décrivez votre problème ou question en détail..."
            :rows="5"
            required
          />
        </form>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <UButton type="button" color="gray" variant="outline" @click="close">
            Annuler
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="loading"
            icon="i-heroicons-paper-airplane"
            @click="submitContactForm"
          >
            Envoyer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
