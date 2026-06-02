import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, CheckCircle2, ClipboardPlus, MapPinned, TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { categoryLabels, type PlaceCategory } from "@/features/places/domain";
import { createPlaceFromIntake, formDataToPlaceIntake } from "@/features/places/server/place-intake";

export const dynamic = "force-dynamic";

type AdminNewPlacePageProps = {
  searchParams: Promise<{
    created?: string;
    persisted?: string;
    slug?: string;
    scene?: string;
    error?: string;
  }>;
};

const categoryOptions = Object.entries(categoryLabels) as Array<[PlaceCategory, string]>;

export default async function AdminNewPlacePage({ searchParams }: AdminNewPlacePageProps) {
  const state = await searchParams;

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href="/">
          <MapPinned size={16} /> Bản đồ
        </Link>
        <Link className="secondary-button" href="/api/places">
          API places
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Admin local</p>
          <h1>Thêm địa điểm và scene nháp</h1>
          <p>
            Nhập một địa điểm độc lập cùng luồng vào đầu tiên. Khi chưa bật <code>DATABASE_URL</code>, form chỉ kiểm tra
            và dry-run; khi có PostGIS, form ghi place + scene trong một transaction.
          </p>
        </div>
      </section>

      <section className="info-grid place-intake-grid" aria-label="Thêm địa điểm">
        <article className="info-panel intake-panel">
          <h2>
            <ClipboardPlus size={18} /> Form nhập địa điểm
          </h2>
          <form action={createPlaceAction} className="intake-form">
            <div className="form-grid">
              <label>
                <span>Tên địa điểm</span>
                <input name="name" required minLength={3} placeholder="Phòng trọ gần cổng trường" />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" placeholder="phong-tro-gan-cong-truong" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
              </label>
              <label>
                <span>Loại</span>
                <select name="category" defaultValue="rental">
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Thành phố</span>
                <input name="city" defaultValue="Hải Phòng" />
              </label>
              <label>
                <span>Kinh độ</span>
                <input name="lng" required type="number" step="0.000001" defaultValue="106.6881" />
              </label>
              <label>
                <span>Vĩ độ</span>
                <input name="lat" required type="number" step="0.000001" defaultValue="20.8449" />
              </label>
            </div>

            <label>
              <span>Địa chỉ / mô tả vị trí</span>
              <input name="address" required minLength={3} placeholder="Ngõ nhỏ gần cổng chính" />
            </label>
            <label>
              <span>Tóm tắt</span>
              <textarea name="summary" required minLength={12} rows={3} placeholder="Địa điểm thử nghiệm cho luồng scan từ cổng vào phòng." />
            </label>
            <label>
              <span>Mô tả nội bộ</span>
              <textarea name="description" rows={3} placeholder="Ghi chú thêm cho admin/capture." />
            </label>

            <div className="form-grid">
              <label>
                <span>Tên scene</span>
                <input name="sceneTitle" placeholder="Cổng vào phòng trọ" />
              </label>
              <label>
                <span>Scene slug</span>
                <input name="sceneSlug" placeholder="phong-tro-gan-cong-truong-v1" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
              </label>
            </div>
            <label>
              <span>Luồng vào</span>
              <input name="sceneEntryLabel" required minLength={5} placeholder="Cổng -> hẻm -> cửa phòng -> phòng chính" />
            </label>

            <button className="action-button" type="submit">
              <ClipboardPlus size={17} aria-hidden="true" /> Kiểm tra và tạo nháp
            </button>
          </form>
        </article>

        <article className="info-panel intake-help-panel">
          <h2>Trạng thái</h2>
          <IntakeStatus state={state} />
          <h2>Quy tắc nhập</h2>
          <ul className="plain-list">
            <li>Slug dùng chữ thường không dấu, số và dấu gạch ngang.</li>
            <li>Tọa độ hiện giới hạn theo Việt Nam để tránh nhập nhầm.</li>
            <li>Scene mới bắt đầu ở trạng thái nháp, chưa có asset 3D.</li>
            <li>Luồng vào phải mô tả đúng đường đi thực tế để chuẩn bị capture.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

async function createPlaceAction(formData: FormData) {
  "use server";

  const result = await createPlaceFromIntake(formDataToPlaceIntake(formData));
  const params = new URLSearchParams();

  if (!result.ok) {
    params.set("created", "0");
    params.set("error", result.errors[0] ?? "Dữ liệu không hợp lệ.");
    redirect(`/admin/places/new?${params.toString()}`);
  }

  params.set("created", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("slug", result.created?.placeSlug ?? result.draft.slug);
  params.set("scene", result.created?.sceneSlug ?? result.draft.sceneSlug);

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/places");
  redirect(`/admin/places/new?${params.toString()}`);
}

function IntakeStatus({
  state,
}: {
  state: Awaited<AdminNewPlacePageProps["searchParams"]>;
}) {
  if (state.created === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Đã ghi vào PostGIS." : "Dry-run hợp lệ, chưa ghi DB."}
        {state.slug ? ` Slug: ${state.slug}.` : ""}
      </p>
    );
  }

  if (state.created === "0") {
    return (
      <p className="publish-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "Dữ liệu không hợp lệ."}
      </p>
    );
  }

  return (
    <p className="muted-copy">
      Form này là bước đầu của admin import: nhập place, tạo scene nháp, rồi chuyển sang capture và asset pipeline.
    </p>
  );
}
