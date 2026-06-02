#!/usr/bin/env python3
"""Check that the running local app can read PostGIS, MinIO/S3, and a scene manifest."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


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
        "baseUrl": args.base_url,
        "sceneId": args.scene_id,
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
        description="Check a running local app before renting GPU time.",
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:4317", help="Running app URL.")
    parser.add_argument("--scene-id", default="home-test-room-v1", help="Scene id to check through the manifest API.")
    parser.add_argument("--expect-postgis", action="store_true", help="Fail if /api/places is not backed by PostGIS.")
    parser.add_argument("--expect-storage-ready", action="store_true", help="Fail if /api/admin/system storageReady is false.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    return parser


def run_checks(args: argparse.Namespace) -> list[CheckResult]:
    checks: list[CheckResult] = []
    base_url = normalize_base_url(args.base_url)

    health = request_json(base_url, "/api/health")
    if health.ok:
        checks.append(pass_check("health API", "reachable"))
    else:
        checks.append(fail_check("health API", health.error))
        return checks

    places = request_json(base_url, "/api/places")
    if not places.ok:
        checks.append(fail_check("places API", places.error))
    else:
        source = read_nested_string(places.data, ("meta", "source"))
        count = len(read_nested_list(places.data, ("data",)))
        checks.append(pass_check("places API", f"{count} places from {source or 'unknown'}"))
        if args.expect_postgis and source != "postgis":
            checks.append(fail_check("places source", f"expected postgis, got {source or 'missing'}"))
        elif source == "postgis":
            checks.append(pass_check("places source", "postgis"))
        else:
            checks.append(warn_check("places source", source or "missing source"))

    admin_cookie = create_admin_session_cookie(base_url)
    if admin_cookie:
        checks.append(pass_check("admin session", "cookie issued"))
    else:
        checks.append(fail_check("admin session", "could not create local admin session"))
        return checks

    system = request_json(base_url, "/api/admin/system", cookie=admin_cookie)
    if not system.ok:
        checks.append(fail_check("system API", system.error))
    else:
        verdict = read_nested_string(system.data, ("meta", "verdict", "state"))
        migration_count = read_nested_int(system.data, ("data", "database", "status", "appliedMigrationCount"))
        storage_ready = read_nested_bool(system.data, ("data", "checks", "storageReady"))
        checks.append(pass_check("system API", f"verdict={verdict or 'missing'} migrations={migration_count}"))

        if verdict == "ready":
            checks.append(pass_check("system verdict", "ready"))
        else:
            checks.append(warn_check("system verdict", verdict or "missing"))

        if migration_count and migration_count > 0:
            checks.append(pass_check("migrations", str(migration_count)))
        else:
            checks.append(fail_check("migrations", "no applied migrations reported"))

        if storage_ready:
            checks.append(pass_check("storage", "ready"))
        elif args.expect_storage_ready:
            checks.append(fail_check("storage", "storageReady is false"))
        else:
            checks.append(warn_check("storage", "storageReady is false"))

    manifest = request_json(base_url, f"/api/scenes/{args.scene_id}/manifest")
    if not manifest.ok:
        checks.append(fail_check("scene manifest", manifest.error))
    else:
        scene_id = read_nested_string(manifest.data, ("data", "id"))
        source = read_nested_string(manifest.data, ("meta", "source"))
        can_open = read_nested_bool(manifest.data, ("data", "readiness", "canOpenViewer"))
        if scene_id == args.scene_id:
            checks.append(pass_check("scene manifest", f"{scene_id} from {source or 'unknown'}"))
        else:
            checks.append(fail_check("scene manifest", f"expected {args.scene_id}, got {scene_id or 'missing'}"))
        checks.append(warn_check("viewer readiness", "SOG not published yet") if not can_open else pass_check("viewer readiness", "can open viewer"))

    return checks


@dataclass(frozen=True)
class JsonResponse:
    ok: bool
    data: Any = None
    error: str = ""


def request_json(base_url: str, path: str, *, cookie: str | None = None) -> JsonResponse:
    request = Request(urljoin(base_url, path.lstrip("/")))
    if cookie:
        request.add_header("Cookie", cookie)

    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
    except HTTPError as error:
        return JsonResponse(False, error=f"{error.code} {error.reason}")
    except URLError as error:
        return JsonResponse(False, error=str(error.reason))

    try:
        return JsonResponse(True, json.loads(body))
    except json.JSONDecodeError:
        return JsonResponse(False, error="response is not JSON")


def create_admin_session_cookie(base_url: str) -> str | None:
    body = json.dumps({"role": "admin"}).encode("utf-8")
    request = Request(
        urljoin(base_url, "/api/session"),
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            set_cookie = response.headers.get("set-cookie") or ""
    except (HTTPError, URLError):
        return None

    match = re.search(r"(loi_vao_session=[^;]+)", set_cookie)
    return match.group(1) if match else None


def normalize_base_url(value: str) -> str:
    clean = value.strip()
    if not clean.endswith("/"):
        clean += "/"
    return clean


def read_nested_string(source: Any, path: tuple[str, ...]) -> str:
    value = read_nested(source, path)
    return value.strip() if isinstance(value, str) else ""


def read_nested_int(source: Any, path: tuple[str, ...]) -> int:
    value = read_nested(source, path)
    return value if isinstance(value, int) else 0


def read_nested_bool(source: Any, path: tuple[str, ...]) -> bool:
    value = read_nested(source, path)
    return value if isinstance(value, bool) else False


def read_nested_list(source: Any, path: tuple[str, ...]) -> list[Any]:
    value = read_nested(source, path)
    return value if isinstance(value, list) else []


def read_nested(source: Any, path: tuple[str, ...]) -> Any:
    current = source
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


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
    print(f"runtime: {payload['baseUrl']} scene={payload['sceneId']}")
    print(f"summary: {summary['passed']} pass, {summary['warnings']} warn, {summary['failed']} fail")

    for check in payload["checks"]:
        marker = {"pass": "[ok]", "warn": "[warn]", "fail": "[fail]"}.get(check["status"], "[?]")
        print(f"{marker} {check['name']}: {check['detail']}")


if __name__ == "__main__":
    raise SystemExit(main())
