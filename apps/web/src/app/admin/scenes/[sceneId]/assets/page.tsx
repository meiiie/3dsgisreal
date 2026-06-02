import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AlertTriangle, ArrowLeft, Box, CheckCircle2, FileCheck2, MapPin, ShieldCheck, UploadCloud } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { sceneStatusLabels } from "@/features/places/domain";
import { getSceneAssetPlan, publishSceneAssets } from "@/features/scenes/server/asset-publishing";

export const dynamic = "force-dynamic";

type AdminSceneAssetsPageProps = {
  params: Promise<{
    sceneId: string;
  }>;
  searchParams: Promise<{
    persisted?: string;
    publish?: string;
  }>;
};

const requiredForLabels = {
  viewer: "Mở viewer",
  walkthrough: "Đi lại/collision",
  preview: "Preview",
};

export default async function AdminSceneAssetsPage({ params, searchParams }: AdminSceneAssetsPageProps) {
  const { sceneId } = await params;
  const publishState = await searchParams;
  const context = await getSceneAssetPlan(sceneId);

  if (!context) {
    notFound();
  }

  const { place, plan, readiness, localFiles, objectFiles } = context;
  const localFileCount = localFiles.filter((file) => file.exists).length;
  const qaReadyCount = localFiles.filter((file) => file.qaStatus === "ready").length;
  const objectFileCount = objectFiles.filter((file) => file.exists).length;

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href={`/places/${place.slug}`}>
          <MapPin size={16} /> Địa điểm
        </Link>
        <Link className="secondary-button" href={`/viewer/${place.scene.id}`}>
          <Box size={16} /> Viewer
        </Link>
        <Link className="secondary-button" href={`/api/admin/scenes/${place.scene.id}/assets`}>
          API asset
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Admin local</p>
          <h1>Quản lý asset scene</h1>
          <p>
            Kiểm tra bộ key chuẩn sau bước SuperSplat/SplatTransform, rồi gắn vào scene version để manifest và
            viewer dùng cùng một contract.
          </p>
        </div>
        <div className="stat-strip" aria-label="Trạng thái runtime">
          <div>
            <strong>v{plan.version}</strong>
            <span>Version asset</span>
          </div>
          <div>
            <strong>{readiness.canOpenViewer ? "Có" : "Chưa"}</strong>
            <span>Mở viewer</span>
          </div>
          <div>
            <strong>{readiness.canEnableWalkthrough ? "Đủ" : "Thiếu"}</strong>
            <span>Walkthrough</span>
          </div>
          <div>
            <strong>{localFileCount}/{localFiles.length}</strong>
            <span>File local</span>
          </div>
          <div>
            <strong>{qaReadyCount}/{localFiles.length}</strong>
            <span>QA cơ bản</span>
          </div>
          <div>
            <strong>{objectFileCount}/{objectFiles.length}</strong>
            <span>Object S3</span>
          </div>
        </div>
      </section>

      <section className="info-grid asset-admin-grid" aria-label="Kế hoạch asset scene">
        <article className="info-panel">
          <h2>
            <MapPin size={18} /> Địa điểm
          </h2>
          <dl className="fact-list">
            <div>
              <dt>Tên</dt>
              <dd>{place.name}</dd>
            </div>
            <div>
              <dt>Scene</dt>
              <dd>{place.scene.title}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>{sceneStatusLabels[place.scene.status]}</dd>
            </div>
          </dl>
        </article>

        <article className="info-panel asset-panel">
          <h2>
            <FileCheck2 size={18} /> Asset hiện tại
          </h2>
          <ul className="asset-list">
            {readiness.checklist.map((item) => (
              <li key={item.kind} data-available={item.available}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{requiredForLabels[item.requiredFor]}</span>
                </div>
                <span>{item.available ? "Đã gắn" : "Thiếu"}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="info-panel asset-panel">
          <h2>
            <ShieldCheck size={18} /> Key sẽ publish
          </h2>
          <p className="muted-copy">Base key: <code>{plan.baseKey}</code></p>
          <ul className="asset-key-list">
            {plan.artifacts.map((artifact) => (
              <li key={artifact.kind}>
                <span>{artifact.label}</span>
                <code>{artifact.storageKey}</code>
              </li>
            ))}
          </ul>
        </article>

        <article className="info-panel asset-panel">
          <h2>
            <FileCheck2 size={18} /> File trong public
          </h2>
          <p className="muted-copy">
            Đặt output đã clean/convert vào <code>apps/web/public/scene-assets/{plan.baseKey}/</code> trước khi publish
            thật.
          </p>
          <ul className="asset-list">
            {localFiles.map((file) => (
              <li key={file.kind} data-available={file.exists} data-qa-status={file.qaStatus}>
                <div>
                  <strong>{file.label}</strong>
                  <span>{file.publicUrl}</span>
                  <span>{file.qaMessage}</span>
                </div>
                <span>{file.exists ? formatBytes(file.bytes) : "Chưa có"}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="info-panel asset-panel">
          <h2>
            <UploadCloud size={18} /> Object storage
          </h2>
          <p className="muted-copy">
            Gate này kiểm tra object trong bucket <code>scene-assets</code>. Sau khi upload SOG/settings/collision/poster
            lên MinIO/S3, tất cả object cần ready trước khi viewer thật được xem là sẵn sàng.
          </p>
          <ul className="asset-list">
            {objectFiles.map((file) => (
              <li key={file.kind} data-available={file.exists}>
                <div>
                  <strong>{file.label}</strong>
                  <span>{file.objectUrl}</span>
                  <span>{file.error || formatObjectUpdatedAt(file.lastModified)}</span>
                </div>
                <span>{file.exists ? formatBytes(file.bytes) : "Missing"}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="info-panel publish-panel">
          <h2>
            <UploadCloud size={18} /> Publish contract
          </h2>
          <p className="muted-copy">
            Nút này dùng các key chuẩn của plan hiện tại. Khi chưa bật <code>DATABASE_URL</code>, API chỉ dry-run; khi
            có PostGIS, API sẽ gắn key vào latest scene version.
          </p>
          <form action={publishAssetsAction}>
            <input type="hidden" name="sceneId" value={place.scene.id} />
            <button className="action-button" type="submit">
              <UploadCloud size={17} aria-hidden="true" /> Gắn asset keys
            </button>
          </form>
          <PublishStatus publish={publishState.publish} persisted={publishState.persisted} artifactCount={plan.artifacts.length} />
        </article>
      </section>
    </main>
  );
}

async function publishAssetsAction(formData: FormData) {
  "use server";

  const sceneId = readFormString(formData, "sceneId");

  if (!sceneId) {
    redirect("/admin?publish=missing-scene");
  }

  const result = await publishSceneAssets(sceneId, {});
  const params = new URLSearchParams({
    publish: result?.blocked ? "blocked" : result ? "ok" : "missing",
    persisted: result?.persisted ? "1" : "0",
  });

  if (result?.blocked) {
    params.set("missingObjects", String(result.blocked.missingObjectKeys.length));
  }

  revalidatePath(`/admin/scenes/${sceneId}/assets`);
  revalidatePath(`/api/scenes/${sceneId}/manifest`);
  redirect(`/admin/scenes/${encodeURIComponent(sceneId)}/assets?${params.toString()}`);
}

function PublishStatus({ publish, persisted, artifactCount }: { publish?: string; persisted?: string; artifactCount: number }) {
  if (publish === "ok") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        Hoàn tất kiểm tra plan. {persisted === "1" ? "Đã ghi vào DB." : "Chưa ghi DB, đây là dry-run local."}
      </p>
    );
  }

  if (publish === "blocked") {
    return (
      <p className="publish-error" role="alert">
        <AlertTriangle size={16} aria-hidden="true" /> Chưa ghi DB vì object storage còn thiếu asset planned.
      </p>
    );
  }

  if (publish === "missing") {
    return (
      <p className="publish-error" role="alert">
        <AlertTriangle size={16} aria-hidden="true" /> Không tìm thấy scene để publish.
      </p>
    );
  }

  return (
    <p className="publish-status" aria-live="polite">
      Plan hiện có {artifactCount} artifact cần kiểm tra trước khi viewer mở thật.
    </p>
  );
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function formatBytes(bytes?: number | null) {
  if (!bytes) {
    return "Có file";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatObjectUpdatedAt(value: string | null) {
  return value ? `Updated ${value}` : "Object check ready";
}
