import {
  createProcessingJobFromCapture,
  getDatabase,
  type CreatedProcessingJobRow,
} from "@loi-vao/db";

import type { CaptureWorkItem } from "../domain";
import { listCaptureWorkItems } from "./repository";

const providers = ["runpod", "vast.ai", "gcp", "google-colab", "local"] as const;
const toolchains = ["nerfstudio-splatfacto-gsplat", "postshot-benchmark", "opensplat"] as const;

export type ProcessingJobIntakeDraft = {
  captureSessionId: string;
  provider: (typeof providers)[number];
  gpuType: string;
  toolchain: (typeof toolchains)[number];
  frameTarget: number;
  logKey: string;
  notes: string;
};

export type ProcessingJobIntakeResult =
  | {
      ok: true;
      persisted: boolean;
      draft: ProcessingJobIntakeDraft;
      created?: CreatedProcessingJobRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<ProcessingJobIntakeDraft>;
    };

export async function createProcessingJobFromIntake(raw: unknown): Promise<ProcessingJobIntakeResult> {
  const parsed = await parseProcessingJobIntake(raw);

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
    const capture = await getCaptureForDraft(parsed.draft.captureSessionId);
    const created = await createProcessingJobFromCapture(database, {
      captureSessionId: parsed.draft.captureSessionId,
      provider: parsed.draft.provider,
      gpuType: parsed.draft.gpuType || null,
      toolchain: parsed.draft.toolchain,
      status: "queued",
      logKey: parsed.draft.logKey,
      config: buildProcessingConfig(parsed.draft, capture),
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
      errors: ["Không tạo được processing job. Kiểm tra capture session, PostGIS hoặc scene version."],
    };
  }
}

export async function parseProcessingJobIntake(raw: unknown): Promise<ProcessingJobIntakeResult> {
  const source = toRecord(raw);
  const captureSessionId = readString(source, "captureSessionId");
  const provider = readProvider(source, "provider");
  const gpuType = readString(source, "gpuType") || "RTX 4090";
  const toolchain = readToolchain(source, "toolchain");
  const frameTarget = readFrameTarget(source, "frameTarget");
  const notes = readString(source, "notes") || "Tạo job GPU từ admin local.";
  const logKey = normalizeLogKey(readString(source, "logKey")) || defaultLogKey(captureSessionId, provider);

  const draft: Partial<ProcessingJobIntakeDraft> = {
    captureSessionId,
    provider,
    gpuType,
    toolchain,
    frameTarget,
    logKey,
    notes,
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
    draft: draft as ProcessingJobIntakeDraft,
  };
}

export function formDataToProcessingJobIntake(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function validateDraft(draft: Partial<ProcessingJobIntakeDraft>) {
  const errors: string[] = [];

  const capture = draft.captureSessionId ? await getCaptureForDraft(draft.captureSessionId) : undefined;

  if (!draft.captureSessionId || !capture) {
    errors.push("Cần chọn capture session hợp lệ.");
  }

  if (capture && !capture.sceneId) {
    errors.push("Capture session cần gắn với scene trước khi tạo job GPU.");
  }

  if (capture && !capture.rawAssetKey) {
    errors.push("Capture session cần có raw asset key trước khi tạo job GPU.");
  }

  if (capture && !["uploaded", "processing"].includes(capture.status)) {
    errors.push("Chỉ tạo job GPU cho capture đã upload hoặc đang xử lý lại.");
  }

  if (!draft.logKey || !isSafeProcessingLogKey(draft.logKey)) {
    errors.push("Log key phải bắt đầu bằng processing/ và không chứa ký tự nguy hiểm.");
  }

  if (!draft.frameTarget || draft.frameTarget < 100 || draft.frameTarget > 1200) {
    errors.push("Frame target nên nằm trong khoảng 100-1200 frame.");
  }

  return errors;
}

async function getCaptureForDraft(captureSessionId: string) {
  const captures = await listCaptureWorkItems();
  return captures.find((capture) => capture.id === captureSessionId);
}

function buildProcessingConfig(draft: ProcessingJobIntakeDraft, capture: CaptureWorkItem | undefined) {
  return {
    capture: {
      captureSessionId: draft.captureSessionId,
      rawAssetKey: capture?.rawAssetKey,
      sceneId: capture?.sceneId,
      placeName: capture?.placeName,
    },
    nerfstudio: {
      frameTarget: draft.frameTarget,
      processData: "ns-process-data video --num-frames-target <frameTarget>",
      train: "ns-train splatfacto",
      export: "ns-export gaussian-splat",
    },
    operatorNotes: draft.notes,
    expectedOutput: "PLY -> SuperSplat cleanup -> SOG/collision/poster",
  };
}

function readProvider(source: Record<string, unknown>, key: string): ProcessingJobIntakeDraft["provider"] {
  const value = readString(source, key);
  return providers.includes(value as ProcessingJobIntakeDraft["provider"])
    ? (value as ProcessingJobIntakeDraft["provider"])
    : "runpod";
}

function readToolchain(source: Record<string, unknown>, key: string): ProcessingJobIntakeDraft["toolchain"] {
  const value = readString(source, key);
  return toolchains.includes(value as ProcessingJobIntakeDraft["toolchain"])
    ? (value as ProcessingJobIntakeDraft["toolchain"])
    : "nerfstudio-splatfacto-gsplat";
}

function readFrameTarget(source: Record<string, unknown>, key: string) {
  const value = Number(readString(source, key));
  return Number.isFinite(value) ? Math.round(value) : 400;
}

function defaultLogKey(captureSessionId: string, provider: string) {
  const safeCaptureId = captureSessionId.replace(/[^a-zA-Z0-9_-]/g, "-") || "capture";
  return `processing/${safeCaptureId}/${provider}-train.log`;
}

function normalizeLogKey(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function isSafeProcessingLogKey(value: string) {
  return (
    value.startsWith("processing/") &&
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
