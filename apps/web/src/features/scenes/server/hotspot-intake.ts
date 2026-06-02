import {
  createSceneHotspot,
  deleteSceneHotspot,
  getDatabase,
  updateSceneHotspot,
  type CreatedSceneHotspotRow,
  type DeletedSceneHotspotRow,
  type UpdatedSceneHotspotRow,
} from "@loi-vao/db";

import {
  sceneHotspotKindLabels,
  type SceneHotspotKind,
} from "@/features/places/domain";
import { listPlaces, listSceneHotspots } from "@/features/places/server/repository";
import { readPayload, validatePayload } from "./hotspot-payload";

export { getDefaultHotspotPayload, hotspotToPayloadJson } from "./hotspot-payload";

const hotspotKinds = Object.keys(sceneHotspotKindLabels) as SceneHotspotKind[];

export type HotspotIntakeDraft = {
  hotspotId?: string;
  sceneSlug: string;
  kind: SceneHotspotKind;
  title: string;
  body: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  sortOrder: number;
  payload: Record<string, unknown>;
};

export type HotspotIntakeResult =
  | {
      ok: true;
      persisted: boolean;
      draft: HotspotIntakeDraft;
      created?: CreatedSceneHotspotRow;
      updated?: UpdatedSceneHotspotRow;
      deleted?: DeletedSceneHotspotRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<HotspotIntakeDraft>;
    };

export type HotspotDeleteDraft = {
  sceneSlug: string;
  hotspotId: string;
  confirmDelete: boolean;
};

export type HotspotDeleteResult =
  | {
      ok: true;
      persisted: boolean;
      draft: HotspotDeleteDraft;
      deleted?: DeletedSceneHotspotRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<HotspotDeleteDraft>;
    };

export async function createHotspotFromIntake(raw: unknown): Promise<HotspotIntakeResult> {
  const parsed = await parseHotspotIntake(raw);

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
    const created = await createSceneHotspot(database, {
      sceneSlug: parsed.draft.sceneSlug,
      kind: parsed.draft.kind,
      title: parsed.draft.title,
      body: parsed.draft.body,
      position: {
        x: parsed.draft.x,
        y: parsed.draft.y,
        z: parsed.draft.z,
      },
      rotation: {
        yaw: parsed.draft.yaw,
      },
      payload: parsed.draft.payload,
      sortOrder: parsed.draft.sortOrder,
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
      errors: [
        "Không ghi được hotspot. Kiểm tra scene version, PostGIS hoặc payload đầu vào.",
      ],
    };
  }
}

export async function updateHotspotFromIntake(raw: unknown): Promise<HotspotIntakeResult> {
  const parsed = await parseHotspotIntake(raw);

  if (!parsed.ok) {
    return parsed;
  }

  const hotspotId = readString(toRecord(raw), "hotspotId");
  const hotspotError = await validateExistingHotspot(parsed.draft.sceneSlug, hotspotId);

  if (hotspotError) {
    return {
      ok: false,
      persisted: false,
      draft: {
        ...parsed.draft,
        hotspotId,
      },
      errors: [hotspotError],
    };
  }

  const dryRun = readBoolean(toRecord(raw), "dryRun");
  const database = getDatabase();
  const draft = {
    ...parsed.draft,
    hotspotId,
  };

  if (dryRun || !database) {
    return {
      ok: true,
      persisted: false,
      draft,
    };
  }

  try {
    const updated = await updateSceneHotspot(database, {
      hotspotId,
      sceneSlug: parsed.draft.sceneSlug,
      kind: parsed.draft.kind,
      title: parsed.draft.title,
      body: parsed.draft.body,
      position: {
        x: parsed.draft.x,
        y: parsed.draft.y,
        z: parsed.draft.z,
      },
      rotation: {
        yaw: parsed.draft.yaw,
      },
      payload: parsed.draft.payload,
      sortOrder: parsed.draft.sortOrder,
    });

    return {
      ok: true,
      persisted: true,
      draft,
      updated,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft,
      errors: ["Không cập nhật được hotspot. Kiểm tra hotspot id, scene version hoặc PostGIS."],
    };
  }
}

export async function deleteHotspotFromIntake(raw: unknown): Promise<HotspotDeleteResult> {
  const source = normalizeSceneRef(toRecord(raw));
  const sceneSlug = readString(source, "sceneSlug");
  const hotspotId = readString(source, "hotspotId");
  const confirmDelete = readBoolean(source, "confirmDelete");
  const dryRun = readBoolean(source, "dryRun");
  const draft = {
    sceneSlug,
    hotspotId,
    confirmDelete,
  };
  const errors: string[] = [];
  const scene = await getSceneForDraft(sceneSlug);

  if (!sceneSlug || !scene) {
    errors.push("Scene không tồn tại trong danh sách địa điểm hiện tại.");
  }

  const hotspotError = await validateExistingHotspot(sceneSlug, hotspotId);

  if (hotspotError) {
    errors.push(hotspotError);
  }

  if (!confirmDelete) {
    errors.push("Cần xác nhận trước khi xóa hotspot.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      persisted: false,
      errors,
      draft,
    };
  }

  const database = getDatabase();

  if (dryRun || !database) {
    return {
      ok: true,
      persisted: false,
      draft,
    };
  }

  try {
    const deleted = await deleteSceneHotspot(database, {
      sceneSlug,
      hotspotId,
    });

    return {
      ok: true,
      persisted: true,
      draft,
      deleted,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft,
      errors: ["Không xóa được hotspot. Kiểm tra hotspot id, scene version hoặc PostGIS."],
    };
  }
}

export async function parseHotspotIntake(raw: unknown): Promise<HotspotIntakeResult> {
  const source = normalizeSceneRef(toRecord(raw));
  const hotspotId = readString(source, "hotspotId") || undefined;
  const sceneSlug = readString(source, "sceneSlug");
  const kind = readHotspotKind(source, "kind");
  const title = readString(source, "title");
  const body = readString(source, "body");
  const x = readNumber(source, "x");
  const y = readNumber(source, "y");
  const z = readNumber(source, "z");
  const yaw = readNumber(source, "yaw");
  const sortOrder = readInteger(source, "sortOrder", 50);
  const payloadResult = readPayload(source, kind, sceneSlug);

  const draft: Partial<HotspotIntakeDraft> = {
    hotspotId,
    sceneSlug,
    kind,
    title,
    body,
    x,
    y,
    z,
    yaw,
    sortOrder,
  };

  if (payloadResult.ok) {
    draft.payload = payloadResult.payload;
  }

  const errors = await validateDraft(draft);

  if (!payloadResult.ok) {
    errors.push(payloadResult.error);
  } else {
    errors.push(...validatePayload(kind, payloadResult.payload));
  }

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
    draft: draft as HotspotIntakeDraft,
  };
}

export function formDataToHotspotIntake(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function validateDraft(draft: Partial<HotspotIntakeDraft>) {
  const errors: string[] = [];
  const scene = await getSceneForDraft(draft.sceneSlug);

  if (!draft.sceneSlug || !scene) {
    errors.push("Scene không tồn tại trong danh sách địa điểm hiện tại.");
  }

  if (!draft.title || draft.title.length < 3) {
    errors.push("Tiêu đề hotspot cần ít nhất 3 ký tự.");
  }

  if (!draft.body || draft.body.length < 8) {
    errors.push("Nội dung hotspot cần đủ rõ để người xem hiểu tác vụ.");
  }

  if (!Number.isFinite(draft.x) || Math.abs(draft.x ?? 0) > 100) {
    errors.push("Tọa độ X cần là số trong khoảng -100 đến 100.");
  }

  if (!Number.isFinite(draft.y) || (draft.y ?? 0) < 0 || (draft.y ?? 0) > 10) {
    errors.push("Tọa độ Y nên nằm trong khoảng 0 đến 10 mét.");
  }

  if (!Number.isFinite(draft.z) || Math.abs(draft.z ?? 0) > 100) {
    errors.push("Tọa độ Z cần là số trong khoảng -100 đến 100.");
  }

  if (!Number.isFinite(draft.yaw) || Math.abs(draft.yaw ?? 0) > 360) {
    errors.push("Yaw cần là số trong khoảng -360 đến 360 độ.");
  }

  if (!Number.isInteger(draft.sortOrder) || (draft.sortOrder ?? 0) < 0 || (draft.sortOrder ?? 0) > 9999) {
    errors.push("Sort order cần là số nguyên từ 0 đến 9999.");
  }

  return errors;
}

async function getSceneForDraft(sceneSlug?: string) {
  if (!sceneSlug) {
    return undefined;
  }

  const places = await listPlaces();
  return places.find((place) => place.scene.id === sceneSlug)?.scene;
}

async function validateExistingHotspot(sceneSlug: string, hotspotId: string) {
  if (!hotspotId) {
    return "Hotspot id không hợp lệ.";
  }

  const hotspots = sceneSlug ? await listSceneHotspots(sceneSlug) : [];

  if (!hotspots.some((hotspot) => hotspot.id === hotspotId)) {
    return "Hotspot không tồn tại trong scene hiện tại.";
  }

  return "";
}

function normalizeSceneRef(source: Record<string, unknown>) {
  const sceneSlug = readString(source, "sceneSlug") || readString(source, "sceneId");

  return {
    ...source,
    sceneSlug,
  };
}

function readHotspotKind(source: Record<string, unknown>, key: string): SceneHotspotKind {
  const value = readString(source, key);
  return hotspotKinds.includes(value as SceneHotspotKind) ? (value as SceneHotspotKind) : "info";
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

function readInteger(source: Record<string, unknown>, key: string, fallback: number) {
  const value = readNumber(source, key);
  return Number.isFinite(value) ? Math.round(value) : fallback;
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
