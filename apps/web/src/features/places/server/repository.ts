import { buildStorageAssetUrl, getSceneRuntimeReadiness } from "@loi-vao/assets";
import {
  getDatabase,
  listPlaceSceneRows,
  listSceneHotspotRows,
  type PlaceSceneRow,
  type SceneHotspotRow,
} from "@loi-vao/db";

import { samplePlaces } from "../sample-data";
import {
  categoryLabels,
  type Place,
  type PlaceBoundsFilter,
  type PlaceCategory,
  type PlaceListFilters,
  type PlaceNearFilter,
  type PlacePublicationStatus,
  type SceneHotspot,
  type SceneManifest,
  type SceneStatus,
} from "../domain";

const placeCategories = Object.keys(categoryLabels) as PlaceCategory[];
const placePublicationStatuses: PlacePublicationStatus[] = ["draft", "review", "published"];
const defaultNearRadiusMeters = 1_500;
const maxNearRadiusMeters = 50_000;

export async function listPlaces(filters: PlaceListFilters = {}): Promise<Place[]> {
  const normalizedFilters = normalizePlaceListFilters(filters);
  const database = getDatabase();

  if (!database) {
    return filterPlaces(samplePlaces, normalizedFilters);
  }

  const rows = await listPlaceSceneRows(database, normalizedFilters);
  return rows.map(mapRowToPlace);
}

export function getPlaceRepositorySource() {
  return process.env.DATABASE_URL ? "postgis" : "sample-repository";
}

export function readPlaceListFilters(source: URLSearchParams | Record<string, unknown>): PlaceListFilters {
  return normalizePlaceListFilters({
    search: readSourceString(source, "q") || readSourceString(source, "search"),
    category: readCategory(source, "category"),
    status: readPublicationStatus(source),
    bounds: readBounds(source),
    near: readNear(source),
  });
}

export async function getPlaceBySlug(slug: string): Promise<Place | undefined> {
  const places = await listPlaces();
  return places.find((place) => place.slug === slug);
}

export async function getPlaceBySceneId(sceneId: string): Promise<Place | undefined> {
  const places = await listPlaces();
  return places.find((place) => place.scene.id === sceneId);
}

export async function getSceneManifest(sceneId: string) {
  const place = await getPlaceBySceneId(sceneId);

  if (!place) {
    return undefined;
  }

  const hotspots = await listSceneHotspots(sceneId);
  const scene = withSceneReadiness({
    ...place.scene,
    hotspots,
  });

  return {
    ...scene,
    place: {
      id: place.id,
      slug: place.slug,
      name: place.name,
      address: place.address,
      city: place.city,
      coordinates: place.coordinates,
      routeHint: place.routeHint,
    },
  };
}

export async function listSceneHotspots(sceneId: string): Promise<SceneHotspot[]> {
  const database = getDatabase();

  if (!database) {
    return samplePlaces.find((place) => place.scene.id === sceneId)?.scene.hotspots ?? [];
  }

  const rows = await listSceneHotspotRows(database, sceneId);
  return rows.map(mapHotspotRow);
}

export async function getAdminOverview() {
  const places = await listPlaces();
  const statusCounts = places.reduce<Record<SceneStatus, number>>(
    (counts, place) => ({
      ...counts,
      [place.scene.status]: counts[place.scene.status] + 1,
    }),
    { pending_capture: 0, processing: 0, ready: 0, failed: 0 },
  );

  return {
    places,
    statusCounts,
    needsCapture: places.filter((place) => place.scene.status === "pending_capture"),
    processing: places.filter((place) => place.scene.status === "processing"),
    publishable: places.filter((place) => place.privacyStatus === "publishable"),
  };
}

function normalizePlaceListFilters(filters: PlaceListFilters): PlaceListFilters {
  const search = filters.search?.trim().slice(0, 80);
  const bounds = normalizeBounds(filters.bounds);
  const near = normalizeNear(filters.near);

  return {
    ...(search ? { search } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(bounds ? { bounds } : {}),
    ...(near ? { near } : {}),
  };
}

function filterPlaces(places: Place[], filters: PlaceListFilters) {
  const searchNeedle = normalizeSearchText(filters.search ?? "");
  const matchingPlaces = places.flatMap((place) => {
    const distanceMeters = filters.near ? getDistanceMeters(place.coordinates, filters.near) : undefined;

    const matchesCategory = !filters.category || place.category === filters.category;
    const matchesStatus = !filters.status || place.publicationStatus === filters.status;
    const haystack = normalizeSearchText(
      `${place.name} ${place.summary} ${place.address} ${place.city} ${place.routeHint}`,
    );
    const matchesSearch = !searchNeedle || haystack.includes(searchNeedle);
    const matchesBounds = !filters.bounds || isInsideBounds(place.coordinates, filters.bounds);
    const matchesNear = !filters.near || (distanceMeters !== undefined && distanceMeters <= filters.near.radiusMeters);

    if (!matchesCategory || !matchesStatus || !matchesSearch || !matchesBounds || !matchesNear) {
      return [];
    }

    return [{ ...place, ...(distanceMeters !== undefined ? { distanceMeters } : {}) }];
  });

  return filters.near
    ? [...matchingPlaces].sort((first, second) => (first.distanceMeters ?? Infinity) - (second.distanceMeters ?? Infinity))
    : matchingPlaces;
}

function readBounds(source: URLSearchParams | Record<string, unknown>): PlaceBoundsFilter | undefined {
  const bbox = readSourceString(source, "bbox");

  if (bbox) {
    const [west, south, east, north] = bbox.split(",").map((part) => Number(part.trim()));
    return normalizeBounds({ west, south, east, north });
  }

  const west = readSourceNumber(source, "west");
  const south = readSourceNumber(source, "south");
  const east = readSourceNumber(source, "east");
  const north = readSourceNumber(source, "north");

  return normalizeBounds({ west, south, east, north });
}

function readNear(source: URLSearchParams | Record<string, unknown>): PlaceNearFilter | undefined {
  const near = readSourceString(source, "near");

  if (near) {
    const [lng, lat] = near.split(",").map((part) => Number(part.trim()));
    return normalizeNear({ lng, lat, radiusMeters: readRadiusMeters(source) ?? defaultNearRadiusMeters });
  }

  const lng = readSourceNumber(source, "lng") ?? readSourceNumber(source, "longitude");
  const lat = readSourceNumber(source, "lat") ?? readSourceNumber(source, "latitude");

  return normalizeNear({ lng, lat, radiusMeters: readRadiusMeters(source) ?? defaultNearRadiusMeters });
}

function readRadiusMeters(source: URLSearchParams | Record<string, unknown>) {
  return readSourceNumber(source, "radiusMeters") ?? readSourceNumber(source, "radius");
}

function normalizeBounds(bounds: Partial<PlaceBoundsFilter> | undefined): PlaceBoundsFilter | undefined {
  if (!bounds) {
    return undefined;
  }

  const west = readFiniteNumber(bounds.west);
  const south = readFiniteNumber(bounds.south);
  const east = readFiniteNumber(bounds.east);
  const north = readFiniteNumber(bounds.north);

  if (west === undefined || south === undefined || east === undefined || north === undefined) {
    return undefined;
  }

  if (west < -180 || east > 180 || south < -90 || north > 90) {
    return undefined;
  }

  if (west >= east || south >= north) {
    return undefined;
  }

  return { west, south, east, north };
}

function normalizeNear(near: Partial<PlaceNearFilter> | undefined): PlaceNearFilter | undefined {
  if (!near) {
    return undefined;
  }

  const lng = readFiniteNumber(near.lng);
  const lat = readFiniteNumber(near.lat);
  const radiusMeters = readFiniteNumber(near.radiusMeters);

  if (lng === undefined || lat === undefined || radiusMeters === undefined) {
    return undefined;
  }

  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return undefined;
  }

  if (radiusMeters <= 0 || radiusMeters > maxNearRadiusMeters) {
    return undefined;
  }

  return {
    lng: roundCoordinate(lng),
    lat: roundCoordinate(lat),
    radiusMeters: Math.round(radiusMeters),
  };
}

function isInsideBounds([lng, lat]: Place["coordinates"], bounds: PlaceBoundsFilter) {
  return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;
}

function getDistanceMeters([lng, lat]: Place["coordinates"], near: PlaceNearFilter) {
  const earthRadiusMeters = 6_371_000;
  const fromLat = toRadians(lat);
  const toLat = toRadians(near.lat);
  const deltaLat = toRadians(near.lat - lat);
  const deltaLng = toRadians(near.lng - lng);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function readCategory(source: URLSearchParams | Record<string, unknown>, key: string) {
  const value = readSourceString(source, key);
  return placeCategories.includes(value as PlaceCategory) ? (value as PlaceCategory) : undefined;
}

function readPublicationStatus(source: URLSearchParams | Record<string, unknown>) {
  const value = readSourceString(source, "status") || readSourceString(source, "publicationStatus");
  return placePublicationStatuses.includes(value as PlacePublicationStatus) ? (value as PlacePublicationStatus) : undefined;
}

function readSourceString(source: URLSearchParams | Record<string, unknown>, key: string) {
  if (source instanceof URLSearchParams) {
    return source.get(key)?.trim() ?? "";
  }

  const value = source[key];

  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }

  return typeof value === "string" ? value.trim() : "";
}

function readSourceNumber(source: URLSearchParams | Record<string, unknown>, key: string) {
  const value = readSourceString(source, key);
  return value ? Number(value) : undefined;
}

function readFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function mapRowToPlace(row: PlaceSceneRow): Place {
  const sceneId = row.sceneSlug ?? `${row.placeSlug}-pending`;
  const scene = withSceneReadiness({
    id: sceneId,
    title: row.sceneTitle ?? "Chưa có scene",
    status: mapSceneStatus(row),
    format: "sog",
    contentUrl: resolvePublicAssetUrl(row.contentKey),
    settingsUrl: resolvePublicAssetUrl(row.settingsKey),
    collisionUrl: resolvePublicAssetUrl(row.collisionKey),
    posterUrl: resolvePublicAssetUrl(row.posterKey),
  });

  return {
    id: row.placeId,
    slug: row.placeSlug,
    name: row.placeName,
    category: row.placeCategory as PlaceCategory,
    publicationStatus: mapPublicationStatus(row.placeStatus),
    city: row.placeCity,
    address: row.placeAddress,
    summary: row.placeSummary,
    routeHint: row.sceneEntryLabel || "Cần bổ sung luồng vào",
    privacyStatus: mapPrivacyStatus(row.placeStatus),
    coordinates: [row.lng, row.lat],
    ...(typeof row.distanceMeters === "number" ? { distanceMeters: Math.round(row.distanceMeters) } : {}),
    scene,
  };
}

function mapPrivacyStatus(status: PlaceSceneRow["placeStatus"]): Place["privacyStatus"] {
  if (status === "published") {
    return "publishable";
  }

  if (status === "review") {
    return "permission_needed";
  }

  return "private_draft";
}

function mapPublicationStatus(status: PlaceSceneRow["placeStatus"]): PlacePublicationStatus {
  return status === "review" || status === "published" ? status : "draft";
}

function mapSceneStatus(row: PlaceSceneRow): SceneStatus {
  if (row.versionStatus === "failed") {
    return "failed";
  }

  if (
    (row.versionStatus === "published" || row.versionStatus === "ready" || row.sceneStatus === "published" || row.sceneStatus === "ready") &&
    row.contentKey
  ) {
    return "ready";
  }

  if (row.sceneStatus === "processing" || row.versionStatus === "processing") {
    return "processing";
  }

  return "pending_capture";
}

function resolvePublicAssetUrl(storageKey: string | null): string | undefined {
  if (!storageKey) {
    return undefined;
  }

  const baseUrl = readSceneAssetsPublicBaseUrl();
  return buildStorageAssetUrl(storageKey, baseUrl);
}

function readSceneAssetsPublicBaseUrl() {
  const configured =
    process.env.SCENE_ASSETS_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SCENE_ASSET_BASE_URL;

  return configured?.trim() || undefined;
}

function withSceneReadiness(scene: SceneManifest): SceneManifest {
  return {
    ...scene,
    readiness: getSceneRuntimeReadiness(scene),
  };
}

function mapHotspotRow(row: SceneHotspotRow): SceneHotspot {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    sortOrder: row.sortOrder,
    position: readPosition(row.position),
    rotation: row.rotation,
    payload: row.payload,
  };
}

function readPosition(value: Record<string, unknown>): SceneHotspot["position"] {
  return {
    x: readNumber(value.x),
    y: readNumber(value.y),
    z: readNumber(value.z),
  };
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
