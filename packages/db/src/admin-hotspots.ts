import { sql, type Kysely } from "kysely";

import type { Database, SceneHotspotKind } from "./schema";

export type CreateSceneHotspotInput = {
  sceneSlug: string;
  kind: SceneHotspotKind;
  title: string;
  body: string;
  position: Record<string, unknown>;
  rotation: Record<string, unknown>;
  payload: Record<string, unknown>;
  sortOrder: number;
};

export type CreatedSceneHotspotRow = {
  hotspotId: string;
  sceneSlug: string;
  sceneVersionId: string;
  sortOrder: number;
};

export type UpdateSceneHotspotInput = CreateSceneHotspotInput & {
  hotspotId: string;
};

export type UpdatedSceneHotspotRow = CreatedSceneHotspotRow & {
  kind: SceneHotspotKind;
  title: string;
};

export type DeleteSceneHotspotInput = {
  sceneSlug: string;
  hotspotId: string;
};

export type DeletedSceneHotspotRow = {
  hotspotId: string;
  sceneSlug: string;
  sceneVersionId: string;
};

export async function createSceneHotspot(
  db: Kysely<Database>,
  input: CreateSceneHotspotInput,
): Promise<CreatedSceneHotspotRow> {
  const positionJson = JSON.stringify(input.position);
  const rotationJson = JSON.stringify(input.rotation);
  const payloadJson = JSON.stringify(input.payload);

  const result = await sql<CreatedSceneHotspotRow>`
    with target_scene as (
      select id, slug
      from public.scenes
      where slug = ${input.sceneSlug}
      order by created_at asc
      limit 1
    ),
    target_version as (
      select id
      from public.scene_versions
      where scene_id = (select id from target_scene)
      order by version desc
      limit 1
    ),
    created_hotspot as (
      insert into public.scene_hotspots (
        scene_version_id,
        kind,
        title,
        body,
        position,
        rotation,
        payload,
        sort_order
      )
      select
        target_version.id,
        ${input.kind},
        ${input.title},
        ${input.body},
        ${positionJson}::jsonb,
        ${rotationJson}::jsonb,
        ${payloadJson}::jsonb,
        ${input.sortOrder}
      from target_version
      returning id, scene_version_id, sort_order
    )
    select
      created_hotspot.id::text as "hotspotId",
      (select slug from target_scene) as "sceneSlug",
      created_hotspot.scene_version_id::text as "sceneVersionId",
      created_hotspot.sort_order::int as "sortOrder"
    from created_hotspot
  `.execute(db);

  const created = result.rows[0];

  if (!created) {
    throw new Error("Scene version not found for hotspot.");
  }

  return created;
}

export async function updateSceneHotspot(
  db: Kysely<Database>,
  input: UpdateSceneHotspotInput,
): Promise<UpdatedSceneHotspotRow> {
  const positionJson = JSON.stringify(input.position);
  const rotationJson = JSON.stringify(input.rotation);
  const payloadJson = JSON.stringify(input.payload);

  const result = await sql<UpdatedSceneHotspotRow>`
    with target_hotspot as (
      select
        sh.id,
        sh.scene_version_id,
        scenes.slug as scene_slug
      from public.scene_hotspots sh
      join public.scene_versions sv on sv.id = sh.scene_version_id
      join public.scenes scenes on scenes.id = sv.scene_id
      where scenes.slug = ${input.sceneSlug}
        and sh.id = ${input.hotspotId}::uuid
      limit 1
    )
    update public.scene_hotspots sh set
      kind = ${input.kind},
      title = ${input.title},
      body = ${input.body},
      position = ${positionJson}::jsonb,
      rotation = ${rotationJson}::jsonb,
      payload = ${payloadJson}::jsonb,
      sort_order = ${input.sortOrder}
    from target_hotspot
    where sh.id = target_hotspot.id
    returning
      sh.id::text as "hotspotId",
      target_hotspot.scene_slug as "sceneSlug",
      sh.scene_version_id::text as "sceneVersionId",
      sh.sort_order::int as "sortOrder",
      sh.kind as "kind",
      sh.title as "title"
  `.execute(db);

  const updated = result.rows[0];

  if (!updated) {
    throw new Error("Scene hotspot not found for update.");
  }

  return updated;
}

export async function deleteSceneHotspot(
  db: Kysely<Database>,
  input: DeleteSceneHotspotInput,
): Promise<DeletedSceneHotspotRow> {
  const result = await sql<DeletedSceneHotspotRow>`
    with target_hotspot as (
      select
        sh.id,
        sh.scene_version_id,
        scenes.slug as scene_slug
      from public.scene_hotspots sh
      join public.scene_versions sv on sv.id = sh.scene_version_id
      join public.scenes scenes on scenes.id = sv.scene_id
      where scenes.slug = ${input.sceneSlug}
        and sh.id = ${input.hotspotId}::uuid
      limit 1
    ),
    deleted_hotspot as (
      delete from public.scene_hotspots sh
      using target_hotspot
      where sh.id = target_hotspot.id
      returning sh.id, sh.scene_version_id
    )
    select
      deleted_hotspot.id::text as "hotspotId",
      (select scene_slug from target_hotspot) as "sceneSlug",
      deleted_hotspot.scene_version_id::text as "sceneVersionId"
    from deleted_hotspot
  `.execute(db);

  const deleted = result.rows[0];

  if (!deleted) {
    throw new Error("Scene hotspot not found for delete.");
  }

  return deleted;
}
