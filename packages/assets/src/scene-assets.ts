export type SceneAssetKind = "content" | "settings" | "collision" | "poster";

export type SceneAssetInput = {
  status: string;
  contentUrl?: string;
  settingsUrl?: string;
  collisionUrl?: string;
  posterUrl?: string;
};

export type SceneAssetChecklistItem = {
  kind: SceneAssetKind;
  label: string;
  requiredFor: "viewer" | "walkthrough" | "preview";
  available: boolean;
  url?: string;
};

export type SceneRuntimeReadiness = {
  canOpenViewer: boolean;
  canEnableWalkthrough: boolean;
  missingForViewer: SceneAssetKind[];
  missingForWalkthrough: SceneAssetKind[];
  checklist: SceneAssetChecklistItem[];
};

export type SceneAssetPublishArtifact = {
  kind: SceneAssetKind;
  label: string;
  storageKey: string;
  requiredFor: SceneAssetChecklistItem["requiredFor"];
};

export type SceneAssetPublishPlan = {
  sceneId: string;
  version: number;
  baseKey: string;
  artifacts: SceneAssetPublishArtifact[];
};

const assetLabels: Record<SceneAssetKind, string> = {
  content: "SOG content",
  settings: "settings.json",
  collision: "collision",
  poster: "poster",
};

export function buildStorageAssetUrl(storageKey: string, baseUrl?: string, publicPrefix = "/scene-assets") {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://") || storageKey.startsWith("/")) {
    return storageKey;
  }

  const cleanKey = storageKey.replace(/^\/+/, "");
  const cleanBaseUrl = baseUrl?.replace(/\/$/, "");
  const cleanPrefix = publicPrefix.replace(/\/$/, "");

  return cleanBaseUrl ? `${cleanBaseUrl}/${cleanKey}` : `${cleanPrefix}/${cleanKey}`;
}

export function createSceneAssetPublishPlan(sceneId: string, version = 1): SceneAssetPublishPlan {
  const cleanSceneId = toStorageSegment(sceneId);
  const baseKey = `scenes/${cleanSceneId}/v${version}`;

  return {
    sceneId,
    version,
    baseKey,
    artifacts: [
      toPublishArtifact("content", "viewer", `${baseKey}/scene.sog`),
      toPublishArtifact("settings", "walkthrough", `${baseKey}/settings.json`),
      toPublishArtifact("collision", "walkthrough", `${baseKey}/collision.voxel.json`),
      toPublishArtifact("poster", "preview", `${baseKey}/poster.webp`),
    ],
  };
}

export function getSceneAssetChecklist(input: SceneAssetInput): SceneAssetChecklistItem[] {
  return [
    toChecklistItem("content", "viewer", input.contentUrl),
    toChecklistItem("settings", "walkthrough", input.settingsUrl),
    toChecklistItem("collision", "walkthrough", input.collisionUrl),
    toChecklistItem("poster", "preview", input.posterUrl),
  ];
}

export function getSceneRuntimeReadiness(input: SceneAssetInput): SceneRuntimeReadiness {
  const checklist = getSceneAssetChecklist(input);
  const missingForViewer = checklist
    .filter((item) => item.requiredFor === "viewer" && !item.available)
    .map((item) => item.kind);
  const missingForWalkthrough = checklist
    .filter((item) => (item.requiredFor === "viewer" || item.requiredFor === "walkthrough") && !item.available)
    .map((item) => item.kind);

  return {
    canOpenViewer: input.status === "ready" && missingForViewer.length === 0,
    canEnableWalkthrough: input.status === "ready" && missingForWalkthrough.length === 0,
    missingForViewer,
    missingForWalkthrough,
    checklist,
  };
}

export function createSuperSplatViewerUrl(input: SceneAssetInput, viewerPath = "/supersplat-viewer/index.html") {
  if (!input.contentUrl) {
    return undefined;
  }

  const params = [`content=${encodeURIComponent(input.contentUrl)}`];

  if (input.settingsUrl) {
    params.push(`settings=${encodeURIComponent(input.settingsUrl)}`);
  }

  if (input.collisionUrl) {
    params.push(`collision=${encodeURIComponent(input.collisionUrl)}`);
  }

  if (input.posterUrl) {
    params.push(`poster=${encodeURIComponent(input.posterUrl)}`);
  }

  return `${viewerPath}?${params.join("&")}`;
}

function toChecklistItem(
  kind: SceneAssetKind,
  requiredFor: SceneAssetChecklistItem["requiredFor"],
  url?: string,
): SceneAssetChecklistItem {
  return {
    kind,
    label: assetLabels[kind],
    requiredFor,
    available: Boolean(url),
    url,
  };
}

function toPublishArtifact(
  kind: SceneAssetKind,
  requiredFor: SceneAssetChecklistItem["requiredFor"],
  storageKey: string,
): SceneAssetPublishArtifact {
  return {
    kind,
    label: assetLabels[kind],
    storageKey,
    requiredFor,
  };
}

function toStorageSegment(value: string) {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return segment || "scene";
}
