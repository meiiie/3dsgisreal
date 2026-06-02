import { NextResponse } from "next/server";

import { getAdminReviewQueues } from "@/features/admin/server/review-queues";
import { getPlaceRepositorySource } from "@/features/places/server/repository";

export async function GET() {
  const queues = await getAdminReviewQueues();

  return NextResponse.json({
    data: queues,
    meta: {
      source: getPlaceRepositorySource(),
    },
  });
}
