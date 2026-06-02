import { sql, type Kysely } from "kysely";

import type { Database, ProcessingJobStatus } from "./schema";

export type CreateProcessingJobFromCaptureInput = {
  captureSessionId: string;
  provider: string;
  gpuType: string | null;
  toolchain: string;
  status: ProcessingJobStatus;
  config: Record<string, unknown>;
  logKey: string | null;
};

export type CreatedProcessingJobRow = {
  processingJobId: string;
  captureSessionId: string;
  sceneVersionId: string;
  sceneSlug: string;
  sceneVersion: number;
};

export type UpdateProcessingJobStatusInput = {
  processingJobId: string;
  status: ProcessingJobStatus;
  operatorNote: string;
};

export type UpdatedProcessingJobStatusRow = {
  processingJobId: string;
  captureSessionId: string | null;
  sceneVersionId: string | null;
  sceneSlug: string | null;
  status: ProcessingJobStatus;
};

export async function createProcessingJobFromCapture(
  db: Kysely<Database>,
  input: CreateProcessingJobFromCaptureInput,
): Promise<CreatedProcessingJobRow> {
  const configJson = JSON.stringify(input.config);

  const result = await sql<CreatedProcessingJobRow>`
    with target_capture as (
      select
        cs.id as capture_session_id,
        cs.scene_id,
        s.slug as scene_slug
      from public.capture_sessions cs
      join public.scenes s on s.id = cs.scene_id
      where cs.id::text = ${input.captureSessionId}
      limit 1
    ),
    next_version as (
      select
        target_capture.scene_id,
        coalesce(max(sv.version), 0) + 1 as version
      from target_capture
      left join public.scene_versions sv on sv.scene_id = target_capture.scene_id
      group by target_capture.scene_id
    ),
    created_version as (
      insert into public.scene_versions (
        scene_id,
        version,
        status,
        renderer,
        source_format,
        runtime_format,
        training_metadata
      )
      select
        next_version.scene_id,
        next_version.version,
        'processing',
        'playcanvas',
        'ply',
        'sog',
        ${configJson}::jsonb
      from next_version
      returning id, scene_id, version
    ),
    created_job as (
      insert into public.processing_jobs (
        capture_session_id,
        scene_version_id,
        provider,
        gpu_type,
        toolchain,
        status,
        config,
        log_key
      )
      select
        target_capture.capture_session_id,
        created_version.id,
        ${input.provider},
        ${input.gpuType},
        ${input.toolchain},
        ${input.status},
        ${configJson}::jsonb,
        ${input.logKey}
      from target_capture
      join created_version on true
      returning id, capture_session_id, scene_version_id
    ),
    marked_capture as (
      update public.capture_sessions
      set status = 'processing'
      where id = (select capture_session_id from target_capture)
      returning id
    )
    select
      created_job.id::text as "processingJobId",
      created_job.capture_session_id::text as "captureSessionId",
      created_job.scene_version_id::text as "sceneVersionId",
      target_capture.scene_slug as "sceneSlug",
      created_version.version::int as "sceneVersion"
    from created_job
    join target_capture on target_capture.capture_session_id = created_job.capture_session_id
    join created_version on created_version.id = created_job.scene_version_id
    join marked_capture on marked_capture.id = created_job.capture_session_id
  `.execute(db);

  const created = result.rows[0];

  if (!created) {
    throw new Error("Capture session not found for processing job.");
  }

  return created;
}

export async function updateProcessingJobStatus(
  db: Kysely<Database>,
  input: UpdateProcessingJobStatusInput,
): Promise<UpdatedProcessingJobStatusRow> {
  const note = input.operatorNote.trim();

  const result = await sql<UpdatedProcessingJobStatusRow>`
    with updated_job as (
      update public.processing_jobs pj
      set
        status = ${input.status},
        started_at = case
          when ${input.status} = 'running' and pj.started_at is null then now()
          else pj.started_at
        end,
        finished_at = case
          when ${input.status} in ('succeeded', 'failed', 'cancelled') then now()
          when ${input.status} = 'running' then null
          else pj.finished_at
        end,
        config = coalesce(pj.config, '{}'::jsonb) || jsonb_build_object(
          'lastStatusNote', ${note},
          'lastStatusChangeAt', now()
        )
      where pj.id::text = ${input.processingJobId}
      returning
        pj.id,
        pj.capture_session_id,
        pj.scene_version_id,
        pj.status
    ),
    marked_capture as (
      update public.capture_sessions cs
      set status = case
        when ${input.status} = 'succeeded' then 'accepted'
        when ${input.status} = 'failed' then 'rejected'
        when ${input.status} = 'cancelled' then 'uploaded'
        else 'processing'
      end
      where cs.id = (select capture_session_id from updated_job)
      returning cs.id
    ),
    marked_version as (
      update public.scene_versions sv
      set status = case
        when ${input.status} in ('failed', 'cancelled') then 'failed'
        else sv.status
      end
      where sv.id = (select scene_version_id from updated_job)
      returning sv.id
    )
    select
      uj.id::text as "processingJobId",
      uj.capture_session_id::text as "captureSessionId",
      uj.scene_version_id::text as "sceneVersionId",
      s.slug as "sceneSlug",
      uj.status as "status"
    from updated_job uj
    left join public.scene_versions sv on sv.id = uj.scene_version_id
    left join public.scenes s on s.id = sv.scene_id
    left join marked_capture mc on mc.id = uj.capture_session_id
    left join marked_version mv on mv.id = uj.scene_version_id
  `.execute(db);

  const updated = result.rows[0];

  if (!updated) {
    throw new Error("Processing job not found.");
  }

  return updated;
}
