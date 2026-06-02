import { sql, type Kysely } from "kysely";

import type { Database } from "./schema";

export type SceneAssetPublishInput = {
  sceneSlug: string;
  contentKey: string;
  settingsKey?: string;
  collisionKey?: string;
  posterKey?: string;
};

export type SceneAssetPublishRow = {
  sceneSlug: string;
  sceneTitle: string;
  sceneVersionId: string;
  version: number;
  contentKey: string;
  settingsKey: string | null;
  collisionKey: string | null;
  posterKey: string | null;
};

export async function publishLatestSceneVersionAssets(
  db: Kysely<Database>,
  input: SceneAssetPublishInput,
): Promise<SceneAssetPublishRow | undefined> {
  const result = await sql<SceneAssetPublishRow>`
    with target_scene as (
      select id, slug, title
      from public.scenes
      where slug = ${input.sceneSlug}
      order by created_at asc
      limit 1
    ),
    target_version as (
      select id, version
      from public.scene_versions
      where scene_id = (select id from target_scene)
      order by version desc
      limit 1
    ),
    updated_version as (
      update public.scene_versions sv
      set
        status = 'ready',
        runtime_format = 'sog',
        content_key = ${input.contentKey},
        settings_key = ${input.settingsKey ?? null},
        collision_key = ${input.collisionKey ?? null},
        poster_key = ${input.posterKey ?? null}
      where sv.id = (select id from target_version)
      returning
        sv.id::text as "sceneVersionId",
        sv.version as "version",
        sv.content_key as "contentKey",
        sv.settings_key as "settingsKey",
        sv.collision_key as "collisionKey",
        sv.poster_key as "posterKey"
    ),
    updated_scene as (
      update public.scenes s
      set status = 'ready', updated_at = now()
      where s.id = (select id from target_scene)
      returning s.slug as "sceneSlug", s.title as "sceneTitle"
    )
    select
      us."sceneSlug",
      us."sceneTitle",
      uv."sceneVersionId",
      uv."version",
      uv."contentKey",
      uv."settingsKey",
      uv."collisionKey",
      uv."posterKey"
    from updated_scene us
    cross join updated_version uv
  `.execute(db);

  return result.rows[0];
}
