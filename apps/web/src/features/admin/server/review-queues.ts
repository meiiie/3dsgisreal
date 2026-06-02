import type {
  AdminReviewQueue,
  AdminReviewQueueId,
  AdminReviewQueueItem,
  AdminReviewQueues,
} from "@/features/admin/domain";
import {
  categoryLabels,
  privacyStatusLabels,
  publicationStatusLabels,
  sceneStatusLabels,
  type Place,
} from "@/features/places/domain";
import { listPlaces } from "@/features/places/server/repository";
import {
  captureStatusLabels,
  getCaptureNextAction,
  getProcessingNextAction,
  processingJobStatusLabels,
  type CaptureWorkItem,
  type ProcessingJobItem,
} from "@/features/pipeline/domain";
import { getPipelineOverview } from "@/features/pipeline/server/repository";

export async function getAdminReviewQueues(): Promise<AdminReviewQueues> {
  const [places, pipeline] = await Promise.all([listPlaces(), getPipelineOverview()]);
  const uploadedCaptures = pipeline.captureSessions.filter((capture) => capture.status === "uploaded");
  const activeJobs = pipeline.processingJobs.filter((job) =>
    ["queued", "running", "failed"].includes(job.status),
  );
  const activeJobSceneIds = new Set(activeJobs.flatMap((job) => (job.sceneId ? [job.sceneId] : [])));

  const queues: AdminReviewQueue[] = [
    buildQueue(
      "needsPermission",
      places.filter(needsPermissionReview).map(toPermissionItem),
    ),
    buildQueue(
      "needsCapture",
      places.filter((place) => place.scene.status === "pending_capture").map(toCaptureNeededItem),
    ),
    buildQueue(
      "processing",
      [
        ...uploadedCaptures.map(toCaptureItem),
        ...activeJobs.map(toProcessingJobItem),
        ...places
          .filter((place) => place.scene.status === "processing" && !activeJobSceneIds.has(place.scene.id))
          .map(toProcessingPlaceItem),
      ],
    ),
    buildQueue("readyToPublish", places.filter(isReadyToPublish).map(toReadyToPublishItem)),
    buildQueue(
      "published",
      places.filter((place) => place.publicationStatus === "published").map(toPublishedItem),
    ),
  ];

  return {
    counts: Object.fromEntries(queues.map((queue) => [queue.id, queue.items.length])) as Record<
      AdminReviewQueueId,
      number
    >,
    queues,
  };
}

const queueText: Record<
  AdminReviewQueueId,
  Pick<AdminReviewQueue, "title" | "description" | "emptyLabel">
> = {
  needsPermission: {
    title: "Cần rà soát quyền quay",
    description: "Địa điểm còn ở review hoặc cần xác nhận quyền riêng tư trước khi capture/public.",
    emptyLabel: "Không có địa điểm đang kẹt ở bước quyền quay.",
  },
  needsCapture: {
    title: "Cần capture",
    description: "Scene chưa có dữ liệu scan, nên bước tiếp theo là ghi metadata capture.",
    emptyLabel: "Không có scene nào đang chờ capture.",
  },
  processing: {
    title: "Đang xử lý GPU",
    description: "Capture/job đang chờ hoặc chạy Nerfstudio/gsplat, cần theo dõi log và trạng thái.",
    emptyLabel: "Không có job GPU đang mở.",
  },
  readyToPublish: {
    title: "Sẵn sàng publish",
    description: "Scene đã ready và địa điểm đủ điều kiện công khai, cần kiểm tra asset/hotspot lần cuối.",
    emptyLabel: "Chưa có scene nào đủ điều kiện publish.",
  },
  published: {
    title: "Đã công khai",
    description: "Địa điểm đã public; queue này giúp kiểm tra lại trải nghiệm người dùng.",
    emptyLabel: "Chưa có địa điểm công khai.",
  },
};

function buildQueue(id: AdminReviewQueueId, items: AdminReviewQueueItem[]): AdminReviewQueue {
  return {
    id,
    ...queueText[id],
    items: sortQueueItems(items),
  };
}

function needsPermissionReview(place: Place) {
  return place.publicationStatus === "review" || place.privacyStatus === "permission_needed";
}

function isReadyToPublish(place: Place) {
  return place.privacyStatus === "publishable" && place.scene.status === "ready";
}

function toPermissionItem(place: Place): AdminReviewQueueItem {
  return toPlaceItem(place, {
    id: `permission:${place.slug}`,
    statusLine: `${publicationStatusLabels[place.publicationStatus]} · ${privacyStatusLabels[place.privacyStatus]}`,
    context: place.routeHint,
    nextAction: "Kiểm tra checklist privacy trước khi đổi status public hoặc capture tiếp.",
    actionLabel: "Privacy checklist",
    href: `/admin/places/${place.slug}/privacy`,
    priority: "high",
  });
}

function toCaptureNeededItem(place: Place): AdminReviewQueueItem {
  return toPlaceItem(place, {
    id: `capture:${place.slug}`,
    statusLine: `${sceneStatusLabels[place.scene.status]} · ${publicationStatusLabels[place.publicationStatus]}`,
    context: place.routeHint,
    nextAction: "Ghi capture session từ iPhone/video trước khi tạo job GPU.",
    actionLabel: "Ghi capture",
    href: `/admin/captures/new?scene=${encodeURIComponent(place.scene.id)}`,
    priority: place.publicationStatus === "published" ? "normal" : "high",
  });
}

function toProcessingPlaceItem(place: Place): AdminReviewQueueItem {
  return toPlaceItem(place, {
    id: `processing:${place.slug}`,
    statusLine: sceneStatusLabels[place.scene.status],
    context: place.scene.title,
    nextAction: "Tìm job GPU tương ứng hoặc tạo lại job nếu metadata bị thiếu.",
    actionLabel: "Tạo job GPU",
    href: "/admin/processing/new",
    priority: "normal",
  });
}

function toReadyToPublishItem(place: Place): AdminReviewQueueItem {
  return toPlaceItem(place, {
    id: `publish:${place.slug}`,
    statusLine: `${sceneStatusLabels[place.scene.status]} · ${privacyStatusLabels[place.privacyStatus]}`,
    context: place.scene.title,
    nextAction: "Kiểm tra SOG/settings/collision/poster và publish asset keys.",
    actionLabel: "Kế hoạch asset",
    href: `/admin/scenes/${place.scene.id}/assets`,
    priority: "high",
  });
}

function toPublishedItem(place: Place): AdminReviewQueueItem {
  return toPlaceItem(place, {
    id: `published:${place.slug}`,
    statusLine: `${publicationStatusLabels[place.publicationStatus]} · ${sceneStatusLabels[place.scene.status]}`,
    context: place.routeHint,
    nextAction: "Mở hồ sơ công khai để kiểm tra map, detail, viewer và microcopy.",
    actionLabel: "Xem hồ sơ",
    href: `/places/${place.slug}`,
    priority: "low",
  });
}

function toPlaceItem(
  place: Place,
  item: Pick<
    AdminReviewQueueItem,
    "id" | "statusLine" | "context" | "nextAction" | "actionLabel" | "href" | "priority"
  >,
): AdminReviewQueueItem {
  return {
    ...item,
    kind: "place",
    title: place.name,
    subtitle: `${categoryLabels[place.category]} · ${place.city}`,
    placeSlug: place.slug,
    sceneId: place.scene.id,
    category: place.category,
    publicationStatus: place.publicationStatus,
    sceneStatus: place.scene.status,
  };
}

function toProcessingJobItem(job: ProcessingJobItem): AdminReviewQueueItem {
  return {
    id: `job:${job.id}`,
    kind: "processingJob",
    title: job.sceneTitle,
    subtitle: job.placeName,
    statusLine: `${processingJobStatusLabels[job.status]} · ${job.provider}${job.gpuType ? ` · ${job.gpuType}` : ""}`,
    context: job.toolchain,
    nextAction: getProcessingNextAction(job),
    actionLabel: "Điều phối job",
    href: `/admin/processing/${job.id}`,
    priority: job.status === "failed" ? "high" : "normal",
    sceneId: job.sceneId,
    jobStatus: job.status,
  };
}

function toCaptureItem(item: CaptureWorkItem): AdminReviewQueueItem {
  return {
    id: `capture:${item.id}`,
    kind: "capture",
    title: item.sceneTitle,
    subtitle: item.placeName,
    statusLine: `${captureStatusLabels[item.status]} · ${item.device}`,
    context: item.rawAssetKey ?? item.notes,
    nextAction: getCaptureNextAction(item),
    actionLabel: "Tạo job GPU",
    href: `/admin/processing/new?capture=${encodeURIComponent(item.id)}`,
    priority: item.status === "uploaded" ? "high" : "normal",
    placeSlug: item.placeSlug,
    sceneId: item.sceneId,
    captureStatus: item.status,
  };
}

function sortQueueItems(items: AdminReviewQueueItem[]) {
  const rank: Record<AdminReviewQueueItem["priority"], number> = {
    high: 0,
    normal: 1,
    low: 2,
  };

  return [...items].sort((first, second) => {
    const priority = rank[first.priority] - rank[second.priority];
    return priority || first.title.localeCompare(second.title, "vi");
  });
}
