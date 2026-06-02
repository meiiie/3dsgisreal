import { getObjectStorageRuntimeStatus } from "@loi-vao/assets";
import { getDatabase, getDatabaseRuntimeStatus } from "@loi-vao/db";

import type { SystemRuntimeStatus } from "../domain";

export async function getSystemRuntimeStatus(): Promise<SystemRuntimeStatus> {
  const database = getDatabase();
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  let databaseStatus = null;
  let databaseError = null;

  if (database) {
    try {
      databaseStatus = await getDatabaseRuntimeStatus(database);
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "Unknown database health error.";
    }
  }

  const requiredTablesReady = databaseStatus
    ? Object.values(databaseStatus.requiredTables).every(Boolean)
    : false;
  const storageStatus = await getObjectStorageRuntimeStatus({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    sceneAssetsBucket: process.env.SCENE_ASSETS_BUCKET,
    rawCaptureBucket: process.env.RAW_CAPTURE_BUCKET,
  });

  return {
    app: {
      service: "loi-vao-web",
      mode: "local-lab",
      nodeEnv: process.env.NODE_ENV || "development",
    },
    database: {
      configured: databaseConfigured,
      source: databaseConfigured ? "postgis" : "sample-repository",
      status: databaseStatus,
      error: databaseError,
    },
    storage: {
      sceneAssetsBucket: process.env.SCENE_ASSETS_BUCKET || null,
      rawCaptureBucket: process.env.RAW_CAPTURE_BUCKET || null,
      sceneAssetsPublicBaseUrl: readSceneAssetsPublicBaseUrl(),
      s3EndpointConfigured: Boolean(process.env.S3_ENDPOINT),
      credentialsConfigured: Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY),
      status: storageStatus,
    },
    checks: {
      databaseReady: Boolean(databaseStatus?.connected),
      migrationsReady: Boolean(databaseStatus?.migrationTableExists && databaseStatus.appliedMigrationCount > 0),
      requiredTablesReady,
      storageConfigured: Boolean(process.env.SCENE_ASSETS_BUCKET && process.env.RAW_CAPTURE_BUCKET),
      assetPublicBaseConfigured: Boolean(readSceneAssetsPublicBaseUrl()),
      storageReady: storageStatus.connected,
    },
  };
}

function readSceneAssetsPublicBaseUrl() {
  const configured =
    process.env.SCENE_ASSETS_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SCENE_ASSET_BASE_URL;

  return configured?.trim() || null;
}
