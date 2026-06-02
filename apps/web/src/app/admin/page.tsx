import Link from "next/link";
import {
  ArrowLeft,
  ClipboardPlus,
  Database,
  FileSpreadsheet,
  ImageUp,
  ListChecks,
  MessageSquarePlus,
  PencilLine,
  Activity,
  ServerCog,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { privacyStatusLabels, sceneStatusLabels } from "@/features/places/domain";
import { getAdminOverview } from "@/features/places/server/repository";
import {
  captureStatusLabels,
  getCaptureNextAction,
  getProcessingNextAction,
  processingJobStatusLabels,
} from "@/features/pipeline/domain";
import { getPipelineOverview } from "@/features/pipeline/server/repository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [overview, pipeline] = await Promise.all([getAdminOverview(), getPipelineOverview()]);

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/">
          <ArrowLeft size={16} /> Bản đồ
        </Link>
        <Link className="secondary-button" href="/admin/places/new">
          <ClipboardPlus size={16} /> Thêm địa điểm
        </Link>
        <Link className="secondary-button" href="/admin/places/import">
          <FileSpreadsheet size={16} /> Import CSV
        </Link>
        <Link className="secondary-button" href="/admin/review">
          <ListChecks size={16} /> Review queues
        </Link>
        <Link className="secondary-button" href="/admin/captures/new">
          <ImageUp size={16} /> Ghi capture
        </Link>
        <Link className="secondary-button" href="/admin/processing/new">
          <ServerCog size={16} /> Tạo job GPU
        </Link>
        <Link className="secondary-button" href="/admin/system">
          <Activity size={16} /> System
        </Link>
        <Link className="secondary-button" href="/api/places">
          API places
        </Link>
        <Link className="secondary-button" href="/api/admin/pipeline">
          API pipeline
        </Link>
        <Link className="secondary-button" href="/api/admin/review">
          API review
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Admin local</p>
          <h1>Điều phối địa điểm và pipeline</h1>
          <p>
            Bề mặt admin đầu tiên cho capture, xử lý scene, quyền riêng tư và trạng thái xuất bản.
          </p>
        </div>
        <div className="stat-strip" aria-label="Tổng quan scene">
          {Object.entries(overview.statusCounts).map(([status, count]) => (
            <div key={status}>
              <strong>{count}</strong>
              <span>{sceneStatusLabels[status as keyof typeof sceneStatusLabels]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="info-grid">
        <article className="info-panel">
          <h2>
            <ImageUp size={18} /> Chờ capture
          </h2>
          <ul className="work-list">
            {pipeline.captureSessions.map((item) => (
              <li key={item.id}>
                {item.placeSlug ? (
                  <Link href={`/places/${item.placeSlug}`}>{item.placeName}</Link>
                ) : (
                  <strong>{item.placeName}</strong>
                )}
                <span>
                  {captureStatusLabels[item.status]} · {item.device} · {item.captureMode}
                </span>
                <span>{getCaptureNextAction(item)}</span>
                {item.rawAssetKey && item.sceneId ? (
                  <Link className="secondary-button" href={`/admin/processing/new?capture=${item.id}`}>
                    Tạo job GPU
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </article>

        <article className="info-panel">
          <h2>
            <ServerCog size={18} /> Job GPU
          </h2>
          <ul className="work-list">
            {pipeline.processingJobs.map((job) => (
              <li key={job.id}>
                {job.sceneId ? (
                  <Link href={`/viewer/${job.sceneId}`}>{job.sceneTitle}</Link>
                ) : (
                  <strong>{job.sceneTitle}</strong>
                )}
                <span>
                  {processingJobStatusLabels[job.status]} · {job.provider}
                  {job.gpuType ? ` · ${job.gpuType}` : ""}
                </span>
                <span>{getProcessingNextAction(job)}</span>
                <Link className="secondary-button" href={`/admin/processing/${job.id}`}>
                  Điều phối job
                </Link>
                {job.sceneId ? (
                  <Link className="secondary-button" href={`/admin/scenes/${job.sceneId}/assets`}>
                    Kế hoạch asset
                  </Link>
                ) : null}
                {job.sceneId ? (
                  <Link className="secondary-button" href={`/admin/scenes/${job.sceneId}/hotspots`}>
                    <MessageSquarePlus size={15} /> Hotspot
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </article>

        <article className="info-panel">
          <h2>
            <ShieldCheck size={18} /> Review địa điểm
          </h2>
          <ul className="work-list">
            {overview.places.map((place) => (
              <li key={place.id}>
                <Link href={`/admin/places/${place.slug}/review`}>{place.name}</Link>
                <span>
                  {privacyStatusLabels[place.privacyStatus]} · {sceneStatusLabels[place.scene.status]}
                </span>
                <span>{place.routeHint}</span>
                <Link className="secondary-button" href={`/admin/places/${place.slug}/edit`}>
                  <PencilLine size={15} /> Sửa metadata
                </Link>
                <Link className="secondary-button" href={`/admin/places/${place.slug}/privacy`}>
                  <ShieldCheck size={15} /> Privacy
                </Link>
                <Link className="secondary-button" href={`/admin/places/${place.slug}/review`}>
                  Review status
                </Link>
              </li>
            ))}
          </ul>
        </article>

        <article className="info-panel">
          <h2>
            <Database size={18} /> Backend kế tiếp
          </h2>
          <p className="muted-copy">
            Place/scene read path đã có PostGIS/Kysely khi bật DATABASE_URL. Pipeline API đang dùng cùng contract
            để chuẩn bị capture sessions, processing jobs, scene version và asset publish.
          </p>
          <p className="icon-line">
            <UploadCloud size={16} /> {overview.processing.length} scene đang xử lý · {overview.needsCapture.length} scene chờ scan
          </p>
        </article>
      </section>
    </main>
  );
}
