import Link from "next/link";
import { Box, CheckCircle2, CircleAlert } from "lucide-react";

import { getSceneReadiness, sceneStatusLabels, type Place } from "@/features/places/domain";

type ViewerReadinessPanelProps = {
  place: Place;
};

export function ViewerReadinessPanel({ place }: ViewerReadinessPanelProps) {
  const readiness = getSceneReadiness(place.scene);

  return (
    <div className="viewer-empty">
      <Box size={34} />
      <h2>{place.name}</h2>
      <p>
        Scene này đang ở trạng thái {sceneStatusLabels[place.scene.status].toLowerCase()}. Viewer sẽ mở khi có
        SOG content; walkthrough đầy đủ cần thêm settings.json và collision.
      </p>

      <ul className="asset-checklist" aria-label="Tình trạng asset scene">
        {readiness.checklist.map((item) => (
          <li key={item.kind} data-ready={item.available}>
            {item.available ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>

      <Link className="secondary-button dark" href={`/places/${place.slug}`}>
        Xem hồ sơ địa điểm
      </Link>
    </div>
  );
}
