/**
 * Composable pour tester le système de backup AWS S3
 * Permet de simuler un test de backup et de récupération
 */

export const useBackupTest = () => {
  const supabase = useSupabaseClient() as any;
  const isTestRunning = ref(false);
  const testResults = ref<{
    success: boolean;
    message: string;
    details: Record<string, unknown>;
    duration: number;
  } | null>(null);

  /**
   * Test complet du système de backup
   */
  const runBackupTest = async () => {
    if (isTestRunning.value) {
      console.warn("⚠️ Test déjà en cours");
      return;
    }

    isTestRunning.value = true;
    const startTime = Date.now();

    try {
      console.log("🧪 Démarrage du test de backup AWS S3...");

      // 1. Vérifier la connexion à la base de données
      const { data: companies, error: dbError } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1);

      if (dbError) {
        throw new Error(`Erreur BDD: ${dbError.message}`);
      }

      if (!companies || companies.length === 0) {
        throw new Error("Aucune compagnie trouvée pour le test");
      }

      const testCompany = companies[0];
      if (!testCompany) {
        throw new Error("Aucune compagnie disponible pour le test");
      }
      console.log(
        `✅ Base de données OK - Test avec: ${testCompany.company_name}`,
      );

      // 2. Générer des données de test
      const testData = await generateTestBackupData(testCompany);
      console.log("✅ Données de test générées");

      // 3. Tester l'upload AWS S3
      const awsResult = (await $fetch("/api/backup/aws-upload", {
        method: "POST",
        body: {
          filename: `test_backup_${
            testCompany.company_name
          }_${Date.now()}.json`,
          data: JSON.stringify(testData),
          companyName: `TEST_${testCompany.company_name}`,
        },
      })) as Record<string, any>;

      console.log("✅ Upload AWS S3 réussi:", awsResult);

      // 4. Calculer la durée
      const duration = Date.now() - startTime;

      testResults.value = {
        success: true,
        message: "Test de backup réussi avec succès !",
        details: {
          company: testCompany.company_name,
          tablesBackuped: testData.tables.length,
          awsDetails: awsResult,
          uploadTime: duration,
          region: awsResult.metadata?.region,
          bucketName: awsResult.bucketName,
          s3Key: awsResult.s3Key,
          fileSize: awsResult.size,
        },
        duration,
      };

      console.log("🎉 Test de backup terminé avec succès");
      return testResults.value;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";

      testResults.value = {
        success: false,
        message: `Test de backup échoué: ${errorMessage}`,
        details: {
          error: errorMessage,
          duration,
        },
        duration,
      };

      console.error("❌ Test de backup échoué:", error);
      return testResults.value;
    } finally {
      isTestRunning.value = false;
    }
  };

  /**
   * Génère des données de test réalistes
   */
  const generateTestBackupData = async (company: {
    id: string;
    company_name: string;
  }) => {
    const tables = [
      "users",
      "products_carreaux",
      "product_types",
      "clients",
      "invoices",
      "stocks",
      "magasins",
    ];

    const testData = {
      company: company.company_name,
      tables: [] as Array<{ name: string; data: unknown[]; count: number }>,
      metadata: {
        generatedAt: new Date().toISOString(),
        companyId: company.id,
        testMode: true,
      },
    };

    // Récupérer de vraies données pour quelques tables importantes
    for (const table of tables) {
      try {
        let query = supabase.from(table).select("*").limit(5); // Limiter pour le test

        // Logique de filtrage comme dans le vrai backup
        if (
          [
            "users",
            "products_carreaux",
            "product_types",
            "stocks",
            "magasins",
          ].includes(table)
        ) {
          query = query.eq("company_id", company.id);
        } else {
          // Pour les autres tables, récupérer via magasin_id
          const { data: magasins } = await supabase
            .from("magasins")
            .select("id")
            .eq("company_id", company.id)
            .limit(1);

          if (magasins && magasins.length > 0 && magasins[0]) {
            query = query.eq("magasin_id", magasins[0].id);
          }
        }

        const { data, error } = await query;

        if (!error && data) {
          testData.tables.push({
            name: table,
            data: data,
            count: data.length,
          });
        } else {
          // Ajouter une entrée vide si pas de données
          testData.tables.push({
            name: table,
            data: [],
            count: 0,
          });
        }
      } catch (error) {
        console.warn(`Erreur table ${table} dans le test:`, error);
        testData.tables.push({
          name: table,
          data: [],
          count: 0,
        });
      }
    }

    return testData;
  };

  /**
   * Test de simulation de crash de BDD
   */
  const simulateDatabaseCrash = async () => {
    console.log("💥 Simulation d'un crash de base de données...");

    // Simuler différents scénarios de crash
    const crashScenarios = [
      {
        name: "Connexion perdue",
        simulate: () => {
          console.log("📡 Simulation: Perte de connexion à Supabase");
          return { canRecover: true, recoveryTime: "2-5 minutes" };
        },
      },
      {
        name: "Corruption de données",
        simulate: () => {
          console.log("💾 Simulation: Corruption des données de production");
          return {
            canRecover: false,
            recoveryTime: "Récupération depuis AWS S3 nécessaire",
          };
        },
      },
      {
        name: "Crash complet du serveur",
        simulate: () => {
          console.log("🔥 Simulation: Crash complet du serveur Supabase");
          return {
            canRecover: false,
            recoveryTime: "Restauration depuis backup AWS S3",
          };
        },
      },
    ];

    const randomScenario =
      crashScenarios[Math.floor(Math.random() * crashScenarios.length)];
    if (!randomScenario) {
      throw new Error("Aucun scénario de crash disponible");
    }
    const result = randomScenario.simulate();

    console.log(`✅ Simulation terminée: ${randomScenario.name}`);
    console.log(
      `🔄 Récupération possible: ${result.canRecover ? "Oui" : "Non"}`,
    );
    console.log(`⏱️ Temps de récupération: ${result.recoveryTime}`);

    if (!result.canRecover) {
      console.log("☁️ Récupération depuis les backups AWS S3 en cours...");
      console.log(
        "📦 Fichiers disponibles sur S3 dans le bucket app-gestion-backups",
      );
      console.log("⚡ Temps de récupération estimé: 5-10 minutes");
    }

    return {
      scenario: randomScenario.name,
      ...result,
      awsBackupAvailable: true,
      s3Bucket: "app-gestion-backups",
    };
  };

  return {
    // État
    isTestRunning: readonly(isTestRunning),
    testResults: readonly(testResults),

    // Actions
    runBackupTest,
    simulateDatabaseCrash,

    // Utilitaires
    clearTestResults: () => {
      testResults.value = null;
    },
  };
};
