/**
 * Endpoint pour tester la configuration AWS sans faire d'upload
 * Vérifie les clés et la connectivité S3
 */
import {
  S3Client,
  HeadBucketCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export default defineEventHandler(async (_event) => {
  try {
    // Vérifier les variables d'environnement
    const awsConfig = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
      bucketName: process.env.AWS_S3_BUCKET_NAME,
    };

    const missingVars = [];
    if (!awsConfig.accessKeyId) missingVars.push("AWS_ACCESS_KEY_ID");
    if (!awsConfig.secretAccessKey) missingVars.push("AWS_SECRET_ACCESS_KEY");
    if (!awsConfig.bucketName) missingVars.push("AWS_S3_BUCKET_NAME");

    if (missingVars.length > 0) {
      return {
        success: false,
        status: "config_missing",
        message: "Variables d'environnement AWS manquantes",
        missingVariables: missingVars,
        instructions: "Voir docs/AWS_SETUP_GUIDE.md pour configurer AWS S3",
      };
    }

    // Créer le client S3
    const s3Client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });

    // Test 1: Vérifier l'accès au bucket
    try {
      const headBucketCommand = new HeadBucketCommand({
        Bucket: awsConfig.bucketName,
      });
      await s3Client.send(headBucketCommand);
    } catch (bucketError: unknown) {
      const error = bucketError as { name?: string; message?: string };
      if (error.name === "NotFound") {
        return {
          success: false,
          status: "bucket_not_found",
          message: `Le bucket S3 '${awsConfig.bucketName}' n'existe pas`,
          bucketName: awsConfig.bucketName,
          region: awsConfig.region,
          suggestion: "Créer le bucket dans la console AWS S3",
        };
      } else if (bucketError.name === "Forbidden") {
        return {
          success: false,
          status: "access_denied",
          message: "Accès refusé au bucket S3",
          bucketName: awsConfig.bucketName,
          suggestion: "Vérifier les permissions IAM de l'utilisateur",
        };
      } else {
        throw bucketError;
      }
    }

    // Test 2: Lister les objets existants (test de lecture)
    let existingBackups = 0;
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: awsConfig.bucketName,
        Prefix: "backups/",
        MaxKeys: 10,
      });
      const listResult = await s3Client.send(listCommand);
      existingBackups = listResult.Contents?.length || 0;
    } catch (listError) {
      console.warn("Erreur listage (non critique):", listError);
    }

    // Tout est bon !
    return {
      success: true,
      status: "ready",
      message: "Configuration AWS S3 valide et opérationnelle",
      config: {
        region: awsConfig.region,
        bucketName: awsConfig.bucketName,
        accessKeyId: awsConfig.accessKeyId.substring(0, 8) + "...",
        existingBackups,
      },
      bucketUrl: `https://${awsConfig.bucketName}.s3.${awsConfig.region}.amazonaws.com`,
      recommendations: [
        "Configuration prête pour les backups automatiques",
        "Les fichiers seront stockés dans le dossier /backups/",
        "Durabilité: 99.999999999% (11 9s)",
        "Disponibilité: 99.99%",
      ],
    };
  } catch (error: unknown) {
    console.error("❌ Erreur test AWS S3:", error);

    // Analyser le type d'erreur
    let errorType = "unknown_error";
    let suggestion = "Vérifier la configuration AWS";

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage?.includes("authorization header is malformed")) {
      errorType = "invalid_credentials";
      suggestion = "Vérifier que les clés AWS sont correctes et sans espaces";
    } else if (errorMessage?.includes("Access Denied")) {
      errorType = "access_denied";
      suggestion = "Vérifier les permissions IAM de l'utilisateur";
    } else if (errorMessage?.includes("Region")) {
      errorType = "invalid_region";
      suggestion = "Vérifier que la région AWS est correcte";
    }

    return {
      success: false,
      status: errorType,
      message: `Test AWS S3 échoué: ${errorMessage}`,
      suggestion,
      documentation: "/docs/AWS_SETUP_GUIDE.md",
    };
  }
});
