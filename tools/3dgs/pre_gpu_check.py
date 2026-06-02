#!/usr/bin/env python3
"""Validate a generated pre-GPU experiment before renting paid GPU time."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
REQUIRED_EXPERIMENT_FILES = (
    "README.md",
    "experiment.json",
    "admin-capture-payload.json",
    "admin-processing-job-payload.json",
    "runpod-nerfstudio.sh",
    "postprocess-local.ps1",
)
REQUIRED_EXPERIMENT_KEYS = (
    "scene_id",
    "run_id",
    "capture_mode",
    "raw_input",
    "remote_raw_input",
    "raw_asset_key",
    "frame_target",
    "provider",
    "gpu_type",
    "toolchain",
    "asset_version",
)


@dataclass(frozen=True)
class CheckResult:
    name: str
    status: str
    detail: str


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    checks = run_checks(args)
    payload = {
        "experimentDir": str(args.experiment_dir.resolve()),
        "checks": [asdict(check) for check in checks],
        "summary": summarize(checks),
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=True, indent=2))
    else:
        print_summary(payload)

    return 2 if payload["summary"]["failed"] else 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate a generated GPU experiment folder before renting GPU time.",
    )
    parser.add_argument("--experiment-dir", type=Path, required=True, help="Folder created by create_gpu_experiment.py.")
    parser.add_argument("--require-raw", action="store_true", help="Fail when the local raw input is missing.")
    parser.add_argument(
        "--require-admin-ready",
        action="store_true",
        help="Fail when generated admin payload placeholders still need to be filled.",
    )
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    return parser


def run_checks(args: argparse.Namespace) -> list[CheckResult]:
    experiment_dir = args.experiment_dir.resolve()
    checks: list[CheckResult] = []

    checks.append(check_experiment_dir(experiment_dir))
    checks.extend(check_required_files(experiment_dir))

    experiment = read_json(experiment_dir / "experiment.json")
    capture_payload = read_json(experiment_dir / "admin-capture-payload.json")
    processing_payload = read_json(experiment_dir / "admin-processing-job-payload.json")

    checks.append(check_json_object("experiment.json", experiment))
    checks.append(check_json_object("admin-capture-payload.json", capture_payload))
    checks.append(check_json_object("admin-processing-job-payload.json", processing_payload))

    if isinstance(experiment, dict):
        checks.extend(check_experiment_contract(experiment, args.require_raw))
        checks.extend(check_script_contract(experiment_dir, experiment))

    if isinstance(experiment, dict) and isinstance(capture_payload, dict):
        checks.extend(check_capture_payload(experiment, capture_payload))

    if isinstance(experiment, dict) and isinstance(processing_payload, dict):
        checks.extend(check_processing_payload(experiment, processing_payload, args.require_admin_ready))

    checks.append(check_supersplat_viewer_bundle())
    checks.append(check_artifacts_gitignore())

    return checks


def check_experiment_dir(experiment_dir: Path) -> CheckResult:
    if experiment_dir.is_dir():
        return pass_check("experiment folder", str(experiment_dir))
    return fail_check("experiment folder", f"missing folder: {experiment_dir}")


def check_required_files(experiment_dir: Path) -> list[CheckResult]:
    results: list[CheckResult] = []

    for filename in REQUIRED_EXPERIMENT_FILES:
        file_path = experiment_dir / filename
        if file_path.is_file():
            results.append(pass_check(f"file {filename}", "present"))
        else:
            results.append(fail_check(f"file {filename}", "missing"))

    return results


def check_json_object(label: str, value: Any) -> CheckResult:
    if isinstance(value, dict):
        return pass_check(label, "valid JSON object")
    return fail_check(label, "missing, invalid, or not a JSON object")


def check_experiment_contract(experiment: dict[str, Any], require_raw: bool) -> list[CheckResult]:
    checks: list[CheckResult] = []

    for key in REQUIRED_EXPERIMENT_KEYS:
        if has_value(experiment.get(key)):
            checks.append(pass_check(f"experiment.{key}", "present"))
        else:
            checks.append(fail_check(f"experiment.{key}", "missing"))

    raw_asset_key = read_string(experiment.get("raw_asset_key"))
    if is_safe_raw_key(raw_asset_key):
        checks.append(pass_check("raw asset key", raw_asset_key))
    else:
        checks.append(fail_check("raw asset key", "must start with raw-captures/ and use safe characters"))

    frame_target = experiment.get("frame_target")
    if isinstance(frame_target, int) and 100 <= frame_target <= 1200:
        checks.append(pass_check("frame target", str(frame_target)))
    else:
        checks.append(fail_check("frame target", "must be an integer between 100 and 1200"))

    raw_input = read_string(experiment.get("raw_input"))
    if raw_input:
        raw_path = Path(raw_input)
        if raw_path.exists():
            checks.append(pass_check("local raw input", str(raw_path)))
        elif require_raw:
            checks.append(fail_check("local raw input", f"missing: {raw_path}"))
        else:
            checks.append(warn_check("local raw input", f"missing until capture is copied: {raw_path}"))

    return checks


def check_script_contract(experiment_dir: Path, experiment: dict[str, Any]) -> list[CheckResult]:
    scene_id = read_string(experiment.get("scene_id"))
    remote_raw_input = read_string(experiment.get("remote_raw_input"))
    runpod_script = read_text(experiment_dir / "runpod-nerfstudio.sh")
    postprocess_script = read_text(experiment_dir / "postprocess-local.ps1")
    checks: list[CheckResult] = []

    if scene_id and scene_id in runpod_script and remote_raw_input and remote_raw_input in runpod_script:
        checks.append(pass_check("runpod script contract", "scene id and raw input are wired"))
    else:
        checks.append(fail_check("runpod script contract", "missing scene id or remote raw input"))

    if "ns-process-data" in runpod_script and "ns-train splatfacto" in runpod_script and "ns-export gaussian-splat" in runpod_script:
        checks.append(pass_check("nerfstudio commands", "process, train, and export commands present"))
    else:
        checks.append(fail_check("nerfstudio commands", "missing process/train/export command"))

    if scene_id and scene_id in postprocess_script and "prepare_local_scene_assets.py" in postprocess_script and "pnpm assets:upload" in postprocess_script:
        checks.append(pass_check("postprocess script contract", "local staging and S3 upload dry-runs present"))
    else:
        checks.append(fail_check("postprocess script contract", "missing scene id, local staging, or upload command"))

    return checks


def check_capture_payload(experiment: dict[str, Any], payload: dict[str, Any]) -> list[CheckResult]:
    scene_id = read_string(experiment.get("scene_id"))
    raw_asset_key = read_string(experiment.get("raw_asset_key"))
    checks: list[CheckResult] = []

    if payload.get("sceneSlug") == scene_id:
        checks.append(pass_check("capture payload scene", scene_id))
    else:
        checks.append(fail_check("capture payload scene", "sceneSlug does not match experiment scene_id"))

    if payload.get("rawAssetKey") == raw_asset_key:
        checks.append(pass_check("capture payload raw key", raw_asset_key))
    else:
        checks.append(fail_check("capture payload raw key", "rawAssetKey does not match experiment raw_asset_key"))

    if read_string(payload.get("placeSlug")) and "<fill-" not in read_string(payload.get("placeSlug")):
        checks.append(pass_check("capture payload place", read_string(payload.get("placeSlug"))))
    else:
        checks.append(warn_check("capture payload place", "placeSlug still needs a real value"))

    return checks


def check_processing_payload(
    experiment: dict[str, Any],
    payload: dict[str, Any],
    require_admin_ready: bool,
) -> list[CheckResult]:
    checks: list[CheckResult] = []
    expected_toolchain = read_string(experiment.get("toolchain"))
    capture_session_id = read_string(payload.get("captureSessionId"))

    if payload.get("toolchain") == expected_toolchain:
        checks.append(pass_check("processing payload toolchain", expected_toolchain))
    else:
        checks.append(fail_check("processing payload toolchain", "toolchain does not match experiment"))

    if capture_session_id and "<fill-" not in capture_session_id:
        checks.append(pass_check("processing capture id", capture_session_id))
    elif require_admin_ready:
        checks.append(fail_check("processing capture id", "captureSessionId placeholder must be replaced before rental"))
    else:
        checks.append(warn_check("processing capture id", "placeholder is OK until the admin capture row is created"))

    return checks


def check_supersplat_viewer_bundle() -> CheckResult:
    viewer_index = REPO_ROOT / "apps" / "web" / "public" / "supersplat-viewer" / "index.html"
    if viewer_index.is_file():
        return pass_check("SuperSplat Viewer bundle", str(viewer_index))
    return warn_check("SuperSplat Viewer bundle", "run pnpm --filter @tro/web sync:supersplat-viewer before viewer QA")


def check_artifacts_gitignore() -> CheckResult:
    gitignore = read_text(REPO_ROOT / ".gitignore")
    if re.search(r"(^|\n)artifacts/\s*(\n|$)", gitignore):
        return pass_check("artifacts gitignore", "artifacts/ is ignored")
    return fail_check("artifacts gitignore", "artifacts/ must stay out of git")


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def read_string(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def has_value(value: Any) -> bool:
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, int):
        return True
    return value is not None


def is_safe_raw_key(value: str) -> bool:
    return bool(
        value.startswith("raw-captures/")
        and ".." not in value
        and "\\" not in value
        and re.fullmatch(r"[a-zA-Z0-9/_\-.]+", value)
    )


def summarize(checks: list[CheckResult]) -> dict[str, int]:
    return {
        "passed": sum(1 for check in checks if check.status == "pass"),
        "warnings": sum(1 for check in checks if check.status == "warn"),
        "failed": sum(1 for check in checks if check.status == "fail"),
    }


def pass_check(name: str, detail: str) -> CheckResult:
    return CheckResult(name, "pass", detail)


def warn_check(name: str, detail: str) -> CheckResult:
    return CheckResult(name, "warn", detail)


def fail_check(name: str, detail: str) -> CheckResult:
    return CheckResult(name, "fail", detail)


def print_summary(payload: dict[str, Any]) -> None:
    summary = payload["summary"]
    print(f"experiment: {payload['experimentDir']}")
    print(f"summary: {summary['passed']} pass, {summary['warnings']} warn, {summary['failed']} fail")

    for check in payload["checks"]:
        marker = {"pass": "[ok]", "warn": "[warn]", "fail": "[fail]"}.get(check["status"], "[?]")
        print(f"{marker} {check['name']}: {check['detail']}")


if __name__ == "__main__":
    raise SystemExit(main())
