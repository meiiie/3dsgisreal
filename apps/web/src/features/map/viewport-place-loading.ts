import type { Map as MapLibreMap } from "maplibre-gl";

import type { Place, PlaceBoundsFilter, PlaceListFilters } from "@/features/places/domain";

export type PlacesViewportResponse = {
  data: Place[];
  meta: {
    count: number;
    filters: PlaceListFilters;
    source: "postgis" | "sample-repository";
  };
};

export function readMapViewportBounds(map: MapLibreMap): PlaceBoundsFilter {
  const bounds = map.getBounds();

  return {
    west: roundCoordinate(bounds.getWest()),
    south: roundCoordinate(bounds.getSouth()),
    east: roundCoordinate(bounds.getEast()),
    north: roundCoordinate(bounds.getNorth()),
  };
}

export function buildPlacesViewportUrl(filters: PlaceListFilters, bounds: PlaceBoundsFilter) {
  const params = new URLSearchParams({
    bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
  });

  if (filters.search) {
    params.set("q", filters.search);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.near) {
    params.set("near", `${filters.near.lng},${filters.near.lat}`);
    params.set("radiusMeters", String(filters.near.radiusMeters));
  }

  return `/api/places?${params.toString()}`;
}

export function formatViewportBounds(bounds: PlaceBoundsFilter) {
  return `${bounds.south.toFixed(4)}, ${bounds.west.toFixed(4)} -> ${bounds.north.toFixed(4)}, ${bounds.east.toFixed(4)}`;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}
