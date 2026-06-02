import {
  getDatabase,
  listCaptureSessionRows,
  listProcessingJobRows,
  type CaptureSessionRow,
  type ProcessingJobRow,
} from "@loi-vao/db";

import type {
  CaptureSessionStatus,
  CaptureWorkItem,
  PipelineOverview,
  ProcessingJobItem,
  ProcessingJobStatus,
} from "../domain";
import { sampleCaptureSessions, sampleProcessingJobs } from "../sample-data";

export async function listCaptureWorkItems(): Promise<CaptureWorkItem[]> {
  const database = getDatabase();

  if (!database) {
    return sampleCaptureSessions;
  }

  const rows = await listCaptureSessionRows(database);
  return rows.map(mapCaptureRow);
}

export async function listProcessingJobs(): Promise<ProcessingJobItem[]> {
  const database = getDatabase();

  if (!database) {
    return sampleProcessingJobs;
  }

  const rows = await listProcessingJobRows(database);
  return rows.map(mapProcessingRow);
}

export async function getPipelineOverview(): Promise<PipelineOverview> {
  const [captureSessions, processingJobs] = await Promise.all([
    listCaptureWorkItems(),
    listProcessingJobs(),
  ]);

  return {
    captureSessions,
    processingJobs,
    captureStatusCounts: countCaptureStatuses(captureSessions),
    jobStatusCounts: countJobStatuses(processingJobs),
  };
}

function mapCaptureRow(row: CaptureSessionRow): CaptureWorkItem {
  return {
    id: row.id,
    placeSlug: row.placeSlug ?? undefined,
    placeName: row.placeName ?? "Chưa gắn địa điểm",
    sceneId: row.sceneSlug ?? undefined,
    sceneTitle: row.sceneTitle ?? "Chưa gắn scene",
    device: row.device,
    captureMode: row.captureMode,
    status: row.status,
    notes: row.notes,
    rawAssetKey: row.rawAssetKey ?? undefined,
    createdAt: toIsoString(row.createdAt),
    capturedAt: toOptionalIsoString(row.capturedAt),
  };
}

function mapProcessingRow(row: ProcessingJobRow): ProcessingJobItem {
  return {
    id: row.id,
    captureSessionId: row.captureSessionId ?? undefined,
    sceneVersionId: row.sceneVersionId ?? undefined,
    placeName: row.placeName ?? "Chưa gắn địa điểm",
    sceneId: row.sceneSlug ?? undefined,
    sceneTitle: row.sceneTitle ?? "Chưa gắn scene",
    provider: row.provider,
    gpuType: row.gpuType ?? undefined,
    toolchain: row.toolchain,
    status: row.status,
    logKey: row.logKey ?? undefined,
    createdAt: toIsoString(row.createdAt),
    startedAt: toOptionalIsoString(row.startedAt),
    finishedAt: toOptionalIsoString(row.finishedAt),
  };
}

function countCaptureStatuses(items: CaptureWorkItem[]) {
  return items.reduce<Record<CaptureSessionStatus, number>>(
    (counts, item) => ({
      ...counts,
      [item.status]: counts[item.status] + 1,
    }),
    { draft: 0, uploaded: 0, processing: 0, accepted: 0, rejected: 0, archived: 0 },
  );
}

function countJobStatuses(items: ProcessingJobItem[]) {
  return items.reduce<Record<ProcessingJobStatus, number>>(
    (counts, item) => ({
      ...counts,
      [item.status]: counts[item.status] + 1,
    }),
    { queued: 0, running: 0, succeeded: 0, failed: 0, cancelled: 0 },
  );
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function toOptionalIsoString(value: Date | string | null) {
  return value ? toIsoString(value) : undefined;
}
