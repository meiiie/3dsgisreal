import type { SceneHotspot, SceneHotspotKind } from "@/features/places/domain";

export function hotspotToPayloadJson(hotspot: SceneHotspot) {
  return JSON.stringify(hotspot.payload, null, 2);
}

export function getDefaultHotspotPayload(kind: SceneHotspotKind, sceneSlug: string) {
  if (kind === "audio") {
    return {
      audioKey: `audio/${sceneSlug || "scene"}/intro-vi.mp3`,
      durationSeconds: 30,
    };
  }

  if (kind === "quiz") {
    return {
      question: "Nguoi xem can chu y diem moc nao trong scene nay?",
      options: ["Loi vao chinh", "Zoom camera", "Doi lens giua chung"],
      answerIndex: 0,
    };
  }

  if (kind === "checkin") {
    return {
      reward: `${sceneSlug || "scene"}-checkin`,
      userStatus: "checked_in",
    };
  }

  if (kind === "link") {
    return {
      href: `/viewer/${sceneSlug || "scene"}`,
      label: "Mo diem lien quan",
    };
  }

  return {
    label: "Ghi chu hien truong",
    importance: "normal",
  };
}

export function validatePayload(kind: SceneHotspotKind, payload: Record<string, unknown>) {
  const errors: string[] = [];

  if (kind === "audio" && !readPayloadString(payload, "audioKey")) {
    errors.push("Hotspot audio can payload.audioKey.");
  }

  if (kind === "quiz") {
    const question = readPayloadString(payload, "question");
    const options = Array.isArray(payload.options)
      ? payload.options.filter((option): option is string => typeof option === "string" && option.trim().length > 0)
      : [];
    const answerIndex = typeof payload.answerIndex === "number" ? payload.answerIndex : Number.NaN;

    if (!question || options.length < 2 || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
      errors.push("Hotspot quiz can question, it nhat 2 options va answerIndex hop le.");
    }
  }

  if (kind === "checkin" && !readPayloadString(payload, "reward")) {
    errors.push("Hotspot check-in can payload.reward.");
  }

  if (kind === "link") {
    const href = readPayloadString(payload, "href");
    if (!href || !(href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://"))) {
      errors.push("Hotspot lien ket can payload.href bat dau bang /, https:// hoac http://.");
    }
  }

  return errors;
}

export function readPayload(source: Record<string, unknown>, kind: SceneHotspotKind, sceneSlug: string) {
  const rawPayload = readString(source, "payloadJson");

  if (!rawPayload) {
    return {
      ok: true as const,
      payload: getDefaultHotspotPayload(kind, sceneSlug),
    };
  }

  try {
    const payload = JSON.parse(rawPayload) as unknown;

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return {
        ok: true as const,
        payload: payload as Record<string, unknown>,
      };
    }
  } catch {
    return {
      ok: false as const,
      error: "Payload phai la JSON object hop le.",
    };
  }

  return {
    ok: false as const,
    error: "Payload phai la JSON object, khong dung array hoac primitive.",
  };
}

function readPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value.trim() : "";
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}
