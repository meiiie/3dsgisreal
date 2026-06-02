import { NextResponse } from "next/server";

import { getPipelineOverview } from "@/features/pipeline/server/repository";

export async function GET() {
  const overview = await getPipelineOverview();
  return NextResponse.json(overview);
}
