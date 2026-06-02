import { NextResponse } from "next/server";

import { updatePlaceFromStatusInput } from "@/features/places/server/place-status-review";

type PlaceStatusRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function PATCH(request: Request, { params }: PlaceStatusRouteProps) {
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

  const result = await updatePlaceFromStatusInput({
    ...body,
    placeSlug: slug,
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
