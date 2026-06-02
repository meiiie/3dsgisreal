import { NextResponse } from "next/server";

import {
  getAdminPlacePrivacyReview,
  savePlacePrivacyReviewFromInput,
} from "@/features/places/server/place-privacy-review";

type PlacePrivacyRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: PlacePrivacyRouteProps) {
  const { slug } = await params;
  const review = await getAdminPlacePrivacyReview(slug);

  if (!review) {
    return NextResponse.json({ error: "place_not_found" }, { status: 404 });
  }

  return NextResponse.json({ data: review });
}

export async function POST(request: Request, { params }: PlacePrivacyRouteProps) {
  const { slug } = await params;
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        persisted: false,
        errors: ["Body JSON không hợp lệ."],
      },
      { status: 400 },
    );
  }

  const result = await savePlacePrivacyReviewFromInput({
    ...body,
    placeSlug: slug,
  });

  return NextResponse.json(result, {
    status: result.ok ? (result.persisted ? 201 : 200) : 400,
  });
}
