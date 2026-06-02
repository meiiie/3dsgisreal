import { NextResponse, type NextRequest } from "next/server";

import { canAccessAdmin } from "@/features/identity/domain";
import { verifyLocalSessionCookieEdge } from "@/features/identity/session-cookie-edge";
import { LOCAL_SESSION_COOKIE_NAME } from "@/features/identity/session-cookie";

export async function proxy(request: NextRequest) {
  const session = await verifyLocalSessionCookieEdge(request.cookies.get(LOCAL_SESSION_COOKIE_NAME)?.value);

  if (session && canAccessAdmin(session)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/admin")) {
    return NextResponse.json(
      {
        ok: false,
        error: "admin_session_required",
        message: "Can chon phien Admin local truoc khi goi API admin.",
        sessionHref: "/session?access=admin-required",
      },
      { status: 403 },
    );
  }

  const sessionUrl = new URL("/session", request.url);
  sessionUrl.searchParams.set("access", "admin-required");
  sessionUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(sessionUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
