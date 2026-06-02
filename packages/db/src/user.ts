import { sql, type Kysely } from "kysely";

import type { Database, UserPlaceLibraryStatus } from "./schema";
import { LOCAL_STUDENT_PROFILE_ID } from "./identity";

export const LOCAL_DEMO_PROFILE_ID = LOCAL_STUDENT_PROFILE_ID;

export type UserPlaceActivityRow = {
  profileId: string;
  displayName: string | null;
  placeId: string;
  status: UserPlaceLibraryStatus;
  note: string;
  savedAt: Date;
  lastViewedAt: Date | null;
};

export type UpsertUserPlaceCheckInInput = {
  profileId?: string;
  placeId: string;
  note: string;
};

export type UpsertUserPlaceLibraryInput = {
  profileId?: string;
  placeId: string;
  status: UserPlaceLibraryStatus;
  note: string;
};

export type UpsertedUserPlaceCheckInRow = {
  profileId: string;
  placeId: string;
  status: UserPlaceLibraryStatus;
  note: string;
  savedAt: Date;
  lastViewedAt: Date;
};

export type UpsertedUserPlaceLibraryRow = {
  profileId: string;
  placeId: string;
  status: UserPlaceLibraryStatus;
  note: string;
  savedAt: Date;
  lastViewedAt: Date | null;
};

export async function listUserPlaceActivityRows(
  db: Kysely<Database>,
  profileId = LOCAL_DEMO_PROFILE_ID,
): Promise<UserPlaceActivityRow[]> {
  const result = await sql<UserPlaceActivityRow>`
    select
      upl.profile_id::text as "profileId",
      p.display_name as "displayName",
      upl.place_id::text as "placeId",
      upl.status as "status",
      upl.note as "note",
      upl.saved_at as "savedAt",
      upl.last_viewed_at as "lastViewedAt"
    from public.user_place_library upl
    left join public.profiles p on p.id = upl.profile_id
    left join public.places place on place.id = upl.place_id
    where upl.profile_id = ${profileId}::uuid
      and place.status <> 'archived'
    order by coalesce(upl.last_viewed_at, upl.saved_at) desc
  `.execute(db);

  return result.rows;
}

export async function upsertUserPlaceCheckIn(
  db: Kysely<Database>,
  input: UpsertUserPlaceCheckInInput,
): Promise<UpsertedUserPlaceCheckInRow> {
  const row = await upsertUserPlaceLibraryStatus(db, {
    profileId: input.profileId,
    placeId: input.placeId,
    status: "checked_in",
    note: input.note,
  });

  if (!row.lastViewedAt) {
    throw new Error("Could not write user check-in timestamp.");
  }

  return {
    ...row,
    lastViewedAt: row.lastViewedAt,
  };
}

export async function upsertUserPlaceLibraryStatus(
  db: Kysely<Database>,
  input: UpsertUserPlaceLibraryInput,
): Promise<UpsertedUserPlaceLibraryRow> {
  const profileId = input.profileId || LOCAL_DEMO_PROFILE_ID;

  const result = await sql<UpsertedUserPlaceLibraryRow>`
    insert into public.user_place_library (
      profile_id,
      place_id,
      status,
      note,
      saved_at,
      last_viewed_at
    ) values (
      ${profileId}::uuid,
      ${input.placeId}::uuid,
      ${input.status},
      ${input.note},
      now(),
      case when ${input.status} in ('visited', 'checked_in') then now() else null end
    )
    on conflict (profile_id, place_id) do update set
      status = case
        when public.user_place_library.status = 'checked_in' then 'checked_in'
        when public.user_place_library.status = 'visited' and excluded.status = 'saved' then 'visited'
        else excluded.status
      end,
      note = excluded.note,
      last_viewed_at = case
        when excluded.status in ('visited', 'checked_in') then now()
        else public.user_place_library.last_viewed_at
      end
    returning
      profile_id::text as "profileId",
      place_id::text as "placeId",
      status as "status",
      note as "note",
      saved_at as "savedAt",
      last_viewed_at as "lastViewedAt"
  `.execute(db);

  const row = result.rows[0];

  if (!row) {
    throw new Error("Could not write user place library status.");
  }

  return row;
}
