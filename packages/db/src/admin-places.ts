import { sql, type Kysely } from "kysely";

import type { Database, PlaceCategory, PlaceStatus, SceneStatus } from "./schema";

export type CreatePlaceWithSceneInput = {
  slug: string;
  name: string;
  category: PlaceCategory;
  status: PlaceStatus;
  summary: string;
  description: string;
  address: string;
  city: string;
  lng: number;
  lat: number;
  sceneSlug: string;
  sceneTitle: string;
  sceneEntryLabel: string;
  sceneStatus: SceneStatus;
};

export type CreatedPlaceWithSceneRow = {
  placeId: string;
  placeSlug: string;
  sceneId: string;
  sceneSlug: string;
};

export type CreatedPlacesWithScenesBatch = {
  items: CreatedPlaceWithSceneRow[];
};

export type UpdatePlaceStatusInput = {
  placeSlug: string;
  status: PlaceStatus;
};

export type UpdatedPlaceStatusRow = {
  placeId: string;
  placeSlug: string;
  status: PlaceStatus;
  updatedAt: Date;
};

export type UpdatePlaceWithSceneInput = {
  placeSlug: string;
  name: string;
  category: PlaceCategory;
  summary: string;
  address: string;
  city: string;
  lng: number;
  lat: number;
  sceneSlug: string;
  sceneTitle: string;
  sceneEntryLabel: string;
};

export type UpdatedPlaceWithSceneRow = {
  placeId: string;
  placeSlug: string;
  sceneId: string;
  sceneSlug: string;
};

export async function createPlaceWithScene(
  db: Kysely<Database>,
  input: CreatePlaceWithSceneInput,
): Promise<CreatedPlaceWithSceneRow> {
  return db.transaction().execute((trx) => insertPlaceWithScene(trx, input));
}

export async function createPlacesWithScenes(
  db: Kysely<Database>,
  inputs: CreatePlaceWithSceneInput[],
): Promise<CreatedPlacesWithScenesBatch> {
  return db.transaction().execute(async (trx) => {
    const items: CreatedPlaceWithSceneRow[] = [];

    for (const input of inputs) {
      items.push(await insertPlaceWithScene(trx, input));
    }

    return { items };
  });
}

async function insertPlaceWithScene(
  db: Kysely<Database>,
  input: CreatePlaceWithSceneInput,
): Promise<CreatedPlaceWithSceneRow> {
  const placeResult = await sql<{
    placeId: string;
    placeSlug: string;
  }>`
      insert into public.places (
        slug,
        name,
        category,
        status,
        summary,
        description,
        address,
        city,
        geom
      ) values (
        ${input.slug},
        ${input.name},
        ${input.category},
        ${input.status},
        ${input.summary},
        ${input.description},
        ${input.address},
        ${input.city},
        public.ST_SetSRID(public.ST_MakePoint(${input.lng}, ${input.lat}), 4326)
      )
      returning id::text as "placeId", slug as "placeSlug"
    `.execute(db);

  const place = placeResult.rows[0];

  const sceneResult = await sql<{
    sceneId: string;
    sceneSlug: string;
  }>`
      insert into public.scenes (
        place_id,
        slug,
        title,
        entry_label,
        status
      ) values (
        ${place.placeId}::uuid,
        ${input.sceneSlug},
        ${input.sceneTitle},
        ${input.sceneEntryLabel},
        ${input.sceneStatus}
      )
      returning id::text as "sceneId", slug as "sceneSlug"
    `.execute(db);

  const scene = sceneResult.rows[0];

  return {
    placeId: place.placeId,
    placeSlug: place.placeSlug,
    sceneId: scene.sceneId,
    sceneSlug: scene.sceneSlug,
  };
}

export async function updatePlaceStatus(
  db: Kysely<Database>,
  input: UpdatePlaceStatusInput,
): Promise<UpdatedPlaceStatusRow> {
  const result = await sql<UpdatedPlaceStatusRow>`
    update public.places
    set
      status = ${input.status},
      updated_at = now()
    where slug = ${input.placeSlug}
    returning
      id::text as "placeId",
      slug as "placeSlug",
      status as "status",
      updated_at as "updatedAt"
  `.execute(db);

  const updated = result.rows[0];

  if (!updated) {
    throw new Error("Place not found.");
  }

  return updated;
}

export async function updatePlaceWithScene(
  db: Kysely<Database>,
  input: UpdatePlaceWithSceneInput,
): Promise<UpdatedPlaceWithSceneRow> {
  return db.transaction().execute(async (trx) => {
    const placeResult = await sql<{
      placeId: string;
      placeSlug: string;
    }>`
      update public.places
      set
        name = ${input.name},
        category = ${input.category},
        summary = ${input.summary},
        address = ${input.address},
        city = ${input.city},
        geom = public.ST_SetSRID(public.ST_MakePoint(${input.lng}, ${input.lat}), 4326),
        updated_at = now()
      where slug = ${input.placeSlug}
      returning id::text as "placeId", slug as "placeSlug"
    `.execute(trx);

    const place = placeResult.rows[0];

    if (!place) {
      throw new Error("Place not found.");
    }

    const sceneResult = await sql<{
      sceneId: string;
      sceneSlug: string;
    }>`
      update public.scenes
      set
        title = ${input.sceneTitle},
        entry_label = ${input.sceneEntryLabel},
        updated_at = now()
      where place_id = ${place.placeId}::uuid and slug = ${input.sceneSlug}
      returning id::text as "sceneId", slug as "sceneSlug"
    `.execute(trx);

    const scene = sceneResult.rows[0];

    if (!scene) {
      throw new Error("Scene not found.");
    }

    return {
      placeId: place.placeId,
      placeSlug: place.placeSlug,
      sceneId: scene.sceneId,
      sceneSlug: scene.sceneSlug,
    };
  });
}
