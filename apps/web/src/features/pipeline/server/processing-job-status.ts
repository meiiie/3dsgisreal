import {
  getDatabase,
  updateProcessingJobStatus,
  type UpdatedProcessingJobStatusRow,
} from "@loi-vao/db";

import type { ProcessingJobItem, ProcessingJobStatus } from "../domain";
import { listProcessingJobs } from "./repository";

const processingJobStatuses = ["queued", "running", "succeeded", "failed", "cancelled"] as const;

const allowedTransitions: Record<ProcessingJobStatus, ProcessingJobStatus[]> = {
  queued: ["running", "failed", "cancelled"],
  running: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: ["queued"],
  cancelled: ["queued"],
};

export type ProcessingJobStatusDraft = {
  processingJobId: string;
  status: ProcessingJobStatus;
  operatorNote: string;
};

export type ProcessingJobStatusResult =
  | {
      ok: true;
      persisted: boolean;
      draft: ProcessingJobStatusDraft;
      current: ProcessingJobItem;
      updated?: UpdatedProcessingJobStatusRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<ProcessingJobStatusDraft>;
    };

export async function updateProcessingJobFromStatusInput(raw: unknown): Promise<ProcessingJobStatusResult> {
  const parsed = await parseProcessingJobStatusInput(raw);

  if (!parsed.ok) {
    return parsed;
  }

  const dryRun = readBoolean(toRecord(raw), "dryRun");
  const database = getDatabase();

  if (dryRun || !database) {
    return {
      ok: true,
      persisted: false,
      draft: parsed.draft,
      current: parsed.current,
    };
  }

  try {
    const updated = await updateProcessingJobStatus(database, parsed.draft);

    return {
      ok: true,
      persisted: true,
      draft: parsed.draft,
      current: parsed.current,
      updated,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Không cập nhật được job. Kiểm tra PostGIS, job id hoặc quyền admin local."],
    };
  }
}

export async function parseProcessingJobStatusInput(raw: unknown): Promise<ProcessingJobStatusResult> {
  const source = toRecord(raw);
  const processingJobId = readString(source, "processingJobId");
  const status = readStatus(source, "status");
  const operatorNote = readString(source, "operatorNote") || "Cập nhật trạng thái từ admin local.";

  const draft: Partial<ProcessingJobStatusDraft> = {
    processingJobId,
    status,
    operatorNote,
  };

  const current = processingJobId ? await getProcessingJob(processingJobId) : undefined;
  const errors = validateStatusDraft(draft, current);

  if (errors.length > 0 || !current) {
    return {
      ok: false,
      persisted: false,
      errors,
      draft,
    };
  }

  return {
    ok: true,
    persisted: false,
    draft: draft as ProcessingJobStatusDraft,
    current,
  };
}

export function formDataToProcessingJobStatus(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function getProcessingJob(processingJobId: string) {
  const jobs = await listProcessingJobs();
  return jobs.find((job) => job.id === processingJobId);
}

export function getAllowedProcessingTransitions(status: ProcessingJobStatus) {
  return allowedTransitions[status];
}

function validateStatusDraft(
  draft: Partial<ProcessingJobStatusDraft>,
  current: ProcessingJobItem | undefined,
) {
  const errors: string[] = [];

  if (!draft.processingJobId || !current) {
    errors.push("Không tìm thấy processing job.");
    return errors;
  }

  if (!draft.status) {
    errors.push("Cần chọn trạng thái mới.");
    return errors;
  }

  if (draft.status === current.status) {
    errors.push("Trạng thái mới đang trùng với trạng thái hiện tại.");
    return errors;
  }

  if (!allowedTransitions[current.status].includes(draft.status)) {
    errors.push("Transition này không hợp lệ cho vòng đời job hiện tại.");
  }

  return errors;
}

function readStatus(source: Record<string, unknown>, key: string): ProcessingJobStatus {
  const value = readString(source, key);
  return processingJobStatuses.includes(value as ProcessingJobStatus)
    ? (value as ProcessingJobStatus)
    : "queued";
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return value === true || value === "true" || value === "1";
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
}
