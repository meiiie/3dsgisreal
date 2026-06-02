import { NextResponse } from "next/server";

import { getCurrentSession } from "@/features/identity/server/session";
import { updateUserPlaceLibraryFromPlace } from "@/features/user/server/place-library-action";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        persisted: false,
        errors: ["Body JSON khong hop le."],
      },
      { status: 400 },
    );
  }

  const session = await getCurrentSession();
  const result = await updateUserPlaceLibraryFromPlace(body, session.profileId);

  return NextResponse.json(result, {
    status: result.ok ? (result.persisted ? 201 : 200) : 400,
  });
}
