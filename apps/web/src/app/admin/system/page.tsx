import Link from "next/link";
import { ArrowLeft, Database, HardDrive, ServerCog, ShieldCheck } from "lucide-react";

import { getSystemVerdict } from "@/features/system/domain";
import { getSystemRuntimeStatus } from "@/features/system/server/repository";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const status = await getSystemRuntimeStatus();
  const verdict = getSystemVerdict(status);
  const requiredTables = status.database.status?.requiredTables ?? {};

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Dieu huong system">
        <Link className="secondary-button" href="/admin">
          <ArrowLeft size={16} /> Admin
        </Link>
        <Link className="secondary-button" href="/api/admin/system">
          API system
        </Link>
        <Link className="secondary-button" href="/session">
          Session
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Admin/Ops</p>
          <h1>System health local</h1>
          <p>Kiem tra app, PostGIS, migration va object-storage config truoc khi dua scene that vao viewer.</p>
        </div>
        <div className="stat-strip" aria-label="Trang thai runtime">
          <div>
            <strong>{verdict.label}</strong>
            <span>{status.database.source}</span>
          </div>
          <div>
            <strong>{status.database.status?.appliedMigrationCount ?? 0}</strong>
            <span>Migration</span>
          </div>
          <div>
            <strong>{status.checks.storageReady ? "Ready" : status.checks.storageConfigured ? "Check" : "Thieu"}</strong>
            <span>Storage</span>
          </div>
        </div>
      </section>

      <section className="inline-status" data-state={verdict.state} aria-label="Ket luan system">
        <strong>{verdict.label}</strong>
        <p>{verdict.detail}</p>
      </section>

      <section className="info-grid system-health-grid" aria-label="System health">
        <article className="info-panel">
          <h2>
            <ServerCog size={18} /> App runtime
          </h2>
          <dl className="meta-list">
            <div>
              <dt>Service</dt>
              <dd>{status.app.service}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{status.app.mode}</dd>
            </div>
            <div>
              <dt>Node env</dt>
              <dd>{status.app.nodeEnv}</dd>
            </div>
          </dl>
        </article>

        <article className="info-panel">
          <h2>
            <Database size={18} /> PostGIS
          </h2>
          <dl className="meta-list">
            <div>
              <dt>DATABASE_URL</dt>
              <dd>{status.database.configured ? "Da cau hinh" : "Chua bat"}</dd>
            </div>
            <div>
              <dt>Ket noi</dt>
              <dd>{status.checks.databaseReady ? "Ready" : "Chua san sang"}</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>{status.database.status?.databaseName || "sample fallback"}</dd>
            </div>
            <div>
              <dt>PostGIS extension</dt>
              <dd>{status.database.status?.postgisAvailable ? "Co" : "Chua xac nhan"}</dd>
            </div>
            <div>
              <dt>Loi</dt>
              <dd>{status.database.error || "Khong co"}</dd>
            </div>
          </dl>
        </article>

        <article className="info-panel">
          <h2>
            <ShieldCheck size={18} /> Migration/schema
          </h2>
          <dl className="meta-list">
            <div>
              <dt>schema_migrations</dt>
              <dd>{status.database.status?.migrationTableExists ? "Co" : "Chua co"}</dd>
            </div>
            <div>
              <dt>Latest</dt>
              <dd>{status.database.status?.latestMigration || "Chua ap dung"}</dd>
            </div>
          </dl>
          <ul className="plain-list compact-table-list">
            {Object.entries(requiredTables).length > 0 ? (
              Object.entries(requiredTables).map(([name, ready]) => (
                <li key={name}>
                  <code>{name}</code>
                  <span>{ready ? "ready" : "missing"}</span>
                </li>
              ))
            ) : (
              <li>
                <code>sample-repository</code>
                <span>DATABASE_URL chua bat</span>
              </li>
            )}
          </ul>
        </article>

        <article className="info-panel">
          <h2>
            <HardDrive size={18} /> Storage config
          </h2>
          <dl className="meta-list">
            <div>
              <dt>Scene bucket</dt>
              <dd>{status.storage.sceneAssetsBucket || "Chua cau hinh"}</dd>
            </div>
            <div>
              <dt>Raw capture bucket</dt>
              <dd>{status.storage.rawCaptureBucket || "Chua cau hinh"}</dd>
            </div>
            <div>
              <dt>Scene public base</dt>
              <dd>{status.storage.sceneAssetsPublicBaseUrl || "Local /scene-assets fallback"}</dd>
            </div>
            <div>
              <dt>S3 endpoint</dt>
              <dd>{status.storage.s3EndpointConfigured ? "Da cau hinh" : "Chua cau hinh"}</dd>
            </div>
            <div>
              <dt>S3 credentials</dt>
              <dd>{status.storage.credentialsConfigured ? "Da cau hinh" : "Chua cau hinh"}</dd>
            </div>
            <div>
              <dt>Ket noi bucket</dt>
              <dd>{status.checks.storageReady ? "Ready" : "Chua san sang"}</dd>
            </div>
            <div>
              <dt>Loi</dt>
              <dd>{status.storage.status.error || "Khong co"}</dd>
            </div>
          </dl>
          <ul className="plain-list compact-table-list">
            <li>
              <code>{status.storage.status.buckets.sceneAssets.name || "scene-assets"}</code>
              <span>{status.storage.status.buckets.sceneAssets.exists ? "ready" : "missing"}</span>
            </li>
            <li>
              <code>{status.storage.status.buckets.rawCaptures.name || "raw-captures"}</code>
              <span>{status.storage.status.buckets.rawCaptures.exists ? "ready" : "missing"}</span>
            </li>
          </ul>
        </article>
      </section>
    </main>
  );
}
