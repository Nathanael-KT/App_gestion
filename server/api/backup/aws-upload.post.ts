/**
 * API pour sauvegarder les backups sur AWS S3
 * Assure la récupération des données même en cas de crash complet de la BDD
 * Compatible Deno Deploy - utilise JSON au lieu d'Excel
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default defineEventHandler(async (event) => {
  try {
    // Vérifier si AWS est configuré
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!awsAccessKey || !awsSecretKey || !bucketName) {
      return {
        success: false,
        status: 'aws_not_configured',
        message: 'AWS S3 n est pas configuré sur ce serveur',
        info: 'Le backup automatique AWS S3 sera disponible après configuration des clés AWS',
        fallback: 'Les backups manuels locaux restent disponibles'
      };
    }

    const body = await readBody(event);
    const { filename, data, companyName } = body;

    if (!filename || !data || !companyName) {
      throw createError({
        statusCode: 400,
        statusMessage: "Données manquantes pour le backup",
      });
    }

    // Vérifier si on est en mode test/développement
    const isTestMode =
      !awsAccessKey || !awsSecretKey || awsAccessKey === "test_access_key";

    if (isTestMode) {
      // Mode simulation pour les tests locaux
      console.log("🧪 Mode test AWS S3 - Simulation du backup");

      const workbookData = JSON.parse(data);
      const simulatedSize = workbookData.tables.length * 1024 * 100; // ~100KB par table

      // Retourner une réponse simulée
      return {
        success: true,
        message: "Backup simulé avec succès (Mode Test)",
        s3Key: `test/backups/${new Date().getFullYear()}/${companyName.replace(
          /[^a-zA-Z0-9]/g,
          "_"
        )}/${filename}`,
        s3Url: `https://app-gestion-backups-test.s3.us-east-1.amazonaws.com/test/${filename}`,
        bucketName: "app-gestion-backups-test",
        size: simulatedSize,
        etag: `"test-${Date.now()}"`,
        metadata: {
          company: companyName,
          filename,
          uploadedAt: new Date().toISOString(),
          region: "us-east-1",
          storageClass: "STANDARD_IA",
          encryption: "AES256",
          testMode: true,
        },
      };
    }

    // Configuration AWS S3 réelle (production)
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
    });

    // Création du fichier de backup JSON (compatible Deno Deploy)
    let backupBuffer: Buffer;

    try {
      const workbookData = JSON.parse(data);
      
      // Créer un backup JSON structuré et lisible
      const backupContent = {
        metadata: {
          company: workbookData.company,
          companyId: workbookData.metadata.companyId,
          generatedAt: workbookData.metadata.generatedAt,
          backupType: "Automatique - AWS S3",
          format: "JSON",
          tablesCount: workbookData.tables.length,
          totalRecords: workbookData.tables.reduce(
            (sum: number, table: { count: number }) => sum + table.count,
            0
          ),
          version: "1.0",
          deno_compatible: true
        },
        summary: {
          company: workbookData.company,
          backupDate: new Date().toLocaleDateString("fr-FR"),
          backupTime: new Date().toLocaleTimeString("fr-FR"),
          tablesBackedUp: workbookData.tables.length,
          status: "Backup réussi - Stocké sur AWS S3",
          availability: "99.99% - Récupération instantanée"
        },
        tables: workbookData.tables
      };

      // Convertir en buffer JSON pretty-printed
      backupBuffer = Buffer.from(JSON.stringify(backupContent, null, 2), 'utf-8');
      
    } catch (parseError) {
      console.error("Erreur parsing des données:", parseError);
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors du traitement des données de backup",
      });
    }

    // Créer le chemin S3 organisé par date et compagnie
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // Utiliser .json au lieu de .xlsx pour la compatibilité
    const jsonFilename = filename.replace(/\.xlsx?$/i, '.json');
    const s3Key = `backups/${year}/${month}/${day}/${companyName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}/${jsonFilename}`;

    // Upload vers S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: backupBuffer,
      ContentType: "application/json",
      Metadata: {
        "company-name": companyName,
        "backup-type": "automatic",
        "generated-at": date.toISOString(),
        "file-size": String(backupBuffer.length),
        "tables-count": String(JSON.parse(data).tables.length),
        "format": "json",
        "deno-compatible": "true"
      },
      // Chiffrement et stockage durable
      ServerSideEncryption: "AES256",
      StorageClass: "STANDARD_IA", // Stockage peu fréquent mais récupération rapide
    });

    const uploadResult = await s3Client.send(uploadCommand);

    // Construire l'URL de récupération
    const s3Url = `https://${bucketName}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${s3Key}`;

    console.log(`✅ Backup AWS S3 réussi: ${companyName} -> ${s3Key}`);

    return {
      success: true,
      message: "Backup sauvegardé avec succès sur AWS S3 (format JSON)",
      s3Key,
      s3Url,
      bucketName,
      size: backupBuffer.length,
      etag: uploadResult.ETag,
      format: "JSON",
      metadata: {
        company: companyName,
        filename: jsonFilename,
        uploadedAt: date.toISOString(),
        region: process.env.AWS_REGION || "us-east-1",
        storageClass: "STANDARD_IA",
        encryption: "AES256",
        denoCompatible: true,
      },
    };
  } catch (error) {
    console.error("❌ Erreur backup AWS S3:", error);

    // Retourner une erreur détaillée
    throw createError({
      statusCode: 500,
      statusMessage: `Erreur backup AWS: ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`,
    });
  }
});
