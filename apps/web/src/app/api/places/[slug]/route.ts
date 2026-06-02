import { NextResponse } from "next/server";

import {
  getPlaceBySlug,
  getPlaceRepositorySource,
} from "@/features/places/server/repository";

type PlaceDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: PlaceDetailRouteProps) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);

  if (!place) {
    return NextResponse.json(
      {
        error: "place_not_found",
        message: "Place not found.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: place,
    meta: {
      source: getPlaceRepositorySource(),
      sceneManifestHref: `/api/scenes/${encodeURIComponent(place.scene.id)}/manifest`,
      placeHref: `/places/${encodeURIComponent(place.slug)}`,
    },
  });
}
