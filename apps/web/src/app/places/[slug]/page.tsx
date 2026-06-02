import Link from "next/link";
import { ArrowLeft, Bookmark, Box, CheckCircle2, MapPin, Route, TriangleAlert } from "lucide-react";
import { notFound } from "next/navigation";

import {
  categoryLabels,
  getPlaceCoordinateLabel,
  isSceneEnterable,
  privacyStatusLabels,
  sceneStatusLabels,
} from "@/features/places/domain";
import { getPlaceBySlug } from "@/features/places/server/repository";

import { updateUserPlaceLibraryAction } from "./actions";

export const dynamic = "force-dynamic";

type PlacePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    userPlace?: string;
    persisted?: string;
    error?: string;
  }>;
};

export default async function PlacePage({ params, searchParams }: PlacePageProps) {
  const [{ slug }, state] = await Promise.all([params, searchParams]);
  const place = await getPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const canEnterScene = isSceneEnterable(place.scene);

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/">
          <ArrowLeft size={16} /> Bản đồ
        </Link>
        <Link className="secondary-button" href="/user">
          User
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">{categoryLabels[place.category]}</p>
          <h1>{place.name}</h1>
          <p>{place.summary}</p>
        </div>
        <div className="detail-actions">
          {canEnterScene ? (
            <Link className="action-button" href={`/viewer/${place.scene.id}`}>
              <Box size={17} /> Mở 3D
            </Link>
          ) : (
            <span className="action-button" aria-disabled="true">
              <Box size={17} /> Chưa có 3D
            </span>
          )}
          <Link className="secondary-button" href={`/api/scenes/${place.scene.id}/manifest`}>
            Manifest
          </Link>
          <form action={updateUserPlaceLibraryAction} className="button-row place-user-action-form">
            <input type="hidden" name="placeSlug" value={place.slug} />
            <input type="hidden" name="note" value={`Theo doi ${place.name} tu ho so dia diem.`} />
            <button className="secondary-button" type="submit" name="status" value="saved">
              <Bookmark size={16} aria-hidden="true" /> Luu
            </button>
            <button className="secondary-button" type="submit" name="status" value="visited">
              <CheckCircle2 size={16} aria-hidden="true" /> Da xem
            </button>
          </form>
        </div>
      </section>

      <PlaceUserActionStatus state={state} />

      <section className="info-grid" aria-label="Thông tin địa điểm">
        <article className="info-panel">
          <h2>Thông tin</h2>
          <dl className="fact-list">
            <div>
              <dt>Địa chỉ</dt>
              <dd>{place.address}</dd>
            </div>
            <div>
              <dt>Thành phố</dt>
              <dd>{place.city}</dd>
            </div>
            <div>
              <dt>Tọa độ</dt>
              <dd>{getPlaceCoordinateLabel(place)}</dd>
            </div>
          </dl>
        </article>

        <article className="info-panel">
          <h2>Luồng vào</h2>
          <p className="icon-line">
            <Route size={16} /> {place.routeHint}
          </p>
          <p className="muted-copy">Dùng route hint này để kiểm tra scan từ điểm vào đến khu chính.</p>
        </article>

        <article className="info-panel">
          <h2>Scene</h2>
          <dl className="fact-list">
            <div>
              <dt>Tên scene</dt>
              <dd>{place.scene.title}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>{sceneStatusLabels[place.scene.status]}</dd>
            </div>
            <div>
              <dt>Quyền riêng tư</dt>
              <dd>{privacyStatusLabels[place.privacyStatus]}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="inline-status" aria-label="Trạng thái pipeline">
        <MapPin size={17} />
        <p>
          Đây là hồ sơ địa điểm local. Khi PostGIS adapter sẵn sàng, dữ liệu này sẽ chuyển từ sample
          repository sang database mà UI không cần đổi contract.
        </p>
      </section>
    </main>
  );
}

function PlaceUserActionStatus({
  state,
}: {
  state: Awaited<PlacePageProps["searchParams"]>;
}) {
  if (state.userPlace === "saved") {
    return (
      <section className="inline-status" aria-label="Trang thai user">
        <Bookmark size={17} />
        <p>{state.persisted === "1" ? "Da luu dia diem vao dashboard user." : "Dry-run luu dia diem hop le, chua ghi DB."}</p>
      </section>
    );
  }

  if (state.userPlace === "visited") {
    return (
      <section className="inline-status" aria-label="Trang thai user">
        <CheckCircle2 size={17} />
        <p>{state.persisted === "1" ? "Da danh dau dia diem la da xem." : "Dry-run da xem hop le, chua ghi DB."}</p>
      </section>
    );
  }

  if (state.userPlace === "0") {
    return (
      <section className="inline-status inline-status-error" aria-label="Loi trang thai user" role="alert">
        <TriangleAlert size={17} />
        <p>{state.error ?? "Khong ghi duoc trang thai dia diem."}</p>
      </section>
    );
  }

  return null;
}
