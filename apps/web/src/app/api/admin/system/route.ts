import { NextResponse } from "next/server";

import { getSystemVerdict } from "@/features/system/domain";
import { getSystemRuntimeStatus } from "@/features/system/server/repository";

export async function GET() {
  const status = await getSystemRuntimeStatus();

  return NextResponse.json({
    data: status,
    meta: {
      verdict: getSystemVerdict(status),
    },
  });
}
