"use client";

import Link from "next/link";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import { Box, LocateFixed, MapPin, RefreshCw, Route, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  categoryLabels,
  isSceneEnterable,
  publicationStatusLabels,
  sceneStatusLabels,
  type Place,
  type PlaceCategory,
  type PlaceListFilters,
  type PlacePublicationStatus,
} from "@/features/places/domain";

import {
  buildPlacesViewportUrl,
  formatViewportBounds,
  readMapViewportBounds,
  type PlacesViewportResponse,
} from "./viewport-place-loading";

type MapExperienceProps = {
  places: Place[];
  filters: PlaceListFilters;
  mapStyleUrl: string;
};

const categoryOptions = Object.entries(categoryLabels) as Array<[PlaceCategory, string]>;
const publicationStatusOptions = Object.entries(publicationStatusLabels) as Array<[PlacePublicationStatus, string]>;
const defaultMapCenter: Place["coordinates"] = [106.6881, 20.8449];
type ViewportLoadState = "idle" | "loading" | "ready" | "error";

export function MapExperience({ places: initialPlaces, filters, mapStyleUrl }: MapExperienceProps) {
  const [places, setPlaces] = useState(initialPlaces);
  const [selectedId, setSelectedId] = useState<string | undefined>(places[0]?.id);
  const [mapReady, setMapReady] = useState(false);
  const [viewportLoadState, setViewportLoadState] = useState<ViewportLoadState>("idle");
  const [viewportStatusText, setViewportStatusText] = useState("Du lieu ban dau");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const userMovedMapRef = useRef(false);
  const loadViewportRef = useRef<() => void>(() => undefined);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedId) ?? places[0],
    [places, selectedId],
  );

  const fallbackMarkers = useMemo(() => {
    if (!places.length) {
      return [];
    }

    const longitudes = places.map((place) => place.coordinates[0]);
    const latitudes = places.map((place) => place.coordinates[1]);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const lngSpan = Math.max(maxLng - minLng, 0.0001);
    const latSpan = Math.max(maxLat - minLat, 0.0001);

    return places.map((place) => ({
      place,
      left: 18 + ((place.coordinates[0] - minLng) / lngSpan) * 64,
      top: 18 + (1 - (place.coordinates[1] - minLat) / latSpan) * 64,
    }));
  }, [places]);

  const initialCenter = useMemo(() => initialPlaces[0]?.coordinates ?? defaultMapCenter, [initialPlaces]);

  const loadPlacesForViewport = useCallback(async () => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const bounds = readMapViewportBounds(map);
    const url = buildPlacesViewportUrl(filters, bounds);
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    setViewportLoadState("loading");
    setViewportStatusText(`Dang cap nhat ${formatViewportBounds(bounds)}`);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`places_viewport_${response.status}`);
      }

      const body = (await response.json()) as PlacesViewportResponse;
      setPlaces(body.data);
      setSelectedId((currentId) =>
        currentId && body.data.some((place) => place.id === currentId) ? currentId : body.data[0]?.id,
      );
      setViewportLoadState("ready");
      setViewportStatusText(`Khung hien tai co ${body.meta.count} dia diem`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setViewportLoadState("error");
      setViewportStatusText("Chua cap nhat duoc khung ban do");
    }
  }, [filters]);

  useEffect(() => {
    loadViewportRef.current = () => {
      void loadPlacesForViewport();
    };
  }, [loadPlacesForViewport]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const markUserMapMove = (event: { originalEvent?: unknown }) => {
      if (!event.originalEvent) {
        return;
      }

      userMovedMapRef.current = true;
    };

    const loadAfterUserMapMove = () => {
      if (!userMovedMapRef.current) {
        return;
      }

      userMovedMapRef.current = false;
      loadViewportRef.current();
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyleUrl,
      center: initialCenter,
      zoom: 14,
      pitch: 42,
      bearing: -16,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.once("load", () => setMapReady(true));
    map.on("dragstart", markUserMapMove);
    map.on("zoomstart", markUserMapMove);
    map.on("rotatestart", markUserMapMove);
    map.on("pitchstart", markUserMapMove);
    map.on("moveend", loadAfterUserMapMove);
    mapRef.current = map;

    return () => {
      abortRef.current?.abort();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.off("dragstart", markUserMapMove);
      map.off("zoomstart", markUserMapMove);
      map.off("rotatestart", markUserMapMove);
      map.off("pitchstart", markUserMapMove);
      map.off("moveend", loadAfterUserMapMove);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [initialCenter, mapStyleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = places.map((place) => {
      const el = document.createElement("button");
      el.className = "marker";
      el.type = "button";
      el.title = place.name;
      el.dataset.active = String(place.id === selectedPlace?.id);
      el.innerHTML =
        '<svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';
      el.addEventListener("click", () => setSelectedId(place.id));
      return new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(place.coordinates)
        .addTo(map);
    });
  }, [places, selectedPlace?.id]);

  useEffect(() => {
    if (!selectedPlace || !mapRef.current) {
      return;
    }

    mapRef.current.easeTo({
      center: selectedPlace.coordinates,
      zoom: 15.4,
      duration: 650,
    });
  }, [selectedPlace]);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Danh sách địa điểm">
        <header className="sidebar-header">
          <div className="brand-row">
            <h1 className="brand-title">Lối Vào</h1>
            <span className="status-pill">Local lab</span>
          </div>
          <p className="brand-copy">
            Bản đồ địa điểm độc lập. Mỗi marker mở một hồ sơ và một không gian 3D riêng khi
            asset SOG sẵn sàng.
          </p>
          <nav className="top-links" aria-label="Điều hướng nhanh">
            <Link href="/user">User</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/api/places">API</Link>
          </nav>
          <form className="place-filter-form" action="/" role="search">
            <label>
              <span>Tìm địa điểm</span>
              <input name="q" defaultValue={filters.search ?? ""} placeholder="Tên, địa chỉ, luồng vào" />
            </label>
            <label>
              <span>Loại</span>
              <select name="category" defaultValue={filters.category ?? ""}>
                <option value="">Tất cả</option>
                {categoryOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Trạng thái</span>
              <select name="status" defaultValue={filters.status ?? ""}>
                <option value="">Tất cả</option>
                {publicationStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-actions">
              <button className="action-button" type="submit">
                <Search size={17} aria-hidden="true" /> Tìm
              </button>
              <Link className="secondary-button" href="/">
                Xóa lọc
              </Link>
            </div>
          </form>
          <div className="viewport-sync-row">
            <button
              className="secondary-button viewport-sync-button"
              type="button"
              onClick={() => void loadPlacesForViewport()}
              disabled={viewportLoadState === "loading"}
            >
              <RefreshCw size={17} aria-hidden="true" />
              {viewportLoadState === "loading" ? "Dang cap nhat" : "Cap nhat khung"}
            </button>
            <p className="viewport-sync-status" data-state={viewportLoadState} aria-live="polite">
              {viewportStatusText}
            </p>
          </div>
          <p className="filter-summary" aria-live="polite">
            {places.length} địa điểm
            {filters.search ? ` · "${filters.search}"` : ""}
            {filters.category ? ` · ${categoryLabels[filters.category]}` : ""}
            {filters.status ? ` · ${publicationStatusLabels[filters.status]}` : ""}
            {filters.near ? ` · trong ${formatDistance(filters.near.radiusMeters)}` : ""}
          </p>
        </header>

        <section className="place-list">
          {places.length > 0 ? (
            places.map((place) => {
              const isActive = place.id === selectedPlace?.id;
              const canEnterScene = isSceneEnterable(place.scene);

              return (
                <article key={place.id} className="place-item" data-active={isActive}>
                  <div className="place-item-top">
                    <div>
                      <h2 className="place-name">{place.name}</h2>
                      <p className="place-meta">
                        {place.city} · {place.address}
                        {place.distanceMeters !== undefined ? ` · cách ${formatDistance(place.distanceMeters)}` : ""}
                      </p>
                    </div>
                    <span className="place-badge">{categoryLabels[place.category]}</span>
                  </div>
                  <p className="place-meta">{place.summary}</p>
                  <p className="place-route">
                    <Route size={14} /> {place.routeHint}
                  </p>
                  <div className="place-actions">
                    <button
                      className="icon-button"
                      type="button"
                      title="Đưa bản đồ tới địa điểm"
                      aria-label="Đưa bản đồ tới địa điểm"
                      onClick={() => setSelectedId(place.id)}
                    >
                      <LocateFixed size={17} />
                    </button>
                    <Link className="secondary-button" href={`/places/${place.slug}`}>
                      Hồ sơ
                    </Link>
                    {canEnterScene ? (
                      <Link className="action-button" href={`/viewer/${place.scene.id}`}>
                        <Box size={17} />
                        Mở 3D
                      </Link>
                    ) : (
                      <span className="action-button" aria-disabled="true">
                        <Box size={17} />
                        Chưa có 3D
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <article className="place-item empty-place-state">
              <h2 className="place-name">Không có địa điểm phù hợp</h2>
              <p className="place-meta">
                Thử xóa bớt từ khóa, đổi loại địa điểm, hoặc quay lại toàn bộ bản đồ.
              </p>
              <div className="place-actions">
                <Link className="secondary-button" href="/">
                  Xem tất cả
                </Link>
              </div>
            </article>
          )}
        </section>
      </aside>

      <section className="map-region" aria-label="Bản đồ địa điểm">
        <div ref={mapContainerRef} className="map-canvas" />
        <div className="map-fallback-markers" data-hidden={mapReady}>
          {fallbackMarkers.map(({ place, left, top }) => (
            <button
              key={place.id}
              className="fallback-marker"
              type="button"
              title={place.name}
              data-active={place.id === selectedPlace?.id}
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => setSelectedId(place.id)}
            >
              <MapPin size={17} />
            </button>
          ))}
        </div>
        {selectedPlace ? (
          <div className="map-overlay">
            <h2 className="overlay-title">{selectedPlace.name}</h2>
            <p className="overlay-copy">{selectedPlace.summary}</p>
            <div className="place-actions">
              <span className="place-badge">
                <MapPin size={13} /> {categoryLabels[selectedPlace.category]}
              </span>
              <span className="place-badge">{sceneStatusLabels[selectedPlace.scene.status]}</span>
              <span className="place-badge">{publicationStatusLabels[selectedPlace.publicationStatus]}</span>
            </div>
          </div>
        ) : (
          <div className="map-overlay">
            <h2 className="overlay-title">Chưa có kết quả</h2>
            <p className="overlay-copy">Bản đồ sẽ hiển thị lại khi bộ lọc tìm thấy địa điểm phù hợp.</p>
            <div className="place-actions">
              <Link className="secondary-button" href="/">
                Xem tất cả
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function formatDistance(distanceMeters: number) {
  return distanceMeters >= 1_000 ? `${(distanceMeters / 1_000).toFixed(1)} km` : `${Math.round(distanceMeters)} m`;
}
