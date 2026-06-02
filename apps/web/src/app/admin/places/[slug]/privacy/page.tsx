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

import { privacyStatusLabels, sceneStatusLabels } from "@/features/places/domain";
import {
  formDataToPlacePrivacyReview,
  getAdminPlacePrivacyReview,
  privacyChecklistItems,
  privacyReviewDecisionLabels,
  privacyReviewDecisions,
  savePlacePrivacyReviewFromInput,
  type PlacePrivacyReviewDecision,
} from "@/features/places/server/place-privacy-review";

export const dynamic = "force-dynamic";

type AdminPlacePrivacyPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    reviewed?: string;
    persisted?: string;
    decision?: string;
    error?: string;
  }>;
};

export default async function AdminPlacePrivacyPage({
  params,
  searchParams,
}: AdminPlacePrivacyPageProps) {
  const [{ slug }, state] = await Promise.all([params, searchParams]);
  const review = await getAdminPlacePrivacyReview(slug);

  if (!review) {
    notFound();
  }

  const { place, latestReview, defaultDraft } = review;
  const selectedDecision = privacyReviewDecisions.includes(state.decision as PlacePrivacyReviewDecision)
    ? (state.decision as PlacePrivacyReviewDecision)
    : defaultDraft.decision;

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href={`/admin/places/${place.slug}/review`}>
          <ShieldCheck size={16} /> Review status
        </Link>
        <Link className="secondary-button" href={`/admin/places/${place.slug}/edit`}>
          <PencilLine size={16} /> Sửa metadata
        </Link>
        <Link className="secondary-button" href={`/places/${place.slug}`}>
          <MapPinned size={16} /> Hồ sơ địa điểm
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Privacy checklist</p>
          <h1>{place.name}</h1>
          <p>
            Kiểm tra quyền quay, địa chỉ, người xuất hiện, đồ cá nhân, audio/hotspot và raw capture trước khi
            đưa địa điểm vào pilot công khai.
          </p>
        </div>
        <div className="stat-strip" aria-label="Tổng quan privacy">
          <div>
            <strong>{latestReview ? privacyReviewDecisionLabels[latestReview.decision] : "Chưa có"}</strong>
            <span>Review mới nhất</span>
          </div>
          <div>
            <strong>{privacyStatusLabels[place.privacyStatus]}</strong>
            <span>Privacy status</span>
          </div>
          <div>
            <strong>{sceneStatusLabels[place.scene.status]}</strong>
            <span>Scene</span>
          </div>
        </div>
      </section>

      <section className="info-grid place-intake-grid privacy-checklist-grid" aria-label="Privacy checklist">
        <article className="info-panel intake-panel">
          <h2>
            <ShieldCheck size={18} /> Checklist public
          </h2>
          <PlacePrivacyMessage state={state} />
          <form action={savePrivacyReviewAction} className="intake-form privacy-checklist-form">
            <input type="hidden" name="placeSlug" value={place.slug} />
            <label>
              <span>Quyết định</span>
              <select name="decision" defaultValue={selectedDecision}>
                {privacyReviewDecisions.map((decision) => (
                  <option key={decision} value={decision}>
                    {privacyReviewDecisionLabels[decision]}
                  </option>
                ))}
              </select>
            </label>

            <div className="privacy-checklist" role="group" aria-label="Các mục privacy cần xác nhận">
              {privacyChecklistItems.map((item) => (
                <label className="privacy-check-item" key={item.key}>
                  <input
                    name={item.key}
                    type="checkbox"
                    value="true"
                    defaultChecked={defaultDraft.checks[item.key]}
                  />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.help}</small>
                  </span>
                </label>
              ))}
            </div>

            <label>
              <span>Ghi chú operator</span>
              <textarea
                name="notes"
                rows={4}
                maxLength={600}
                defaultValue={defaultDraft.notes}
                placeholder="Ví dụ: cần quay lại tránh biển số xe, hoặc đã xin quyền chủ quán ngày..."
              />
            </label>

            <div className="button-row">
              <button className="secondary-button" name="dryRun" type="submit" value="true">
                <FileClock size={17} aria-hidden="true" /> Kiểm tra dry-run
              </button>
              <button className="action-button" type="submit">
                <ShieldCheck size={17} aria-hidden="true" /> Lưu checklist
              </button>
            </div>
          </form>
        </article>

        <article className="info-panel intake-help-panel">
          <h2>Review mới nhất</h2>
          {latestReview ? (
            <dl className="detail-list">
              <div>
                <dt>Quyết định</dt>
                <dd>{privacyReviewDecisionLabels[latestReview.decision]}</dd>
              </div>
              <div>
                <dt>Nguồn</dt>
                <dd>{latestReview.source}</dd>
              </div>
              <div>
                <dt>Thời điểm</dt>
                <dd>{new Date(latestReview.createdAt).toLocaleString("vi-VN")}</dd>
              </div>
              <div>
                <dt>Ghi chú</dt>
                <dd>{latestReview.notes || "Chưa có ghi chú."}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted-copy">Chưa có checklist. Hãy dry-run trước nếu chỉ muốn kiểm tra hợp đồng form/API.</p>
          )}

          <h2>Không tự public</h2>
          <p className="muted-copy">
            Checklist này chỉ tạo bằng chứng privacy. Muốn đổi trạng thái địa điểm, dùng trang Review status để giữ
            quyền riêng tư, asset readiness và publication là các bước riêng.
          </p>
        </article>
      </section>
    </main>
  );
}

async function savePrivacyReviewAction(formData: FormData) {
  "use server";

  const result = await savePlacePrivacyReviewFromInput(formDataToPlacePrivacyReview(formData));
  const placeSlug = String(formData.get("placeSlug") ?? "");
  const params = new URLSearchParams();

  if (!result.ok) {
    params.set("reviewed", "0");
    params.set("error", result.errors[0] ?? "Không lưu được privacy checklist.");
    redirect(`/admin/places/${placeSlug}/privacy?${params.toString()}`);
  }

  params.set("reviewed", "1");
  params.set("persisted", result.persisted ? "1" : "0");
  params.set("decision", result.created?.decision ?? result.draft.decision);

  revalidatePath("/admin");
  revalidatePath("/admin/review");
  revalidatePath(`/admin/places/${placeSlug}/privacy`);
  revalidatePath(`/admin/places/${placeSlug}/review`);
  revalidatePath(`/api/admin/places/${placeSlug}/privacy`);
  redirect(`/admin/places/${placeSlug}/privacy?${params.toString()}`);
}

function PlacePrivacyMessage({
  state,
}: {
  state: Awaited<AdminPlacePrivacyPageProps["searchParams"]>;
}) {
  if (state.reviewed === "1") {
    return (
      <p className="publish-status" aria-live="polite">
        <CheckCircle2 size={16} aria-hidden="true" />
        {state.persisted === "1" ? "Đã lưu checklist vào PostGIS." : "Dry-run hợp lệ, chưa ghi DB."}
        {state.decision ? ` Decision: ${state.decision}.` : ""}
      </p>
    );
  }

  if (state.reviewed === "0") {
    return (
      <p className="publish-error" role="alert">
        <TriangleAlert size={16} aria-hidden="true" /> {state.error ?? "Không lưu được privacy checklist."}
      </p>
    );
  }

  return (
    <p className="muted-copy">
      Chọn approve chỉ khi tất cả mục đã được xác nhận. Nếu còn rủi ro, để Cần bổ sung hoặc Chặn public.
    </p>
  );
}
