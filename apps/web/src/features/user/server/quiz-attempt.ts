import {
  createUserQuizAttempt,
  getDatabase,
  LOCAL_DEMO_PROFILE_ID,
  type CreatedUserQuizAttemptRow,
} from "@loi-vao/db";

import { getPlaceBySceneId, listSceneHotspots } from "@/features/places/server/repository";

export type UserQuizAttemptDraft = {
  sceneId: string;
  hotspotId: string;
  selectedIndex: number;
  selectedOption: string;
  question: string;
  correct: boolean;
  reward: string;
};

export type UserQuizAttemptResult =
  | {
      ok: true;
      persisted: boolean;
      draft: UserQuizAttemptDraft;
      attempt?: CreatedUserQuizAttemptRow;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      draft?: Partial<UserQuizAttemptDraft>;
    };

export async function answerQuizFromViewer(
  raw: unknown,
  profileId = LOCAL_DEMO_PROFILE_ID,
): Promise<UserQuizAttemptResult> {
  const parsed = await parseUserQuizAttempt(raw);

  if (!parsed.ok) {
    return parsed;
  }

  const dryRun = readBoolean(toRecord(raw), "dryRun");
  const database = getDatabase();

  if (dryRun || !database) {
    return {
      ok: true,
      persisted: false,
      draft: parsed.draft,
    };
  }

  try {
    const attempt = await createUserQuizAttempt(database, {
      profileId,
      sceneHotspotId: parsed.draft.hotspotId,
      selectedIndex: parsed.draft.selectedIndex,
      correct: parsed.draft.correct,
      reward: parsed.draft.reward,
      payload: {
        question: parsed.draft.question,
        selectedOption: parsed.draft.selectedOption,
      },
    });

    return {
      ok: true,
      persisted: true,
      draft: parsed.draft,
      attempt,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      draft: parsed.draft,
      errors: ["Không ghi được câu trả lời quiz. Kiểm tra PostGIS, profile local hoặc dữ liệu hotspot."],
    };
  }
}

async function parseUserQuizAttempt(raw: unknown): Promise<UserQuizAttemptResult> {
  const source = toRecord(raw);
  const sceneId = readString(source, "sceneId");
  const hotspotId = readString(source, "hotspotId");
  const selectedIndex = readInteger(source, "selectedIndex");

  const draft: Partial<UserQuizAttemptDraft> = {
    sceneId,
    hotspotId,
    selectedIndex,
  };

  const [place, hotspots] = await Promise.all([
    sceneId ? getPlaceBySceneId(sceneId) : undefined,
    sceneId ? listSceneHotspots(sceneId) : [],
  ]);
  const hotspot = hotspots.find((candidate) => candidate.id === hotspotId);
  const question = readString(hotspot?.payload ?? {}, "question");
  const options = readOptions(hotspot?.payload.options);
  const answerIndex = readInteger(hotspot?.payload ?? {}, "answerIndex");
  const reward = readString(hotspot?.payload ?? {}, "reward") || "local-demo-quiz";
  const errors: string[] = [];

  if (!sceneId || !place) {
    errors.push("Scene không tồn tại trong bản đồ hiện tại.");
  }

  if (!hotspotId || !hotspot || hotspot.kind !== "quiz") {
    errors.push("Hotspot quiz không hợp lệ.");
  }

  if (!question || options.length < 2) {
    errors.push("Quiz cần có câu hỏi và ít nhất 2 đáp án.");
  }

  if (answerIndex < 0 || answerIndex >= options.length) {
    errors.push("Đáp án đúng của quiz không hợp lệ.");
  }

  if (selectedIndex < 0 || selectedIndex >= options.length) {
    errors.push("Đáp án đã chọn không hợp lệ.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      persisted: false,
      errors,
      draft,
    };
  }

  return {
    ok: true,
    persisted: false,
    draft: {
      sceneId,
      hotspotId,
      selectedIndex,
      selectedOption: options[selectedIndex] ?? "",
      question,
      correct: selectedIndex === answerIndex,
      reward,
    },
  };
}

function readOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((option) => String(option).trim()).filter(Boolean);
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readInteger(source: Record<string, unknown>, key: string) {
  const value = source[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
  return Number.isInteger(parsed) ? parsed : -1;
}

function readBoolean(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return value === true || value === "true" || value === "1";
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
}
