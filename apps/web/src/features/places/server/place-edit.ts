import {
  getDatabase,
  updatePlaceWithScene,
  type UpdatedPlaceWithSceneRow,
} from "@loi-vao/db";

import { categoryLabels, type Place, type PlaceCategory } from "../domain";
import { getPlaceBySlug } from "./repository";

const placeCategories = Object.keys(categoryLabels) as PlaceCategory[];

export type PlaceEditDraft = {
  placeSlug: string;
  name: string;
  category: PlaceCategory;
  summary: string;
  address: string;
  city: string;
  lng: number;
  lat: number;
  sceneSlug: string;
  sceneTitle: string;
  sceneEntryLabel: string;
};

export type PlaceEditResult =
  | {
      ok: true;
      persisted: boolean;
      draft: PlaceEditDraft;
      current: Place;
      updated?: UpdatedPlaceWithSceneRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<PlaceEditDraft>;
    };

export async function updatePlaceFromEditInput(raw: unknown): Promise<PlaceEditResult> {
  const parsed = await parsePlaceEditInput(raw);

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
    const updated = await updatePlaceWithScene(database, parsed.draft);

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
      errors: ["Không cập nhật được địa điểm. Kiểm tra PostGIS, slug, scene hoặc quyền admin local."],
    };
  }
}

export async function parsePlaceEditInput(raw: unknown): Promise<PlaceEditResult> {
  const source = toRecord(raw);
  const placeSlug = readString(source, "placeSlug");
  const name = readString(source, "name");
  const category = readCategory(source, "category");
  const summary = readString(source, "summary");
  const address = readString(source, "address");
  const city = readString(source, "city");
  const lng = readNumber(source, "lng");
  const lat = readNumber(source, "lat");
  const sceneSlug = readString(source, "sceneSlug");
  const sceneTitle = readString(source, "sceneTitle");
  const sceneEntryLabel = readString(source, "sceneEntryLabel");

  const draft: Partial<PlaceEditDraft> = {
    placeSlug,
    name,
    summary,
    address,
    city,
    sceneSlug,
    sceneTitle,
    sceneEntryLabel,
  };

  if (category) {
    draft.category = category;
  }

  if (Number.isFinite(lng)) {
    draft.lng = lng;
  }

  if (Number.isFinite(lat)) {
    draft.lat = lat;
  }

  const current = placeSlug ? await getPlaceBySlug(placeSlug) : undefined;
  const errors = validateDraft(draft, current);

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
    draft: draft as PlaceEditDraft,
    current,
  };
}

export function formDataToPlaceEdit(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function validateDraft(draft: Partial<PlaceEditDraft>, current: Place | undefined) {
  const errors: string[] = [];

  if (!draft.placeSlug || !current) {
    errors.push("Không tìm thấy địa điểm cần sửa.");
    return errors;
  }

  if (!draft.name || draft.name.length < 3) {
    errors.push("Tên địa điểm cần ít nhất 3 ký tự.");
  }

  if (!draft.category) {
    errors.push("Loại địa điểm không hợp lệ.");
  }

  if (!draft.summary || draft.summary.length < 12) {
    errors.push("Tóm tắt cần đủ rõ để người dùng hiểu địa điểm.");
  }

  if (!draft.address || draft.address.length < 3) {
    errors.push("Cần nhập địa chỉ hoặc mô tả vị trí.");
  }

  if (!draft.city || draft.city.length < 2) {
    errors.push("Cần nhập thành phố.");
  }

  if (typeof draft.lng !== "number" || draft.lng < 102 || draft.lng > 110) {
    errors.push("Kinh độ cần nằm trong khoảng Việt Nam thử nghiệm, khoảng 102 đến 110.");
  }

  if (typeof draft.lat !== "number" || draft.lat < 8 || draft.lat > 24) {
    errors.push("Vĩ độ cần nằm trong khoảng Việt Nam thử nghiệm, khoảng 8 đến 24.");
  }

  if (!draft.sceneSlug || draft.sceneSlug !== current.scene.id) {
    errors.push("Scene cần sửa không khớp với địa điểm hiện tại.");
  }

  if (!draft.sceneTitle || draft.sceneTitle.length < 3) {
    errors.push("Tên scene cần ít nhất 3 ký tự.");
  }

  if (!draft.sceneEntryLabel || draft.sceneEntryLabel.length < 5) {
    errors.push("Cần mô tả luồng vào, ví dụ: Cổng -> hẻm -> phòng.");
  }

  return errors;
}

function readCategory(source: Record<string, unknown>, key: string): PlaceCategory | undefined {
  const value = readString(source, key);
  return placeCategories.includes(value as PlaceCategory) ? (value as PlaceCategory) : undefined;
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(source: Record<string, unknown>, key: string) {
  const value = source[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return Number.NaN;
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
