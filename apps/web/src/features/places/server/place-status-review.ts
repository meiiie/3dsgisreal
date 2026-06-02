import {
  getDatabase,
  updatePlaceStatus,
  type PlaceStatus,
  type UpdatedPlaceStatusRow,
} from "@loi-vao/db";

import type { Place } from "../domain";
import { getPlaceBySlug } from "./repository";

export type PlaceReviewStatus = PlaceStatus;

export const placeReviewStatuses = ["draft", "review", "published", "archived"] as const;

export const placeReviewStatusLabels: Record<PlaceReviewStatus, string> = {
  draft: "Bản nháp",
  review: "Chờ review",
  published: "Có thể công khai",
  archived: "Lưu trữ",
};

export const placeReviewStatusHelp: Record<PlaceReviewStatus, string> = {
  draft: "Giữ địa điểm ở vùng admin nội bộ, phù hợp khi chưa đủ quyền quay hoặc chưa có scene tốt.",
  review: "Đưa vào hàng chờ kiểm tra quyền riêng tư, chất lượng capture, mô tả và luồng vào.",
  published: "Đánh dấu địa điểm đủ điều kiện xuất hiện như nội dung có thể công khai.",
  archived: "Ẩn khỏi danh sách hoạt động. Chỉ dùng khi địa điểm không còn phù hợp hoặc cần gỡ khỏi pilot.",
};

export type PlaceStatusReviewModel = {
  place: Place;
  currentStatus: PlaceReviewStatus;
};

export type PlaceStatusReviewDraft = {
  placeSlug: string;
  status: PlaceReviewStatus;
  confirmArchive: boolean;
};

export type PlaceStatusReviewResult =
  | {
      ok: true;
      persisted: boolean;
      draft: PlaceStatusReviewDraft;
      current: PlaceStatusReviewModel;
      updated?: UpdatedPlaceStatusRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<PlaceStatusReviewDraft>;
    };

export async function updatePlaceFromStatusInput(raw: unknown): Promise<PlaceStatusReviewResult> {
  const parsed = await parsePlaceStatusReviewInput(raw);

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
    };
  }

  try {
    const updated = await updatePlaceStatus(database, parsed.draft);

    return {
      ok: true,
      persisted: true,
      draft: parsed.draft,
      current: parsed.current,
      updated,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Không cập nhật được địa điểm. Kiểm tra PostGIS, slug hoặc quyền admin local."],
    };
  }
}

export async function parsePlaceStatusReviewInput(raw: unknown): Promise<PlaceStatusReviewResult> {
  const source = toRecord(raw);
  const placeSlug = readString(source, "placeSlug");
  const status = readStatus(source, "status");
  const confirmArchive = readBoolean(source, "confirmArchive");

  const draft: Partial<PlaceStatusReviewDraft> = {
    placeSlug,
    confirmArchive,
  };

  if (status) {
    draft.status = status;
  }
  const current = placeSlug ? await getAdminPlaceStatusReview(placeSlug) : undefined;
  const errors = validateStatusDraft(draft, current);

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
    draft: draft as PlaceStatusReviewDraft,
    current,
  };
}

export function formDataToPlaceStatusReview(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function getAdminPlaceStatusReview(
  placeSlug: string,
): Promise<PlaceStatusReviewModel | undefined> {
  const place = await getPlaceBySlug(placeSlug);

  if (!place) {
    return undefined;
  }

  return {
    place,
    currentStatus: mapPrivacyStatusToReviewStatus(place.privacyStatus),
  };
}

function validateStatusDraft(
  draft: Partial<PlaceStatusReviewDraft>,
  current: PlaceStatusReviewModel | undefined,
) {
  const errors: string[] = [];

  if (!draft.placeSlug || !current) {
    errors.push("Không tìm thấy địa điểm cần review.");
    return errors;
  }

  if (!draft.status) {
    errors.push("Cần chọn trạng thái mới cho địa điểm.");
    return errors;
  }

  if (draft.status === "archived" && !draft.confirmArchive) {
    errors.push("Cần xác nhận trước khi lưu trữ địa điểm.");
  }

  return errors;
}

function mapPrivacyStatusToReviewStatus(status: Place["privacyStatus"]): PlaceReviewStatus {
  if (status === "publishable") {
    return "published";
  }

  if (status === "permission_needed") {
    return "review";
  }

  return "draft";
}

function readStatus(
  source: Record<string, unknown>,
  key: string,
): PlaceReviewStatus | undefined {
  const value = readString(source, key);
  return placeReviewStatuses.includes(value as PlaceReviewStatus) ? (value as PlaceReviewStatus) : undefined;
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
