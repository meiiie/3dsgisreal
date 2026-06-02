import { Pencil, Trash2 } from "lucide-react";

import {
  sceneHotspotKindLabels,
  type SceneHotspot,
  type SceneHotspotKind,
} from "@/features/places/domain";
import { hotspotToPayloadJson } from "@/features/scenes/server/hotspot-intake";

import { deleteHotspotAction, updateHotspotAction } from "./actions";

const hotspotKinds = Object.keys(sceneHotspotKindLabels) as SceneHotspotKind[];

export function HotspotEditorList({
  hotspots,
  sceneSlug,
}: {
  hotspots: SceneHotspot[];
  sceneSlug: string;
}) {
  if (hotspots.length === 0) {
    return <p className="muted-copy">Scene nay chua co hotspot.</p>;
  }

  return (
    <ul className="work-list">
      {hotspots.map((hotspot, index) => (
        <li key={hotspot.id}>
          <strong>{hotspot.title}</strong>
          <span>
            {sceneHotspotKindLabels[hotspot.kind]} - x {hotspot.position.x.toFixed(1)}, y{" "}
            {hotspot.position.y.toFixed(1)}, z {hotspot.position.z.toFixed(1)}
          </span>
          <span>{hotspot.body}</span>
          <code>{hotspotToPayloadJson(hotspot)}</code>
          <details suppressHydrationWarning>
            <summary>Sua / xoa hotspot</summary>
            <form action={updateHotspotAction} className="intake-form hotspot-edit-form">
              <input type="hidden" name="sceneSlug" value={sceneSlug} />
              <input type="hidden" name="hotspotId" value={hotspot.id} />

              <div className="form-grid">
                <label>
                  <span>Loai hotspot</span>
                  <select name="kind" defaultValue={hotspot.kind}>
                    {hotspotKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {sceneHotspotKindLabels[kind]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Sort order</span>
                  <input
                    name="sortOrder"
                    type="number"
                    min={0}
                    max={9999}
                    defaultValue={getHotspotSortOrder(hotspot, index)}
                  />
                </label>
              </div>

              <label>
                <span>Tieu de</span>
                <input name="title" defaultValue={hotspot.title} required minLength={3} />
              </label>

              <label>
                <span>Noi dung</span>
                <textarea name="body" rows={3} defaultValue={hotspot.body} required minLength={8} />
              </label>

              <div className="form-grid">
                <label>
                  <span>X</span>
                  <input name="x" type="number" step="0.1" defaultValue={hotspot.position.x} required />
                </label>
                <label>
                  <span>Y</span>
                  <input name="y" type="number" step="0.1" defaultValue={hotspot.position.y} required />
                </label>
                <label>
                  <span>Z</span>
                  <input name="z" type="number" step="0.1" defaultValue={hotspot.position.z} required />
                </label>
                <label>
                  <span>Yaw</span>
                  <input name="yaw" type="number" step="1" defaultValue={readHotspotYaw(hotspot)} required />
                </label>
              </div>

              <label>
                <span>Payload JSON</span>
                <textarea name="payloadJson" rows={6} defaultValue={hotspotToPayloadJson(hotspot)} spellCheck={false} />
              </label>

              <div className="button-row">
                <button className="secondary-button" type="submit" name="dryRun" value="true">
                  <Pencil size={16} aria-hidden="true" /> Kiem tra sua
                </button>
                <button className="action-button" type="submit">
                  <Pencil size={16} aria-hidden="true" /> Luu sua
                </button>
              </div>
            </form>

            <form action={deleteHotspotAction} className="intake-form hotspot-delete-form">
              <input type="hidden" name="sceneSlug" value={sceneSlug} />
              <input type="hidden" name="hotspotId" value={hotspot.id} />
              <label>
                <span>Xac nhan xoa</span>
                <input name="confirmDelete" type="checkbox" value="true" required />
              </label>
              <div className="button-row">
                <button className="secondary-button" type="submit" name="dryRun" value="true">
                  <Trash2 size={16} aria-hidden="true" /> Kiem tra xoa
                </button>
                <button className="action-button" type="submit">
                  <Trash2 size={16} aria-hidden="true" /> Xoa hotspot
                </button>
              </div>
            </form>
          </details>
        </li>
      ))}
    </ul>
  );
}

function getHotspotSortOrder(hotspot: SceneHotspot, index: number) {
  return typeof hotspot.sortOrder === "number" && Number.isInteger(hotspot.sortOrder)
    ? hotspot.sortOrder
    : (index + 1) * 10;
}

function readHotspotYaw(hotspot: SceneHotspot) {
  const yaw = hotspot.rotation?.yaw;
  return typeof yaw === "number" && Number.isFinite(yaw) ? yaw : 0;
}
