import {
  createCaptureSessionForScene,
  getDatabase,
  type CreatedCaptureSessionRow,
} from "@loi-vao/db";

import { listPlaces } from "@/features/places/server/repository";

const captureModes = ["video", "photos", "video + stills"] as const;

export type CaptureIntakeDraft = {
  placeSlug: string;
  sceneSlug: string;
  device: string;
  captureMode: (typeof captureModes)[number];
  capturedAt: string;
  notes: string;
  rawAssetKey: string;
};

export type CaptureIntakeResult =
  | {
      ok: true;
      persisted: boolean;
      draft: CaptureIntakeDraft;
      created?: CreatedCaptureSessionRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<CaptureIntakeDraft>;
    };

export async function createCaptureFromIntake(raw: unknown): Promise<CaptureIntakeResult> {
  const parsed = await parseCaptureIntake(raw);

  if (!parsed.ok) {
    return parsed;
  }

  const dryRun = readBoolean(toRecord(raw), "dryRun");
  const database = getDatabase();

  if (dryRun || !database) {
    return {
      ok: true,
      persisted: false,
      draft: parsed.draft,
    };
  }

  try {
    const created = await createCaptureSessionForScene(database, {
      ...parsed.draft,
      status: "uploaded",
    });

    return {
      ok: true,
      persisted: true,
      draft: parsed.draft,
      created,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Không ghi được capture session. Kiểm tra scene, PostGIS hoặc raw asset key."],
    };
  }
}

export async function parseCaptureIntake(raw: unknown): Promise<CaptureIntakeResult> {
  const source = normalizeSceneRef(toRecord(raw));
  const placeSlug = readString(source, "placeSlug");
  const sceneSlug = readString(source, "sceneSlug");
  const device = readString(source, "device") || "iPhone 14 Pro";
  const captureMode = readCaptureMode(source, "captureMode");
  const capturedAt = readString(source, "capturedAt") || new Date().toISOString();
  const rawAssetKey = normalizeAssetKey(readString(source, "rawAssetKey"));
  const notes = readString(source, "notes") || "Capture nhập từ admin local.";

  const draft: Partial<CaptureIntakeDraft> = {
    placeSlug,
    sceneSlug,
    device,
    captureMode,
    capturedAt,
    notes,
    rawAssetKey,
  };

  const errors = await validateDraft(draft);

  if (errors.length > 0) {
    return {
      ok: false,
      persisted: false,
      errors,
      draft,
    };
  }

  return {
    ok: true,
    persisted: false,
    draft: draft as CaptureIntakeDraft,
  };
}

export function formDataToCaptureIntake(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function validateDraft(draft: Partial<CaptureIntakeDraft>) {
  const errors: string[] = [];

  if (!draft.placeSlug || !draft.sceneSlug) {
    errors.push("Cần chọn địa điểm và scene.");
  }

  const places = await listPlaces();
  const selectedPlace = places.find((place) => place.slug === draft.placeSlug);

  if (!selectedPlace || selectedPlace.scene.id !== draft.sceneSlug) {
    errors.push("Scene không tồn tại trong danh sách địa điểm hiện tại.");
  }

  if (!draft.device || draft.device.length < 3) {
    errors.push("Cần nhập thiết bị capture.");
  }

  if (!draft.rawAssetKey || !isSafeRawAssetKey(draft.rawAssetKey)) {
    errors.push("Raw asset key phải bắt đầu bằng raw-captures/ và không chứa ký tự nguy hiểm.");
  }

  if (!draft.capturedAt || Number.isNaN(Date.parse(draft.capturedAt))) {
    errors.push("Thời điểm capture không hợp lệ.");
  }

  return errors;
}

function normalizeSceneRef(source: Record<string, unknown>) {
  const sceneRef = readString(source, "sceneRef");

  if (!sceneRef || source.placeSlug || source.sceneSlug) {
    return source;
  }

  const [placeSlug = "", sceneSlug = ""] = sceneRef.split("::");

  return {
    ...source,
    placeSlug,
    sceneSlug,
  };
}

function readCaptureMode(source: Record<string, unknown>, key: string): CaptureIntakeDraft["captureMode"] {
  const value = readString(source, key);
  return captureModes.includes(value as CaptureIntakeDraft["captureMode"])
    ? (value as CaptureIntakeDraft["captureMode"])
    : "video";
}

function normalizeAssetKey(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function isSafeRawAssetKey(value: string) {
  return (
    value.startsWith("raw-captures/") &&
    !value.includes("..") &&
    /^[a-zA-Z0-9/_\-.]+$/.test(value)
  );
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return value === true || value === "true" || value === "1";
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
}
