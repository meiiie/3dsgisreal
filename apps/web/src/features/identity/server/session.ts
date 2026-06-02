import { cookies } from "next/headers";

import { getDatabase, getProfileAccessRow } from "@loi-vao/db";

import {
  canAccessAdmin,
  createLocalSession,
  getDefaultLocalSession,
  type LocalSession,
  type LocalSessionRole,
} from "../domain";
import {
  LOCAL_SESSION_COOKIE_NAME,
  LOCAL_SESSION_MAX_AGE_SECONDS,
} from "../session-cookie";
import {
  signLocalSessionCookie,
  verifyLocalSessionCookie,
} from "./session-cookie-node";

export async function getCurrentSession(): Promise<LocalSession> {
  const cookieStore = await cookies();
  const fromCookie = verifyLocalSessionCookie(cookieStore.get(LOCAL_SESSION_COOKIE_NAME)?.value);

  if (!fromCookie) {
    return getDefaultLocalSession();
  }

  return hydrateSessionFromDatabase(fromCookie);
}

export async function setCurrentSession(role: LocalSessionRole) {
  const cookieStore = await cookies();
  cookieStore.set(LOCAL_SESSION_COOKIE_NAME, signLocalSessionCookie(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCAL_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_SESSION_COOKIE_NAME);
}

export async function getCurrentAdminSession() {
  const session = await getCurrentSession();
  return canAccessAdmin(session) ? session : undefined;
}

async function hydrateSessionFromDatabase(session: LocalSession): Promise<LocalSession> {
  const database = getDatabase();

  if (!database) {
    return session;
  }

  try {
    const row = await getProfileAccessRow(database, session.profileId);

    if (!row) {
      return session;
    }

    return {
      ...createLocalSession(session.role, session.issuedAt),
      displayName: row.displayName || session.displayName,
      projectRoles: row.projectRoles,
    };
  } catch {
    return session;
  }
}
