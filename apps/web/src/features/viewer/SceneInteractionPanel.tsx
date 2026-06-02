import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CircleHelp,
  Info,
  Link as LinkIcon,
  MapPinned,
  TriangleAlert,
  Volume2,
} from "lucide-react";

import {
  sceneHotspotKindLabels,
  type SceneHotspot,
  type SceneHotspotKind,
} from "@/features/places/domain";
import { getCurrentSession } from "@/features/identity/server/session";
import { checkInFromViewer } from "@/features/user/server/check-in";
import { answerQuizFromViewer } from "@/features/user/server/quiz-attempt";

type SceneInteractionPanelProps = {
  sceneId: string;
  checkInState?: ViewerCheckInState;
  quizState?: ViewerQuizState;
  hotspots: SceneHotspot[];
};

export type ViewerCheckInState = {
  status?: string;
  persisted?: string;
  hotspotId?: string;
  error?: string;
};

export type ViewerQuizState = {
  status?: string;
  persisted?: string;
  hotspotId?: string;
  selected?: string;
  correct?: string;
  error?: string;
};

const hotspotIcons: Record<SceneHotspotKind, typeof Info> = {
  info: Info,
  audio: Volume2,
  quiz: CircleHelp,
  checkin: MapPinned,
  link: LinkIcon,
};

export function SceneInteractionPanel({ checkInState, quizState, sceneId, hotspots }: SceneInteractionPanelProps) {
  return (
    <aside className="viewer-hotspot-panel" aria-label="Tương tác trong scene">
      <div>
        <p className="eyebrow">Scene interactions</p>
        <h2>Hotspot</h2>
        <p>
          Các điểm tương tác này sẽ được gắn vào viewer 3D khi runtime SOG/collision sẵn sàng.
        </p>
      </div>

      {hotspots.length > 0 ? (
        <ul className="viewer-hotspot-list">
          {hotspots.map((hotspot) => (
            <HotspotItem
              checkInState={checkInState}
              hotspot={hotspot}
              key={hotspot.id}
              quizState={quizState}
              sceneId={sceneId}
            />
          ))}
        </ul>
      ) : (
        <p className="viewer-hotspot-empty">
          Scene này chưa có hotspot. Thêm info/audio/quiz/check-in sau khi luồng đi bộ đã ổn định.
        </p>
      )}
    </aside>
  );
}

function HotspotItem({
  checkInState,
  quizState,
  sceneId,
  hotspot,
}: {
  checkInState?: ViewerCheckInState;
  quizState?: ViewerQuizState;
  sceneId: string;
  hotspot: SceneHotspot;
}) {
  const Icon = hotspotIcons[hotspot.kind];

  return (
    <li data-kind={hotspot.kind}>
      <div className="viewer-hotspot-heading">
        <span>
          <Icon size={15} aria-hidden="true" />
          {sceneHotspotKindLabels[hotspot.kind]}
        </span>
        <code>
          {hotspot.position.x}, {hotspot.position.y}, {hotspot.position.z}
        </code>
      </div>
      <strong>{hotspot.title}</strong>
      <p>{hotspot.body}</p>
      <HotspotPayload hotspot={hotspot} quizState={quizState} sceneId={sceneId} />
      <HotspotActionForm checkInState={checkInState} hotspot={hotspot} quizState={quizState} sceneId={sceneId} />
    </li>
  );
}

function HotspotPayload({
  hotspot,
  quizState,
  sceneId,
}: {
  hotspot: SceneHotspot;
  quizState?: ViewerQuizState;
  sceneId: string;
}) {
  if (hotspot.kind === "audio") {
    return (
      <span className="viewer-hotspot-note">
        Audio: {readString(hotspot.payload.audioKey) || "chưa gắn file"}
        {readNumber(hotspot.payload.durationSeconds) ? ` · ${readNumber(hotspot.payload.durationSeconds)}s` : ""}
      </span>
    );
  }

  if (hotspot.kind === "quiz") {
    const question = readString(hotspot.payload.question);
    const options = Array.isArray(hotspot.payload.options) ? hotspot.payload.options : [];
    const isCurrent = quizState?.hotspotId === hotspot.id;
    const succeeded = isCurrent && quizState?.status === "ok";
    const failed = isCurrent && quizState?.status === "error";
    const answeredCorrectly = succeeded && quizState?.correct === "1";
    const selected = quizState?.selected ?? "";

    return (
      <div className="viewer-hotspot-quiz">
        {question ? <span>{question}</span> : null}
        <div className="viewer-hotspot-quiz-options" role="list">
          {options.map((option, index) => (
            <form action={answerQuizHotspotAction} key={`${index}-${String(option)}`} role="listitem">
              <input type="hidden" name="sceneId" value={sceneId} />
              <input type="hidden" name="hotspotId" value={hotspot.id} />
              <input type="hidden" name="selectedIndex" value={index} />
              <button
                aria-pressed={isCurrent && selected === String(index)}
                className="viewer-quiz-option"
                data-selected={isCurrent && selected === String(index)}
                disabled={answeredCorrectly}
                type="submit"
              >
                {String(option)}
              </button>
            </form>
          ))}
        </div>
        {succeeded ? (
          <p className={answeredCorrectly ? "viewer-hotspot-success" : "viewer-hotspot-error"} aria-live="polite">
            {answeredCorrectly ? (
              <CheckCircle2 size={14} aria-hidden="true" />
            ) : (
              <TriangleAlert size={14} aria-hidden="true" />
            )}
            {answeredCorrectly
              ? quizState.persisted === "1"
                ? "Đúng rồi. Câu trả lời đã được ghi vào hồ sơ user."
                : "Đúng rồi. Quiz local hợp lệ, chưa ghi DB."
              : "Chưa đúng. Bạn có thể chọn lại đáp án khác."}
          </p>
        ) : null}
        {failed ? (
          <p className="viewer-hotspot-error" role="alert">
            <TriangleAlert size={14} aria-hidden="true" /> {quizState.error || "Không ghi được câu trả lời quiz."}
          </p>
        ) : null}
      </div>
    );
  }

  if (hotspot.kind === "checkin") {
    return (
      <span className="viewer-hotspot-note">
        Check-in: {readString(hotspot.payload.reward) || "local-demo"}
      </span>
    );
  }

  if (hotspot.kind === "link") {
    return (
      <span className="viewer-hotspot-note">
        Link: {readString(hotspot.payload.href) || "chưa gắn URL"}
      </span>
    );
  }

  return null;
}

function HotspotActionForm({
  checkInState,
  hotspot,
  quizState,
  sceneId,
}: {
  checkInState?: ViewerCheckInState;
  hotspot: SceneHotspot;
  quizState?: ViewerQuizState;
  sceneId: string;
}) {
  if (hotspot.kind !== "checkin") {
    return null;
  }

  const reward = readString(hotspot.payload.reward) || "local-demo-checkin";
  const isCurrent = checkInState?.hotspotId === hotspot.id;
  const succeeded = isCurrent && checkInState?.status === "ok";
  const failed = isCurrent && checkInState?.status === "error";

  return (
    <div className="viewer-hotspot-action-stack">
      <form action={checkInHotspotAction}>
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="hotspotId" value={hotspot.id} />
        <input type="hidden" name="reward" value={reward} />
        <input type="hidden" name="note" value={`Check-in từ viewer: ${hotspot.title}`} />
        {quizState?.status ? (
          <>
            <input type="hidden" name="quiz" value={quizState.status} />
            <input type="hidden" name="quizHotspot" value={quizState.hotspotId || ""} />
            <input type="hidden" name="quizSelected" value={quizState.selected || ""} />
            <input type="hidden" name="quizCorrect" value={quizState.correct || ""} />
            <input type="hidden" name="quizPersisted" value={quizState.persisted || ""} />
            <input type="hidden" name="quizError" value={quizState.error || ""} />
          </>
        ) : null}
        <button className="viewer-hotspot-action" type="submit" disabled={succeeded}>
          <MapPinned size={15} aria-hidden="true" />
          {succeeded ? "Đã check-in" : "Check-in tại đây"}
        </button>
      </form>
      {succeeded ? (
        <p className="viewer-hotspot-success" aria-live="polite">
          <CheckCircle2 size={14} aria-hidden="true" />
          {checkInState.persisted === "1" ? "Đã check-in vào hồ sơ user." : "Check-in local hợp lệ, chưa ghi DB."}
        </p>
      ) : null}
      {failed ? (
        <p className="viewer-hotspot-error" role="alert">
          <TriangleAlert size={14} aria-hidden="true" /> {checkInState.error || "Không ghi được check-in."}
        </p>
      ) : null}
    </div>
  );
}

async function checkInHotspotAction(formData: FormData) {
  "use server";

  const sceneId = readFormString(formData, "sceneId");
  const hotspotId = readFormString(formData, "hotspotId");
  const session = await getCurrentSession();
  const result = await checkInFromViewer(Object.fromEntries(formData.entries()), session.profileId);
  const params = new URLSearchParams();

  if (!sceneId) {
    redirect("/?checkin=missing-scene");
  }

  params.set("hotspot", hotspotId || "");
  preserveQuizStateParams(formData, params);

  if (!result.ok) {
    params.set("checkin", "error");
    params.set("error", result.errors[0] ?? "Không ghi được check-in.");
    redirect(`/viewer/${encodeURIComponent(sceneId)}?${params.toString()}`);
  }

  params.set("checkin", "ok");
  params.set("persisted", result.persisted ? "1" : "0");

  revalidatePath("/user");
  revalidatePath("/api/user");
  revalidatePath(`/viewer/${sceneId}`);
  redirect(`/viewer/${encodeURIComponent(sceneId)}?${params.toString()}`);
}

function preserveQuizStateParams(formData: FormData, params: URLSearchParams) {
  for (const key of ["quiz", "quizHotspot", "quizSelected", "quizCorrect", "quizPersisted", "quizError"]) {
    const value = readFormString(formData, key);

    if (value) {
      params.set(key, value);
    }
  }
}

async function answerQuizHotspotAction(formData: FormData) {
  "use server";

  const sceneId = readFormString(formData, "sceneId");
  const hotspotId = readFormString(formData, "hotspotId");
  const selectedIndex = readFormString(formData, "selectedIndex");
  const session = await getCurrentSession();
  const result = await answerQuizFromViewer(Object.fromEntries(formData.entries()), session.profileId);
  const params = new URLSearchParams();

  if (!sceneId) {
    redirect("/?quiz=missing-scene");
  }

  params.set("quizHotspot", hotspotId || "");
  params.set("quizSelected", selectedIndex || "");

  if (!result.ok) {
    params.set("quiz", "error");
    params.set("quizError", result.errors[0] ?? "Không ghi được câu trả lời quiz.");
    redirect(`/viewer/${encodeURIComponent(sceneId)}?${params.toString()}`);
  }

  params.set("quiz", "ok");
  params.set("quizCorrect", result.draft.correct ? "1" : "0");
  params.set("quizPersisted", result.persisted ? "1" : "0");

  revalidatePath("/user");
  revalidatePath("/api/user");
  revalidatePath(`/viewer/${sceneId}`);
  redirect(`/viewer/${encodeURIComponent(sceneId)}?${params.toString()}`);
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
