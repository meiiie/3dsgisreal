import Link from "next/link";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Crosshair,
  MapPin,
  MessageSquarePlus,
  TriangleAlert,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  sceneHotspotKindLabels,
  sceneStatusLabels,
  type SceneHotspot,
  type SceneHotspotKind,
} from "@/features/places/domain";
import {
  getPlaceBySceneId,
  listSceneHotspots,
} from "@/features/places/server/repository";
import {
  getDefaultHotspotPayload,
} from "@/features/scenes/server/hotspot-intake";

import { createHotspotAction } from "./actions";
import { HotspotEditorList } from "./HotspotEditorList";

export const dynamic = "force-dynamic";

type AdminSceneHotspotsPageProps = {
  params: Promise<{
    sceneId: string;
  }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    persisted?: string;
    hotspot?: string;
    kind?: string;
    error?: string;
  }>;
};

const hotspotKinds = Object.keys(sceneHotspotKindLabels) as SceneHotspotKind[];

export default async function AdminSceneHotspotsPage({
  params,
  searchParams,
}: AdminSceneHotspotsPageProps) {
  const [{ sceneId }, state] = await Promise.all([params, searchParams]);
  const [place, hotspots] = await Promise.all([
    getPlaceBySceneId(sceneId),
    listSceneHotspots(sceneId),
  ]);

  if (!place) {
    notFound();
  }

  const nextSortOrder = getNextSortOrder(hotspots);

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
        <Link className="secondary-button" href={`/admin/scenes/${place.scene.id}/assets`}>
          Asset
        </Link>
        <Link className="secondary-button" href={`/api/admin/scenes/${place.scene.id}/hotspots`}>
          API hotspot
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Admin local</p>
          <h1>Quản lý hotspot scene</h1>
          <p>
            Tạo các điểm tương tác trong scene để manifest, viewer và PlayCanvas runtime dùng chung
            một contract. Bước này dùng tọa độ số trước khi có gizmo đặt điểm trực tiếp trong 3D.
          </p>
        </div>
        <div className="stat-strip" aria-label="Tổng quan hotspot">
          <div>
            <strong>{hotspots.length}</strong>
            <span>Hotspot</span>
          </div>
          <div>
            <strong>{sceneStatusLabels[place.scene.status]}</strong>
            <span>Scene</span>
          </div>
          <div>
            <strong>{place.scene.readiness?.canOpenViewer ? "Có" : "Chưa"}</strong>
            <span>Mở viewer</span>
          </div>
        </div>
      </section>

      <section className="info-grid place-intake-grid" aria-label="Quản lý hotspot">
        <article className="info-panel intake-panel">
          <h2>
            <MessageSquarePlus size={18} /> Thêm hotspot
          </h2>
          <form action={createHotspotAction} className="intake-form">
            <input type="hidden" name="sceneSlug" value={place.scene.id} />

            <div className="form-grid">
              <label>
                <span>Loại hotspot</span>
                <select name="kind" defaultValue="info">
                  {hotspotKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {sceneHotspotKindLabels[kind]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sort order</span>
                <input name="sortOrder" type="number" min={0} max={9999} defaultValue={nextSortOrder} />
              </label>
            </div>

            <label>
              <span>Tiêu đề</span>
              <input name="title" defaultValue="Ghi chú hiện trường" required minLength={3} />
            </label>

            <label>
              <span>Nội dung</span>
              <textarea
                name="body"
                rows={3}
                defaultValue="Điểm tương tác mẫu để kiểm tra manifest, viewer và hành vi trong scene."
                required
                minLength={8}
              />
            </label>

            <div className="form-grid">
              <label>
                <span>X</span>
                <input name="x" type="number" step="0.1" defaultValue="0" required />
              </label>
              <label>
                <span>Y</span>
                <input name="y" type="number" step="0.1" defaultValue="1.5" required />
              </label>
              <label>
                <span>Z</span>
                <input name="z" type="number" step="0.1" defaultValue="0" required />
              </label>
              <label>
                <span>Yaw</span>
                <input name="yaw" type="number" step="1" defaultValue="0" required />
              </label>
            </div>

            <label>
              <span>Payload JSON</span>
              <textarea
                name="payloadJson"
                rows={8}
                defaultValue={JSON.stringify(getDefaultHotspotPayload("info", place.scene.id), null, 2)}
                spellCheck={false}
              />
            </label>

            <button className="action-button" type="submit">
              <MessageSquarePlus size={17} aria-hidden="true" /> Kiểm tra và thêm hotspot
            </button>
          </form>
        </article>

        <aside className="info-panel intake-help-panel">
          <h2>Trạng thái</h2>
          <HotspotStatus state={state} />

          <h2>
            <Crosshair size={18} /> Hotspot hiện có
          </h2>
          <HotspotEditorList hotspots={hotspots} sceneSlug={place.scene.id} />

          <h2>Quy tắc</h2>
          <ul className="plain-list">
            <li>Vị trí dùng trục <code>x/y/z</code> theo runtime scene, chỉnh tinh sau khi có viewer thật.</li>
            <li>Payload phải là JSON object; không lưu script hoặc raw HTML vào hotspot.</li>
            <li>Quiz cần <code>question</code>, <code>options</code> và <code>answerIndex</code>.</li>
            <li>Audio cần <code>audioKey</code>; check-in cần <code>reward</code>.</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}

function HotspotStatus({
  state,
}: {
  state: Awaited<AdminSceneHotspotsPageProps["searchParams"]>;
}) {
  if (state.created === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Đã ghi hotspot vào PostGIS." : "Dry-run hợp lệ, chưa ghi DB."}
        {state.kind ? ` Loại: ${state.kind}.` : ""}
      </p>
    );
  }

  if (state.created === "0") {
    return (
      <p className="publish-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "Dữ liệu hotspot không hợp lệ."}
      </p>
    );
  }

  if (state.updated === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Da cap nhat hotspot trong PostGIS." : "Dry-run sua hotspot hop le, chua ghi DB."}
        {state.kind ? ` Loai: ${state.kind}.` : ""}
      </p>
    );
  }

  if (state.updated === "0") {
    return (
      <p className="publish-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "Du lieu sua hotspot khong hop le."}
      </p>
    );
  }

  if (state.deleted === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Da xoa hotspot trong PostGIS." : "Dry-run xoa hotspot hop le, chua ghi DB."}
      </p>
    );
  }

  if (state.deleted === "0") {
    return (
      <p className="publish-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "Khong xoa duoc hotspot."}
      </p>
    );
  }

  return (
    <p className="muted-copy">
      Hotspot mới sẽ đi vào manifest scene. Khi chưa bật <code>DATABASE_URL</code>, form chỉ dry-run để kiểm tra contract.
    </p>
  );
}

function getNextSortOrder(hotspots: SceneHotspot[]) {
  if (hotspots.length === 0) {
    return 10;
  }

  return Math.max(...hotspots.map(getHotspotSortOrder)) + 10;
}

function getHotspotSortOrder(hotspot: SceneHotspot, index: number) {
  return typeof hotspot.sortOrder === "number" && Number.isInteger(hotspot.sortOrder)
    ? hotspot.sortOrder
    : (index + 1) * 10;
}
