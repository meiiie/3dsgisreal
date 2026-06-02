import {
  buildStorageAssetUrl,
  createSceneAssetPublishPlan,
  getObjectStorageObjectStatuses,
  getSceneRuntimeReadiness,
  type SceneAssetPublishArtifact,
  type SceneAssetPublishPlan,
} from "@loi-vao/assets";
import { getDatabase, publishLatestSceneVersionAssets } from "@loi-vao/db";

import { getPlaceBySceneId } from "@/features/places/server/repository";

export type SceneAssetPublishDraft = {
  contentKey: string;
  settingsKey?: string;
  collisionKey?: string;
  posterKey?: string;
};

export type SceneAssetPublishResult = {
  persisted: boolean;
  blocked?: {
    reason: "missing_object_storage";
    missingObjectKeys: string[];
  };
  plan: SceneAssetPublishPlan;
  draft: SceneAssetPublishDraft;
  readiness: ReturnType<typeof getSceneRuntimeReadiness>;
  localFiles: LocalSceneAssetCheck[];
  objectFiles: ObjectSceneAssetCheck[];
  dbResult?: {
    sceneSlug: string;
    sceneVersionId: string;
    version: number;
  };
};

export type LocalSceneAssetCheck = SceneAssetPublishArtifact & {
  publicUrl: string;
  exists: boolean;
  bytes?: number;
  qaStatus: "ready" | "missing" | "invalid";
  qaMessage: string;
};

export type ObjectSceneAssetCheck = SceneAssetPublishArtifact & {
  bucket: string | null;
  objectUrl: string;
  exists: boolean;
  bytes: number | null;
  lastModified: string | null;
  error: string | null;
};

export async function getSceneAssetPlan(sceneId: string) {
  const place = await getPlaceBySceneId(sceneId);

  if (!place) {
    return undefined;
  }

  const plan = createSceneAssetPublishPlan(place.scene.id);

  return {
    place,
    plan,
    readiness: getSceneRuntimeReadiness(place.scene),
    localFiles: await getLocalSceneAssetChecks(plan),
    objectFiles: await getObjectSceneAssetChecks(plan),
  };
}

export async function publishSceneAssets(sceneId: string, body: unknown): Promise<SceneAssetPublishResult | undefined> {
  const planContext = await getSceneAssetPlan(sceneId);

  if (!planContext) {
    return undefined;
  }

  const draft = parsePublishDraft(body, planContext.plan);
  const localFiles = await getLocalSceneAssetChecks(planContext.plan);
  const objectFiles = await getObjectSceneAssetChecks(planContext.plan);
  const readiness = getSceneRuntimeReadiness({
    status: "ready",
    contentUrl: draft.contentKey,
    settingsUrl: draft.settingsKey,
    collisionUrl: draft.collisionKey,
    posterUrl: draft.posterKey,
  });
  const database = getDatabase();

  if (!database) {
    return {
      persisted: false,
      plan: planContext.plan,
      draft,
      readiness,
      localFiles,
      objectFiles,
    };
  }

  const missingObjectKeys = objectFiles.filter((file) => !file.exists).map((file) => file.storageKey);

  if (missingObjectKeys.length > 0) {
    return {
      persisted: false,
      blocked: {
        reason: "missing_object_storage",
        missingObjectKeys,
      },
      plan: planContext.plan,
      draft,
      readiness,
      localFiles,
      objectFiles,
    };
  }

  const dbResult = await publishLatestSceneVersionAssets(database, {
    sceneSlug: planContext.place.scene.id,
    ...draft,
  });

  return {
    persisted: Boolean(dbResult),
    plan: planContext.plan,
    draft,
    readiness,
    localFiles,
    objectFiles,
    dbResult: dbResult
      ? {
          sceneSlug: dbResult.sceneSlug,
          sceneVersionId: dbResult.sceneVersionId,
          version: dbResult.version,
        }
      : undefined,
  };
}

export async function getObjectSceneAssetChecks(plan: SceneAssetPublishPlan): Promise<ObjectSceneAssetCheck[]> {
  const statuses = await getObjectStorageObjectStatuses(
    {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      sceneAssetsBucket: process.env.SCENE_ASSETS_BUCKET,
      rawCaptureBucket: process.env.RAW_CAPTURE_BUCKET,
    },
    process.env.SCENE_ASSETS_BUCKET,
    plan.artifacts.map((artifact) => ({ key: artifact.storageKey })),
  );

  return plan.artifacts.map((artifact) => {
    const status = statuses.find((item) => item.key === artifact.storageKey);
    return {
      ...artifact,
      bucket: status?.bucket ?? process.env.SCENE_ASSETS_BUCKET ?? null,
      objectUrl: buildObjectAssetUrl(artifact.storageKey, status?.bucket ?? process.env.SCENE_ASSETS_BUCKET),
      exists: status?.exists ?? false,
      bytes: status?.bytes ?? null,
      lastModified: status?.lastModified ?? null,
      error: status?.error ?? null,
    };
  });
}

export async function getLocalSceneAssetChecks(plan: SceneAssetPublishPlan): Promise<LocalSceneAssetCheck[]> {
  if (process.env.NODE_ENV === "production") {
    return plan.artifacts.map(getProductionLocalAssetCheck);
  }

  const { checkLocalArtifactFile } = await import("./local-scene-asset-files");
  return Promise.all(plan.artifacts.map(checkLocalArtifactFile));
}

function buildObjectAssetUrl(storageKey: string, bucket: string | null | undefined) {
  const publicBaseUrl = process.env.NEXT_PUBLIC_SCENE_ASSET_BASE_URL || process.env.SCENE_ASSET_PUBLIC_BASE_URL;

  if (publicBaseUrl) {
    return buildStorageAssetUrl(storageKey, publicBaseUrl);
  }

  return bucket ? `s3://${bucket}/${storageKey}` : storageKey;
}

function parsePublishDraft(body: unknown, plan: SceneAssetPublishPlan): SceneAssetPublishDraft {
  const value = isRecord(body) ? body : {};

  return {
    contentKey: readString(value.contentKey) ?? getRequiredPlannedKey(plan, "content"),
    settingsKey: readString(value.settingsKey) ?? getPlannedKey(plan, "settings"),
    collisionKey: readString(value.collisionKey) ?? getPlannedKey(plan, "collision"),
    posterKey: readString(value.posterKey) ?? getPlannedKey(plan, "poster"),
  };
}

function getPlannedKey(plan: SceneAssetPublishPlan, kind: "content" | "settings" | "collision" | "poster") {
  return plan.artifacts.find((artifact) => artifact.kind === kind)?.storageKey;
}

function getRequiredPlannedKey(
  plan: SceneAssetPublishPlan,
  kind: "content" | "settings" | "collision" | "poster",
) {
  const key = getPlannedKey(plan, kind);

  if (!key) {
    throw new Error(`Missing ${kind} asset key in publish plan`);
  }

  return key;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getProductionLocalAssetCheck(artifact: SceneAssetPublishArtifact): LocalSceneAssetCheck {
  return {
    ...artifact,
    publicUrl: buildStorageAssetUrl(artifact.storageKey),
    exists: false,
    qaStatus: "missing",
    qaMessage: "Local file checks chỉ chạy trong dev/local harness.",
  };
}
