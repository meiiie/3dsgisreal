import {
  createLocalSession,
  resolveLocalSessionChoice,
  type LocalSession,
  type LocalSessionRole,
} from "./domain";

export const LOCAL_SESSION_COOKIE_NAME = "loi_vao_session";
export const LOCAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type LocalSessionCookiePayload = {
  profileId: string;
  role: LocalSessionRole;
  issuedAt: number;
};

export type ParsedSessionCookie = {
  payloadSegment: string;
  signatureSegment: string;
};

export function buildLocalSessionPayload(role: LocalSessionRole, issuedAt = Date.now()) {
  const choice = resolveLocalSessionChoice(role);

  if (!choice) {
    throw new Error("Unknown local session role.");
  }

  return {
    profileId: choice.profileId,
    role,
    issuedAt,
  } satisfies LocalSessionCookiePayload;
}

export function encodeSessionPayload(payload: LocalSessionCookiePayload) {
  return base64UrlEncode(JSON.stringify(payload));
}

export function parseSessionCookieValue(value: string): ParsedSessionCookie | undefined {
  const [payloadSegment, signatureSegment, extra] = value.split(".");

  if (!payloadSegment || !signatureSegment || extra !== undefined) {
    return undefined;
  }

  return { payloadSegment, signatureSegment };
}

export function decodeSessionPayload(payloadSegment: string): LocalSessionCookiePayload | undefined {
  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment)) as Partial<LocalSessionCookiePayload>;
    const choice = payload.role ? resolveLocalSessionChoice(payload.role) : undefined;

    if (!choice || payload.profileId !== choice.profileId || !Number.isFinite(payload.issuedAt)) {
      return undefined;
    }

    return {
      profileId: choice.profileId,
      role: choice.role,
      issuedAt: Number(payload.issuedAt),
    };
  } catch {
    return undefined;
  }
}

export function sessionFromPayload(payload: LocalSessionCookiePayload): LocalSession | undefined {
  const choice = resolveLocalSessionChoice(payload.role);

  if (!choice || choice.profileId !== payload.profileId) {
    return undefined;
  }

  return createLocalSession(choice.role, payload.issuedAt);
}

export function getLocalSessionSecret() {
  return process.env.LOCAL_SESSION_SECRET || "loi-vao-local-session-dev-secret";
}

export function base64UrlEncode(value: string) {
  const encoded =
    typeof btoa === "function"
      ? btoa(value)
      : Buffer.from(value, "utf8").toString("base64");

  return encoded.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

export function sanitizeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
