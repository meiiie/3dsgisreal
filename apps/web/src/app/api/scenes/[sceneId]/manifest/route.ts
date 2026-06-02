import { NextResponse } from "next/server";

import {
  getPlaceRepositorySource,
  getSceneManifest,
} from "@/features/places/server/repository";

type SceneManifestRouteProps = {
  params: Promise<{
    sceneId: string;
  }>;
};

export async function GET(_request: Request, { params }: SceneManifestRouteProps) {
  const { sceneId } = await params;
  const manifest = await getSceneManifest(sceneId);

  if (!manifest) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: manifest,
    meta: {
      source: getPlaceRepositorySource(),
    },
  });
}
