import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  FileClock,
  MapPinned,
  PencilLine,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import {
  categoryLabels,
  getPlaceCoordinateLabel,
  privacyStatusLabels,
} from "@/features/places/domain";
import {
  formDataToPlaceStatusReview,
  getAdminPlaceStatusReview,
  placeReviewStatusHelp,
  placeReviewStatusLabels,
  placeReviewStatuses,
  updatePlaceFromStatusInput,
  type PlaceReviewStatus,
} from "@/features/places/server/place-status-review";

export const dynamic = "force-dynamic";

type AdminPlaceReviewPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    updated?: string;
    persisted?: string;
    status?: string;
    error?: string;
  }>;
};

const statusOptions = placeReviewStatuses as readonly PlaceReviewStatus[];

export default async function AdminPlaceReviewPage({
  params,
  searchParams,
}: AdminPlaceReviewPageProps) {
  const [{ slug }, state] = await Promise.all([params, searchParams]);
  const review = await getAdminPlaceStatusReview(slug);

  if (!review) {
    notFound();
  }

  const { place } = review;
  const selectedStatus = statusOptions.includes(state.status as PlaceReviewStatus)
    ? (state.status as PlaceReviewStatus)
    : review.currentStatus;

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href={`/admin/places/${place.slug}/edit`}>
          <PencilLine size={16} /> Sửa metadata
        </Link>
        <Link className="secondary-button" href={`/admin/places/${place.slug}/privacy`}>
          <ShieldCheck size={16} /> Privacy checklist
        </Link>
        <Link className="secondary-button" href={`/places/${place.slug}`}>
          <MapPinned size={16} /> Hồ sơ địa điểm
        </Link>
        <Link className="secondary-button" href="/api/places">
          API places
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Review địa điểm</p>
          <h1>{place.name}</h1>
          <p>
            Cập nhật vòng đời địa điểm trước khi public: bản nháp, chờ review quyền riêng tư,
            đủ điều kiện công khai, hoặc lưu trữ khỏi pilot.
          </p>
        </div>
        <div className="stat-strip" aria-label="Trạng thái địa điểm">
          <div>
            <strong>{placeReviewStatusLabels[review.currentStatus]}</strong>
            <span>Trạng thái hiện tại</span>
          </div>
          <div>
            <strong>{categoryLabels[place.category]}</strong>
            <span>Loại</span>
          </div>
          <div>
            <strong>{place.scene.status}</strong>
            <span>Scene</span>
          </div>
        </div>
      </section>

      <section className="info-grid place-intake-grid" aria-label="Review trạng thái địa điểm">
        <article className="info-panel intake-panel">
          <h2>
            <ShieldCheck size={18} /> Cập nhật status
          </h2>
          <PlaceReviewStatusMessage state={state} />
          <form action={updatePlaceStatusAction} className="intake-form">
            <input type="hidden" name="placeSlug" value={place.slug} />
            <label>
              <span>Trạng thái mới</span>
              <select name="status" defaultValue={selectedStatus}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {placeReviewStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Xác nhận lưu trữ</span>
              <input name="confirmArchive" type="checkbox" value="true" />
            </label>
            <div className="button-row">
              <button className="secondary-button" name="dryRun" type="submit" value="true">
                <FileClock size={17} aria-hidden="true" /> Kiểm tra dry-run
              </button>
              <button className="action-button" type="submit">
                <ShieldCheck size={17} aria-hidden="true" /> Lưu status
              </button>
            </div>
          </form>
        </article>

        <article className="info-panel intake-help-panel">
          <h2>Ngữ cảnh review</h2>
          <dl className="detail-list">
            <div>
              <dt>Slug</dt>
              <dd>{place.slug}</dd>
            </div>
            <div>
              <dt>Quyền riêng tư</dt>
              <dd>{privacyStatusLabels[place.privacyStatus]}</dd>
            </div>
            <div>
              <dt>Tọa độ</dt>
              <dd>{getPlaceCoordinateLabel(place)}</dd>
            </div>
            <div>
              <dt>Luồng vào</dt>
              <dd>{place.routeHint}</dd>
            </div>
          </dl>
          <h2>
            <Archive size={18} /> Quy tắc status
          </h2>
          <ul className="plain-list">
            {statusOptions.map((status) => (
            <li key={status}>
              <strong>{placeReviewStatusLabels[status]}:</strong> {placeReviewStatusHelp[status]}
            </li>
          ))}
          <li>
            <strong>Privacy checklist:</strong> Dùng trước khi public để ghi bằng chứng quyền quay, địa chỉ, người xuất hiện và raw capture.
          </li>
        </ul>
      </article>
      </section>
    </main>
  );
}

async function updatePlaceStatusAction(formData: FormData) {
  "use server";

  const result = await updatePlaceFromStatusInput(formDataToPlaceStatusReview(formData));
  const placeSlug = String(formData.get("placeSlug") ?? "");
  const params = new URLSearchParams();

  if (!result.ok) {
    params.set("updated", "0");
    params.set("error", result.errors[0] ?? "Không cập nhật được địa điểm.");
    redirect(`/admin/places/${placeSlug}/review?${params.toString()}`);
  }

  params.set("updated", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("status", result.updated?.status ?? result.draft.status);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/places");
  revalidatePath(`/places/${placeSlug}`);
  revalidatePath(`/admin/places/${placeSlug}/review`);
  redirect(`/admin/places/${placeSlug}/review?${params.toString()}`);
}

function PlaceReviewStatusMessage({
  state,
}: {
  state: Awaited<AdminPlaceReviewPageProps["searchParams"]>;
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
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "Không cập nhật được địa điểm."}
      </p>
    );
  }

  return (
    <p className="muted-copy">
      Dùng dry-run trước nếu chỉ muốn kiểm tra hợp đồng API/form. Nút lưu sẽ ghi DB khi
      {" "}
      <code>DATABASE_URL</code> đang bật.
    </p>
  );
}
