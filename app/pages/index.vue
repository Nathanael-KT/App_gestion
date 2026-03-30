<template>
  <component :is="isSuperAdmin ? superadmin : 'div'">
    <!-- Show loading state while user roles are being determined -->
    <div
      v-if="isLoadingRoles"
      class="min-h-screen bg-gray-50 flex items-center justify-center"
    >
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
        />
        <p class="text-gray-600">Chargement de votre profil...</p>
      </div>
    </div>

    <template v-else-if="!isSuperAdmin">
      <div class="min-h-screen bg-gray-50">
        <div
          v-if="companySettings?.blocked"
          class="bg-red-100 text-red-700 px-4 py-3 rounded mb-6 text-center font-semibold"
        >
          Votre entreprise est actuellement bloquée par l'administrateur. Aucun
          accès n'est autorisé tant que le blocage global est actif.<br />
          Veuillez contacter votre administrateur pour plus d'informations.
        </div>
        <!-- Indicateur de chargement global -->
        <div v-if="loading" class="fixed top-4 right-4 z-50">
          <div
            class="bg-white rounded-lg shadow-lg p-3 flex items-center space-x-3"
          >
            <div
              class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"
            />
            <span class="text-sm text-gray-600">Chargement des données...</span>
          </div>
        </div>

        <!-- Message d'erreur global -->
        <div v-if="error && !loading" class="fixed top-4 right-4 z-50">
          <div
            class="bg-red-50 border border-red-200 rounded-lg shadow-lg p-3 flex items-center space-x-3"
          >
            <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-red-600" />
            <span class="text-sm text-red-600"
              >Erreur lors du chargement des données</span
            >
            <UButton
              size="xs"
              color="red"
              variant="soft"
              icon="i-lucide-refresh-cw"
              @click="loadDashboardData"
            >
              Réessayer
            </UButton>
          </div>
        </div>

        <!-- Hero Section -->
        <div
          class="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 text-white"
        >
          <div class="container mx-auto px-6 py-8">
            <div class="flex flex-col lg:flex-row items-center justify-between">
              <div class="flex-1 mb-6 lg:mb-0">
                <h1 class="text-4xl lg:text-5xl font-bold mb-4">
                  Bienvenue, {{ userName || "Utilisateur" }}
                </h1>
                <p class="text-xl text-blue-100 mb-6 max-w-2xl">
                  Gérez votre entreprise de carrelage avec efficacité. Suivez
                  vos stocks, clients, commandes et finances depuis ce tableau
                  de bord complet.
                </p>
                <div class="flex flex-wrap gap-4">
                  <UButton
                    icon="i-lucide-plus"
                    color="white"
                    variant="solid"
                    size="lg"
                    to="/commande/add"
                    class="shadow-lg"
                  >
                    Nouvelle Commande
                  </UButton>
                  <UButton
                    icon="i-lucide-users"
                    color="white"
                    variant="outline"
                    size="lg"
                    to="/client/add"
                    class="border-white/30 hover:bg-white/10"
                  >
                    Nouveau Client
                  </UButton>
                </div>
              </div>

              <!-- Quick Stats Widget -->
              <div
                class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 min-w-80"
              >
                <h3 class="text-lg font-semibold mb-4 flex items-center">
                  <UIcon name="i-lucide-trending-up" class="w-5 h-5 mr-2" />
                  Aperçu Rapide
                </h3>
                <div v-if="loading" class="space-y-3">
                  <div class="flex justify-between items-center">
                    <div class="h-5 w-32 bg-white/20 animate-pulse rounded" />
                    <div class="h-6 w-24 bg-white/20 animate-pulse rounded" />
                  </div>
                  <div class="flex justify-between items-center">
                    <div class="h-5 w-32 bg-white/20 animate-pulse rounded" />
                    <div class="h-6 w-16 bg-white/20 animate-pulse rounded" />
                  </div>
                  <div class="flex justify-between items-center">
                    <div class="h-5 w-32 bg-white/20 animate-pulse rounded" />
                    <div class="h-6 w-16 bg-white/20 animate-pulse rounded" />
                  </div>
                </div>
                <div v-else class="space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-blue-100">Ventes du mois</span>
                    <span class="text-xl font-bold"
                      >{{ monthSales.toLocaleString() }}
                      {{ companySettings?.currency }}</span
                    >
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-blue-100">Commandes actives</span>
                    <span class="text-xl font-bold">{{ activeOrders }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-blue-100">Produits en stock</span>
                    <span class="text-xl font-bold">{{ totalProducts }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="container mx-auto px-6 py-8">
          <!-- KPIs Cards -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <!-- Produits Card -->
            <div
              class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group"
            >
              <div class="flex items-center justify-between mb-4">
                <div
                  class="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors"
                >
                  <UIcon
                    name="i-lucide-package"
                    class="w-8 h-8 text-blue-600"
                  />
                </div>
                <div class="text-right">
                  <div v-if="loading" class="space-y-2">
                    <div class="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                    <div class="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                  </div>
                  <template v-else>
                    <p class="text-2xl font-bold text-gray-900">
                      {{ totalProducts.toLocaleString() }}
                    </p>
                    <p class="text-sm text-gray-500">Produits</p>
                  </template>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Stock total</p>
                  <div class="flex items-center mt-1">
                    <UIcon
                      name="i-lucide-trending-up"
                      class="w-4 h-4 text-green-500 mr-1"
                    />
                    <span class="text-sm text-green-600 font-medium"
                      >+5.2%</span
                    >
                  </div>
                </div>
                <UButton variant="ghost" size="sm" to="/stock"
                  >Voir détail</UButton
                >
              </div>
            </div>

            <!-- Clients Card -->
            <div
              class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group"
            >
              <div class="flex items-center justify-between mb-4">
                <div
                  class="bg-green-100 p-3 rounded-xl group-hover:bg-green-200 transition-colors"
                >
                  <UIcon name="i-lucide-users" class="w-8 h-8 text-green-600" />
                </div>
                <div class="text-right">
                  <div v-if="loading" class="space-y-2">
                    <div class="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                    <div class="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                  </div>
                  <template v-else>
                    <p class="text-2xl font-bold text-gray-900">
                      {{ totalClients.toLocaleString() }}
                    </p>
                    <p class="text-sm text-gray-500">Clients</p>
                  </template>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Clients actifs</p>
                  <div class="flex items-center mt-1">
                    <UIcon
                      name="i-lucide-trending-up"
                      class="w-4 h-4 text-green-500 mr-1"
                    />
                    <span class="text-sm text-green-600 font-medium"
                      >+12.8%</span
                    >
                  </div>
                </div>
                <UButton variant="ghost" size="sm" to="/client"
                  >Voir détail</UButton
                >
              </div>
            </div>

            <!-- Commandes Card -->
            <div
              class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group"
            >
              <div class="flex items-center justify-between mb-4">
                <div
                  class="bg-orange-100 p-3 rounded-xl group-hover:bg-orange-200 transition-colors"
                >
                  <UIcon
                    name="i-lucide-shopping-cart"
                    class="w-8 h-8 text-orange-600"
                  />
                </div>
                <div class="text-right">
                  <div v-if="loading" class="space-y-2">
                    <div class="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                    <div class="h-4 w-16 bg-gray-200 animate-pulse rounded" />
                  </div>
                  <template v-else>
                    <p class="text-2xl font-bold text-gray-900">
                      {{ activeOrders.toLocaleString() }}
                    </p>
                    <p class="text-sm text-gray-500">Commandes</p>
                  </template>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Ce mois</p>
                  <div class="flex items-center mt-1">
                    <UIcon
                      name="i-lucide-trending-up"
                      class="w-4 h-4 text-green-500 mr-1"
                    />
                    <span class="text-sm text-green-600 font-medium"
                      >+8.3%</span
                    >
                  </div>
                </div>
                <UButton variant="ghost" size="sm" to="/commande"
                  >Voir détail</UButton
                >
              </div>
            </div>

            <!-- CA du mois Card -->
            <div
              class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group"
            >
              <div class="flex items-center justify-between mb-4">
                <div
                  class="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-200 transition-colors"
                >
                  <UIcon name="i-lucide-euro" class="w-8 h-8 text-purple-600" />
                </div>
                <div class="text-right">
                  <div v-if="loading" class="space-y-2">
                    <div class="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                    <div class="h-4 w-20 bg-gray-200 animate-pulse rounded" />
                  </div>
                  <template v-else>
                    <p class="text-2xl font-bold text-gray-900">
                      {{ monthSales.toLocaleString() }}
                      {{ companySettings?.currency }}
                    </p>
                    <p class="text-sm text-gray-500">CA du mois</p>
                  </template>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">vs mois dernier</p>
                  <div class="flex items-center mt-1">
                    <UIcon
                      name="i-lucide-trending-up"
                      class="w-4 h-4 text-green-500 mr-1"
                    />
                    <span class="text-sm text-green-600 font-medium"
                      >+15.7%</span
                    >
                  </div>
                </div>
                <UButton variant="ghost" size="sm" to="/rapports/ventes"
                  >Voir détail</UButton
                >
              </div>
            </div>
          </div>

          <!-- Main Dashboard Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <!-- Recent Activity -->
            <div class="lg:col-span-2">
              <div
                class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-xl font-bold text-gray-900 flex items-center">
                    <UIcon
                      name="i-lucide-activity"
                      class="w-6 h-6 mr-2 text-blue-600"
                    />
                    Activité Récente
                  </h2>
                  <UButton variant="ghost" size="sm">Voir tout</UButton>
                </div>

                <div class="space-y-4">
                  <div v-if="loading" class="flex justify-center py-8">
                    <div
                      class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
                    />
                  </div>

                  <div
                    v-else-if="error"
                    class="p-4 bg-red-50 rounded-lg border border-red-100"
                  >
                    <p class="text-red-600 text-sm">
                      Erreur lors du chargement des activités: {{ error }}
                    </p>
                  </div>

                  <div
                    v-for="activity in recentActivities"
                    :key="activity.timestamp"
                    :class="`flex items-center p-4 rounded-xl border ${activity.bgColor} ${activity.borderColor}`"
                  >
                    <div
                      :class="`p-2 rounded-lg mr-4 ${activity.bgColor.replace(
                        '50',
                        '100',
                      )}`"
                    >
                      <UIcon
                        :name="activity.icon"
                        :class="`w-5 h-5 ${activity.iconColor}`"
                      />
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-gray-900">
                        {{ activity.title }}
                      </p>
                      <p class="text-sm text-gray-600">
                        {{ activity.description }}
                      </p>
                    </div>
                    <span class="text-sm text-gray-500">{{
                      activity.time
                    }}</span>
                  </div>

                  <div
                    v-if="!loading && !error && recentActivities.length === 0"
                    class="text-center py-8"
                  >
                    <UIcon
                      name="i-lucide-inbox"
                      class="w-12 h-12 text-gray-400 mx-auto mb-2"
                    />
                    <p class="text-gray-500">Aucune activité récente</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Actions & Profile -->
            <div class="space-y-6">
              <!-- Quick Actions -->
              <div
                class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2
                  class="text-xl font-bold text-gray-900 mb-6 flex items-center"
                >
                  <UIcon
                    name="i-lucide-zap"
                    class="w-6 h-6 mr-2 text-yellow-600"
                  />
                  Actions Rapides
                </h2>

                <div class="grid grid-cols-2 gap-3">
                  <NuxtLink
                    v-if="
                      userRoles.includes('admin') ||
                      userRoles.includes('magasinier')
                    "
                    to="/produit/add"
                    class="flex flex-col items-center p-4 rounded-xl hover:bg-blue-50 transition-colors group border border-transparent hover:border-blue-200"
                  >
                    <div
                      class="bg-blue-100 p-3 rounded-lg mb-2 group-hover:bg-blue-200 transition-colors"
                    >
                      <UIcon
                        name="i-lucide-plus"
                        class="w-6 h-6 text-blue-600"
                      />
                    </div>
                    <span class="text-sm font-medium text-center text-gray-700"
                      >Ajouter Produit</span
                    >
                  </NuxtLink>

                  <NuxtLink
                    v-if="
                      userRoles.includes('admin') ||
                      userRoles.includes('employe')
                    "
                    to="/client/add"
                    class="flex flex-col items-center p-4 rounded-xl hover:bg-green-50 transition-colors group border border-transparent hover:border-green-200"
                  >
                    <div
                      class="bg-green-100 p-3 rounded-lg mb-2 group-hover:bg-green-200 transition-colors"
                    >
                      <UIcon
                        name="i-lucide-user-plus"
                        class="w-6 h-6 text-green-600"
                      />
                    </div>
                    <span class="text-sm font-medium text-center text-gray-700"
                      >Ajouter Client</span
                    >
                  </NuxtLink>

                  <NuxtLink
                    v-if="
                      userRoles.includes('admin') ||
                      userRoles.includes('employe')
                    "
                    to="/commande/add"
                    class="flex flex-col items-center p-4 rounded-xl hover:bg-orange-50 transition-colors group border border-transparent hover:border-orange-200"
                  >
                    <div
                      class="bg-orange-100 p-3 rounded-lg mb-2 group-hover:bg-orange-200 transition-colors"
                    >
                      <UIcon
                        name="i-lucide-shopping-cart"
                        class="w-6 h-6 text-orange-600"
                      />
                    </div>
                    <span class="text-sm font-medium text-center text-gray-700"
                      >Nouvelle Commande</span
                    >
                  </NuxtLink>

                  <NuxtLink
                    v-if="
                      userRoles.includes('admin') ||
                      userRoles.includes('employe')
                    "
                    to="/facture"
                    class="flex flex-col items-center p-4 rounded-xl hover:bg-purple-50 transition-colors group border border-transparent hover:border-purple-200"
                  >
                    <div
                      class="bg-purple-100 p-3 rounded-lg mb-2 group-hover:bg-purple-200 transition-colors"
                    >
                      <UIcon
                        name="i-lucide-receipt"
                        class="w-6 h-6 text-purple-600"
                      />
                    </div>
                    <span class="text-sm font-medium text-center text-gray-700"
                      >Factures</span
                    >
                  </NuxtLink>

                  <NuxtLink
                    v-if="userRoles.includes('magasinier')"
                    to="/Commande"
                    class="flex flex-col items-center p-4 rounded-xl hover:bg-purple-50 transition-colors group border border-transparent hover:border-purple-200"
                  >
                    <div
                      class="bg-purple-100 p-3 rounded-lg mb-2 group-hover:bg-purple-200 transition-colors"
                    >
                      <UIcon
                        name="i-lucide-truck"
                        class="w-6 h-6 text-purple-600"
                      />
                    </div>
                    <span class="text-sm font-medium text-center text-gray-700"
                      >Livraisons</span
                    >
                  </NuxtLink>
                </div>
              </div>

              <!-- User Profile -->
              <div
                class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2
                  class="text-xl font-bold text-gray-900 mb-6 flex items-center"
                >
                  <UIcon
                    name="i-lucide-user"
                    class="w-6 h-6 mr-2 text-indigo-600"
                  />
                  Mon Profil
                </h2>

                <div class="space-y-4">
                  <div class="flex items-center space-x-3">
                    <div class="bg-indigo-100 p-2 rounded-lg">
                      <UIcon
                        name="i-lucide-user"
                        class="w-5 h-5 text-indigo-600"
                      />
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">
                        {{ userName || userEmail }}
                      </p>
                      <p class="text-sm text-gray-500">Nom d'utilisateur</p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-3">
                    <div class="bg-indigo-100 p-2 rounded-lg">
                      <UIcon
                        name="i-lucide-mail"
                        class="w-5 h-5 text-indigo-600"
                      />
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ userEmail }}</p>
                      <p class="text-sm text-gray-500">Email</p>
                    </div>
                  </div>

                  <div v-if="userPhone" class="flex items-center space-x-3">
                    <div class="bg-indigo-100 p-2 rounded-lg">
                      <UIcon
                        name="i-lucide-phone"
                        class="w-5 h-5 text-indigo-600"
                      />
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ userPhone }}</p>
                      <p class="text-sm text-gray-500">Téléphone</p>
                    </div>
                  </div>

                  <div class="pt-4 border-t">
                    <p class="text-sm font-medium text-gray-700 mb-2">
                      Rôles et Permissions
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <RoleBadge
                        v-for="role in userRoles"
                        :key="role"
                        :role-value="role"
                        size="sm"
                      />
                      <span
                        v-if="userRoles.length === 0"
                        class="text-sm text-gray-400"
                      >
                        Aucun rôle assigné
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                      {{ getRoleDescription() }}
                    </p>
                  </div>

                  <UButton
                    to="/profile"
                    variant="outline"
                    size="sm"
                    class="w-full mt-4"
                    icon="i-lucide-settings"
                  >
                    Modifier le profil
                  </UButton>
                </div>
              </div>
            </div>
          </div>

          <!-- Charts and Analytics -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Sales Chart -->
            <div
              class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-gray-900 flex items-center">
                  <UIcon
                    name="i-lucide-bar-chart"
                    class="w-6 h-6 mr-2 text-green-600"
                  />
                  Évolution des Ventes
                </h2>
                <div class="flex space-x-2">
                  <UButton
                    variant="ghost"
                    size="xs"
                    :class="{ 'bg-gray-100': salesPeriod === 'week' }"
                    @click="changeSalesPeriod('week')"
                    >7J</UButton
                  >
                  <UButton
                    variant="ghost"
                    size="xs"
                    :class="{ 'bg-gray-100': salesPeriod === 'month' }"
                    @click="changeSalesPeriod('month')"
                    >1M</UButton
                  >
                  <UButton
                    variant="ghost"
                    size="xs"
                    :class="{ 'bg-gray-100': salesPeriod === 'year' }"
                    @click="changeSalesPeriod('year')"
                    >1A</UButton
                  >
                </div>
              </div>

              <SalesChart
                :sales-data="salesData"
                :period="salesPeriod"
                chart-type="line"
              />
            </div>

            <!-- Stock Alerts -->
            <div
              class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
            >
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-gray-900 flex items-center">
                  <UIcon
                    name="i-lucide-alert-triangle"
                    class="w-6 h-6 mr-2 text-orange-600"
                  />
                  Alertes Stock
                </h2>
                <UButton
                  v-if="
                    userRoles.includes('admin') ||
                    userRoles.includes('magasinier')
                  "
                  variant="ghost"
                  size="sm"
                  to="/stock"
                >
                  Gérer le stock
                </UButton>
              </div>

              <div class="space-y-4">
                <div v-if="loading" class="flex justify-center py-8">
                  <div
                    class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"
                  />
                </div>

                <div
                  v-else-if="error"
                  class="p-4 bg-red-50 rounded-lg border border-red-100"
                >
                  <p class="text-red-600 text-sm">
                    Erreur lors du chargement des alertes: {{ error }}
                  </p>
                </div>

                <div
                  v-for="alert in stockAlerts"
                  :key="alert.product_name"
                  :class="`flex items-center justify-between p-3 rounded-lg border ${alert.bgColor} ${alert.borderColor}`"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      :class="`p-1 rounded ${alert.bgColor.replace(
                        '50',
                        '100',
                      )}`"
                    >
                      <UIcon
                        :name="alert.icon"
                        :class="`w-4 h-4 ${alert.iconColor}`"
                      />
                    </div>
                    <div>
                      <p class="font-medium text-gray-900 text-sm">
                        {{ alert.product_name }}
                      </p>
                      <p :class="`text-xs ${alert.iconColor}`">
                        {{ alert.message }}
                      </p>
                    </div>
                  </div>
                  <UButton size="xs" :color="alert.color" variant="soft">
                    Commander
                  </UButton>
                </div>

                <div
                  v-if="!loading && !error && stockAlerts.length === 0"
                  class="text-center py-8"
                >
                  <UIcon
                    name="i-lucide-check-circle"
                    class="w-12 h-12 text-green-400 mx-auto mb-2"
                  />
                  <p class="text-green-600 font-medium">
                    Tous les stocks sont OK !
                  </p>
                  <p class="text-sm text-gray-500 mt-1">
                    Aucune alerte de stock détectée
                  </p>
                </div>

                <div v-else-if="!loading && !error" class="text-center py-4">
                  <p class="text-sm text-gray-500">
                    {{ stockAlerts.length }} alerte{{
                      stockAlerts.length > 1 ? "s" : ""
                    }}
                    active{{ stockAlerts.length > 1 ? "s" : "" }} sur
                    {{ totalProducts }} produits
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Info -->
          <div
            class="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-8 text-white"
          >
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 class="text-lg font-bold mb-4 flex items-center">
                  <UIcon name="i-lucide-info" class="w-5 h-5 mr-2" />
                  Application
                </h3>
                <div class="space-y-2 text-sm text-gray-300">
                  <p>Version: 2.0.1</p>
                  <p>
                    Dernière mise à jour:
                    {{ new Date().toLocaleDateString("fr-FR") }}
                  </p>
                  <p>Système: Gestion Carrelage Pro</p>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-bold mb-4 flex items-center">
                  <UIcon name="i-lucide-headphones" class="w-5 h-5 mr-2" />
                  Support
                </h3>
                <div class="space-y-2 text-sm text-gray-300">
                  <p>Email: jeobrandevcode@gmail.com</p>
                  <p>Tél: +33 7 69 10 96 26</p>
                  <p>Disponible: 9h-18h (Lu-Ve)</p>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-bold mb-4 flex items-center">
                  <UIcon name="i-lucide-book-open" class="w-5 h-5 mr-2" />
                  Ressources
                </h3>
                <div class="space-y-2">
                  <UButton
                    variant="ghost"
                    size="sm"
                    to="/aide/documentation"
                    class="text-white hover:bg-white/10 justify-start p-0"
                  >
                    Documentation
                  </UButton>
                  <UButton
                    variant="ghost"
                    size="sm"
                    to="/aide/support"
                    class="text-white hover:bg-white/10 justify-start p-0"
                  >
                    Centre d'aide
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </component>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useMagasinStore } from "../composables/useMagasinStore";
import { useCurrentUser } from "../composables/useCurrentUser";
import { useCompanySettings } from "../composables/useCompanySettings";
import superadmin from "./superadmin/index.vue";

// Helper pour valider l'id magasin
function isValidMagasinId(id) {
  return typeof id === "string" && id.trim() !== "";
}
const isSuperAdmin = computed(() => userRoles.value.includes("super_admin"));
const isLoadingRoles = computed(() => userRoles.value === null);
const { companyId, isLoadingUser, loadCurrentUser } = useCurrentUser();
const { settings: companySettings, fetchCompanySettings } =
  useCompanySettings();

onMounted(async () => {
  if (isLoadingUser.value) {
    await loadCurrentUser();
  }
  if (companyId.value) await fetchCompanySettings(companyId.value);
});

const { userRoles, userName, userEmail, userPhone } = useCurrentUser();
const { getHighestRole } = useRoles();
const magasinStore = useMagasinStore();

// Utilisation du composable pour les données réelles
const {
  totalProducts,
  totalClients,
  activeOrders,
  monthSales,
  recentActivities,
  stockAlerts,
  salesData,
  loading,
  error,
  loadDashboardData,
  fetchSalesData,
} = useDashboardData();

// Reactive data
const salesPeriod = ref("month");

// Charger les données au montage du composant : attend que magasinId soit prêt
onMounted(async () => {
  if (!isValidMagasinId(magasinStore.magasinId)) {
    const stop = watch(
      () => magasinStore.magasinId,
      async (val) => {
        if (isValidMagasinId(val)) {
          await loadDashboardData(val);
          stop();
        }
      },
    );
  } else {
    await loadDashboardData(magasinStore.magasinId);
  }
});

// Fonction pour changer la période du graphique
const changeSalesPeriod = async (period) => {
  salesPeriod.value = period;
  if (isValidMagasinId(magasinStore.magasinId)) {
    await fetchSalesData(period, magasinStore.magasinId);
  }
};

// Computed properties
const getRoleDescription = () => {
  const highestRole = getHighestRole([...userRoles.value]);
  if (highestRole) {
    return highestRole.description;
  }
  return "Contactez votre support pour obtenir des permissions.";
};

// SEO
useHead({
  title: "Dashboard - App Gestion Carrelage Pro",
  meta: [
    {
      name: "description",
      content:
        "Dashboard professionnel pour la gestion d'entreprise de carrelage. Suivez vos stocks, clients, commandes et finances en temps réel.",
    },
  ],
});
</script>
