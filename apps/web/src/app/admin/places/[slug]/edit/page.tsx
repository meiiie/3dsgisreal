import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
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
  type PlaceCategory,
} from "@/features/places/domain";
import {
  formDataToPlaceEdit,
  updatePlaceFromEditInput,
} from "@/features/places/server/place-edit";
import { getPlaceBySlug } from "@/features/places/server/repository";

export const dynamic = "force-dynamic";

type AdminPlaceEditPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    updated?: string;
    persisted?: string;
    name?: string;
    error?: string;
  }>;
};

const categoryOptions = Object.entries(categoryLabels) as Array<[PlaceCategory, string]>;

export default async function AdminPlaceEditPage({
  params,
  searchParams,
}: AdminPlaceEditPageProps) {
  const [{ slug }, state] = await Promise.all([params, searchParams]);
  const place = await getPlaceBySlug(slug);

  if (!place) {
    notFound();
  }

  const [lng, lat] = place.coordinates;

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href={`/admin/places/${place.slug}/review`}>
          <ShieldCheck size={16} /> Review
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
          <p className="eyebrow">Admin local</p>
          <h1>Sửa {place.name}</h1>
          <p>
            Cập nhật metadata bản đồ và luồng vào đầu tiên. Slug place/scene được giữ ổn định
            để không làm gãy link, capture session, processing job hoặc asset key đang có.
          </p>
        </div>
        <div className="stat-strip" aria-label="Thông tin địa điểm">
          <div>
            <strong>{categoryLabels[place.category]}</strong>
            <span>Loại</span>
          </div>
          <div>
            <strong>{place.scene.status}</strong>
            <span>Scene</span>
          </div>
          <div>
            <strong>{getPlaceCoordinateLabel(place)}</strong>
            <span>Tọa độ</span>
          </div>
        </div>
      </section>

      <section className="info-grid place-intake-grid" aria-label="Sửa địa điểm">
        <article className="info-panel intake-panel">
          <h2>
            <PencilLine size={18} /> Form sửa địa điểm
          </h2>
          <PlaceEditStatus state={state} />
          <form action={updatePlaceAction} className="intake-form">
            <input type="hidden" name="placeSlug" value={place.slug} />
            <input type="hidden" name="sceneSlug" value={place.scene.id} />

            <div className="form-grid">
              <label>
                <span>Tên địa điểm</span>
                <input name="name" required minLength={3} defaultValue={place.name} />
              </label>
              <label>
                <span>Loại</span>
                <select name="category" defaultValue={place.category}>
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Thành phố</span>
                <input name="city" required minLength={2} defaultValue={place.city} />
              </label>
              <label>
                <span>Địa chỉ / mô tả vị trí</span>
                <input name="address" required minLength={3} defaultValue={place.address} />
              </label>
              <label>
                <span>Kinh độ</span>
                <input name="lng" required type="number" step="0.000001" defaultValue={lng} />
              </label>
              <label>
                <span>Vĩ độ</span>
                <input name="lat" required type="number" step="0.000001" defaultValue={lat} />
              </label>
            </div>

            <label>
              <span>Tóm tắt</span>
              <textarea name="summary" required minLength={12} rows={3} defaultValue={place.summary} />
            </label>

            <div className="form-grid">
              <label>
                <span>Tên scene</span>
                <input name="sceneTitle" required minLength={3} defaultValue={place.scene.title} />
              </label>
              <label>
                <span>Scene slug</span>
                <input value={place.scene.id} readOnly aria-describedby="scene-slug-note" />
              </label>
            </div>
            <p className="muted-copy" id="scene-slug-note">
              Scene slug đang khóa để các asset, hotspot và job hiện tại vẫn trỏ đúng scene.
            </p>
            <label>
              <span>Luồng vào</span>
              <input name="sceneEntryLabel" required minLength={5} defaultValue={place.routeHint} />
            </label>

            <div className="button-row">
              <button className="secondary-button" name="dryRun" type="submit" value="true">
                <FileClock size={17} aria-hidden="true" /> Kiểm tra dry-run
              </button>
              <button className="action-button" type="submit">
                <PencilLine size={17} aria-hidden="true" /> Lưu thay đổi
              </button>
            </div>
          </form>
        </article>

        <article className="info-panel intake-help-panel">
          <h2>Quy tắc sửa</h2>
          <ul className="plain-list">
            <li>Không đổi slug trong form này để bảo toàn link, capture, job và asset path.</li>
            <li>Tọa độ vẫn bị giới hạn trong khoảng Việt Nam thử nghiệm để tránh nhập nhầm.</li>
            <li>Luồng vào nên mô tả đường đi thật từ cổng/mặt tiền đến điểm chính của scene.</li>
            <li>Sau khi sửa metadata, review status và asset publish vẫn là hai bước riêng.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

async function updatePlaceAction(formData: FormData) {
  "use server";

  const result = await updatePlaceFromEditInput(formDataToPlaceEdit(formData));
  const placeSlug = String(formData.get("placeSlug") ?? "");
  const sceneSlug = String(formData.get("sceneSlug") ?? "");
  const params = new URLSearchParams();

  if (!result.ok) {
    params.set("updated", "0");
    params.set("error", result.errors[0] ?? "Không cập nhật được địa điểm.");
    redirect(`/admin/places/${placeSlug}/edit?${params.toString()}`);
  }

  params.set("updated", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("name", result.draft.name);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/places");
  revalidatePath("/api/admin/pipeline");
  revalidatePath(`/places/${placeSlug}`);
  revalidatePath(`/admin/places/${placeSlug}/edit`);
  revalidatePath(`/admin/places/${placeSlug}/review`);
  revalidatePath(`/viewer/${sceneSlug}`);
  revalidatePath(`/api/scenes/${sceneSlug}/manifest`);
  redirect(`/admin/places/${placeSlug}/edit?${params.toString()}`);
}

function PlaceEditStatus({
  state,
}: {
  state: Awaited<AdminPlaceEditPageProps["searchParams"]>;
}) {
  if (state.updated === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Đã cập nhật PostGIS." : "Dry-run hợp lệ, chưa ghi DB."}
        {state.name ? ` Tên: ${state.name}.` : ""}
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
      Dùng dry-run trước nếu chỉ muốn kiểm tra hợp đồng API/form. Nút lưu sẽ ghi DB khi{" "}
      <code>DATABASE_URL</code> đang bật.
    </p>
  );
}
