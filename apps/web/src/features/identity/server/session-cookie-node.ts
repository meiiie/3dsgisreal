import { createHmac, timingSafeEqual } from "node:crypto";

import {
  buildLocalSessionPayload,
  decodeSessionPayload,
  encodeSessionPayload,
  getLocalSessionSecret,
  parseSessionCookieValue,
  sessionFromPayload,
  type LocalSessionCookiePayload,
} from "../session-cookie";
import type { LocalSessionRole } from "../domain";

export function signLocalSessionCookie(role: LocalSessionRole) {
  const payload = buildLocalSessionPayload(role);
  const payloadSegment = encodeSessionPayload(payload);
  const signatureSegment = signPayloadSegment(payloadSegment);
  return `${payloadSegment}.${signatureSegment}`;
}

export function verifyLocalSessionCookie(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = parseSessionCookieValue(value);

  if (!parsed || !isValidSignature(parsed.payloadSegment, parsed.signatureSegment)) {
    return undefined;
  }

  const payload = decodeSessionPayload(parsed.payloadSegment);
  return payload ? sessionFromPayload(payload) : undefined;
}

function signPayloadSegment(payloadSegment: string) {
  return createHmac("sha256", getLocalSessionSecret()).update(payloadSegment).digest("base64url");
}

function isValidSignature(payloadSegment: string, signatureSegment: string) {
  const expected = signPayloadSegment(payloadSegment);

  try {
    return timingSafeEqual(Buffer.from(signatureSegment), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function sessionPayloadForRole(role: LocalSessionRole): LocalSessionCookiePayload {
  return buildLocalSessionPayload(role);
}
