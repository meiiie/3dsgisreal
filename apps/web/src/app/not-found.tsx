import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="viewer-shell">
      <header className="viewer-topbar">
        <Link className="icon-button" href="/" title="Quay lại bản đồ" aria-label="Quay lại bản đồ">
          <ArrowLeft size={17} />
        </Link>
        <h1 className="viewer-title">Không tìm thấy scene</h1>
        <span />
      </header>
      <section className="viewer-stage">
        <div className="viewer-empty">
          <p>Scene không tồn tại trong manifest hiện tại.</p>
        </div>
      </section>
    </main>
  );
}
