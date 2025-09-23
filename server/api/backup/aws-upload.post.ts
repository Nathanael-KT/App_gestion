/**
 * API pour sauvegarder les backups sur AWS S3
 * Assure la récupération des données même en cas de crash complet de la BDD
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as XLSX from "xlsx";

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

      // Générer le fichier Excel pour validation
      const workbookData = JSON.parse(data);
      const workbook = XLSX.utils.book_new();

      // Ajouter les informations de la compagnie
      const companyInfo = [
        ["Nom de la compagnie", workbookData.company],
        ["ID de la compagnie", workbookData.metadata.companyId],
        ["Date de génération", workbookData.metadata.generatedAt],
        ["Type de backup", "Test - Simulation AWS S3"],
        ["Nombre de tables", workbookData.tables.length],
      ];

      const infoWS = XLSX.utils.aoa_to_sheet(companyInfo);
      XLSX.utils.book_append_sheet(workbook, infoWS, "Informations_Test");

      // Calculer la taille simulée
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

    // Conversion des données en fichier Excel binaire
    let excelBuffer: Buffer;

    try {
      // Parse les données et créer un vrai fichier Excel
      const workbookData = JSON.parse(data);
      const workbook = XLSX.utils.book_new();

      // Ajouter les informations de la compagnie
      const companyInfo = [
        ["Nom de la compagnie", workbookData.company],
        ["ID de la compagnie", workbookData.metadata.companyId],
        ["Date de génération", workbookData.metadata.generatedAt],
        ["Type de backup", "Automatique - AWS S3"],
        ["Nombre de tables", workbookData.tables.length],
      ];

      const infoWS = XLSX.utils.aoa_to_sheet(companyInfo);
      XLSX.utils.book_append_sheet(workbook, infoWS, "Informations_Backup");

      // Ajouter chaque table comme feuille
      for (const table of workbookData.tables) {
        if (table.data && table.data.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(table.data);
          XLSX.utils.book_append_sheet(workbook, worksheet, table.name);
        } else {
          // Feuille vide si pas de données
          const emptyWS = XLSX.utils.aoa_to_sheet([
            ["Aucune donnée disponible"],
            [`Table: ${table.name}`],
            [`Nombre d'entrées: 0`],
          ]);
          XLSX.utils.book_append_sheet(workbook, emptyWS, `${table.name}_vide`);
        }
      }

      // Ajouter un résumé
      const summaryData = [
        ["Résumé du Backup Automatique"],
        ["Compagnie", workbookData.company],
        ["Date", new Date().toLocaleDateString("fr-FR")],
        ["Heure", new Date().toLocaleTimeString("fr-FR")],
        ["Tables sauvegardées", workbookData.tables.length],
        [
          "Total des enregistrements",
          workbookData.tables.reduce(
            (sum: number, table: { count: number }) => sum + table.count,
            0
          ),
        ],
        ["Statut", "Backup réussi - Stocké sur AWS S3"],
        ["Disponibilité", "99.99% - Récupération instantanée"],
      ];

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWS, "Résumé_Backup");

      // Convertir en buffer
      excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "buffer",
        compression: true,
      });
    } catch (excelError) {
      console.error("Erreur génération Excel:", excelError);
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors de la génération du fichier Excel",
      });
    }

    // Créer le chemin S3 organisé par date et compagnie
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const s3Key = `backups/${year}/${month}/${day}/${companyName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}/${filename}`;

    // Upload vers S3
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: excelBuffer,
      ContentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      Metadata: {
        "company-name": companyName,
        "backup-type": "automatic",
        "generated-at": date.toISOString(),
        "file-size": String(excelBuffer.length),
        "tables-count": String(JSON.parse(data).tables.length),
      },
      // Chiffrement et stockage durable
      ServerSideEncryption: "AES256",
      StorageClass: "STANDARD_IA", // Stockage peu fréquent mais récupération rapide
    });

    const uploadResult = await s3Client.send(uploadCommand);

    // Construire l'URL de récupération (sera signée côté client si nécessaire)
    const s3Url = `https://${bucketName}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${s3Key}`;

    console.log(`✅ Backup AWS S3 réussi: ${companyName} -> ${s3Key}`);

    return {
      success: true,
      message: "Backup sauvegardé avec succès sur AWS S3",
      s3Key,
      s3Url,
      bucketName,
      size: excelBuffer.length,
      etag: uploadResult.ETag,
      metadata: {
        company: companyName,
        filename,
        uploadedAt: date.toISOString(),
        region: process.env.AWS_REGION || "us-east-1",
        storageClass: "STANDARD_IA",
        encryption: "AES256",
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
