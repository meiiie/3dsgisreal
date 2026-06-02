import { sql, type Kysely } from "kysely";

import type { Database, PlaceCategory, PlaceStatus, SceneStatus, SceneVersionStatus } from "./schema";

export type PlaceSceneRow = {
  placeId: string;
  placeSlug: string;
  placeName: string;
  placeCategory: PlaceCategory;
  placeStatus: PlaceStatus;
  placeSummary: string;
  placeAddress: string;
  placeCity: string;
  lng: number;
  lat: number;
  sceneId: string | null;
  sceneSlug: string | null;
  sceneTitle: string | null;
  sceneEntryLabel: string | null;
  sceneStatus: SceneStatus | null;
  versionStatus: SceneVersionStatus | null;
  runtimeFormat: string | null;
  contentKey: string | null;
  settingsKey: string | null;
  collisionKey: string | null;
  posterKey: string | null;
  distanceMeters: number | null;
};

export type ListPlaceSceneRowsInput = {
  category?: PlaceCategory;
  status?: Exclude<PlaceStatus, "archived">;
  search?: string;
  bounds?: PlaceBoundsFilter;
  near?: PlaceNearFilter;
};

export type PlaceBoundsFilter = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type PlaceNearFilter = {
  lng: number;
  lat: number;
  radiusMeters: number;
};

export async function listPlaceSceneRows(
  db: Kysely<Database>,
  input: ListPlaceSceneRowsInput = {},
): Promise<PlaceSceneRow[]> {
  const category = input.category ?? null;
  const status = input.status ?? null;
  const search = input.search?.trim() || null;
  const searchPattern = search ? `%${search}%` : null;
  const bounds = input.bounds;
  const hasBounds = Boolean(bounds);
  const west = bounds?.west ?? 0;
  const south = bounds?.south ?? 0;
  const east = bounds?.east ?? 0;
  const north = bounds?.north ?? 0;
  const near = input.near;
  const hasNear = Boolean(near);
  const nearLng = near?.lng ?? 0;
  const nearLat = near?.lat ?? 0;
  const radiusMeters = near?.radiusMeters ?? 0;

  const result = await sql<PlaceSceneRow>`
    with near_point as (
      select public.ST_SetSRID(public.ST_MakePoint(${nearLng}, ${nearLat}), 4326)::public.geography as geom
    )
    select
      p.id::text as "placeId",
      p.slug as "placeSlug",
      p.name as "placeName",
      p.category as "placeCategory",
      p.status as "placeStatus",
      p.summary as "placeSummary",
      p.address as "placeAddress",
      p.city as "placeCity",
      public.ST_X(p.geom)::float8 as "lng",
      public.ST_Y(p.geom)::float8 as "lat",
      s.id::text as "sceneId",
      s.slug as "sceneSlug",
      s.title as "sceneTitle",
      s.entry_label as "sceneEntryLabel",
      s.status as "sceneStatus",
      sv.status as "versionStatus",
      sv.runtime_format as "runtimeFormat",
      sv.content_key as "contentKey",
      sv.settings_key as "settingsKey",
      sv.collision_key as "collisionKey",
      sv.poster_key as "posterKey",
      case
        when ${hasNear}::boolean
        then public.ST_Distance(p.geom::public.geography, near_point.geom)::float8
        else null
      end as "distanceMeters"
    from public.places p
    cross join near_point
    left join public.scenes s on s.place_id = p.id
    left join lateral (
      select
        latest.status,
        latest.runtime_format,
        latest.content_key,
        latest.settings_key,
        latest.collision_key,
        latest.poster_key
      from public.scene_versions latest
      where latest.scene_id = s.id
      order by latest.version desc
      limit 1
    ) sv on true
    where p.status <> 'archived'
      and (${category}::text is null or p.category = ${category})
      and (${status}::text is null or p.status = ${status})
      and (
        ${searchPattern}::text is null
        or public.unaccent(p.name) ilike public.unaccent(${searchPattern})
        or public.unaccent(p.summary) ilike public.unaccent(${searchPattern})
        or public.unaccent(p.address) ilike public.unaccent(${searchPattern})
        or public.unaccent(p.city) ilike public.unaccent(${searchPattern})
        or public.unaccent(coalesce(s.entry_label, '')) ilike public.unaccent(${searchPattern})
      )
      and (
        ${hasBounds}::boolean = false
        or p.geom && public.ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)
      )
      and (
        ${hasNear}::boolean = false
        or public.ST_DWithin(p.geom::public.geography, near_point.geom, ${radiusMeters})
      )
    order by
      case
        when ${hasNear}::boolean
        then public.ST_Distance(p.geom::public.geography, near_point.geom)
        else null
      end asc nulls last,
      p.created_at asc,
      s.created_at asc
  `.execute(db);

  return result.rows;
}
