import { NextResponse } from "next/server";

import { updateProcessingJobFromStatusInput } from "@/features/pipeline/server/processing-job-status";

type ProcessingJobStatusRouteProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function PATCH(request: Request, { params }: ProcessingJobStatusRouteProps) {
  const { jobId } = await params;
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

  const result = await updateProcessingJobFromStatusInput({
    ...body,
    processingJobId: jobId,
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
