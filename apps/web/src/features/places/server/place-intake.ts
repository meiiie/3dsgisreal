import { createPlaceWithScene, getDatabase, type CreatedPlaceWithSceneRow } from "@loi-vao/db";

import { categoryLabels, type PlaceCategory } from "../domain";

const placeCategories = Object.keys(categoryLabels) as PlaceCategory[];

export type PlaceIntakeDraft = {
  slug: string;
  name: string;
  category: PlaceCategory;
  summary: string;
  description: string;
  address: string;
  city: string;
  lng: number;
  lat: number;
  sceneSlug: string;
  sceneTitle: string;
  sceneEntryLabel: string;
};

export type PlaceIntakeResult =
  | {
      ok: true;
      persisted: boolean;
      draft: PlaceIntakeDraft;
      created?: CreatedPlaceWithSceneRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<PlaceIntakeDraft>;
    };

export async function createPlaceFromIntake(raw: unknown): Promise<PlaceIntakeResult> {
  const parsed = parsePlaceIntake(raw);

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
    const created = await createPlaceWithScene(database, {
      ...parsed.draft,
      status: "draft",
      sceneStatus: "draft",
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
      errors: ["Không ghi được địa điểm. Kiểm tra slug trùng, kết nối PostGIS hoặc dữ liệu đầu vào."],
    };
  }
}

export function parsePlaceIntake(raw: unknown): PlaceIntakeResult {
  const source = toRecord(raw);
  const name = readString(source, "name");
  const slug = readString(source, "slug") || slugify(name);
  const category = readCategory(source, "category");
  const summary = readString(source, "summary");
  const description = readString(source, "description") || summary;
  const address = readString(source, "address");
  const city = readString(source, "city") || "Hải Phòng";
  const lng = readNumber(source, "lng");
  const lat = readNumber(source, "lat");
  const sceneSlug = readString(source, "sceneSlug") || `${slug}-v1`;
  const sceneTitle = readString(source, "sceneTitle") || `Luồng vào ${name}`;
  const sceneEntryLabel = readString(source, "sceneEntryLabel");

  const draft: Partial<PlaceIntakeDraft> = {
    name,
    slug,
    category,
    summary,
    description,
    address,
    city,
    sceneSlug,
    sceneTitle,
    sceneEntryLabel,
  };

  if (Number.isFinite(lng)) {
    draft.lng = lng;
  }

  if (Number.isFinite(lat)) {
    draft.lat = lat;
  }

  const errors = validateDraft(draft);

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
    draft: draft as PlaceIntakeDraft,
  };
}

export function formDataToPlaceIntake(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function validateDraft(draft: Partial<PlaceIntakeDraft>) {
  const errors: string[] = [];

  if (!draft.name || draft.name.length < 3) {
    errors.push("Tên địa điểm cần ít nhất 3 ký tự.");
  }

  if (!draft.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
    errors.push("Slug chỉ dùng chữ thường không dấu, số và dấu gạch ngang.");
  }

  if (!draft.summary || draft.summary.length < 12) {
    errors.push("Tóm tắt cần đủ rõ để người dùng hiểu địa điểm.");
  }

  if (!draft.address || draft.address.length < 3) {
    errors.push("Cần nhập địa chỉ hoặc mô tả vị trí.");
  }

  if (!draft.sceneEntryLabel || draft.sceneEntryLabel.length < 5) {
    errors.push("Cần mô tả luồng vào, ví dụ: Cổng -> hẻm -> phòng.");
  }

  if (!draft.sceneSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.sceneSlug)) {
    errors.push("Scene slug chỉ dùng chữ thường không dấu, số và dấu gạch ngang.");
  }

  if (typeof draft.lng !== "number" || draft.lng < 102 || draft.lng > 110) {
    errors.push("Kinh độ cần nằm trong khoảng Việt Nam thử nghiệm, khoảng 102 đến 110.");
  }

  if (typeof draft.lat !== "number" || draft.lat < 8 || draft.lat > 24) {
    errors.push("Vĩ độ cần nằm trong khoảng Việt Nam thử nghiệm, khoảng 8 đến 24.");
  }

  return errors;
}

function readCategory(source: Record<string, unknown>, key: string): PlaceCategory {
  const value = readString(source, key);
  return placeCategories.includes(value as PlaceCategory) ? (value as PlaceCategory) : "rental";
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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
}
