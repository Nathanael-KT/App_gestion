import { logger } from "../../utils/logger";
// deno-lint-ignore-file no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default defineEventHandler(async (event: any) => {
  try {
    const body = await readBody(event);
    const { enabled, schedule } = body;

    // Simuler la configuration de la tâche cron côté serveur
    // Dans un vrai environnement, cela configurerait une tâche cron

    if (enabled) {
      logger.debug(`✅ Backup automatique programmé: ${schedule}`);

      // Ici, vous pourriez utiliser node-cron ou un service comme Vercel Cron
      // pour programmer des tâches automatiques

      return {
        success: true,
        message: "Backup automatique configuré avec succès",
        nextExecution: schedule,
      };
    } else {
      logger.debug("❌ Backup automatique désactivé");

      return {
        success: true,
        message: "Backup automatique désactivé",
      };
    }
  } catch (error) {
    logger.error(
      "Erreur lors de la configuration du backup automatique:",
      error
    );

    throw createError({
      statusCode: 500,
      statusMessage: "Erreur lors de la configuration du backup automatique",
    });
  }
});
