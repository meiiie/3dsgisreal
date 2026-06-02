import type { ColumnType, Generated } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type JsonValue = Record<string, unknown>;

export type PlaceCategory =
  | "rental"
  | "cafe"
  | "heritage"
  | "craft"
  | "campus"
  | "food"
  | "other";

export type PlaceStatus = "draft" | "review" | "published" | "archived";
export type SceneStatus = "draft" | "processing" | "ready" | "published" | "archived";
export type SceneVersionStatus = "processing" | "ready" | "published" | "failed" | "archived";
export type CaptureSessionStatus =
  | "draft"
  | "uploaded"
  | "processing"
  | "accepted"
  | "rejected"
  | "archived";
export type ProcessingJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type UserPlaceLibraryStatus = "saved" | "visited" | "checked_in";
export type SceneHotspotKind = "info" | "audio" | "quiz" | "checkin" | "link";
export type ProjectMemberRole = "owner" | "admin" | "editor" | "reviewer";
export type PlacePrivacyReviewDecision = "blocked" | "needs_changes" | "approved";

export type ProfilesTable = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type ProjectMembersTable = {
  id: Generated<string>;
  user_id: string;
  role: ProjectMemberRole;
  created_at: Timestamp;
};

export type PlacesTable = {
  id: Generated<string>;
  slug: string;
  name: string;
  category: PlaceCategory;
  status: PlaceStatus;
  summary: string;
  description: string;
  address: string;
  ward: string | null;
  district: string | null;
  city: string;
  country_code: string;
  geom: unknown;
  created_by: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type PlacePrivacyReviewsTable = {
  id: Generated<string>;
  place_id: string;
  reviewer_id: string | null;
  decision: PlacePrivacyReviewDecision;
  consent_confirmed: boolean;
  address_public_safe: boolean;
  faces_or_people_removed: boolean;
  private_objects_removed: boolean;
  audio_private_safe: boolean;
  raw_capture_private: boolean;
  notes: string;
  created_at: Timestamp;
};

export type ScenesTable = {
  id: Generated<string>;
  place_id: string;
  slug: string;
  title: string;
  entry_label: string;
  status: SceneStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type SceneVersionsTable = {
  id: Generated<string>;
  scene_id: string;
  version: number;
  status: SceneVersionStatus;
  renderer: string;
  source_format: string;
  runtime_format: string;
  asset_base_key: string | null;
  content_key: string | null;
  settings_key: string | null;
  collision_key: string | null;
  poster_key: string | null;
  entry_pose: JsonValue;
  quality_profile: JsonValue;
  training_metadata: JsonValue;
  splat_count: number | null;
  content_size_bytes: number | null;
  checksum_sha256: string | null;
  created_at: Timestamp;
  published_at: Timestamp | null;
};

export type CaptureSessionsTable = {
  id: Generated<string>;
  place_id: string | null;
  scene_id: string | null;
  captured_by: string | null;
  device: string;
  capture_mode: string;
  captured_at: Timestamp | null;
  notes: string;
  raw_asset_key: string | null;
  status: CaptureSessionStatus;
  created_at: Timestamp;
};

export type ProcessingJobsTable = {
  id: Generated<string>;
  capture_session_id: string | null;
  scene_version_id: string | null;
  provider: string;
  gpu_type: string | null;
  toolchain: string;
  status: ProcessingJobStatus;
  config: JsonValue;
  log_key: string | null;
  started_at: Timestamp | null;
  finished_at: Timestamp | null;
  created_at: Timestamp;
};

export type SceneHotspotsTable = {
  id: Generated<string>;
  scene_version_id: string;
  kind: SceneHotspotKind;
  title: string;
  body: string;
  position: JsonValue;
  rotation: JsonValue;
  payload: JsonValue;
  sort_order: number;
  created_at: Timestamp;
};

export type UserPlaceLibraryTable = {
  profile_id: string;
  place_id: string;
  status: UserPlaceLibraryStatus;
  note: string;
  saved_at: Timestamp;
  last_viewed_at: Timestamp | null;
};

export type UserQuizAttemptsTable = {
  id: Generated<string>;
  profile_id: string;
  scene_hotspot_id: string;
  scene_id: string | null;
  selected_index: number;
  correct: boolean;
  reward: string;
  payload: JsonValue;
  answered_at: Timestamp;
};

export type Database = {
  profiles: ProfilesTable;
  project_members: ProjectMembersTable;
  places: PlacesTable;
  place_privacy_reviews: PlacePrivacyReviewsTable;
  scenes: ScenesTable;
  scene_versions: SceneVersionsTable;
  scene_hotspots: SceneHotspotsTable;
  capture_sessions: CaptureSessionsTable;
  processing_jobs: ProcessingJobsTable;
  user_place_library: UserPlaceLibraryTable;
  user_quiz_attempts: UserQuizAttemptsTable;
};
