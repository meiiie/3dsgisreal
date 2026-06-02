import {
  getDatabase,
  LOCAL_DEMO_PROFILE_ID,
  upsertUserPlaceCheckIn,
  type UpsertedUserPlaceCheckInRow,
} from "@loi-vao/db";

import { getPlaceBySceneId, listSceneHotspots } from "@/features/places/server/repository";

export type UserCheckInDraft = {
  sceneId: string;
  hotspotId: string;
  reward: string;
  note: string;
};

export type UserCheckInResult =
  | {
      ok: true;
      persisted: boolean;
      draft: UserCheckInDraft;
      checkedIn?: UpsertedUserPlaceCheckInRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<UserCheckInDraft>;
    };

export async function checkInFromViewer(raw: unknown, profileId = LOCAL_DEMO_PROFILE_ID): Promise<UserCheckInResult> {
  const parsed = await parseUserCheckIn(raw);

  if (!parsed.ok) {
    return parsed;
  }

  const dryRun = readBoolean(toRecord(raw), "dryRun");
  const database = getDatabase();
  const place = await getPlaceBySceneId(parsed.draft.sceneId);

  if (!place) {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Không tìm thấy scene để check-in."],
    };
  }

  if (dryRun || !database) {
    return {
      ok: true,
      persisted: false,
      draft: parsed.draft,
    };
  }

  try {
    const checkedIn = await upsertUserPlaceCheckIn(database, {
      profileId,
      placeId: place.id,
      note: parsed.draft.note,
    });

    return {
      ok: true,
      persisted: true,
      draft: parsed.draft,
      checkedIn,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Không ghi được check-in. Kiểm tra PostGIS, profile local hoặc dữ liệu scene."],
    };
  }
}

export async function parseUserCheckIn(raw: unknown): Promise<UserCheckInResult> {
  const source = toRecord(raw);
  const sceneId = readString(source, "sceneId");
  const hotspotId = readString(source, "hotspotId");
  const reward = readString(source, "reward") || "local-demo-checkin";
  const note = readString(source, "note") || "Check-in từ viewer local.";

  const draft: Partial<UserCheckInDraft> = {
    sceneId,
    hotspotId,
    reward,
    note,
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
    draft: draft as UserCheckInDraft,
  };
}

async function validateDraft(draft: Partial<UserCheckInDraft>) {
  const errors: string[] = [];
  const place = draft.sceneId ? await getPlaceBySceneId(draft.sceneId) : undefined;
  const hotspots = draft.sceneId ? await listSceneHotspots(draft.sceneId) : [];
  const hotspot = hotspots.find((candidate) => candidate.id === draft.hotspotId);

  if (!draft.sceneId || !place) {
    errors.push("Scene không tồn tại trong bản đồ hiện tại.");
  }

  if (!draft.hotspotId || !hotspot || hotspot.kind !== "checkin") {
    errors.push("Hotspot check-in không hợp lệ.");
  }

  if (!draft.reward || draft.reward.length < 3) {
    errors.push("Reward check-in không hợp lệ.");
  }

  if (!draft.note || draft.note.length < 6) {
    errors.push("Ghi chú check-in cần ít nhất 6 ký tự.");
  }

  return errors;
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
