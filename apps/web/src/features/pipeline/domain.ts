export type CaptureSessionStatus =
  | "draft"
  | "uploaded"
  | "processing"
  | "accepted"
  | "rejected"
  | "archived";

export type ProcessingJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type CaptureWorkItem = {
  id: string;
  placeSlug?: string;
  placeName: string;
  sceneId?: string;
  sceneTitle: string;
  device: string;
  captureMode: string;
  status: CaptureSessionStatus;
  notes: string;
  rawAssetKey?: string;
  createdAt: string;
  capturedAt?: string;
};

export type ProcessingJobItem = {
  id: string;
  captureSessionId?: string;
  sceneVersionId?: string;
  placeName: string;
  sceneId?: string;
  sceneTitle: string;
  provider: string;
  gpuType?: string;
  toolchain: string;
  status: ProcessingJobStatus;
  logKey?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
};

export type PipelineOverview = {
  captureSessions: CaptureWorkItem[];
  processingJobs: ProcessingJobItem[];
  captureStatusCounts: Record<CaptureSessionStatus, number>;
  jobStatusCounts: Record<ProcessingJobStatus, number>;
};

export const captureStatusLabels: Record<CaptureSessionStatus, string> = {
  draft: "Bản nháp",
  uploaded: "Đã tải lên",
  processing: "Đang xử lý",
  accepted: "Đã duyệt",
  rejected: "Cần quay lại",
  archived: "Đã lưu trữ",
};

export const processingJobStatusLabels: Record<ProcessingJobStatus, string> = {
  queued: "Đang chờ GPU",
  running: "Đang chạy",
  succeeded: "Thành công",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

export function getCaptureNextAction(item: CaptureWorkItem) {
  if (item.status === "draft") {
    return "Hoàn thiện metadata trước khi upload raw video.";
  }

  if (item.status === "uploaded") {
    return "Tạo processing job cho Nerfstudio/gsplat.";
  }

  if (item.status === "processing") {
    return "Theo dõi job GPU và log train.";
  }

  if (item.status === "rejected") {
    return "Quay lại theo route hint và tránh lỗi ánh sáng/chuyển động.";
  }

  return "Chuẩn bị xuất bản scene version khi asset đã qua QA.";
}

export function getProcessingNextAction(item: ProcessingJobItem) {
  if (item.status === "queued") {
    return "Chờ thuê GPU hoặc gán pod RunPod.";
  }

  if (item.status === "running") {
    return "Kiểm tra log, loss và preview định kỳ.";
  }

  if (item.status === "failed") {
    return "Xem log, điều chỉnh capture/data processing rồi chạy lại.";
  }

  if (item.status === "cancelled") {
    return "Xác nhận không còn chi phí GPU hoặc volume dư.";
  }

  return "Export PLY, clean bằng SuperSplat, rồi publish SOG/collision.";
}
