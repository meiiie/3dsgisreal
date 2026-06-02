import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";

import {
  canAccessAdmin,
  localSessionChoices,
  type LocalSessionRole,
} from "@/features/identity/domain";
import {
  clearCurrentSession,
  getCurrentSession,
  setCurrentSession,
} from "@/features/identity/server/session";
import { sanitizeReturnPath } from "@/features/identity/session-cookie";

export const dynamic = "force-dynamic";

type SessionPageProps = {
  searchParams?: Promise<{
    access?: string;
    next?: string;
  }>;
};

export default async function SessionPage({ searchParams }: SessionPageProps) {
  const params = (await searchParams) ?? {};
  const session = await getCurrentSession();
  const nextPath = sanitizeReturnPath(params.next);
  const needsAdmin = params.access === "admin-required";
  const Icon = canAccessAdmin(session) ? ShieldCheck : UserRound;

  return (
    <main className="page-shell">
      <nav className="page-nav" aria-label="Dieu huong session">
        <Link className="secondary-button" href="/">
          <ArrowLeft size={16} /> Ban do
        </Link>
        <Link className="secondary-button" href="/user">
          User
        </Link>
        <Link className="secondary-button" href="/admin">
          Admin
        </Link>
      </nav>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Identity & Access local</p>
          <h1>Phien lam viec local</h1>
          <p>
            Chon vai tro de test luong user va admin tren cung mot app. Day la session local co ky HMAC,
            khong phai provider auth production.
          </p>
        </div>
        <div className="stat-strip" aria-label="Phien hien tai">
          <div>
            <strong>
              <Icon size={20} aria-hidden="true" /> {session.displayName}
            </strong>
            <span>{session.role}</span>
          </div>
          <div>
            <strong>{canAccessAdmin(session) ? "Co" : "Khong"}</strong>
            <span>Quyen admin</span>
          </div>
        </div>
      </section>

      {needsAdmin ? (
        <section className="inline-status inline-status-error" role="alert" aria-label="Can quyen admin">
          <strong>Can phien Admin local.</strong>
          <p>Trang hoac API admin chi mo khi cookie session co role admin/editor/reviewer/owner.</p>
        </section>
      ) : null}

      <section className="info-grid session-choice-grid" aria-label="Chon phien local">
        {(Object.keys(localSessionChoices) as LocalSessionRole[]).map((role) => {
          const choice = localSessionChoices[role];
          const active = session.role === role;

          return (
            <article className="info-panel session-choice-card" data-active={active} key={role}>
              <h2>{choice.displayName}</h2>
              <p className="muted-copy">{choice.description}</p>
              <div className="badge-row">
                <span>{role}</span>
                <span>{choice.projectRoles.length ? choice.projectRoles.join(", ") : "public user"}</span>
              </div>
              <form action={switchSessionAction}>
                <input type="hidden" name="role" value={role} />
                <input type="hidden" name="next" value={nextPath} />
                <button className={active ? "secondary-button" : "action-button"} type="submit">
                  {active ? "Dang dung" : "Chon phien nay"}
                </button>
              </form>
            </article>
          );
        })}

        <article className="info-panel session-choice-card">
          <h2>Reset ve mac dinh</h2>
          <p className="muted-copy">
            Xoa cookie session va quay ve phien student mac dinh. Admin routes se yeu cau chon lai Admin local.
          </p>
          <form action={clearSessionAction}>
            <input type="hidden" name="next" value="/" />
            <button className="secondary-button" type="submit">
              Xoa session
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

async function switchSessionAction(formData: FormData) {
  "use server";

  const role = readRole(formData.get("role"));
  const nextPath = sanitizeReturnPath(readString(formData.get("next")));

  await setCurrentSession(role);
  redirect(nextPath);
}

async function clearSessionAction(formData: FormData) {
  "use server";

  await clearCurrentSession();
  redirect(sanitizeReturnPath(readString(formData.get("next"))));
}

function readRole(value: FormDataEntryValue | null): LocalSessionRole {
  return value === "admin" ? "admin" : "student";
}

function readString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}
