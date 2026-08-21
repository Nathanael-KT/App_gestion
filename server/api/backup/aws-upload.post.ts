/**
 * API pour sauvegarder les backups sur AWS S3
 * Sécurisé: nécessite admin/super_admin + validation company_id
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default defineEventHandler(async (event) => {
  try {
    const { companyId, roles } = await requireAdmin(event);

    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    if (!awsAccessKey || !awsSecretKey || !bucketName) {
      return {
        success: false,
        status: "aws_not_configured",
        message: "AWS S3 n est pas configuré sur ce serveur",
        info: "Le backup automatique AWS S3 sera disponible après configuration des clés AWS",
        fallback: "Les backups manuels locaux restent disponibles",
      };
    }

    const body = await readBody(event);
    const { filename, data, companyName, company_id } = body;

    if (!filename || !data || !companyName) {
      throw createError({
        statusCode: 400,
        statusMessage: "Données manquantes pour le backup",
      });
    }

    // Validate company_id matches authenticated user's company unless super_admin
    const isSuperAdmin = roles.includes("super_admin");
    if (!isSuperAdmin && company_id && companyId && company_id !== companyId) {
      throw createError({
        statusCode: 403,
        statusMessage: "Company_id ne correspond pas à votre entreprise",
      });
    }

    // If super_admin provides company_id, use it for validation, otherwise use own companyId
    const effectiveCompanyId = company_id || companyId;
    if (!effectiveCompanyId && !isSuperAdmin) {
      throw createError({
        statusCode: 400,
        statusMessage: "Company_id manquant",
      });
    }

    const isTestMode =
      !awsAccessKey || !awsSecretKey || awsAccessKey === "test_access_key";

    if (isTestMode) {
      const workbookData = JSON.parse(data);
      const simulatedSize = workbookData.tables.length * 1024 * 100;

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

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey,
      },
    });

    let backupBuffer: Buffer;

    try {
      const workbookData = JSON.parse(data);

      const backupContent = {
        metadata: {
          company: workbookData.company,
          companyId: workbookData.metadata.companyId || effectiveCompanyId,
          generatedAt: workbookData.metadata.generatedAt,
          backupType: "Automatique - AWS S3",
          format: "JSON",
          tablesCount: workbookData.tables.length,
          totalRecords: workbookData.tables.reduce(
            (sum: number, table: { count: number }) => sum + table.count,
            0
          ),
          version: "1.0",
          deno_compatible: true,
        },
        summary: {
          company: workbookData.company,
          backupDate: new Date().toLocaleDateString("fr-FR"),
          backupTime: new Date().toLocaleTimeString("fr-FR"),
          tablesBackedUp: workbookData.tables.length,
          status: "Backup réussi - Stocké sur AWS S3",
          availability: "99.99% - Récupération instantanée",
        },
        tables: workbookData.tables,
      };

      backupBuffer = Buffer.from(JSON.stringify(backupContent, null, 2), "utf-8");
    } catch {
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur lors du traitement des données de backup",
      });
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const jsonFilename = filename.replace(/\.xlsx?$/i, ".json");
    const s3Key = `backups/${year}/${month}/${day}/${companyName.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}/${jsonFilename}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: backupBuffer,
      ContentType: "application/json",
      Metadata: {
        "company-name": companyName,
        "company-id": effectiveCompanyId || "unknown",
        "backup-type": "automatic",
        "generated-at": date.toISOString(),
        "file-size": String(backupBuffer.length),
        "tables-count": String(JSON.parse(data).tables.length),
        format: "json",
        "deno-compatible": "true",
      },
      ServerSideEncryption: "AES256",
      StorageClass: "STANDARD_IA",
    });

    const uploadResult = await s3Client.send(uploadCommand);

    const s3Url = `https://${bucketName}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${s3Key}`;

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
        companyId: effectiveCompanyId,
        filename: jsonFilename,
        uploadedAt: date.toISOString(),
        region: process.env.AWS_REGION || "us-east-1",
        storageClass: "STANDARD_IA",
        encryption: "AES256",
        denoCompatible: true,
      },
    };
  } catch (error: any) {
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 500,
      statusMessage: `Erreur backup AWS: ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`,
    });
  }
});
