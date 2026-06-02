import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  RotateCcw,
  ServerCog,
  TriangleAlert,
} from "lucide-react";

import {
  getProcessingNextAction,
  processingJobStatusLabels,
  type ProcessingJobStatus,
} from "@/features/pipeline/domain";
import {
  formDataToProcessingJobStatus,
  getAllowedProcessingTransitions,
  getProcessingJob,
  updateProcessingJobFromStatusInput,
} from "@/features/pipeline/server/processing-job-status";

export const dynamic = "force-dynamic";

type AdminProcessingJobPageProps = {
  params: Promise<{
    jobId: string;
  }>;
  searchParams: Promise<{
    updated?: string;
    persisted?: string;
    status?: string;
    error?: string;
  }>;
};

const transitionLabels: Record<ProcessingJobStatus, string> = {
  queued: "Retry về queued",
  running: "Bắt đầu chạy",
  succeeded: "Đánh dấu thành công",
  failed: "Đánh dấu thất bại",
  cancelled: "Hủy job",
};

export default async function AdminProcessingJobPage({
  params,
  searchParams,
}: AdminProcessingJobPageProps) {
  const [{ jobId }, state] = await Promise.all([params, searchParams]);
  const job = await getProcessingJob(jobId);

  if (!job) {
    notFound();
  }

  const transitions = getAllowedProcessingTransitions(job.status);

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href="/admin/processing/new">
          <ServerCog size={16} /> Tạo job GPU
        </Link>
        <Link className="secondary-button" href="/api/admin/pipeline">
          API pipeline
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Processing job</p>
          <h1>{job.sceneTitle}</h1>
          <p>
            Điều phối vòng đời job GPU: queued, running, succeeded, failed, cancelled. Job thành công vẫn cần bước
            SuperSplat/SOG/collision và asset publish trước khi viewer mở thật.
          </p>
        </div>
        <div className="stat-strip" aria-label="Trạng thái job">
          <div>
            <strong>{processingJobStatusLabels[job.status]}</strong>
            <span>Trạng thái</span>
          </div>
          <div>
            <strong>{job.gpuType ?? "Chưa gán"}</strong>
            <span>GPU</span>
          </div>
          <div>
            <strong>{job.provider}</strong>
            <span>Provider</span>
          </div>
        </div>
      </section>

      <section className="info-grid place-intake-grid" aria-label="Điều phối processing job">
        <article className="info-panel intake-panel">
          <h2>
            <ClipboardList size={18} /> Trạng thái vận hành
          </h2>
          <JobStatus state={state} />
          <dl className="detail-list">
            <div>
              <dt>Job id</dt>
              <dd>{job.id}</dd>
            </div>
            <div>
              <dt>Capture session</dt>
              <dd>{job.captureSessionId ?? "Chưa gắn capture"}</dd>
            </div>
            <div>
              <dt>Toolchain</dt>
              <dd>{job.toolchain}</dd>
            </div>
            <div>
              <dt>Log key</dt>
              <dd>{job.logKey ?? "Chưa có log key"}</dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>{getProcessingNextAction(job)}</dd>
            </div>
          </dl>

          {transitions.length > 0 ? (
            <form action={updateJobStatusAction} className="intake-form">
              <input type="hidden" name="processingJobId" value={job.id} />
              <label>
                <span>Ghi chú vận hành</span>
                <textarea
                  name="operatorNote"
                  rows={3}
                  defaultValue="Cập nhật trạng thái từ admin local sau khi kiểm tra GPU/log."
                />
              </label>
              <div className="button-row">
                {transitions.map((status) => (
                  <button className="action-button" key={status} name="status" type="submit" value={status}>
                    {status === "queued" ? (
                      <RotateCcw size={17} aria-hidden="true" />
                    ) : (
                      <ServerCog size={17} aria-hidden="true" />
                    )}
                    {transitionLabels[status]}
                  </button>
                ))}
              </div>
            </form>
          ) : (
            <p className="muted-copy">
              Job đã ở trạng thái terminal. Tiếp tục bằng SuperSplat cleanup và asset publish nếu output đã tốt.
            </p>
          )}
        </article>

        <article className="info-panel intake-help-panel">
          <h2>Runbook GPU</h2>
          <ol className="plain-list">
            <li>
              Start RunPod/L4/4090 và xác nhận <code>nvidia-smi</code>.
            </li>
            <li>Upload raw capture từ key đã ghi trong capture session.</li>
            <li>
              Chạy <code>ns-process-data video --num-frames-target 400</code>.
            </li>
            <li>
              Chạy <code>ns-train splatfacto</code> rồi <code>ns-export gaussian-splat</code>.
            </li>
            <li>Đưa PLY vào SuperSplat, crop/clean, export runtime asset.</li>
          </ol>
          {job.sceneId ? (
            <Link className="secondary-button" href={`/admin/scenes/${job.sceneId}/assets`}>
              Kế hoạch asset
            </Link>
          ) : null}
        </article>
      </section>
    </main>
  );
}

async function updateJobStatusAction(formData: FormData) {
  "use server";

  const result = await updateProcessingJobFromStatusInput(formDataToProcessingJobStatus(formData));
  const jobId = String(formData.get("processingJobId") ?? "");
  const params = new URLSearchParams();

  if (!result.ok) {
    params.set("updated", "0");
    params.set("error", result.errors[0] ?? "Không cập nhật được job.");
    redirect(`/admin/processing/${jobId}?${params.toString()}`);
  }

  params.set("updated", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("status", result.updated?.status ?? result.draft.status);

  revalidatePath("/admin");
  revalidatePath("/api/admin/pipeline");
  revalidatePath(`/admin/processing/${jobId}`);
  redirect(`/admin/processing/${jobId}?${params.toString()}`);
}

function JobStatus({
  state,
}: {
  state: Awaited<AdminProcessingJobPageProps["searchParams"]>;
}) {
  if (state.updated === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Đã cập nhật PostGIS." : "Dry-run hợp lệ, chưa ghi DB."}
        {state.status ? ` Status: ${state.status}.` : ""}
      </p>
    );
  }

  if (state.updated === "0") {
    return (
      <p className="publish-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "Không cập nhật được job."}
      </p>
    );
  }

  return (
    <p className="muted-copy">
      Chọn một transition hợp lệ sau khi operator đã kiểm tra GPU, log, preview hoặc chi phí pod.
    </p>
  );
}
