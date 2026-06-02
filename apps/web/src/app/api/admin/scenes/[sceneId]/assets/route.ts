import { NextResponse } from "next/server";

import { getSceneAssetPlan, publishSceneAssets } from "@/features/scenes/server/asset-publishing";

type SceneAssetsRouteProps = {
  params: Promise<unknown>;
};

export async function GET(_request: Request, { params }: SceneAssetsRouteProps) {
  const sceneId = await getSceneId(params);
  const plan = await getSceneAssetPlan(sceneId);

  if (!plan) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PUT(request: Request, { params }: SceneAssetsRouteProps) {
  const sceneId = await getSceneId(params);
  const body = await request.json().catch(() => ({}));
  const result = await publishSceneAssets(sceneId, body);

  if (!result) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}

async function getSceneId(params: Promise<unknown>) {
  const value = await params;

  if (typeof value === "object" && value !== null && "sceneId" in value) {
    const sceneId = (value as { sceneId?: unknown }).sceneId;
    return typeof sceneId === "string" ? sceneId : "";
  }

  return "";
}
