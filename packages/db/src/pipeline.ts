import { sql, type Kysely } from "kysely";

import type { CaptureSessionStatus, Database, ProcessingJobStatus } from "./schema";

export type CaptureSessionRow = {
  id: string;
  placeId: string | null;
  placeSlug: string | null;
  placeName: string | null;
  sceneId: string | null;
  sceneSlug: string | null;
  sceneTitle: string | null;
  device: string;
  captureMode: string;
  status: CaptureSessionStatus;
  notes: string;
  rawAssetKey: string | null;
  createdAt: Date;
  capturedAt: Date | null;
};

export type ProcessingJobRow = {
  id: string;
  captureSessionId: string | null;
  sceneVersionId: string | null;
  placeName: string | null;
  sceneSlug: string | null;
  sceneTitle: string | null;
  provider: string;
  gpuType: string | null;
  toolchain: string;
  status: ProcessingJobStatus;
  logKey: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export async function listCaptureSessionRows(db: Kysely<Database>): Promise<CaptureSessionRow[]> {
  const result = await sql<CaptureSessionRow>`
    select
      cs.id::text as "id",
      p.id::text as "placeId",
      p.slug as "placeSlug",
      p.name as "placeName",
      s.id::text as "sceneId",
      s.slug as "sceneSlug",
      s.title as "sceneTitle",
      cs.device as "device",
      cs.capture_mode as "captureMode",
      cs.status as "status",
      cs.notes as "notes",
      cs.raw_asset_key as "rawAssetKey",
      cs.created_at as "createdAt",
      cs.captured_at as "capturedAt"
    from public.capture_sessions cs
    left join public.places p on p.id = cs.place_id
    left join public.scenes s on s.id = cs.scene_id
    where cs.status <> 'archived'
    order by cs.created_at desc
  `.execute(db);

  return result.rows;
}

export async function listProcessingJobRows(db: Kysely<Database>): Promise<ProcessingJobRow[]> {
  const result = await sql<ProcessingJobRow>`
    select
      pj.id::text as "id",
      pj.capture_session_id::text as "captureSessionId",
      pj.scene_version_id::text as "sceneVersionId",
      p.name as "placeName",
      s.slug as "sceneSlug",
      s.title as "sceneTitle",
      pj.provider as "provider",
      pj.gpu_type as "gpuType",
      pj.toolchain as "toolchain",
      pj.status as "status",
      pj.log_key as "logKey",
      pj.created_at as "createdAt",
      pj.started_at as "startedAt",
      pj.finished_at as "finishedAt"
    from public.processing_jobs pj
    left join public.capture_sessions cs on cs.id = pj.capture_session_id
    left join public.scene_versions sv on sv.id = pj.scene_version_id
    left join public.scenes s on s.id = coalesce(cs.scene_id, sv.scene_id)
    left join public.places p on p.id = coalesce(cs.place_id, s.place_id)
    where pj.status <> 'cancelled'
    order by pj.created_at desc
  `.execute(db);

  return result.rows;
}
