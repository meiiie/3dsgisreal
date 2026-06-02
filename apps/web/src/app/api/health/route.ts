import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "loi-vao-web",
    mode: "local-lab",
  });
}
