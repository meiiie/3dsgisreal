import { buildStorageAssetUrl, type SceneAssetPublishArtifact } from "@loi-vao/assets";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { LocalSceneAssetCheck } from "./asset-publishing";

export async function checkLocalArtifactFile(artifact: SceneAssetPublishArtifact): Promise<LocalSceneAssetCheck> {
  const filePath = resolveLocalAssetPath(artifact.storageKey);

  if (!filePath) {
    return {
      ...artifact,
      publicUrl: buildStorageAssetUrl(artifact.storageKey),
      exists: false,
      qaStatus: "missing",
      qaMessage: "Không kiểm tra được file local cho key này.",
    };
  }

  try {
    const info = await stat(filePath);
    const exists = info.isFile();
    const bytes = exists ? info.size : undefined;
    const qa = exists ? await getArtifactQa(artifact, filePath, bytes) : missingQa(artifact);

    return {
      ...artifact,
      publicUrl: buildStorageAssetUrl(artifact.storageKey),
      exists,
      bytes,
      ...qa,
    };
  } catch {
    return {
      ...artifact,
      publicUrl: buildStorageAssetUrl(artifact.storageKey),
      exists: false,
      ...missingQa(artifact),
    };
  }
}

async function getArtifactQa(
  artifact: SceneAssetPublishArtifact,
  filePath: string,
  bytes: number | undefined,
): Promise<Pick<LocalSceneAssetCheck, "qaStatus" | "qaMessage">> {
  if (!bytes) {
    return {
      qaStatus: "invalid",
      qaMessage: "File tồn tại nhưng rỗng.",
    };
  }

  if (artifact.kind === "settings" || artifact.kind === "collision") {
    return validateJsonArtifact(filePath);
  }

  return {
    qaStatus: "ready",
    qaMessage: "File có dữ liệu và đúng vị trí local.",
  };
}

async function validateJsonArtifact(filePath: string): Promise<Pick<LocalSceneAssetCheck, "qaStatus" | "qaMessage">> {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as unknown;

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {
        qaStatus: "invalid",
        qaMessage: "JSON phải là object.",
      };
    }

    return {
      qaStatus: "ready",
      qaMessage: "JSON parse được.",
    };
  } catch {
    return {
      qaStatus: "invalid",
      qaMessage: "JSON không parse được.",
    };
  }
}

function missingQa(artifact: SceneAssetPublishArtifact): Pick<LocalSceneAssetCheck, "qaStatus" | "qaMessage"> {
  if (artifact.kind === "poster") {
    return {
      qaStatus: "missing",
      qaMessage: "Chưa có poster preview.",
    };
  }

  return {
    qaStatus: "missing",
    qaMessage: "Chưa có file runtime local.",
  };
}

function resolveLocalAssetPath(storageKey: string) {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://") || storageKey.startsWith("/")) {
    return undefined;
  }

  const publicRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "scene-assets");
  const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "scene-assets", storageKey);
  const relativePath = path.relative(publicRoot, filePath);

  return relativePath.startsWith("..") || path.isAbsolute(relativePath) ? undefined : filePath;
}
