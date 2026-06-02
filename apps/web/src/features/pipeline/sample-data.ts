import type { CaptureWorkItem, ProcessingJobItem } from "./domain";

export const sampleCaptureSessions: CaptureWorkItem[] = [
  {
    id: "capture-home-test-room-iphone14pro",
    placeSlug: "phong-thu-nghiem-tu-cong-vao",
    placeName: "Phòng thử nghiệm từ cổng vào",
    sceneId: "home-test-room-v1",
    sceneTitle: "Cổng vào phòng thử nghiệm",
    device: "iPhone 14 Pro",
    captureMode: "video",
    status: "processing",
    notes: "Lab capture từ cổng vào phòng chính, dùng để kiểm tra pipeline trước khi thuê GPU.",
    rawAssetKey: "raw-captures/home-test-room/iphone14pro-gate-to-room.mov",
    createdAt: "2026-06-02T06:00:00+07:00",
    capturedAt: "2026-06-02T06:00:00+07:00",
  },
  {
    id: "capture-student-cafe-planned",
    placeSlug: "quan-cafe-sinh-vien-mau",
    placeName: "Quán cafe sinh viên mẫu",
    sceneId: "student-cafe-demo-v1",
    sceneTitle: "Mặt tiền và khu ngồi",
    device: "iPhone 14 Pro",
    captureMode: "video + stills",
    status: "draft",
    notes: "Chưa quay. Cần xin quyền quay và chọn khung giờ ít người.",
    createdAt: "2026-06-02T06:15:00+07:00",
  },
];

export const sampleProcessingJobs: ProcessingJobItem[] = [
  {
    id: "job-home-test-room-runpod",
    captureSessionId: "capture-home-test-room-iphone14pro",
    sceneVersionId: "home-test-room-v1-version-1",
    placeName: "Phòng thử nghiệm từ cổng vào",
    sceneId: "home-test-room-v1",
    sceneTitle: "Cổng vào phòng thử nghiệm",
    provider: "RunPod",
    gpuType: "RTX 4090",
    toolchain: "nerfstudio-splatfacto-gsplat",
    status: "queued",
    logKey: "processing/home-test-room/runpod-first-train.log",
    createdAt: "2026-06-02T06:20:00+07:00",
  },
];
