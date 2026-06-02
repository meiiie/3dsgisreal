import Link from "next/link";
import { ArrowLeft, Bookmark, Box, CheckCircle2, CircleHelp, Clock, MapPinned, Route } from "lucide-react";

import { categoryLabels, isSceneEnterable, sceneStatusLabels } from "@/features/places/domain";
import { getCurrentSession } from "@/features/identity/server/session";
import {
  getUserPlaceNextAction,
  userLibraryStatusLabels,
  type UserPlaceItem,
  type UserQuizAttemptItem,
} from "@/features/user/domain";
import { getUserDashboard } from "@/features/user/server/repository";

export const dynamic = "force-dynamic";

export default async function UserPage() {
  const session = await getCurrentSession();
  const dashboard = await getUserDashboard(session.profileId);

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/">
          <ArrowLeft size={16} /> Bản đồ
        </Link>
        <Link className="secondary-button" href="/api/user">
          API user
        </Link>
        <Link className="secondary-button" href="/admin">
          Admin
        </Link>
        <Link className="secondary-button" href="/session">
          Session
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">User local</p>
          <h1>Không gian của {dashboard.profile.displayName}</h1>
          <p>
            Theo dõi những địa điểm đã lưu, scene đã xem và luồng quay lại bản đồ. Đây là bề mặt user local trước khi
            thêm auth thật.
          </p>
        </div>
        <div className="stat-strip" aria-label="Tổng quan user">
          <div>
            <strong>{dashboard.items.length}</strong>
            <span>Địa điểm</span>
          </div>
          <div>
            <strong>{dashboard.statusCounts.saved}</strong>
            <span>Đã lưu</span>
          </div>
          <div>
            <strong>{dashboard.statusCounts.visited}</strong>
            <span>Đã xem</span>
          </div>
          <div>
            <strong>{dashboard.statusCounts.checked_in}</strong>
            <span>Check-in</span>
          </div>
          <div>
            <strong>
              {dashboard.quizStats.correct}/{dashboard.quizStats.total}
            </strong>
            <span>Quiz đúng</span>
          </div>
        </div>
      </section>

      <section className="info-grid user-dashboard-grid" aria-label="Không gian của user">
        <article className="info-panel user-continue-panel">
          <h2>
            <Clock size={18} /> Tiếp tục
          </h2>
          <ul className="work-list">
            {dashboard.continueItems.map((item) => (
              <li key={item.place.id}>
                <Link href={`/places/${item.place.slug}`}>{item.place.name}</Link>
                <span>{getUserPlaceNextAction(item)}</span>
                <span>{item.lastViewedAt ? `Xem gần nhất: ${formatDate(item.lastViewedAt)}` : "Đang chờ scene xử lý"}</span>
              </li>
            ))}
          </ul>
        </article>

        <QuizHistoryPanel attempts={dashboard.quizAttempts} />

        {dashboard.items.map((item) => (
          <UserPlaceCard item={item} key={item.place.id} />
        ))}
      </section>
    </main>
  );
}

function QuizHistoryPanel({ attempts }: { attempts: UserQuizAttemptItem[] }) {
  return (
    <article className="info-panel user-quiz-panel">
      <h2>
        <CircleHelp size={18} /> Quiz gần đây
      </h2>
      {attempts.length > 0 ? (
        <ul className="quiz-attempt-list">
          {attempts.map((attempt) => (
            <li data-correct={attempt.correct} key={attempt.id}>
              <div>
                <Link href={`/viewer/${attempt.place.scene.id}`}>{attempt.place.name}</Link>
                <span>{attempt.hotspotTitle}</span>
              </div>
              <p>{attempt.question}</p>
              <div className="quiz-attempt-meta">
                <span>{attempt.selectedOption || `Đáp án #${attempt.selectedIndex + 1}`}</span>
                <span>{attempt.correct ? "Đúng" : "Chưa đúng"}</span>
                <span>{formatDate(attempt.answeredAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted-copy">Chưa có quiz nào được trả lời trong viewer.</p>
      )}
    </article>
  );
}

function UserPlaceCard({ item }: { item: UserPlaceItem }) {
  const canEnterScene = isSceneEnterable(item.place.scene);

  return (
    <article className="info-panel user-place-card">
      <div className="user-place-heading">
        <div>
          <p className="eyebrow">{categoryLabels[item.place.category]}</p>
          <h2>{item.place.name}</h2>
        </div>
        <span data-status={item.status}>{userLibraryStatusLabels[item.status]}</span>
      </div>
      <p className="muted-copy">{item.place.summary}</p>
      <p className="icon-line">
        <Route size={16} /> {item.place.routeHint}
      </p>
      <div className="badge-row">
        <span>
          <Bookmark size={14} /> {formatDate(item.savedAt)}
        </span>
        <span>
          <CheckCircle2 size={14} /> {sceneStatusLabels[item.place.scene.status]}
        </span>
      </div>
      <p className="muted-copy">{item.note}</p>
      <div className="place-actions">
        <Link className="secondary-button" href={`/places/${item.place.slug}`}>
          <MapPinned size={16} /> Hồ sơ
        </Link>
        {canEnterScene ? (
          <Link className="action-button" href={`/viewer/${item.place.scene.id}`}>
            <Box size={17} /> Mở 3D
          </Link>
        ) : (
          <span className="action-button" aria-disabled="true">
            <Box size={17} /> Chưa có 3D
          </span>
        )}
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}
