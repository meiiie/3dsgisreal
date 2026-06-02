import { MapExperience } from "@/features/map/MapExperience";
import { listPlaces, readPlaceListFilters } from "@/features/places/server/repository";

export const dynamic = "force-dynamic";

const defaultMapStyleUrl = "/map-styles/local-lab.json";

type HomePageProps = {
  searchParams: Promise<{
    bbox?: string;
    q?: string;
    search?: string;
    category?: string;
    status?: string;
    west?: string;
    south?: string;
    east?: string;
    north?: string;
    near?: string;
    lng?: string;
    lat?: string;
    longitude?: string;
    latitude?: string;
    radius?: string;
    radiusMeters?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const filters = readPlaceListFilters(await searchParams);
  const places = await listPlaces(filters);

  return (
    <MapExperience
      key={buildMapExperienceKey(filters, places)}
      places={places}
      filters={filters}
      mapStyleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? defaultMapStyleUrl}
    />
  );
}

function buildMapExperienceKey(filters: ReturnType<typeof readPlaceListFilters>, places: Awaited<ReturnType<typeof listPlaces>>) {
  return JSON.stringify({
    category: filters.category ?? "",
    search: filters.search ?? "",
    status: filters.status ?? "",
    bounds: filters.bounds ?? null,
    near: filters.near ?? null,
    places: places.map((place) => place.id),
  });
}
