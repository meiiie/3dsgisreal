import { sql, type Kysely } from "kysely";

import type { Database } from "./schema";
import { LOCAL_DEMO_PROFILE_ID } from "./user";

export type CreateUserQuizAttemptInput = {
  profileId?: string;
  sceneHotspotId: string;
  selectedIndex: number;
  correct: boolean;
  reward: string;
  payload?: Record<string, unknown>;
};

export type CreatedUserQuizAttemptRow = {
  id: string;
  profileId: string;
  sceneHotspotId: string;
  sceneId: string | null;
  selectedIndex: number;
  correct: boolean;
  reward: string;
  payload: Record<string, unknown>;
  answeredAt: Date;
};

export type UserQuizAttemptRow = {
  id: string;
  profileId: string;
  placeId: string;
  sceneId: string;
  sceneSlug: string;
  sceneTitle: string;
  hotspotId: string;
  hotspotTitle: string;
  selectedIndex: number;
  correct: boolean;
  reward: string;
  question: string;
  selectedOption: string;
  answeredAt: Date;
};

export async function listUserQuizAttemptRows(
  db: Kysely<Database>,
  profileId = LOCAL_DEMO_PROFILE_ID,
): Promise<UserQuizAttemptRow[]> {
  const result = await sql<UserQuizAttemptRow>`
    select
      uqa.id::text as "id",
      uqa.profile_id::text as "profileId",
      scenes.place_id::text as "placeId",
      scenes.id::text as "sceneId",
      scenes.slug as "sceneSlug",
      scenes.title as "sceneTitle",
      sh.id::text as "hotspotId",
      sh.title as "hotspotTitle",
      uqa.selected_index as "selectedIndex",
      uqa.correct as "correct",
      uqa.reward as "reward",
      coalesce(uqa.payload ->> 'question', sh.payload ->> 'question', '') as "question",
      coalesce(uqa.payload ->> 'selectedOption', '') as "selectedOption",
      uqa.answered_at as "answeredAt"
    from public.user_quiz_attempts uqa
    join public.scene_hotspots sh on sh.id = uqa.scene_hotspot_id
    join public.scenes scenes on scenes.id = uqa.scene_id
    join public.places places on places.id = scenes.place_id
    where uqa.profile_id = ${profileId}::uuid
      and places.status <> 'archived'
    order by uqa.answered_at desc
    limit 12
  `.execute(db);

  return result.rows;
}

export async function createUserQuizAttempt(
  db: Kysely<Database>,
  input: CreateUserQuizAttemptInput,
): Promise<CreatedUserQuizAttemptRow> {
  const profileId = input.profileId || LOCAL_DEMO_PROFILE_ID;
  const payload = JSON.stringify(input.payload ?? {});

  const result = await sql<CreatedUserQuizAttemptRow>`
    with target_hotspot as (
      select
        sh.id as hotspot_id,
        sv.scene_id
      from public.scene_hotspots sh
      join public.scene_versions sv on sv.id = sh.scene_version_id
      where sh.id = ${input.sceneHotspotId}::uuid
      limit 1
    )
    insert into public.user_quiz_attempts (
      profile_id,
      scene_hotspot_id,
      scene_id,
      selected_index,
      correct,
      reward,
      payload
    )
    select
      ${profileId}::uuid,
      target_hotspot.hotspot_id,
      target_hotspot.scene_id,
      ${input.selectedIndex},
      ${input.correct},
      ${input.reward},
      ${payload}::jsonb
    from target_hotspot
    returning
      id::text as "id",
      profile_id::text as "profileId",
      scene_hotspot_id::text as "sceneHotspotId",
      scene_id::text as "sceneId",
      selected_index as "selectedIndex",
      correct as "correct",
      reward as "reward",
      payload as "payload",
      answered_at as "answeredAt"
  `.execute(db);

  const row = result.rows[0];

  if (!row) {
    throw new Error("Could not write user quiz attempt.");
  }

  return row;
}
