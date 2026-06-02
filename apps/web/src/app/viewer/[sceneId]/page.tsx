import Link from "next/link";
import { createSuperSplatViewerUrl } from "@loi-vao/assets";
import { ArrowLeft, Map } from "lucide-react";
import { notFound } from "next/navigation";

import { isSceneEnterable } from "@/features/places/domain";
import { getPlaceBySceneId, listSceneHotspots } from "@/features/places/server/repository";
import { SceneInteractionPanel } from "@/features/viewer/SceneInteractionPanel";
import { ViewerReadinessPanel } from "@/features/viewer/ViewerReadinessPanel";

export const dynamic = "force-dynamic";

type ViewerPageProps = {
  params: Promise<{
    sceneId: string;
  }>;
  searchParams: Promise<{
    checkin?: string;
    persisted?: string;
    hotspot?: string;
    error?: string;
    quiz?: string;
    quizPersisted?: string;
    quizHotspot?: string;
    quizSelected?: string;
    quizCorrect?: string;
    quizError?: string;
  }>;
};

export default async function ViewerPage({ params, searchParams }: ViewerPageProps) {
  const [{ sceneId }, checkInState] = await Promise.all([params, searchParams]);
  const [place, hotspots] = await Promise.all([getPlaceBySceneId(sceneId), listSceneHotspots(sceneId)]);

  if (!place) {
    notFound();
  }

  const scene = place.scene;
  const viewerUrl = createSuperSplatViewerUrl(scene);

  return (
    <main className="viewer-shell">
      <header className="viewer-topbar">
        <Link className="icon-button" href="/" title="Quay lại bản đồ" aria-label="Quay lại bản đồ">
          <ArrowLeft size={17} />
        </Link>
        <h1 className="viewer-title">{scene.title}</h1>
        <Link className="icon-button" href="/" title="Bản đồ" aria-label="Bản đồ">
          <Map size={17} />
        </Link>
      </header>

      <section className="viewer-stage">
        <div className="viewer-workspace">
          <div className="viewer-canvas-slot">
            {isSceneEnterable(scene) && viewerUrl ? (
              <iframe
                title={scene.title}
                src={viewerUrl}
                style={{ width: "100%", height: "100%", border: 0 }}
                allow="fullscreen; xr-spatial-tracking"
              />
            ) : (
              <ViewerReadinessPanel place={place} />
            )}
          </div>
          <SceneInteractionPanel
            checkInState={{
              error: checkInState.error,
              hotspotId: checkInState.hotspot,
              persisted: checkInState.persisted,
              status: checkInState.checkin,
            }}
            quizState={{
              correct: checkInState.quizCorrect,
              error: checkInState.quizError,
              hotspotId: checkInState.quizHotspot,
              persisted: checkInState.quizPersisted,
              selected: checkInState.quizSelected,
              status: checkInState.quiz,
            }}
            sceneId={scene.id}
            hotspots={hotspots}
          />
        </div>
      </section>
    </main>
  );
}
