import type {
  PlaceCategory,
  PlacePublicationStatus,
  SceneStatus,
} from "@/features/places/domain";
import type {
  CaptureSessionStatus,
  ProcessingJobStatus,
} from "@/features/pipeline/domain";

export type AdminReviewQueueId =
  | "needsPermission"
  | "needsCapture"
  | "processing"
  | "readyToPublish"
  | "published";

export type AdminReviewQueueItemKind = "place" | "capture" | "processingJob";
export type AdminReviewQueuePriority = "high" | "normal" | "low";

export type AdminReviewQueueItem = {
  id: string;
  kind: AdminReviewQueueItemKind;
  title: string;
  subtitle: string;
  statusLine: string;
  context: string;
  nextAction: string;
  actionLabel: string;
  href: string;
  priority: AdminReviewQueuePriority;
  placeSlug?: string;
  sceneId?: string;
  category?: PlaceCategory;
  publicationStatus?: PlacePublicationStatus;
  sceneStatus?: SceneStatus;
  captureStatus?: CaptureSessionStatus;
  jobStatus?: ProcessingJobStatus;
};

export type AdminReviewQueue = {
  id: AdminReviewQueueId;
  title: string;
  description: string;
  emptyLabel: string;
  items: AdminReviewQueueItem[];
};

export type AdminReviewQueues = {
  counts: Record<AdminReviewQueueId, number>;
  queues: AdminReviewQueue[];
};
