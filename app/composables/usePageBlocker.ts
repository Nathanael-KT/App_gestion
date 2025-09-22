/**
 * Composable pour bloquer l'accès aux pages dont le module est désactivé
 * Cette composable permet de sécuriser l'accès direct aux pages même si l'utilisateur
 * utilise une URL ou un favori, sans passer par le menu.
 */

import { ref, onMounted, watch, readonly } from 'vue'
import { useSupabaseClient } from '#imports'
import { useCurrentUser } from './useCurrentUser'
import { navigateTo } from '#app'

export const usePageBlocker = (menuName: string) => {
  const supabase = useSupabaseClient()
  const { companyId } = useCurrentUser()
  
  const isBlocked = ref(false)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  // Mapping des noms de menus vers leurs paths racines
  const menuToRootPath: Record<string, string> = {
    Accueil: '/',
    Stock: '/stock',
    Clients: '/client',
    Commandes: '/commande',
    Facture: '/facture',
    Caisse: '/caisse',
    Utilisateurs: '/utilisateurs',
    Rapports: '/rapports',
    Discussion: '/discussion',
    Forum: '/forum',
    Paramètres: '/parametres',
    Aide: '/aide',
  }

  /**
   * Récupère la liste des menus bloqués depuis Supabase
   */
  const fetchBlockedMenus = async (): Promise<string[]> => {
    if (!companyId.value) {
      return []
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('company_settings')
        .select('blocked_menus')
        .eq('id', companyId.value)
        .single() as { data: { blocked_menus: string[] | null } | null; error: unknown }

      if (fetchError) {
        console.error('Erreur lors de la récupération des menus bloqués:', fetchError)
        return []
      }

      return data?.blocked_menus || []
    } catch (err) {
      console.error('Erreur lors de la récupération des menus bloqués:', err)
      return []
    }
  }

  /**
   * Vérifie si le menu courant est bloqué et redirige si nécessaire
   */
  const checkAndBlock = async () => {
    try {
      isLoading.value = true
      error.value = null

      // Si pas de companyId, pas de blocage
      if (!companyId.value) {
        isBlocked.value = false
        return
      }

      const blockedMenus = await fetchBlockedMenus()
      
      // Vérifier si le menu courant est dans la liste des menus bloqués
      const menuIsBlocked = blockedMenus.includes(menuName)
      
      if (menuIsBlocked) {
        isBlocked.value = true
        
        // Redirection automatique vers /error avec le query blocked=1
        await navigateTo({
          path: '/error',
          query: {
            blocked: '1',
            message: `Accès bloqué au module "${menuName}". Ce module a été désactivé pour votre entreprise. Contactez votre administrateur.`
          }
        })
      } else {
        isBlocked.value = false
      }
    } catch (err) {
      console.error('Erreur lors de la vérification du blocage:', err)
      error.value = 'Erreur lors de la vérification des permissions'
      isBlocked.value = false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Vérifie manuellement si un menu spécifique est bloqué (sans redirection)
   */
  const isMenuBlocked = async (targetMenuName: string): Promise<boolean> => {
    if (!companyId.value) {
      return false
    }

    const blockedMenus = await fetchBlockedMenus()
    return blockedMenus.includes(targetMenuName)
  }

  /**
   * Obtient la liste complète des menus bloqués
   */
  const getBlockedMenus = async (): Promise<string[]> => {
    return await fetchBlockedMenus()
  }

  // Vérification automatique au montage du composant
  onMounted(() => {
    if (companyId.value) {
      checkAndBlock()
    }
  })

  // Surveiller les changements de companyId
  watch(companyId, (newCompanyId) => {
    if (newCompanyId) {
      checkAndBlock()
    }
  })

  return {
    // État
    isBlocked: readonly(isBlocked),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Actions
    checkAndBlock,
    isMenuBlocked,
    getBlockedMenus,

    // Utilitaires
    menuToRootPath: readonly(ref(menuToRootPath))
  }
}