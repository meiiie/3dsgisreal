import { HeadBucketCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type ObjectStorageBucketStatus = {
  name: string | null;
  exists: boolean;
  error: string | null;
};

export type ObjectStorageRuntimeStatus = {
  configured: boolean;
  connected: boolean;
  endpoint: string | null;
  region: string;
  credentialsConfigured: boolean;
  buckets: {
    sceneAssets: ObjectStorageBucketStatus;
    rawCaptures: ObjectStorageBucketStatus;
  };
  error: string | null;
};

export type ObjectStorageRuntimeConfig = {
  endpoint?: string | null;
  region?: string | null;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  sceneAssetsBucket?: string | null;
  rawCaptureBucket?: string | null;
};

export type ObjectStorageObjectInput = {
  key: string;
};

export type ObjectStorageObjectStatus = {
  key: string;
  bucket: string | null;
  exists: boolean;
  bytes: number | null;
  lastModified: string | null;
  error: string | null;
};

export async function getObjectStorageRuntimeStatus(
  config: ObjectStorageRuntimeConfig,
): Promise<ObjectStorageRuntimeStatus> {
  const normalized = normalizeObjectStorageConfig(config);
  const configured = Boolean(
    normalized.endpoint &&
      normalized.accessKeyId &&
      normalized.secretAccessKey &&
      normalized.sceneAssetsBucket &&
      normalized.rawCaptureBucket,
  );

  const missingStatus = {
    configured,
    connected: false,
    endpoint: normalized.endpoint,
    region: normalized.region,
    credentialsConfigured: Boolean(normalized.accessKeyId && normalized.secretAccessKey),
    buckets: {
      sceneAssets: createMissingBucketStatus(normalized.sceneAssetsBucket),
      rawCaptures: createMissingBucketStatus(normalized.rawCaptureBucket),
    },
    error: configured ? null : "S3 endpoint, credentials, scene bucket, or raw capture bucket is missing.",
  } satisfies ObjectStorageRuntimeStatus;

  if (
    !normalized.endpoint ||
    !normalized.accessKeyId ||
    !normalized.secretAccessKey ||
    !normalized.sceneAssetsBucket ||
    !normalized.rawCaptureBucket
  ) {
    return missingStatus;
  }

  const client = new S3Client({
    endpoint: normalized.endpoint,
    region: normalized.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: normalized.accessKeyId,
      secretAccessKey: normalized.secretAccessKey,
    },
  });

  try {
    const [sceneAssets, rawCaptures] = await Promise.all([
      checkBucket(client, normalized.sceneAssetsBucket),
      checkBucket(client, normalized.rawCaptureBucket),
    ]);

    return {
      ...missingStatus,
      connected: sceneAssets.exists && rawCaptures.exists,
      buckets: {
        sceneAssets,
        rawCaptures,
      },
      error: sceneAssets.error || rawCaptures.error,
    };
  } catch (error) {
    return {
      ...missingStatus,
      error: getErrorMessage(error),
    };
  } finally {
    client.destroy();
  }
}

export async function getObjectStorageObjectStatuses(
  config: ObjectStorageRuntimeConfig,
  bucketName: string | null | undefined,
  objects: ObjectStorageObjectInput[],
): Promise<ObjectStorageObjectStatus[]> {
  const normalized = normalizeObjectStorageConfig(config);
  const bucket = readConfigValue(bucketName);

  if (!normalized.endpoint || !normalized.accessKeyId || !normalized.secretAccessKey || !bucket) {
    return objects.map((object) => ({
      key: object.key,
      bucket,
      exists: false,
      bytes: null,
      lastModified: null,
      error: "S3 endpoint, credentials, or bucket is missing.",
    }));
  }

  const client = new S3Client({
    endpoint: normalized.endpoint,
    region: normalized.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: normalized.accessKeyId,
      secretAccessKey: normalized.secretAccessKey,
    },
  });

  try {
    return await Promise.all(objects.map((object) => checkObject(client, bucket, object.key)));
  } finally {
    client.destroy();
  }
}

async function checkBucket(client: S3Client, name: string | null): Promise<ObjectStorageBucketStatus> {
  if (!name) {
    return createMissingBucketStatus(name);
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: name }));
    return {
      name,
      exists: true,
      error: null,
    };
  } catch (error) {
    return {
      name,
      exists: false,
      error: getErrorMessage(error),
    };
  }
}

async function checkObject(client: S3Client, bucket: string, key: string): Promise<ObjectStorageObjectStatus> {
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

    return {
      key,
      bucket,
      exists: true,
      bytes: result.ContentLength ?? null,
      lastModified: result.LastModified?.toISOString() ?? null,
      error: null,
    };
  } catch (error) {
    return {
      key,
      bucket,
      exists: false,
      bytes: null,
      lastModified: null,
      error: getErrorMessage(error),
    };
  }
}

function createMissingBucketStatus(name: string | null): ObjectStorageBucketStatus {
  return {
    name,
    exists: false,
    error: name ? null : "Bucket name is missing.",
  };
}

function normalizeObjectStorageConfig(config: ObjectStorageRuntimeConfig) {
  return {
    endpoint: readConfigValue(config.endpoint),
    region: readConfigValue(config.region) ?? "us-east-1",
    accessKeyId: readConfigValue(config.accessKeyId),
    secretAccessKey: readConfigValue(config.secretAccessKey),
    sceneAssetsBucket: readConfigValue(config.sceneAssetsBucket),
    rawCaptureBucket: readConfigValue(config.rawCaptureBucket),
  };
}

function readConfigValue(value: string | null | undefined) {
  return value?.trim() || null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown S3 storage error.";
}
