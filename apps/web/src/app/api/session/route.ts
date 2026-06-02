import { NextResponse } from "next/server";

import { canAccessAdmin, type LocalSessionRole } from "@/features/identity/domain";
import {
  clearCurrentSession,
  getCurrentSession,
  setCurrentSession,
} from "@/features/identity/server/session";

export async function GET() {
  return sessionResponse();
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        errors: ["Body JSON khong hop le."],
      },
      { status: 400 },
    );
  }

  const role = readRole(body);

  if (!role) {
    return NextResponse.json(
      {
        ok: false,
        errors: ["Role session khong hop le."],
      },
      { status: 400 },
    );
  }

  await setCurrentSession(role);
  return sessionResponse(201);
}

export async function DELETE() {
  await clearCurrentSession();
  return sessionResponse();
}

async function sessionResponse(status = 200) {
  const session = await getCurrentSession();

  return NextResponse.json(
    {
      ok: true,
      data: session,
      meta: {
        admin: canAccessAdmin(session),
        source: session.isDefault ? "local-default" : "local-signed-cookie",
      },
    },
    { status },
  );
}

function readRole(raw: unknown): LocalSessionRole | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  const value = (raw as Record<string, unknown>).role;
  return value === "student" || value === "admin" ? value : undefined;
}
