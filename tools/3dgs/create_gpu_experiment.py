#!/usr/bin/env python3
"""Create a local pre-GPU experiment folder and command runbooks."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "artifacts" / "gpu-experiments"


@dataclass(frozen=True)
class Experiment:
    scene_id: str
    place_slug: str
    run_id: str
    capture_mode: str
    raw_input: str
    remote_raw_input: str
    raw_asset_key: str
    frame_target: int
    provider: str
    gpu_type: str
    toolchain: str
    asset_version: int
    experiment_dir: str


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        experiment = build_experiment(args)
        files = build_files(experiment)
        if not args.dry_run:
            write_files(Path(experiment.experiment_dir), files, args.overwrite)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    payload = {
        "dryRun": args.dry_run,
        "experiment": asdict(experiment),
        "files": sorted(files.keys()),
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=True, indent=2))
    else:
        print_summary(payload)

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create a pre-GPU experiment folder with capture/job payloads and RunPod commands.",
    )
    parser.add_argument("--scene-id", required=True, help="Scene slug/id, for example home-test-room-v1.")
    parser.add_argument("--place-slug", default="", help="Place slug for admin capture payload.")
    parser.add_argument("--run-id", default="", help="Stable run id. Default: UTC timestamp.")
    parser.add_argument(
        "--capture-mode",
        choices=("video", "images"),
        default="video",
        help="Nerfstudio input mode. Default: video.",
    )
    parser.add_argument("--raw-input", default="", help="Local raw video file or image folder path.")
    parser.add_argument("--raw-name", default="", help="Remote raw filename/folder name if raw input is not local yet.")
    parser.add_argument("--raw-asset-key", default="", help="Raw capture key. Default: raw-captures/<scene>/<run>/<raw-name>.")
    parser.add_argument("--frame-target", type=bounded_frame_target, default=400, help="Video frame target, 100-1200.")
    parser.add_argument("--provider", default="runpod", help="GPU provider label for the generated payload.")
    parser.add_argument("--gpu-type", default="RTX 4090", help="GPU type label for the generated payload.")
    parser.add_argument("--toolchain", default="nerfstudio-splatfacto-gsplat", help="Toolchain label.")
    parser.add_argument("--asset-version", type=positive_int, default=1, help="Runtime asset version for local publish commands.")
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT, help=f"Default: {DEFAULT_OUTPUT_ROOT}")
    parser.add_argument("--dry-run", action="store_true", help="Print plan without creating files.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite an existing experiment folder.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    return parser


def build_experiment(args: argparse.Namespace) -> Experiment:
    scene_id = require_safe_segment(args.scene_id, "scene id")
    run_id = require_safe_segment(args.run_id or utc_run_id(), "run id")
    raw_name = infer_raw_name(args)
    remote_raw_input = f"/workspace/loi-vao/raw/{raw_name}"
    raw_asset_key = normalize_raw_asset_key(args.raw_asset_key or f"raw-captures/{scene_id}/{run_id}/{raw_name}")
    experiment_dir = (args.output_root / scene_id / run_id).resolve()

    return Experiment(
        scene_id=scene_id,
        place_slug=args.place_slug.strip(),
        run_id=run_id,
        capture_mode=args.capture_mode,
        raw_input=args.raw_input.strip(),
        remote_raw_input=remote_raw_input,
        raw_asset_key=raw_asset_key,
        frame_target=args.frame_target,
        provider=args.provider.strip() or "runpod",
        gpu_type=args.gpu_type.strip() or "RTX 4090",
        toolchain=args.toolchain.strip() or "nerfstudio-splatfacto-gsplat",
        asset_version=args.asset_version,
        experiment_dir=str(experiment_dir),
    )


def build_files(experiment: Experiment) -> dict[str, str]:
    capture_payload = {
        "placeSlug": experiment.place_slug or "<fill-place-slug>",
        "sceneSlug": experiment.scene_id,
        "device": "iPhone 14 Pro",
        "captureMode": "video" if experiment.capture_mode == "video" else "photos",
        "capturedAt": datetime.now(timezone.utc).isoformat(),
        "rawAssetKey": experiment.raw_asset_key,
        "notes": (
            f"{experiment.run_id}: RGB-first capture for Nerfstudio. "
            "LiDAR/Scaniverse is optional support for scale/collision only."
        ),
        "dryRun": True,
    }
    processing_payload = {
        "captureSessionId": "<fill-created-capture-session-id>",
        "provider": experiment.provider,
        "gpuType": experiment.gpu_type,
        "toolchain": experiment.toolchain,
        "frameTarget": experiment.frame_target,
        "logKey": f"processing/{experiment.scene_id}/{experiment.run_id}/nerfstudio.log",
        "notes": f"{experiment.run_id}: first GPU run. Pass criteria: COLMAP ok, PLY export ok.",
        "dryRun": True,
    }

    return {
        "README.md": render_readme(experiment),
        "experiment.json": json.dumps(asdict(experiment), ensure_ascii=True, indent=2) + "\n",
        "admin-capture-payload.json": json.dumps(capture_payload, ensure_ascii=True, indent=2) + "\n",
        "admin-processing-job-payload.json": json.dumps(processing_payload, ensure_ascii=True, indent=2) + "\n",
        "runpod-nerfstudio.sh": render_runpod_script(experiment),
        "postprocess-local.ps1": render_postprocess_script(experiment),
    }


def write_files(experiment_dir: Path, files: dict[str, str], overwrite: bool) -> None:
    if experiment_dir.exists() and not overwrite:
        raise ValueError(f"experiment folder exists; use --overwrite: {experiment_dir}")

    experiment_dir.mkdir(parents=True, exist_ok=True)

    for filename, content in files.items():
        (experiment_dir / filename).write_text(content, encoding="utf-8", newline="\n")


def render_readme(experiment: Experiment) -> str:
    return f"""# GPU Experiment {experiment.run_id}

Scene: `{experiment.scene_id}`
Provider target: `{experiment.provider}` / `{experiment.gpu_type}`
Toolchain: `{experiment.toolchain}`

## Before Renting

1. Keep the raw capture outside git.
2. Upload raw media with `pnpm captures:upload -- --input <raw> --scene-id {experiment.scene_id} --take-id {experiment.run_id} --dry-run`.
3. Register the capture through `/admin/captures/new` or use `admin-capture-payload.json`.
4. Create a processing job through `/admin/processing/new`; copy the created capture id into `admin-processing-job-payload.json`.
5. Only start the GPU after the local admin system page reports PostGIS/MinIO ready.

## On GPU

Copy the raw media to:

```text
{experiment.remote_raw_input}
```

Then run:

```bash
bash runpod-nerfstudio.sh
```

Download the export folder and logs before stopping or terminating the pod.

## After GPU

1. Open the exported PLY in SuperSplat.
2. Crop floaters, align the entry view, and export runtime files.
3. Put `scene.sog`, `settings.json`, `collision.voxel.json`, and `poster.webp` in the local `published` folder.
4. Confirm the scene version shown by `/admin/scenes/{experiment.scene_id}/assets`.
5. Run `postprocess-local.ps1` from the repo root after checking the paths and `$Version` inside it.
6. Verify `/admin/scenes/{experiment.scene_id}/assets` and `/api/scenes/{experiment.scene_id}/manifest`.
"""


def render_runpod_script(experiment: Experiment) -> str:
    process_command = (
        'ns-process-data video --data "$RAW_INPUT" --output-dir "$PROCESSED_DIR" '
        '--num-frames-target "$FRAME_TARGET"'
        if experiment.capture_mode == "video"
        else 'ns-process-data images --data "$RAW_INPUT" --output-dir "$PROCESSED_DIR"'
    )

    return f"""#!/usr/bin/env bash
set -euo pipefail

SCENE_ID="{experiment.scene_id}"
RUN_ID="{experiment.run_id}"
FRAME_TARGET="{experiment.frame_target}"
RAW_INPUT="{experiment.remote_raw_input}"
WORK_ROOT="/workspace/loi-vao/${{SCENE_ID}}/${{RUN_ID}}"
PROCESSED_DIR="${{WORK_ROOT}}/processed"
EXPORT_DIR="${{WORK_ROOT}}/exports"
LOG_DIR="${{WORK_ROOT}}/logs"

mkdir -p "$PROCESSED_DIR" "$EXPORT_DIR" "$LOG_DIR"

echo "[1/7] GPU check"
nvidia-smi
python --version

echo "[2/7] System dependencies"
if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg colmap git
else
  echo "apt-get not found; make sure FFmpeg and COLMAP are installed before continuing."
fi

echo "[3/7] Python dependencies"
python -m pip install --upgrade pip
python -m pip install nerfstudio

echo "[4/7] Raw input"
test -e "$RAW_INPUT"
du -sh "$RAW_INPUT" || true

echo "[5/7] Process data"
{process_command} 2>&1 | tee "$LOG_DIR/ns-process-data.log"

echo "[6/7] Train splatfacto"
ns-train splatfacto --data "$PROCESSED_DIR" 2>&1 | tee "$LOG_DIR/ns-train.log"

echo "[7/7] Export Gaussian PLY"
CONFIG_PATH="$(find /workspace -path "*/config.yml" -type f 2>/dev/null | sort | tail -n 1 || true)"
if [ -z "$CONFIG_PATH" ]; then
  echo "Could not find config.yml after training." >&2
  exit 2
fi
echo "$CONFIG_PATH" | tee "$WORK_ROOT/config-path.txt"
ns-export gaussian-splat --load-config "$CONFIG_PATH" --output-dir "$EXPORT_DIR" 2>&1 | tee "$LOG_DIR/ns-export.log"

echo "Export and logs:"
find "$WORK_ROOT" -maxdepth 3 -type f | sort
echo "Download $EXPORT_DIR and $LOG_DIR before stopping or terminating the pod."
"""


def render_postprocess_script(experiment: Experiment) -> str:
    scene = experiment.scene_id
    version = experiment.asset_version
    return f"""# Run from the repository root after SuperSplat/SplatTransform output is ready.
$ErrorActionPreference = "Stop"

$SceneId = "{scene}"
$Version = {version}
$ExperimentDir = "{experiment.experiment_dir}"
$PublishedDir = Join-Path $ExperimentDir "published"

Write-Host "If the admin processing job created v2 or later, update `$Version before running without --dry-run."
Write-Host "Expected published files:"
Write-Host (Join-Path $PublishedDir "scene.sog")
Write-Host (Join-Path $PublishedDir "settings.json")
Write-Host (Join-Path $PublishedDir "collision.voxel.json")
Write-Host (Join-Path $PublishedDir "poster.webp")

pnpm --filter @tro/web sync:supersplat-viewer

python tools\\3dgs\\prepare_local_scene_assets.py `
  --input-dir $PublishedDir `
  --scene-id $SceneId `
  --version $Version `
  --dry-run

pnpm assets:upload -- `
  --input-dir $PublishedDir `
  --scene-id $SceneId `
  --version $Version `
  --dry-run

Write-Host "Remove --dry-run only after the admin asset page and manifest paths are correct."
"""


def infer_raw_name(args: argparse.Namespace) -> str:
    if args.raw_name.strip():
        return safe_filename(args.raw_name.strip())

    if args.raw_input.strip():
        return safe_filename(Path(args.raw_input).name)

    return "capture.mov" if args.capture_mode == "video" else "images"


def normalize_raw_asset_key(value: str) -> str:
    normalized = value.replace("\\", "/").strip().lstrip("/")

    if not normalized.startswith("raw-captures/"):
        raise ValueError("raw asset key must start with raw-captures/")

    if ".." in normalized or not re.fullmatch(r"[a-zA-Z0-9/_\-.]+", normalized):
        raise ValueError(f"unsafe raw asset key: {value}")

    return normalized


def require_safe_segment(value: str, label: str) -> str:
    segment = re.sub(r"[^a-z0-9._-]+", "-", value.strip().lower()).strip("-")

    if not segment:
        raise ValueError(f"{label} must contain at least one storage-safe character")

    return segment


def safe_filename(value: str) -> str:
    name = value.replace("\\", "/").split("/")[-1]
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "-", name).strip("-")

    if not safe:
        raise ValueError("raw name must contain at least one safe character")

    return safe


def utc_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def bounded_frame_target(value: str) -> int:
    parsed = int(value)

    if parsed < 100 or parsed > 1200:
        raise argparse.ArgumentTypeError("frame target must be between 100 and 1200")

    return parsed


def positive_int(value: str) -> int:
    parsed = int(value)

    if parsed < 1:
        raise argparse.ArgumentTypeError("value must be >= 1")

    return parsed


def print_summary(payload: dict[str, object]) -> None:
    experiment = payload["experiment"]
    if not isinstance(experiment, dict):
        return

    print(f"experiment: {experiment['scene_id']} / {experiment['run_id']}")
    print(f"folder: {experiment['experiment_dir']}")
    print(f"dry-run: {payload['dryRun']}")
    print("files:")
    for filename in payload["files"]:
        print(f"- {filename}")


if __name__ == "__main__":
    raise SystemExit(main())
