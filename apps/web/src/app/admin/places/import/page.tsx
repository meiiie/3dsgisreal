import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, FileSpreadsheet, MapPinned, TriangleAlert, UploadCloud } from "lucide-react";
import { redirect } from "next/navigation";

import {
  formDataToPlaceBulkImport,
  getSamplePlaceImportCsv,
  importPlacesFromCsv,
} from "@/features/places/server/place-bulk-import";

export const dynamic = "force-dynamic";

type AdminPlaceImportPageProps = {
  searchParams: Promise<{
    imported?: string;
    persisted?: string;
    total?: string;
    valid?: string;
    invalid?: string;
    error?: string;
  }>;
};

export default async function AdminPlaceImportPage({ searchParams }: AdminPlaceImportPageProps) {
  const state = await searchParams;

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href="/admin/places/new">
          Thêm từng địa điểm
        </Link>
        <Link className="secondary-button" href="/">
          <MapPinned size={16} /> Bản đồ
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Admin local</p>
          <h1>Import nhiều địa điểm bằng CSV</h1>
          <p>
            Dùng cho giai đoạn chuẩn bị map Hải Phòng: nhập nhanh place + scene nháp trước, sau đó mới đi capture,
            tạo processing job và publish asset 3D.
          </p>
        </div>
      </section>

      <section className="info-grid place-intake-grid" aria-label="Import CSV địa điểm">
        <article className="info-panel intake-panel">
          <h2>
            <FileSpreadsheet size={18} /> CSV place + scene
          </h2>
          <form action={importPlacesAction} className="intake-form">
            <label>
              <span>CSV</span>
              <textarea name="csv" rows={10} required defaultValue={getSamplePlaceImportCsv()} />
            </label>
            <label className="checkbox-line">
              <input name="dryRun" type="checkbox" value="true" defaultChecked />
              <span>Dry-run trước, chưa ghi PostGIS</span>
            </label>
            <button className="action-button" type="submit">
              <UploadCloud size={17} aria-hidden="true" /> Kiểm tra CSV
            </button>
          </form>
        </article>

        <article className="info-panel intake-help-panel">
          <h2>Trạng thái</h2>
          <ImportStatus state={state} />
          <h2>Cột hỗ trợ</h2>
          <ul className="plain-list">
            <li>
              Bắt buộc: <code>name, summary, address, lng, lat, sceneEntryLabel</code>.
            </li>
            <li>
              Nên có: <code>slug, category, city, sceneSlug, sceneTitle</code>.
            </li>
            <li>Mỗi lần import tối đa 50 dòng trong local lab.</li>
            <li>CSV phải validate toàn bộ batch trước; có lỗi thì không ghi dòng nào.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

async function importPlacesAction(formData: FormData) {
  "use server";

  const result = await importPlacesFromCsv(formDataToPlaceBulkImport(formData));
  const params = new URLSearchParams();

  params.set("imported", result.ok ? "1" : "0");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("total", String(result.summary.totalRows));
  params.set("valid", String(result.summary.validRows));
  params.set("invalid", String(result.summary.invalidRows));

  if (!result.ok) {
    params.set("error", result.errors[0] ?? "CSV không hợp lệ.");
    redirect(`/admin/places/import?${params.toString()}`);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/api/places");
  redirect(`/admin/places/import?${params.toString()}`);
}

function ImportStatus({
  state,
}: {
  state: Awaited<AdminPlaceImportPageProps["searchParams"]>;
}) {
  if (state.imported === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <FileSpreadsheet size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Đã import vào PostGIS." : "Dry-run hợp lệ, chưa ghi DB."} Tổng {state.total ?? 0}
        , hợp lệ {state.valid ?? 0}, lỗi {state.invalid ?? 0}.
      </p>
    );
  }

  if (state.imported === "0") {
    return (
      <p className="publish-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "CSV không hợp lệ."} Tổng {state.total ?? 0},
        hợp lệ {state.valid ?? 0}, lỗi {state.invalid ?? 0}.
      </p>
    );
  }

  return (
    <p className="muted-copy">
      Bắt đầu bằng dry-run. Khi Docker PostGIS chạy và bạn bỏ chọn dry-run, batch hợp lệ sẽ được ghi trong một transaction.
    </p>
  );
}
