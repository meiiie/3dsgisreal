import {
  createPlacePrivacyReview,
  getDatabase,
  getLatestPlacePrivacyReviewRow,
  type PlacePrivacyReviewDecision,
  type PlacePrivacyReviewRow,
} from "@loi-vao/db";

import { getCurrentAdminSession } from "@/features/identity/server/session";

import type { Place } from "../domain";
import { getPlaceBySlug } from "./repository";

export type { PlacePrivacyReviewDecision };

export type PlacePrivacyChecklistKey =
  | "consentConfirmed"
  | "addressPublicSafe"
  | "facesOrPeopleRemoved"
  | "privateObjectsRemoved"
  | "audioPrivateSafe"
  | "rawCapturePrivate";

export type PlacePrivacyChecklistItem = {
  key: PlacePrivacyChecklistKey;
  label: string;
  help: string;
};

export type PlacePrivacyReviewRecord = {
  id: string;
  decision: PlacePrivacyReviewDecision;
  reviewerId?: string;
  checks: Record<PlacePrivacyChecklistKey, boolean>;
  notes: string;
  createdAt: string;
  source: "postgis" | "sample";
};

export type PlacePrivacyReviewDraft = {
  placeSlug: string;
  decision: PlacePrivacyReviewDecision;
  checks: Record<PlacePrivacyChecklistKey, boolean>;
  notes: string;
};

export type PlacePrivacyReviewModel = {
  place: Place;
  latestReview?: PlacePrivacyReviewRecord;
  defaultDraft: PlacePrivacyReviewDraft;
  missingRequiredKeys: PlacePrivacyChecklistKey[];
};

export type PlacePrivacyReviewResult =
  | {
      ok: true;
      persisted: boolean;
      draft: PlacePrivacyReviewDraft;
      current: PlacePrivacyReviewModel;
      created?: PlacePrivacyReviewRecord;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<PlacePrivacyReviewDraft>;
    };

export const privacyReviewDecisions = ["needs_changes", "approved", "blocked"] as const;

export const privacyReviewDecisionLabels: Record<PlacePrivacyReviewDecision, string> = {
  needs_changes: "Cần bổ sung",
  approved: "Đủ điều kiện riêng tư",
  blocked: "Chặn public",
};

export const privacyChecklistItems: PlacePrivacyChecklistItem[] = [
  {
    key: "consentConfirmed",
    label: "Đã có quyền quay/công khai",
    help: "Có sự cho phép của chủ địa điểm hoặc người có quyền trước khi đưa scene vào pilot.",
  },
  {
    key: "addressPublicSafe",
    label: "Địa chỉ công khai an toàn",
    help: "Không lộ địa chỉ riêng tư ngoài phạm vi người dùng được phép xem.",
  },
  {
    key: "facesOrPeopleRemoved",
    label: "Không lộ mặt/người không liên quan",
    help: "Capture tránh người qua lại hoặc đã xử lý trước khi public.",
  },
  {
    key: "privateObjectsRemoved",
    label: "Không lộ giấy tờ/đồ cá nhân",
    help: "Ảnh/scan không chứa CCCD, hóa đơn, màn hình, chìa khóa, biển số hoặc vật nhạy cảm.",
  },
  {
    key: "audioPrivateSafe",
    label: "Âm thanh và mô tả không lộ riêng tư",
    help: "Audio/hotspot/quiz không nhắc thông tin cá nhân, số điện thoại riêng hoặc lịch sinh hoạt.",
  },
  {
    key: "rawCapturePrivate",
    label: "Raw capture vẫn ở vùng riêng tư",
    help: "Video/ảnh gốc nằm trong raw-captures hoặc storage riêng, không nằm trong public folder/git.",
  },
];

const requiredChecklistKeys = privacyChecklistItems.map((item) => item.key);

export async function getAdminPlacePrivacyReview(
  placeSlug: string,
): Promise<PlacePrivacyReviewModel | undefined> {
  const place = await getPlaceBySlug(placeSlug);

  if (!place) {
    return undefined;
  }

  const latestReview = await readLatestReview(place);

  return {
    place,
    latestReview,
    defaultDraft: {
      placeSlug: place.slug,
      decision: latestReview?.decision ?? getDefaultDecision(place),
      checks: latestReview?.checks ?? getDefaultChecks(place),
      notes: latestReview?.notes ?? "",
    },
    missingRequiredKeys: latestReview ? getMissingRequiredKeys(latestReview.checks) : requiredChecklistKeys,
  };
}

export async function savePlacePrivacyReviewFromInput(raw: unknown): Promise<PlacePrivacyReviewResult> {
  const parsed = await parsePlacePrivacyReviewInput(raw);

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
      current: parsed.current,
      created: toDraftReviewRecord(parsed.draft, "sample"),
    };
  }

  try {
    const session = await getCurrentAdminSession();
    const created = await createPlacePrivacyReview(database, {
      placeSlug: parsed.draft.placeSlug,
      reviewerId: session?.profileId,
      decision: parsed.draft.decision,
      notes: parsed.draft.notes,
      ...parsed.draft.checks,
    });

    return {
      ok: true,
      persisted: true,
      draft: parsed.draft,
      current: parsed.current,
      created: rowToReviewRecord(created, "postgis"),
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Không ghi được privacy checklist. Kiểm tra PostGIS, migration hoặc quyền admin local."],
    };
  }
}

export async function parsePlacePrivacyReviewInput(raw: unknown): Promise<PlacePrivacyReviewResult> {
  const source = toRecord(raw);
  const draft: PlacePrivacyReviewDraft = {
    placeSlug: readString(source, "placeSlug"),
    decision: readDecision(source, "decision") ?? "needs_changes",
    checks: readChecklist(source),
    notes: readString(source, "notes").slice(0, 700),
  };
  const current = draft.placeSlug ? await getAdminPlacePrivacyReview(draft.placeSlug) : undefined;
  const errors = validatePrivacyDraft(draft, current);

  if (errors.length > 0 || !current) {
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
    draft,
    current,
  };
}

export function formDataToPlacePrivacyReview(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function validatePrivacyDraft(
  draft: PlacePrivacyReviewDraft,
  current: PlacePrivacyReviewModel | undefined,
) {
  const errors: string[] = [];

  if (!draft.placeSlug || !current) {
    errors.push("Không tìm thấy địa điểm cần kiểm tra privacy.");
    return errors;
  }

  if (draft.notes.length > 600) {
    errors.push("Ghi chú privacy tối đa 600 ký tự.");
  }

  if (draft.decision === "approved") {
    const missing = getMissingRequiredKeys(draft.checks);

    if (missing.length > 0) {
      errors.push("Không thể approve khi checklist privacy vẫn còn mục chưa xác nhận.");
    }
  }

  if (draft.decision === "blocked" && draft.notes.length < 8) {
    errors.push("Khi chặn public, cần ghi chú lý do đủ rõ để operator xử lý tiếp.");
  }

  return errors;
}

async function readLatestReview(place: Place) {
  const database = getDatabase();

  if (!database) {
    return getSampleReview(place);
  }

  try {
    const row = await getLatestPlacePrivacyReviewRow(database, place.slug);
    return row ? rowToReviewRecord(row, "postgis") : undefined;
  } catch {
    return undefined;
  }
}

function getSampleReview(place: Place): PlacePrivacyReviewRecord | undefined {
  if (place.publicationStatus === "draft") {
    return undefined;
  }

  const approved = place.publicationStatus === "published";
  const checks = approved ? getApprovedChecks() : getDefaultChecks(place);

  return {
    id: `sample-privacy-${place.slug}`,
    decision: approved ? "approved" : "needs_changes",
    checks,
    notes: approved
      ? "Sample review: địa điểm công khai cần được kiểm tra lại bằng checklist thật trước pilot."
      : "Sample review: cần xác nhận quyền quay và dữ liệu riêng tư trước khi public.",
    createdAt: "2026-06-02T00:00:00.000Z",
    source: "sample",
  };
}

function getDefaultDecision(place: Place): PlacePrivacyReviewDecision {
  return place.publicationStatus === "published" ? "approved" : "needs_changes";
}

function getDefaultChecks(place: Place): Record<PlacePrivacyChecklistKey, boolean> {
  return {
    consentConfirmed: place.privacyStatus === "publishable",
    addressPublicSafe: place.publicationStatus === "published",
    facesOrPeopleRemoved: false,
    privateObjectsRemoved: false,
    audioPrivateSafe: place.scene.hotspots?.length ? false : true,
    rawCapturePrivate: true,
  };
}

function getApprovedChecks(): Record<PlacePrivacyChecklistKey, boolean> {
  return Object.fromEntries(requiredChecklistKeys.map((key) => [key, true])) as Record<
    PlacePrivacyChecklistKey,
    boolean
  >;
}

function getMissingRequiredKeys(checks: Record<PlacePrivacyChecklistKey, boolean>) {
  return requiredChecklistKeys.filter((key) => !checks[key]);
}

function rowToReviewRecord(
  row: PlacePrivacyReviewRow,
  source: PlacePrivacyReviewRecord["source"],
): PlacePrivacyReviewRecord {
  return {
    id: row.id,
    decision: row.decision,
    reviewerId: row.reviewerId ?? undefined,
    checks: {
      consentConfirmed: row.consentConfirmed,
      addressPublicSafe: row.addressPublicSafe,
      facesOrPeopleRemoved: row.facesOrPeopleRemoved,
      privateObjectsRemoved: row.privateObjectsRemoved,
      audioPrivateSafe: row.audioPrivateSafe,
      rawCapturePrivate: row.rawCapturePrivate,
    },
    notes: row.notes,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    source,
  };
}

function toDraftReviewRecord(
  draft: PlacePrivacyReviewDraft,
  source: PlacePrivacyReviewRecord["source"],
): PlacePrivacyReviewRecord {
  return {
    id: "dry-run",
    decision: draft.decision,
    checks: draft.checks,
    notes: draft.notes,
    createdAt: new Date().toISOString(),
    source,
  };
}

function readChecklist(source: Record<string, unknown>): Record<PlacePrivacyChecklistKey, boolean> {
  return Object.fromEntries(
    requiredChecklistKeys.map((key) => [key, readBoolean(source, key)]),
  ) as Record<PlacePrivacyChecklistKey, boolean>;
}

function readDecision(
  source: Record<string, unknown>,
  key: string,
): PlacePrivacyReviewDecision | undefined {
  const value = readString(source, key);
  return privacyReviewDecisions.includes(value as PlacePrivacyReviewDecision)
    ? (value as PlacePrivacyReviewDecision)
    : undefined;
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return value === true || value === "true" || value === "1" || value === "on";
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
}
