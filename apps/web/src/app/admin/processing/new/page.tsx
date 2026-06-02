import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CheckCircle2, ImageUp, MapPinned, ServerCog, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";

import {
  createProcessingJobFromIntake,
  formDataToProcessingJobIntake,
} from "@/features/pipeline/server/processing-job-intake";
import { captureStatusLabels } from "@/features/pipeline/domain";
import { listCaptureWorkItems } from "@/features/pipeline/server/repository";

export const dynamic = "force-dynamic";

type AdminNewProcessingPageProps = {
  searchParams: Promise<{
    created?: string;
    persisted?: string;
    capture?: string;
    job?: string;
    scene?: string;
    version?: string;
    error?: string;
  }>;
};

export default async function AdminNewProcessingPage({ searchParams }: AdminNewProcessingPageProps) {
  const [state, captures] = await Promise.all([searchParams, listCaptureWorkItems()]);
  const selectedCaptureId = state.capture && captures.some((capture) => capture.id === state.capture)
    ? state.capture
    : captures[0]?.id ?? "";

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href="/admin/captures/new">
          <ImageUp size={16} /> Ghi capture
        </Link>
        <Link className="secondary-button" href="/">
          <MapPinned size={16} /> Bản đồ
        </Link>
        <Link className="secondary-button" href="/api/admin/pipeline">
          API pipeline
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Admin local</p>
          <h1>Tạo job GPU cho 3DGS</h1>
          <p>
            Chuyển capture đã upload thành job Nerfstudio/gsplat queued. Bước này chưa thuê GPU thật, nhưng tạo đúng
            contract để sau đó gắn RunPod, log, scene version và asset publish.
          </p>
        </div>
      </section>

      <section className="info-grid place-intake-grid" aria-label="Tạo processing job">
        <article className="info-panel intake-panel">
          <h2>
            <ServerCog size={18} /> Form job GPU
          </h2>
          <form action={createProcessingJobAction} className="intake-form">
            <label>
              <span>Capture session</span>
              <select name="captureSessionId" required defaultValue={selectedCaptureId}>
                {captures.length === 0 ? (
                  <option value="">Chưa có capture session</option>
                ) : (
                  captures.map((capture) => (
                    <option key={capture.id} value={capture.id}>
                      {capture.placeName} - {capture.sceneTitle} - {captureStatusLabels[capture.status]}
                    </option>
                  ))
                )}
              </select>
            </label>

            <div className="form-grid">
              <label>
                <span>Provider</span>
                <select name="provider" defaultValue="runpod">
                  <option value="runpod">RunPod</option>
                  <option value="vast.ai">Vast.ai</option>
                  <option value="gcp">Google Cloud GPU</option>
                  <option value="google-colab">Google Colab</option>
                  <option value="local">Local workstation</option>
                </select>
              </label>
              <label>
                <span>GPU</span>
                <select name="gpuType" defaultValue="RTX 4090">
                  <option value="RTX 4090">RTX 4090 24GB</option>
                  <option value="L4">L4 24GB</option>
                  <option value="RTX 3090">RTX 3090 24GB</option>
                  <option value="A100">A100</option>
                  <option value="RTX 3060">RTX 3060 12GB</option>
                </select>
              </label>
              <label>
                <span>Toolchain</span>
                <select name="toolchain" defaultValue="nerfstudio-splatfacto-gsplat">
                  <option value="nerfstudio-splatfacto-gsplat">Nerfstudio splatfacto + gsplat</option>
                  <option value="opensplat">OpenSplat</option>
                  <option value="postshot-benchmark">Postshot benchmark</option>
                </select>
              </label>
              <label>
                <span>Frame target</span>
                <input name="frameTarget" type="number" min={100} max={1200} step={50} defaultValue={400} />
              </label>
            </div>

            <label>
              <span>Log key</span>
              <input
                name="logKey"
                required
                pattern="processing/.+"
                defaultValue="processing/home-test-room/runpod-first-train.log"
              />
            </label>

            <label>
              <span>Ghi chú job</span>
              <textarea
                name="notes"
                rows={4}
                defaultValue="Run ns-process-data video, train splatfacto, export PLY, sau đó clean bằng SuperSplat."
              />
            </label>

            <button className="action-button" type="submit">
              <ServerCog size={17} aria-hidden="true" /> Kiểm tra và tạo job
            </button>
          </form>
        </article>

        <article className="info-panel intake-help-panel">
          <h2>Trạng thái</h2>
          <ProcessingJobStatus state={state} />
          <h2>Quy tắc job GPU</h2>
          <ul className="plain-list">
            <li>Job mới ở trạng thái queued; chỉ bắt đầu tốn tiền khi bạn thuê/chạy GPU thật.</li>
            <li>Log key dùng dạng <code>processing/...</code> để sau này gắn log RunPod/Nerfstudio.</li>
            <li>Mỗi job tạo một scene version mới ở trạng thái processing khi PostGIS được bật.</li>
            <li>Output mong đợi: PLY &gt; SuperSplat cleanup &gt; SOG/collision/poster &gt; asset publish.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

async function createProcessingJobAction(formData: FormData) {
  "use server";

  const result = await createProcessingJobFromIntake(formDataToProcessingJobIntake(formData));
  const params = new URLSearchParams();

  if (!result.ok) {
    params.set("created", "0");
    params.set("error", result.errors[0] ?? "Dữ liệu job không hợp lệ.");
    redirect(`/admin/processing/new?${params.toString()}`);
  }

  params.set("created", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("capture", result.created?.captureSessionId ?? result.draft.captureSessionId);
  params.set("job", result.created?.processingJobId ?? result.draft.logKey);
  if (result.created?.sceneSlug) {
    params.set("scene", result.created.sceneSlug);
  }
  if (result.created?.sceneVersion) {
    params.set("version", String(result.created.sceneVersion));
  }

  revalidatePath("/admin");
  revalidatePath("/api/admin/pipeline");
  redirect(`/admin/processing/new?${params.toString()}`);
}

function ProcessingJobStatus({
  state,
}: {
  state: Awaited<AdminNewProcessingPageProps["searchParams"]>;
}) {
  if (state.created === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Đã ghi job vào PostGIS." : "Dry-run hợp lệ, chưa ghi DB."}
        {state.scene ? ` Scene: ${state.scene}.` : ""}
        {state.version ? ` Version: ${state.version}.` : ""}
      </p>
    );
  }

  if (state.created === "0") {
    return (
      <p className="publish-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "Dữ liệu job không hợp lệ."}
      </p>
    );
  }

  return (
    <p className="muted-copy">
      Sau khi tạo job, admin pipeline có thể theo dõi queued/running/succeeded/failed và nối sang asset publish.
    </p>
  );
}
