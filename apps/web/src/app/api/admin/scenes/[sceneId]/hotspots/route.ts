import { NextResponse } from "next/server";

import { getPlaceBySceneId, listSceneHotspots } from "@/features/places/server/repository";
import {
  createHotspotFromIntake,
  deleteHotspotFromIntake,
  updateHotspotFromIntake,
} from "@/features/scenes/server/hotspot-intake";

type SceneHotspotsRouteProps = {
  params: Promise<{
    sceneId: string;
  }>;
};

export async function GET(_request: Request, { params }: SceneHotspotsRouteProps) {
  const { sceneId } = await params;
  const place = await getPlaceBySceneId(sceneId);

  if (!place) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  const hotspots = await listSceneHotspots(sceneId);

  return NextResponse.json({
    sceneId,
    place: {
      slug: place.slug,
      name: place.name,
    },
    hotspots,
  });
}

export async function POST(request: Request, { params }: SceneHotspotsRouteProps) {
  const { sceneId } = await params;
  let body: unknown;

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

  const result = await createHotspotFromIntake({
    ...(body && typeof body === "object" && !Array.isArray(body) ? body : {}),
    sceneSlug: sceneId,
  });

  return NextResponse.json(result, {
    status: result.ok ? (result.persisted ? 201 : 200) : 400,
  });
}

export async function PATCH(request: Request, { params }: SceneHotspotsRouteProps) {
  const { sceneId } = await params;
  let body: unknown;

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

  const result = await updateHotspotFromIntake({
    ...(body && typeof body === "object" && !Array.isArray(body) ? body : {}),
    sceneSlug: sceneId,
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}

export async function DELETE(request: Request, { params }: SceneHotspotsRouteProps) {
  const { sceneId } = await params;
  let body: unknown;

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

  const result = await deleteHotspotFromIntake({
    ...(body && typeof body === "object" && !Array.isArray(body) ? body : {}),
    sceneSlug: sceneId,
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
