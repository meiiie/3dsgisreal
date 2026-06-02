import { sql, type Kysely } from "kysely";

import type { CaptureSessionStatus, Database } from "./schema";

export type CreateCaptureSessionForSceneInput = {
  placeSlug: string;
  sceneSlug: string;
  device: string;
  captureMode: string;
  capturedAt: string;
  notes: string;
  rawAssetKey: string;
  status: CaptureSessionStatus;
};

export type CreatedCaptureSessionRow = {
  captureSessionId: string;
  placeSlug: string;
  sceneSlug: string;
};

export async function createCaptureSessionForScene(
  db: Kysely<Database>,
  input: CreateCaptureSessionForSceneInput,
): Promise<CreatedCaptureSessionRow> {
  const result = await sql<CreatedCaptureSessionRow>`
    with target_scene as (
      select
        p.id as place_id,
        p.slug as place_slug,
        s.id as scene_id,
        s.slug as scene_slug
      from public.places p
      join public.scenes s on s.place_id = p.id
      where p.slug = ${input.placeSlug}
        and s.slug = ${input.sceneSlug}
      limit 1
    )
    insert into public.capture_sessions (
      place_id,
      scene_id,
      device,
      capture_mode,
      captured_at,
      notes,
      raw_asset_key,
      status
    )
    select
      target_scene.place_id,
      target_scene.scene_id,
      ${input.device},
      ${input.captureMode},
      ${input.capturedAt}::timestamptz,
      ${input.notes},
      ${input.rawAssetKey},
      ${input.status}
    from target_scene
    returning
      id::text as "captureSessionId",
      (select place_slug from target_scene) as "placeSlug",
      (select scene_slug from target_scene) as "sceneSlug"
  `.execute(db);

  const created = result.rows[0];

  if (!created) {
    throw new Error("Scene not found for capture session.");
  }

  return created;
}
