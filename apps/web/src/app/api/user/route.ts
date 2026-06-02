import { NextResponse } from "next/server";

import { getCurrentSession } from "@/features/identity/server/session";
import { getUserDashboard } from "@/features/user/server/repository";

export async function GET() {
  const session = await getCurrentSession();
  const dashboard = await getUserDashboard(session.profileId);

  return NextResponse.json({
    data: dashboard,
    meta: {
      session,
      source: process.env.DATABASE_URL ? "postgis" : "sample-repository",
    },
  });
}
