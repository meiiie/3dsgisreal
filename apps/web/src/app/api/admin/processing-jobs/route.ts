import { NextResponse } from "next/server";

import { createProcessingJobFromIntake } from "@/features/pipeline/server/processing-job-intake";

export async function POST(request: Request) {
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

  const result = await createProcessingJobFromIntake(body);

  return NextResponse.json(result, {
    status: result.ok ? (result.persisted ? 201 : 200) : 400,
  });
}
