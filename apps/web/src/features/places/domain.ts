import {
  getSceneRuntimeReadiness,
  type SceneRuntimeReadiness,
} from "@loi-vao/assets";

export type PlaceCategory = "rental" | "cafe" | "heritage" | "craft" | "campus" | "food" | "other";
export type PlacePublicationStatus = "draft" | "review" | "published";

export type PlaceListFilters = {
  search?: string;
  category?: PlaceCategory;
  status?: PlacePublicationStatus;
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

export type SceneStatus = "pending_capture" | "processing" | "ready" | "failed";
export type SceneHotspotKind = "info" | "audio" | "quiz" | "checkin" | "link";

export type SceneHotspot = {
  id: string;
  kind: SceneHotspotKind;
  title: string;
  body: string;
  sortOrder?: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: Record<string, unknown>;
  payload: Record<string, unknown>;
};

export type SceneManifest = {
  id: string;
  title: string;
  status: SceneStatus;
  format: "sog";
  contentUrl?: string;
  settingsUrl?: string;
  collisionUrl?: string;
  posterUrl?: string;
  readiness?: SceneRuntimeReadiness;
  hotspots?: SceneHotspot[];
};

export type Place = {
  id: string;
  slug: string;
  name: string;
  category: PlaceCategory;
  publicationStatus: PlacePublicationStatus;
  city: string;
  address: string;
  summary: string;
  routeHint: string;
  privacyStatus: "private_draft" | "permission_needed" | "publishable";
  coordinates: [number, number];
  distanceMeters?: number;
  scene: SceneManifest;
};

export const categoryLabels: Record<PlaceCategory, string> = {
  rental: "Phòng trọ",
  cafe: "Cafe",
  heritage: "Di tích",
  craft: "Làng nghề",
  campus: "Campus",
  food: "Ăn uống",
  other: "Khác",
};

export const sceneStatusLabels: Record<SceneStatus, string> = {
  pending_capture: "Chờ scan",
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  failed: "Cần kiểm tra",
};

export const publicationStatusLabels: Record<PlacePublicationStatus, string> = {
  draft: "Bản nháp",
  review: "Đang rà soát",
  published: "Công khai",
};

export const privacyStatusLabels: Record<Place["privacyStatus"], string> = {
  private_draft: "Bản nháp riêng tư",
  permission_needed: "Cần xác nhận quyền quay",
  publishable: "Có thể công khai",
};

export const sceneHotspotKindLabels: Record<SceneHotspotKind, string> = {
  info: "Thông tin",
  audio: "Audio guide",
  quiz: "Quiz",
  checkin: "Check-in",
  link: "Liên kết",
};

export function isSceneEnterable(scene: SceneManifest) {
  return getSceneReadiness(scene).canOpenViewer;
}

export function getSceneReadiness(scene: SceneManifest) {
  return scene.readiness ?? getSceneRuntimeReadiness(scene);
}

export function getPlaceCoordinateLabel(place: Place) {
  const [lng, lat] = place.coordinates;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
