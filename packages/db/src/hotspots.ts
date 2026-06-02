import { sql, type Kysely } from "kysely";

import type { Database, SceneHotspotKind } from "./schema";

export type SceneHotspotRow = {
  id: string;
  kind: SceneHotspotKind;
  title: string;
  body: string;
  position: Record<string, unknown>;
  rotation: Record<string, unknown>;
  payload: Record<string, unknown>;
  sortOrder: number;
};

export async function listSceneHotspotRows(
  db: Kysely<Database>,
  sceneSlug: string,
): Promise<SceneHotspotRow[]> {
  const result = await sql<SceneHotspotRow>`
    with target_scene as (
      select id
      from public.scenes
      where slug = ${sceneSlug}
      order by created_at asc
      limit 1
    ),
    target_version as (
      select id
      from public.scene_versions
      where scene_id = (select id from target_scene)
      order by version desc
      limit 1
    )
    select
      sh.id::text as "id",
      sh.kind as "kind",
      sh.title as "title",
      sh.body as "body",
      sh.position as "position",
      sh.rotation as "rotation",
      sh.payload as "payload",
      sh.sort_order as "sortOrder"
    from public.scene_hotspots sh
    where sh.scene_version_id = (select id from target_version)
    order by sh.sort_order asc, sh.created_at asc
  `.execute(db);

  return result.rows;
}
