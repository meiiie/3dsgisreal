#!/usr/bin/env python3
"""Copy prepared scene runtime assets into the local Next.js public folder."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "apps" / "web" / "public" / "scene-assets"


@dataclass(frozen=True)
class ArtifactSpec:
    key: str
    label: str
    default_name: str
    required: bool


@dataclass(frozen=True)
class PreparedArtifact:
    kind: str
    label: str
    source: str
    destination: str
    public_url: str
    copied: bool
    bytes: int


ARTIFACTS = (
    ArtifactSpec("content", "SOG content", "scene.sog", True),
    ArtifactSpec("settings", "settings.json", "settings.json", True),
    ArtifactSpec("collision", "collision", "collision.voxel.json", True),
    ArtifactSpec("poster", "poster", "poster.webp", True),
)


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    scene_segment = to_storage_segment(args.scene_id)
    destination_dir = args.output_root / "scenes" / scene_segment / f"v{args.version}"

    try:
        prepared = prepare_assets(args, destination_dir)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    payload = {
        "sceneId": args.scene_id,
        "version": args.version,
        "destinationDir": str(destination_dir.resolve()),
        "dryRun": args.dry_run,
        "artifacts": [asdict(item) for item in prepared],
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print_summary(payload)

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Copy SOG/settings/collision/poster files into apps/web/public/scene-assets.",
    )
    parser.add_argument("--input-dir", type=Path, required=True, help="Folder containing prepared runtime artifacts.")
    parser.add_argument("--scene-id", required=True, help="Scene id/slug, for example home-test-room-v1.")
    parser.add_argument("--version", type=positive_int, default=1, help="Scene asset version number. Default: 1.")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help=f"Destination scene-assets root. Default: {DEFAULT_OUTPUT_ROOT}",
    )
    parser.add_argument("--content", default="scene.sog", help="Input filename for SOG content.")
    parser.add_argument("--settings", default="settings.json", help="Input filename for viewer settings.")
    parser.add_argument("--collision", default="collision.voxel.json", help="Input filename for collision data.")
    parser.add_argument("--poster", default="poster.webp", help="Input filename for poster/thumbnail.")
    parser.add_argument("--allow-missing-optional", action="store_true", help="Only require scene.sog; copy optional files if present.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print destinations without copying.")
    parser.add_argument("--overwrite", action="store_true", help="Replace destination files if they already exist.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    return parser


def prepare_assets(args: argparse.Namespace, destination_dir: Path) -> list[PreparedArtifact]:
    input_dir = args.input_dir.resolve()
    output_root = args.output_root.resolve()
    destination_dir = destination_dir.resolve()

    if not input_dir.is_dir():
        raise ValueError(f"input directory does not exist: {input_dir}")

    ensure_inside(output_root, destination_dir, "destination")

    prepared: list[PreparedArtifact] = []
    missing: list[Path] = []
    blocked: list[Path] = []

    for spec in with_user_filenames(args):
        source = (input_dir / spec.default_name).resolve()
        destination = destination_dir / output_filename(spec.key)
        ensure_inside(input_dir, source, "source")

        if not source.is_file():
            if spec.required or not args.allow_missing_optional:
                missing.append(source)
            continue

        if destination.exists() and not args.overwrite:
            blocked.append(destination)
            continue

        if not args.dry_run:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

        prepared.append(
            PreparedArtifact(
                kind=spec.key,
                label=spec.label,
                source=str(source),
                destination=str(destination),
                public_url=to_public_url(output_root, destination),
                copied=not args.dry_run,
                bytes=source.stat().st_size,
            )
        )

    if missing:
        message = "missing required artifacts: " + ", ".join(str(path) for path in missing)
        raise ValueError(message)

    if blocked:
        message = "destination files already exist; use --overwrite: " + ", ".join(str(path) for path in blocked)
        raise ValueError(message)

    return prepared


def with_user_filenames(args: argparse.Namespace) -> tuple[ArtifactSpec, ...]:
    names = {
        "content": args.content,
        "settings": args.settings,
        "collision": args.collision,
        "poster": args.poster,
    }

    artifacts: list[ArtifactSpec] = []

    for spec in ARTIFACTS:
        required = spec.required
        if args.allow_missing_optional and spec.key != "content":
            required = False
        artifacts.append(ArtifactSpec(spec.key, spec.label, names[spec.key], required))

    return tuple(artifacts)


def output_filename(kind: str) -> str:
    names = {
        "content": "scene.sog",
        "settings": "settings.json",
        "collision": "collision.voxel.json",
        "poster": "poster.webp",
    }
    return names[kind]


def to_storage_segment(value: str) -> str:
    segment = re.sub(r"[^a-z0-9._-]+", "-", value.strip().lower())
    segment = segment.strip("-")

    if not segment:
        raise ValueError("scene id must contain at least one storage-safe character")

    return segment


def to_public_url(output_root: Path, destination: Path) -> str:
    relative = destination.resolve().relative_to(output_root.resolve())
    return "/scene-assets/" + relative.as_posix()


def ensure_inside(root: Path, child: Path, label: str) -> None:
    try:
        child.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"{label} path escapes output root: {child}") from exc


def positive_int(value: str) -> int:
    parsed = int(value)

    if parsed < 1:
        raise argparse.ArgumentTypeError("version must be >= 1")

    return parsed


def print_summary(payload: dict[str, object]) -> None:
    print(f"scene: {payload['sceneId']} v{payload['version']}")
    print(f"destination: {payload['destinationDir']}")
    print(f"dry-run: {payload['dryRun']}")

    artifacts = payload["artifacts"]
    if not isinstance(artifacts, list):
        return

    for item in artifacts:
        if not isinstance(item, dict):
            continue
        copied = "copied" if item["copied"] else "validated"
        print(f"- {item['label']}: {copied} -> {item['public_url']} ({item['bytes']} bytes)")


if __name__ == "__main__":
    raise SystemExit(main())
