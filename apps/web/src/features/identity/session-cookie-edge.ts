import {
  decodeSessionPayload,
  getLocalSessionSecret,
  parseSessionCookieValue,
  sessionFromPayload,
} from "./session-cookie";

export async function verifyLocalSessionCookieEdge(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = parseSessionCookieValue(value);

  if (!parsed) {
    return undefined;
  }

  const expected = await signPayloadSegmentEdge(parsed.payloadSegment);

  if (parsed.signatureSegment !== expected) {
    return undefined;
  }

  const payload = decodeSessionPayload(parsed.payloadSegment);
  return payload ? sessionFromPayload(payload) : undefined;
}

async function signPayloadSegmentEdge(payloadSegment: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getLocalSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadSegment));
  return arrayBufferToBase64Url(signature);
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
