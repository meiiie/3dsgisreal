import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileClock,
  ImageUp,
  ListChecks,
  MapPinned,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

import type { AdminReviewQueue, AdminReviewQueueItem } from "@/features/admin/domain";
import { getAdminReviewQueues } from "@/features/admin/server/review-queues";

export const dynamic = "force-dynamic";

const queueIcons: Record<AdminReviewQueue["id"], ComponentType<{ size?: number }>> = {
  needsPermission: ShieldCheck,
  needsCapture: ImageUp,
  processing: ServerCog,
  readyToPublish: FileClock,
  published: CheckCircle2,
};

export default async function AdminReviewPage() {
  const reviewQueues = await getAdminReviewQueues();

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Điều hướng">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href="/">
          <MapPinned size={16} /> Bản đồ
        </Link>
        <Link className="secondary-button" href="/api/admin/review">
          API review
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Admin/Ops</p>
          <h1>Review queues</h1>
          <p>
            Gom các địa điểm, scene và job GPU theo việc cần làm tiếp theo: quyền quay, capture,
            xử lý GPU, publish asset, và kiểm tra trải nghiệm đã công khai.
          </p>
        </div>
        <div className="stat-strip" aria-label="Tổng quan review queue">
          {reviewQueues.queues.map((queue) => (
            <div key={queue.id}>
              <strong>{queue.items.length}</strong>
              <span>{queue.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="info-grid review-queue-grid" aria-label="Review queues">
        {reviewQueues.queues.map((queue) => (
          <QueuePanel key={queue.id} queue={queue} />
        ))}
      </section>
    </main>
  );
}

function QueuePanel({ queue }: { queue: AdminReviewQueue }) {
  const Icon = queueIcons[queue.id] ?? ListChecks;

  return (
    <article className="info-panel review-queue-panel" data-queue={queue.id}>
      <h2>
        <Icon size={18} /> {queue.title}
      </h2>
      <p className="muted-copy">{queue.description}</p>
      {queue.items.length === 0 ? (
        <p className="queue-empty">{queue.emptyLabel}</p>
      ) : (
        <ul className="review-queue-list">
          {queue.items.map((item) => (
            <QueueItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </article>
  );
}

function QueueItem({ item }: { item: AdminReviewQueueItem }) {
  return (
    <li className="review-queue-item" data-priority={item.priority}>
      <div className="queue-item-heading">
        <div>
          <strong>{item.title}</strong>
          <span>{item.subtitle}</span>
        </div>
        <span className="place-badge">{item.priority === "high" ? "Ưu tiên" : item.kind}</span>
      </div>
      <p>{item.statusLine}</p>
      <p>{item.context}</p>
      <p>{item.nextAction}</p>
      <Link className="secondary-button" href={item.href}>
        {item.actionLabel}
      </Link>
    </li>
  );
}
