import { NextResponse } from "next/server";

import { getCurrentSession } from "@/features/identity/server/session";
import { answerQuizFromViewer } from "@/features/user/server/quiz-attempt";

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

  const session = await getCurrentSession();
  const result = await answerQuizFromViewer(body, session.profileId);

  return NextResponse.json(result, {
    status: result.ok ? (result.persisted ? 201 : 200) : 400,
  });
}
