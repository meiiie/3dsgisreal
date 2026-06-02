import {
  getDatabase,
  LOCAL_DEMO_PROFILE_ID,
  upsertUserPlaceLibraryStatus,
  type UpsertedUserPlaceLibraryRow,
} from "@loi-vao/db";

import { getPlaceBySlug } from "@/features/places/server/repository";

export type UserPlaceLibraryActionStatus = "saved" | "visited";

export type UserPlaceLibraryDraft = {
  placeSlug: string;
  status: UserPlaceLibraryActionStatus;
  note: string;
};

export type UserPlaceLibraryActionResult =
  | {
      ok: true;
      persisted: boolean;
      draft: UserPlaceLibraryDraft;
      updated?: UpsertedUserPlaceLibraryRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<UserPlaceLibraryDraft>;
    };

const allowedStatuses: UserPlaceLibraryActionStatus[] = ["saved", "visited"];

export async function updateUserPlaceLibraryFromPlace(
  raw: unknown,
  profileId = LOCAL_DEMO_PROFILE_ID,
): Promise<UserPlaceLibraryActionResult> {
  const parsed = await parseUserPlaceLibraryAction(raw);

  if (!parsed.ok) {
    return parsed;
  }

  const dryRun = readBoolean(toRecord(raw), "dryRun");
  const database = getDatabase();
  const place = await getPlaceBySlug(parsed.draft.placeSlug);

  if (!place) {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Dia diem khong ton tai trong ban do hien tai."],
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
    const updated = await upsertUserPlaceLibraryStatus(database, {
      profileId,
      placeId: place.id,
      status: parsed.draft.status,
      note: parsed.draft.note,
    });

    return {
      ok: true,
      persisted: true,
      draft: parsed.draft,
      updated,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Khong ghi duoc trang thai user. Kiem tra PostGIS, profile local hoac place id."],
    };
  }
}

export async function parseUserPlaceLibraryAction(raw: unknown): Promise<UserPlaceLibraryActionResult> {
  const source = toRecord(raw);
  const placeSlug = readString(source, "placeSlug");
  const status = readStatus(source, "status");
  const note = readString(source, "note") || getDefaultNote(status);
  const draft: Partial<UserPlaceLibraryDraft> = {
    placeSlug,
    status,
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
    draft: draft as UserPlaceLibraryDraft,
  };
}

export function formDataToUserPlaceLibraryAction(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function validateDraft(draft: Partial<UserPlaceLibraryDraft>) {
  const errors: string[] = [];
  const place = draft.placeSlug ? await getPlaceBySlug(draft.placeSlug) : undefined;

  if (!draft.placeSlug || !place) {
    errors.push("Dia diem khong ton tai trong ban do hien tai.");
  }

  if (!draft.status || !allowedStatuses.includes(draft.status)) {
    errors.push("Trang thai user khong hop le.");
  }

  if (!draft.note || draft.note.length < 6 || draft.note.length > 240) {
    errors.push("Ghi chu can tu 6 den 240 ky tu.");
  }

  return errors;
}

function getDefaultNote(status: UserPlaceLibraryActionStatus) {
  return status === "visited" ? "Da xem ho so dia diem local." : "Da luu dia diem local.";
}

function readStatus(source: Record<string, unknown>, key: string): UserPlaceLibraryActionStatus {
  const value = readString(source, key);
  return allowedStatuses.includes(value as UserPlaceLibraryActionStatus)
    ? (value as UserPlaceLibraryActionStatus)
    : "saved";
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
