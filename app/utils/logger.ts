/**
 * Logger léger : n'affiche rien en production, se comporte comme
 * console.log/warn en développement. Auto-importé par Nuxt (app/utils/).
 *
 * Remplace les appels console.log/console.warn bruts qui restaient
 * exécutés en production (voir ticket dette technique #63).
 * console.error reste un console.error direct (utile même en prod
 * pour le monitoring d'erreurs).
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (import.meta.dev) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (import.meta.dev) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
};
