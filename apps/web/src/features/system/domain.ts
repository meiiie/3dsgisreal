import type { DatabaseRuntimeStatus } from "@loi-vao/db";
import type { ObjectStorageRuntimeStatus } from "@loi-vao/assets";

export type SystemRuntimeStatus = {
  app: {
    service: "loi-vao-web";
    mode: "local-lab";
    nodeEnv: string;
  };
  database: {
    configured: boolean;
    source: "postgis" | "sample-repository";
    status: DatabaseRuntimeStatus | null;
    error: string | null;
  };
  storage: {
    sceneAssetsBucket: string | null;
    rawCaptureBucket: string | null;
    sceneAssetsPublicBaseUrl: string | null;
    s3EndpointConfigured: boolean;
    credentialsConfigured: boolean;
    status: ObjectStorageRuntimeStatus;
  };
  checks: {
    databaseReady: boolean;
    migrationsReady: boolean;
    requiredTablesReady: boolean;
    storageConfigured: boolean;
    assetPublicBaseConfigured: boolean;
    storageReady: boolean;
  };
};

export function getSystemVerdict(status: SystemRuntimeStatus) {
  if (!status.database.configured) {
    return {
      state: "sample",
      label: "Sample repository",
      detail: "DATABASE_URL chua bat, app dang dung sample fallback cho local UI.",
    };
  }

  if (!status.checks.databaseReady) {
    return {
      state: "blocked",
      label: "PostGIS chua ket noi",
      detail: status.database.error || "Kiem tra Docker Desktop, postgres container va DATABASE_URL.",
    };
  }

  if (!status.checks.migrationsReady || !status.checks.requiredTablesReady) {
    return {
      state: "needs_migration",
      label: "Can migrate DB",
      detail: "Chay pnpm db:migrate de cap nhat schema_migrations va cac bang loi.",
    };
  }

  if (!status.checks.storageReady) {
    return {
      state: "needs_storage",
      label: "Storage chua ready",
      detail: status.storage.status.error || "Kiem tra MinIO/S3 endpoint, credentials va bucket scene/raw.",
    };
  }

  return {
    state: "ready",
    label: "Runtime ready",
    detail: "PostGIS, schema_migrations, bang loi va object storage da san sang.",
  };
}
