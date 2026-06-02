import { NextResponse } from "next/server";

import {
  getPlaceRepositorySource,
  listPlaces,
  readPlaceListFilters,
} from "@/features/places/server/repository";

export async function GET(request: Request) {
  const filters = readPlaceListFilters(new URL(request.url).searchParams);
  const places = await listPlaces(filters);

  return NextResponse.json({
    data: places,
    meta: {
      count: places.length,
      filters,
      source: getPlaceRepositorySource(),
    },
  });
}
