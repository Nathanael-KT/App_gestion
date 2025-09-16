<script setup>
// États
const selectedSection = ref("overview");
const searchQuery = ref("");
const showTableOfContents = ref(true);

// Structure de la documentation
const docSections = [
  {
    id: "overview",
    title: "Vue d'ensemble",
    icon: "i-heroicons-eye",
    color: "blue",
  },
  {
    id: "getting-started",
    title: "Démarrage rapide",
    icon: "i-heroicons-rocket-launch",
    color: "green",
  },
  {
    id: "dashboard",
    title: "Tableau de bord",
    icon: "i-heroicons-squares-2x2",
    color: "purple",
  },
  {
    id: "inventory",
    title: "Gestion du stock",
    icon: "i-heroicons-cube",
    color: "orange",
  },
  {
    id: "clients",
    title: "Gestion des clients",
    icon: "i-heroicons-users",
    color: "teal",
  },
  {
    id: "invoices",
    title: "Facturation",
    icon: "i-heroicons-document-text",
    color: "indigo",
  },
  {
    id: "reports",
    title: "Rapports",
    icon: "i-heroicons-chart-bar",
    color: "pink",
  },
  {
    id: "users",
    title: "Utilisateurs",
    icon: "i-heroicons-user-group",
    color: "cyan",
  },
  {
    id: "shortcuts",
    title: "Raccourcis",
    icon: "i-heroicons-command-line",
    color: "gray",
  },
  {
    id: "troubleshooting",
    title: "Dépannage",
    icon: "i-heroicons-wrench-screwdriver",
    color: "red",
  },
];

// Contenu de la documentation
const docContent = {
  overview: {
    title: "Vue d'ensemble de l'application",
    content: `
      <div class="prose max-w-none">
        <h2>Bienvenue dans votre application de gestion</h2>
        <p class="lead">Cette application vous permet de gérer efficacement votre stock, vos clients, vos factures et d'analyser vos performances commerciales.</p>
        
        <h3>Fonctionnalités principales</h3>
        <ul>
          <li><strong>Gestion du stock</strong> : Ajout, modification, suivi des produits avec alertes automatiques</li>
          <li><strong>Gestion des clients</strong> : Carnet d'adresses complet avec historique</li>
          <li><strong>Facturation</strong> : Création, envoi et suivi des factures</li>
          <li><strong>Rapports analytiques</strong> : Ventes, stock, performances avec graphiques</li>
          <li><strong>Multi-utilisateurs</strong> : Gestion des rôles et permissions</li>
        </ul>

        <h3>Architecture de l'application</h3>
        <div class="bg-gray-50 p-4 rounded-lg my-4">
          <p>L'application est construite avec les technologies modernes :</p>
          <ul class="list-none">
            <li>🎯 <strong>Frontend</strong> : Nuxt 3 + Vue.js 3</li>
            <li>🗄️ <strong>Backend</strong> : Supabase (PostgreSQL)</li>
            <li>🎨 <strong>UI</strong> : Nuxt UI + Tailwind CSS</li>
            <li>📊 <strong>Graphiques</strong> : Chart.js</li>
          </ul>
        </div>
      </div>
    `,
  },
  "getting-started": {
    title: "Guide de démarrage rapide",
    content: `
      <div class="prose max-w-none">
        <h2>Premiers pas avec l'application</h2>
        
        <h3>1. Connexion</h3>
        <ol>
          <li>Rendez-vous sur la page de connexion</li>
          <li>Saisissez vos identifiants fournis par votre administrateur</li>
          <li>Cliquez sur "Se connecter"</li>
        </ol>

        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
          <p><strong>💡 Astuce :</strong> Cochez "Se souvenir de moi" pour rester connecté.</p>
        </div>

        <h3>2. Navigation</h3>
        <p>Une fois connecté, vous accédez au tableau de bord principal avec :</p>
        <ul>
          <li><strong>Menu latéral</strong> : Navigation principale</li>
          <li><strong>Barre supérieure</strong> : Profil utilisateur et déconnexion</li>
          <li><strong>Zone centrale</strong> : Contenu principal</li>
        </ul>

        <h3>3. Première configuration</h3>
        <p>Pour bien démarrer, suivez ces étapes :</p>
        <ol>
          <li><strong>Ajoutez des types de produits</strong> (Stock > Types de produits)</li>
          <li><strong>Créez vos premiers produits</strong> (Stock > Ajouter)</li>
          <li><strong>Ajoutez vos clients</strong> (Clients > Ajouter)</li>
          <li><strong>Créez votre première facture</strong> (Factures > Ajouter)</li>
        </ol>

        <div class="bg-green-50 border-l-4 border-green-400 p-4 my-4">
          <p><strong>✅ Conseil :</strong> Commencez par quelques produits de test pour vous familiariser.</p>
        </div>
      </div>
    `,
  },
  dashboard: {
    title: "Tableau de bord",
    content: `
      <div class="prose max-w-none">
        <h2>Comprendre votre tableau de bord</h2>
        
        <h3>Vue d'ensemble</h3>
        <p>Le tableau de bord vous donne une vue instantanée de votre activité :</p>

        <h4>Statistiques principales (cartes du haut)</h4>
        <ul>
          <li><strong>Total Produits</strong> : Nombre de références en stock</li>
          <li><strong>Clients Actifs</strong> : Nombre de clients enregistrés</li>
          <li><strong>Factures ce mois</strong> : Nombre de factures du mois en cours</li>
          <li><strong>CA du mois</strong> : Chiffre d'affaires mensuel</li>
        </ul>

        <h4>Graphiques et analyses</h4>
        <ul>
          <li><strong>Évolution des ventes</strong> : Graphique temporel des revenus</li>
          <li><strong>Top produits</strong> : Produits les plus vendus</li>
          <li><strong>Répartition par type</strong> : Distribution des ventes</li>
        </ul>

        <h4>Alertes et notifications</h4>
        <div class="bg-orange-50 border-l-4 border-orange-400 p-4 my-4">
          <ul class="list-none">
            <li>🔴 <strong>Stock critique</strong> : Produits en rupture</li>
            <li>🟡 <strong>Stock faible</strong> : Produits à réapprovisionner</li>
            <li>📄 <strong>Factures impayées</strong> : Factures en attente</li>
          </ul>
        </div>

        <h3>Actions rapides</h3>
        <p>Depuis le tableau de bord, vous pouvez :</p>
        <ul>
          <li>Créer une nouvelle facture</li>
          <li>Ajouter un produit</li>
          <li>Enregistrer un client</li>
          <li>Accéder aux rapports détaillés</li>
        </ul>
      </div>
    `,
  },
  inventory: {
    title: "Gestion du stock",
    content: `
      <div class="prose max-w-none">
        <h2>Maîtriser la gestion de stock</h2>
        
        <h3>Ajouter un produit</h3>
        <ol>
          <li>Allez dans <strong>Stock > Ajouter</strong></li>
          <li>Remplissez les informations obligatoires :
            <ul>
              <li><strong>Nom</strong> : Nom du produit</li>
              <li><strong>Prix</strong> : Prix de vente unitaire</li>
              <li><strong>Stock initial</strong> : Quantité en stock</li>
              <li><strong>Type</strong> : Catégorie du produit</li>
            </ul>
          </li>
          <li>Informations optionnelles :
            <ul>
              <li><strong>Description</strong> : Détails du produit</li>
              <li><strong>Référence</strong> : Code produit</li>
              <li><strong>Dimensions</strong> : Longueur, largeur pour les carreaux</li>
            </ul>
          </li>
          <li>Cliquez sur <strong>"Enregistrer"</strong></li>
        </ol>

        <h3>Types de produits</h3>
        <p>Organisez vos produits par types :</p>
        <ul>
          <li>Allez dans <strong>Stock > Types de produits</strong></li>
          <li>Cliquez sur <strong>"Ajouter un type"</strong></li>
          <li>Saisissez le nom du type (ex: Carrelage, Faïence, etc.)</li>
        </ul>

        <h3>Filtres et recherche</h3>
        <p>Sur la page stock, utilisez les filtres pour :</p>
        <ul>
          <li><strong>Recherche textuelle</strong> : Par nom ou référence</li>
          <li><strong>Type de produit</strong> : Filtrer par catégorie</li>
          <li><strong>Unité</strong> : m², pièce, etc.</li>
          <li><strong>Statut stock</strong> : En stock, faible, rupture</li>
          <li><strong>Prix</strong> : Fourchette de prix</li>
        </ul>

        <h3>Alertes de stock</h3>
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
          <p><strong>Seuils automatiques :</strong></p>
          <ul class="list-none">
            <li>🔴 <strong>Rupture</strong> : Stock = 0</li>
            <li>🟠 <strong>Critique</strong> : Stock ≤ 5</li>
            <li>🟡 <strong>Faible</strong> : Stock ≤ 10</li>
            <li>🟢 <strong>Normal</strong> : Stock > 10</li>
          </ul>
        </div>

        <h3>Mouvements de stock</h3>
        <p>Le stock est automatiquement mis à jour quand :</p>
        <ul>
          <li>Une facture passe en statut "Payée"</li>
          <li>Vous modifiez manuellement le stock</li>
          <li>Un réapprovisionnement est effectué</li>
        </ul>
      </div>
    `,
  },
  clients: {
    title: "Gestion des clients",
    content: `
      <div class="prose max-w-none">
        <h2>Gérer votre clientèle</h2>
        
        <h3>Ajouter un client</h3>
        <ol>
          <li>Rendez-vous dans <strong>Clients > Ajouter</strong></li>
          <li>Remplissez les informations obligatoires :
            <ul>
              <li><strong>Nom complet</strong> : Nom du client</li>
              <li><strong>Email</strong> : Adresse email (unique)</li>
            </ul>
          </li>
          <li>Informations optionnelles :
            <ul>
              <li><strong>Téléphone</strong> : Numéro de contact</li>
              <li><strong>Adresse</strong> : Adresse complète</li>
            </ul>
          </li>
          <li>Sauvegardez avec <strong>"Enregistrer"</strong></li>
        </ol>

        <h3>Liste des clients</h3>
        <p>La page clients vous permet de :</p>
        <ul>
          <li><strong>Voir tous les clients</strong> dans un tableau</li>
          <li><strong>Rechercher</strong> par nom ou email</li>
          <li><strong>Modifier</strong> les informations (icône crayon)</li>
          <li><strong>Voir l'historique</strong> des factures par client</li>
        </ul>

        <h3>Modifier un client</h3>
        <ol>
          <li>Sur la liste des clients, cliquez sur l'icône <strong>crayon</strong></li>
          <li>Modifiez les informations nécessaires</li>
          <li>Cliquez sur <strong>"Mettre à jour"</strong></li>
        </ol>

        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
          <p><strong>💡 Astuce :</strong> L'email doit être unique pour chaque client.</p>
        </div>

        <h3>Utilisation dans les factures</h3>
        <p>Une fois créés, vos clients apparaissent automatiquement dans :</p>
        <ul>
          <li>La liste déroulante lors de la création de factures</li>
          <li>Les rapports de ventes (top clients)</li>
          <li>Les filtres des rapports</li>
        </ul>

        <h3>Bonnes pratiques</h3>
        <ul>
          <li>Vérifiez l'orthographe des noms</li>
          <li>Utilisez un format cohérent pour les adresses</li>
          <li>Gardez les informations à jour</li>
          <li>Utilisez des emails valides pour les notifications</li>
        </ul>
      </div>
    `,
  },
  invoices: {
    title: "Système de facturation",
    content: `
      <div class="prose max-w-none">
        <h2>Créer et gérer vos factures</h2>
        
        <h3>Créer une nouvelle facture</h3>
        <ol>
          <li>Allez dans <strong>Factures > Ajouter</strong></li>
          <li>Sélectionnez un <strong>client</strong> dans la liste déroulante</li>
          <li>Ajoutez des produits :
            <ul>
              <li>Cliquez sur <strong>"Ajouter un produit"</strong></li>
              <li>Choisissez le produit</li>
              <li>Définissez la quantité</li>
              <li>Le prix se remplit automatiquement</li>
            </ul>
          </li>
          <li>Le total se calcule automatiquement</li>
          <li>Sauvegardez en <strong>"Brouillon"</strong> ou <strong>"Finalisez"</strong></li>
        </ol>

        <h3>États des factures</h3>
        <div class="bg-gray-50 p-4 rounded-lg my-4">
          <ul class="list-none">
            <li>📝 <strong>Brouillon</strong> : Facture en cours de création</li>
            <li>📤 <strong>Envoyée</strong> : Facture envoyée au client</li>
            <li>💳 <strong>Payée</strong> : Paiement reçu (déduction automatique du stock)</li>
            <li>❌ <strong>Annulée</strong> : Facture annulée</li>
          </ul>
        </div>

        <h3>Gestion du stock automatique</h3>
        <div class="bg-green-50 border-l-4 border-green-400 p-4 my-4">
          <p><strong>Important :</strong> La gestion du stock :</p>
          <ul>
            <li>Le stock des produits est automatiquement décrémenté lors de la création de la commande</li>
            <li>Un mouvement de stock est enregistré lors de la commande</li>
            <li>Le passage en statut "Payée" n'affecte plus le stock</li>
          </ul>
        </div>

        <h3>Modifier une facture</h3>
        <p>Les règles de modification :</p>
        <ul>
          <li><strong>Brouillon</strong> : Modification complète possible</li>
          <li><strong>Envoyée</strong> : Modification limitée</li>
          <li><strong>Payée</strong> : Plus de modification (contactez l'administrateur)</li>
        </ul>

        <h3>Calculateur de cartons</h3>
        <p>Pour les produits avec dimensions (carreaux) :</p>
        <ol>
          <li>Utilisez l'icône calculatrice sur la ligne produit</li>
          <li>Saisissez les dimensions de la surface à couvrir</li>
          <li>La quantité nécessaire est calculée automatiquement</li>
          <li>Un surplus de 10% est ajouté par défaut</li>
        </ol>

        <h3>Impression et export</h3>
        <ul>
          <li>Visualisez la facture avec le bouton "œil"</li>
          <li>Imprimez avec Ctrl+P</li>
          <li>Exportez en PDF depuis le navigateur</li>
        </ul>
      </div>
    `,
  },
  reports: {
    title: "Rapports et analyses",
    content: `
      <div class="prose max-w-none">
        <h2>Exploiter vos données avec les rapports</h2>
        
        <h3>Rapport de ventes</h3>
        <p>Accédez via <strong>Rapports > Ventes</strong> pour analyser :</p>
        
        <h4>Filtres disponibles</h4>
        <ul>
          <li><strong>Période</strong> : Aujourd'hui, semaine, mois, trimestre, année</li>
          <li><strong>Client</strong> : Filtrer par client spécifique</li>
          <li><strong>Produit</strong> : Analyser un produit particulier</li>
        </ul>

        <h4>Métriques principales</h4>
        <ul>
          <li><strong>Chiffre d'affaires</strong> : Total des ventes</li>
          <li><strong>Nombre de factures</strong> : Volume d'activité</li>
          <li><strong>Panier moyen</strong> : CA / nombre de factures</li>
          <li><strong>Quantités vendues</strong> : Volume total</li>
        </ul>

        <h4>Graphiques interactifs</h4>
        <ul>
          <li><strong>Barres</strong> : Comparaison par périodes</li>
          <li><strong>Ligne</strong> : Tendances temporelles</li>
          <li><strong>Secteurs</strong> : Répartition du CA</li>
        </ul>

        <h3>Rapport de stock</h3>
        <p>Accédez via <strong>Rapports > Stock</strong> pour surveiller :</p>
        
        <h4>Vue d'ensemble</h4>
        <ul>
          <li><strong>Total produits</strong> : Nombre de références</li>
          <li><strong>Valeur totale</strong> : Valeur de l'inventaire</li>
          <li><strong>Stock moyen</strong> : Moyenne des quantités</li>
          <li><strong>Alertes</strong> : Nombre de produits en alerte</li>
        </ul>

        <h4>Analyses détaillées</h4>
        <ul>
          <li><strong>Top produits par valeur</strong> : Produits les plus chers</li>
          <li><strong>Alertes stock faible</strong> : Produits à réapprovisionner</li>
          <li><strong>Mouvements récents</strong> : Historique des 20 derniers mouvements</li>
        </ul>

        <h3>Filtrage et tri</h3>
        <p>Dans tous les rapports :</p>
        <ul>
          <li>Utilisez les <strong>filtres</strong> pour affiner vos analyses</li>
          <li>Les sections se <strong>déplient automatiquement</strong> si des filtres sont actifs</li>
          <li>Bouton <strong>"Réinitialiser"</strong> pour revenir à la vue complète</li>
          <li><strong>Actualisation</strong> manuelle des données</li>
        </ul>

        <div class="bg-purple-50 border-l-4 border-purple-400 p-4 my-4">
          <p><strong>💡 Astuce :</strong> Consultez les rapports régulièrement pour identifier les tendances et optimiser vos ventes.</p>
        </div>
      </div>
    `,
  },
  users: {
    title: "Gestion des utilisateurs",
    content: `
      <div class="prose max-w-none">
        <h2>Gérer les utilisateurs et permissions</h2>
        
        <h3>Types d'utilisateurs</h3>
        <div class="bg-gray-50 p-4 rounded-lg my-4">
          <ul class="list-none">
            <li>👑 <strong>Administrateur</strong> : Accès complet à toutes les fonctions</li>
            <li>👨‍💼 <strong>Manager</strong> : Gestion stock, clients, factures, rapports</li>
            <li>👨‍💻 <strong>Employé</strong> : Consultation et saisie limitée</li>
            <li>👁️ <strong>Lecture seule</strong> : Consultation uniquement</li>
          </ul>
        </div>

        <h3>Ajouter un utilisateur</h3>
        <p><em>Fonctionnalité réservée aux administrateurs</em></p>
        <ol>
          <li>Allez dans <strong>Utilisateurs > Ajouter</strong></li>
          <li>Saisissez les informations :
            <ul>
              <li><strong>Nom complet</strong></li>
              <li><strong>Email</strong> (identifiant de connexion)</li>
              <li><strong>Mot de passe temporaire</strong></li>
              <li><strong>Rôles</strong> : Sélectionnez les permissions</li>
            </ul>
          </li>
          <li>L'utilisateur reçoit ses identifiants par email</li>
        </ol>

        <h3>Modifier les permissions</h3>
        <ul>
          <li>Seuls les <strong>administrateurs</strong> peuvent modifier les rôles</li>
          <li>Un utilisateur peut avoir <strong>plusieurs rôles</strong></li>
          <li>Les changements sont <strong>effectifs immédiatement</strong></li>
        </ul>

        <h3>Sécurité</h3>
        <div class="bg-red-50 border-l-4 border-red-400 p-4 my-4">
          <p><strong>Bonnes pratiques :</strong></p>
          <ul>
            <li>Changez le mot de passe temporaire à la première connexion</li>
            <li>Utilisez des mots de passe forts</li>
            <li>Révoquez l'accès des anciens employés</li>
            <li>Vérifiez régulièrement les permissions</li>
          </ul>
        </div>

        <h3>Mon profil</h3>
        <p>Chaque utilisateur peut :</p>
        <ul>
          <li>Modifier ses informations personnelles</li>
          <li>Changer son mot de passe</li>
          <li>Voir ses permissions actuelles</li>
          <li>Consulter son historique de connexions</li>
        </ul>
      </div>
    `,
  },
  shortcuts: {
    title: "Raccourcis clavier",
    content: `
      <div class="prose max-w-none">
        <h2>Raccourcis pour gagner du temps</h2>
        
        <h3>Navigation générale</h3>
        <div class="bg-gray-50 p-4 rounded-lg my-4">
          <table class="min-w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2">Raccourci</th>
                <th class="text-left py-2">Action</th>
              </tr>
            </thead>
            <tbody class="space-y-2">
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + D</kbd></td>
                <td>Retour au tableau de bord</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + S</kbd></td>
                <td>Aller au stock</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + C</kbd></td>
                <td>Aller aux clients</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + F</kbd></td>
                <td>Aller aux factures</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + R</kbd></td>
                <td>Aller aux rapports</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Actions dans les formulaires</h3>
        <div class="bg-blue-50 p-4 rounded-lg my-4">
          <table class="min-w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2">Raccourci</th>
                <th class="text-left py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + Enter</kbd></td>
                <td>Sauvegarder le formulaire</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Esc</kbd></td>
                <td>Fermer modal/annuler</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + N</kbd></td>
                <td>Nouveau (selon la page)</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Tab</kbd></td>
                <td>Champ suivant</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Shift + Tab</kbd></td>
                <td>Champ précédent</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Actions dans les tableaux</h3>
        <div class="bg-green-50 p-4 rounded-lg my-4">
          <table class="min-w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2">Raccourci</th>
                <th class="text-left py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + F</kbd></td>
                <td>Recherche dans le tableau</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">F5</kbd></td>
                <td>Actualiser les données</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + A</kbd></td>
                <td>Sélectionner tout</td>
              </tr>
              <tr class="border-b">
                <td><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Delete</kbd></td>
                <td>Supprimer l'élément sélectionné</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Raccourcis spécifiques</h3>
        <h4>Facturation</h4>
        <ul>
          <li><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + P</kbd> : Imprimer la facture</li>
          <li><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + +</kbd> : Ajouter une ligne produit</li>
          <li><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Alt + C</kbd> : Ouvrir le calculateur</li>
        </ul>

        <h4>Navigation rapide</h4>
        <ul>
          <li><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + /</kbd> : Afficher l'aide</li>
          <li><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + ,</kbd> : Paramètres</li>
          <li><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">Ctrl + Q</kbd> : Déconnexion</li>
        </ul>

        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
          <p><strong>💡 Note :</strong> Sur Mac, remplacez <kbd>Ctrl</kbd> par <kbd>Cmd</kbd></p>
        </div>
      </div>
    `,
  },
  troubleshooting: {
    title: "Guide de dépannage",
    content: `
      <div class="prose max-w-none">
        <h2>Résoudre les problèmes courants</h2>
        
        <h3>Problèmes de connexion</h3>
        
        <h4>Je ne peux pas me connecter</h4>
        <div class="bg-red-50 border-l-4 border-red-400 p-4 my-4">
          <p><strong>Solutions à essayer :</strong></p>
          <ol>
            <li>Vérifiez vos identifiants (attention aux majuscules/minuscules)</li>
            <li>Assurez-vous que Caps Lock n'est pas activé</li>
            <li>Videz le cache de votre navigateur</li>
            <li>Essayez en navigation privée</li>
            <li>Contactez votre administrateur</li>
          </ol>
        </div>

        <h4>Session expirée fréquemment</h4>
        <p>Si vous êtes déconnecté souvent :</p>
        <ul>
          <li>Cochez "Se souvenir de moi" à la connexion</li>
          <li>Vérifiez les paramètres de cookies de votre navigateur</li>
          <li>Évitez d'ouvrir l'app dans plusieurs onglets</li>
        </ul>

        <h3>Problèmes de performance</h3>
        
        <h4>L'application est lente</h4>
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
          <p><strong>Causes possibles et solutions :</strong></p>
          <ul>
            <li><strong>Connexion internet</strong> : Testez votre débit</li>
            <li><strong>Cache du navigateur</strong> : Videz-le (Ctrl+Shift+Del)</li>
            <li><strong>Mémoire</strong> : Fermez les onglets inutiles</li>
            <li><strong>Navigateur</strong> : Mettez-le à jour</li>
            <li><strong>Extensions</strong> : Désactivez les bloqueurs de pub</li>
          </ul>
        </div>

        <h4>Données qui ne se chargent pas</h4>
        <ol>
          <li>Actualisez la page (F5)</li>
          <li>Vérifiez votre connexion internet</li>
          <li>Essayez dans un autre navigateur</li>
          <li>Contactez le support si ça persiste</li>
        </ol>

        <h3>Problèmes de fonctionnalités</h3>
        
        <h4>Je ne peux pas ajouter de produit</h4>
        <p>Vérifiez que :</p>
        <ul>
          <li>Vous avez les permissions nécessaires</li>
          <li>Les champs obligatoires sont remplis</li>
          <li>Le prix est un nombre valide</li>
          <li>La référence n'existe pas déjà</li>
        </ul>

        <h4>Le stock ne se met pas à jour</h4>
        <p>Le stock se décrémente automatiquement quand :</p>
        <ul>
          <li>Une facture passe en statut <strong>"Payée"</strong></li>
          <li>Les produits de la facture existent</li>
          <li>Il y a suffisamment de stock</li>
        </ul>

        <h4>Les graphiques n'apparaissent pas</h4>
        <ol>
          <li>Vérifiez que vous avez des données</li>
          <li>Essayez de changer la période de filtre</li>
          <li>Actualisez la page</li>
          <li>Désactivez les bloqueurs de contenu</li>
        </ol>

        <h3>Erreurs courantes</h3>
        
        <div class="bg-gray-50 p-4 rounded-lg my-4">
          <h4>Messages d'erreur fréquents :</h4>
          <ul class="list-none space-y-2">
            <li><strong>"Email déjà utilisé"</strong> → Changez l'email ou vérifiez les doublons</li>
            <li><strong>"Stock insuffisant"</strong> → Vérifiez les quantités disponibles</li>
            <li><strong>"Champ obligatoire"</strong> → Remplissez tous les champs requis</li>
            <li><strong>"Format invalide"</strong> → Vérifiez le format des données (email, prix)</li>
          </ul>
        </div>

        <h3>Que faire si rien ne fonctionne ?</h3>
        
        <h4>Informations à fournir au support :</h4>
        <ol>
          <li><strong>Navigateur</strong> : Chrome, Firefox, Safari + version</li>
          <li><strong>Système</strong> : Windows, Mac, Linux</li>
          <li><strong>Actions effectuées</strong> : Étapes qui ont mené au problème</li>
          <li><strong>Message d'erreur</strong> : Copie exacte du message</li>
          <li><strong>Capture d'écran</strong> : Si possible</li>
        </ol>

        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
          <p><strong>Contact support :</strong></p>
          <ul class="list-none">
            <li>📧 Email : jeobrandevcode@gmail.com</li>
            <li>📞 Téléphone : +33 7 69 10 96 26</li>
          </ul>
        </div>
      </div>
    `,
  },
};

// Section de contenu filtrée
const currentContent = computed(() => {
  return docContent[selectedSection.value] || { title: "", content: "" };
});

// Recherche dans le contenu
const searchResults = computed(() => {
  if (!searchQuery.value) return [];

  const query = searchQuery.value.toLowerCase();
  const results = [];

  Object.entries(docContent).forEach(([key, section]) => {
    if (
      section.title.toLowerCase().includes(query) ||
      section.content.toLowerCase().includes(query)
    ) {
      results.push({
        id: key,
        title: section.title,
        section: docSections.find((s) => s.id === key),
      });
    }
  });

  return results;
});
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-4">Documentation</h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">
        Guide complet d'utilisation de votre application de gestion
      </p>
    </div>

    <!-- Barre de recherche -->
    <div class="max-w-2xl mx-auto mb-8">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher dans la documentation..."
        icon="i-heroicons-magnifying-glass"
        size="lg"
        class="w-full"
      />

      <!-- Résultats de recherche -->
      <div
        v-if="searchQuery && searchResults.length"
        class="mt-4 bg-white rounded-lg shadow-md border"
      >
        <div class="p-4 border-b border-gray-200">
          <h4 class="font-semibold text-gray-800">
            Résultats de recherche ({{ searchResults.length }})
          </h4>
        </div>
        <div class="max-h-64 overflow-y-auto">
          <div
            v-for="result in searchResults"
            :key="result.id"
            class="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            @click="
              selectedSection = result.id;
              searchQuery = '';
            "
          >
            <div class="flex items-center gap-3">
              <UIcon
                :name="result.section.icon"
                :class="`w-5 h-5 text-${result.section.color}-500`"
              />
              <div>
                <h5 class="font-medium text-gray-800">{{ result.title }}</h5>
                <p class="text-sm text-gray-500">{{ result.section.title }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <!-- Menu de navigation -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-lg shadow-md sticky top-8">
          <div class="p-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-800">Sommaire</h3>
              <UButton
                icon="i-heroicons-bars-3"
                variant="ghost"
                size="sm"
                class="lg:hidden"
                @click="showTableOfContents = !showTableOfContents"
              />
            </div>
          </div>

          <div
            :class="[
              'lg:block',
              { hidden: !showTableOfContents, block: showTableOfContents },
            ]"
          >
            <nav class="p-2">
              <button
                v-for="section in docSections"
                :key="section.id"
                :class="[
                  'w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 mb-1',
                  selectedSection === section.id
                    ? `bg-${section.color}-50 text-${section.color}-700 border-l-4 border-${section.color}-500`
                    : 'text-gray-600 hover:bg-gray-50',
                ]"
                @click="
                  selectedSection = section.id;
                  showTableOfContents = false;
                "
              >
                <UIcon
                  :name="section.icon"
                  :class="`w-4 h-4 text-${section.color}-500`"
                />
                <span class="text-sm font-medium">{{ section.title }}</span>
              </button>
            </nav>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="lg:col-span-3">
        <div class="bg-white rounded-lg shadow-md">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-2xl font-bold text-gray-800">
              {{ currentContent.title }}
            </h2>
          </div>

          <div class="p-6">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="prose max-w-none" v-html="currentContent.content" />
          </div>
        </div>

        <!-- Navigation entre sections -->
        <div class="flex justify-between items-center mt-8">
          <UButton
            v-if="docSections.findIndex((s) => s.id === selectedSection) > 0"
            variant="outline"
            color="gray"
            icon="i-heroicons-arrow-left"
            @click="
              selectedSection =
                docSections[
                  docSections.findIndex((s) => s.id === selectedSection) - 1
                ].id
            "
          >
            Section précédente
          </UButton>
          <div />
          <UButton
            v-if="
              docSections.findIndex((s) => s.id === selectedSection) <
              docSections.length - 1
            "
            variant="outline"
            color="gray"
            @click="
              selectedSection =
                docSections[
                  docSections.findIndex((s) => s.id === selectedSection) + 1
                ].id
            "
          >
            Section suivante
            <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 ml-2" />
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  margin-top: 2rem;
}

.prose h2:first-child {
  margin-top: 0;
}

.prose h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.75rem;
  margin-top: 1.5rem;
}

.prose h4 {
  font-size: 1.125rem;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
}

.prose p {
  color: #4b5563;
  margin-bottom: 1rem;
  line-height: 1.75;
}

.prose ul,
.prose ol {
  margin-bottom: 1rem;
  color: #4b5563;
}

.prose li {
  margin-bottom: 0.25rem;
}

.prose strong {
  font-weight: 600;
  color: #1f2937;
}

.prose code {
  background-color: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
}

.prose th {
  text-align: left;
  font-weight: 500;
  color: #1f2937;
  padding-bottom: 0.5rem;
}

.prose td {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  color: #4b5563;
}

.prose kbd {
  background-color: #e5e7eb;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  border: 1px solid #d1d5db;
}

.prose .lead {
  font-size: 1.125rem;
  color: #374151;
  font-weight: 500;
}
</style>
