import json

from smoke.common import BASE_URL, set_local_session_on_page
from smoke.place_api import assert_place_detail_api, assert_places_filter_api


def check_api(browser) -> None:
    page = browser.new_page()
    assert_admin_api_requires_session(page)
    response = page.goto(f"{BASE_URL}/api/places", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    assert "home-test-room-v1" in page.content()
    body = response.json()
    assert body["meta"]["source"] in ("postgis", "sample-repository")
    assert_places_filter_api(page)
    assert_place_detail_api(page)

    set_local_session_on_page(page, "admin")
    response = page.goto(f"{BASE_URL}/api/admin/pipeline", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    assert "capture-home-test-room-iphone14pro" in page.content()
    assert "job-home-test-room-runpod" in page.content()
    assert_system_api(page)
    assert_admin_review_api(page)

    assert_dry_run_place_create(page)
    assert_dry_run_place_import(page)
    assert_dry_run_place_update(page)
    assert_dry_run_place_status_review(page)
    assert_dry_run_place_privacy_review(page)
    assert_dry_run_capture_create(page)
    assert_dry_run_processing_job_create(page)
    assert_dry_run_processing_transition(page)
    set_local_session_on_page(page, "student")
    assert_user_api_and_checkin(page)
    set_local_session_on_page(page, "admin")
    assert_scene_asset_api(page)
    assert_hotspot_api(page)
    assert_manifest_api(page)
    page.close()


def assert_admin_api_requires_session(page) -> None:
    response = page.request.delete(f"{BASE_URL}/api/session")
    assert response.ok
    response = page.request.get(f"{BASE_URL}/api/admin/pipeline")
    assert response.status == 403
    body = response.json()
    assert body["error"] == "admin_session_required"
    response = page.request.get(f"{BASE_URL}/api/admin/review")
    assert response.status == 403
    response = page.request.get(f"{BASE_URL}/api/admin/places/phong-thu-nghiem-tu-cong-vao/privacy")
    assert response.status == 403


def assert_system_api(page) -> None:
    response = page.goto(f"{BASE_URL}/api/admin/system", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    body = response.json()
    assert body["data"]["app"]["service"] == "loi-vao-web"
    assert body["data"]["database"]["source"] in ("postgis", "sample-repository")
    assert "storageReady" in body["data"]["checks"]
    assert "assetPublicBaseConfigured" in body["data"]["checks"]
    assert "buckets" in body["data"]["storage"]["status"]
    assert "sceneAssetsPublicBaseUrl" in body["data"]["storage"]
    assert "verdict" in body["meta"]


def assert_admin_review_api(page) -> None:
    response = page.goto(f"{BASE_URL}/api/admin/review", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    body = response.json()
    assert body["meta"]["source"] in ("postgis", "sample-repository")
    assert body["data"]["counts"]["needsCapture"] >= 1
    assert body["data"]["counts"]["processing"] >= 1
    assert len(body["data"]["queues"]) == 5


def assert_dry_run_place_create(page) -> None:
    response = post_json(
        page,
        "/api/admin/places",
        {
            "name": "API smoke place",
            "slug": "api-smoke-dia-diem",
            "category": "rental",
            "summary": "Dry-run API for admin place creation.",
            "address": "API smoke area",
            "city": "Hai Phong",
            "lng": 106.6881,
            "lat": 20.8449,
            "sceneTitle": "API smoke route",
            "sceneSlug": "api-smoke-dia-diem-v1",
            "sceneEntryLabel": "Gate -> path -> main point",
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["slug"] == "api-smoke-dia-diem"


def assert_dry_run_place_import(page) -> None:
    response = post_json(
        page,
        "/api/admin/places/import",
        {
            "csv": "\n".join(
                [
                    "name,slug,category,summary,address,city,lng,lat,sceneSlug,sceneTitle,sceneEntryLabel",
                    "API import smoke,api-import-smoke,rental,Dry-run API for CSV place import,API import area,Hai Phong,106.6881,20.8449,api-import-smoke-v1,API import route,Gate -> lane -> room",
                ]
            ),
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["summary"]["totalRows"] == 1
    assert body["rows"][0]["draft"]["slug"] == "api-import-smoke"


def assert_dry_run_place_status_review(page) -> None:
    response = patch_json(
        page,
        "/api/admin/places/phong-thu-nghiem-tu-cong-vao/status",
        {
            "status": "review",
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["placeSlug"] == "phong-thu-nghiem-tu-cong-vao"
    assert body["draft"]["status"] == "review"


def assert_dry_run_place_privacy_review(page) -> None:
    response = page.goto(
        f"{BASE_URL}/api/admin/places/phong-thu-nghiem-tu-cong-vao/privacy",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.ok
    body = response.json()
    assert body["data"]["place"]["slug"] == "phong-thu-nghiem-tu-cong-vao"
    assert "defaultDraft" in body["data"]

    response = post_json(
        page,
        "/api/admin/places/phong-thu-nghiem-tu-cong-vao/privacy",
        {
            "decision": "approved",
            "consentConfirmed": True,
            "addressPublicSafe": True,
            "facesOrPeopleRemoved": True,
            "privateObjectsRemoved": True,
            "audioPrivateSafe": True,
            "rawCapturePrivate": True,
            "notes": "Dry-run API validates the privacy checklist before publication.",
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["decision"] == "approved"
    assert body["draft"]["checks"]["consentConfirmed"] is True


def assert_dry_run_place_update(page) -> None:
    response = patch_json(
        page,
        "/api/admin/places/phong-thu-nghiem-tu-cong-vao",
        {
            "name": "Phong thu nghiem smoke edit",
            "category": "rental",
            "summary": "Dry-run API for admin place metadata editing.",
            "address": "Smoke edit area",
            "city": "Hai Phong",
            "lng": 106.6881,
            "lat": 20.8449,
            "sceneSlug": "home-test-room-v1",
            "sceneTitle": "Smoke edited route",
            "sceneEntryLabel": "Gate -> path -> edited point",
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["placeSlug"] == "phong-thu-nghiem-tu-cong-vao"
    assert body["draft"]["sceneSlug"] == "home-test-room-v1"


def assert_dry_run_capture_create(page) -> None:
    response = post_json(
        page,
        "/api/admin/captures",
        {
            "placeSlug": "phong-thu-nghiem-tu-cong-vao",
            "sceneSlug": "home-test-room-v1",
            "device": "iPhone 14 Pro",
            "captureMode": "video",
            "capturedAt": "2026-06-02T13:00",
            "rawAssetKey": "raw-captures/api-smoke/iphone14pro.mov",
            "notes": "Dry-run API for capture session.",
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["sceneSlug"] == "home-test-room-v1"


def assert_dry_run_processing_job_create(page) -> None:
    response = post_json(
        page,
        "/api/admin/processing-jobs",
        {
            "captureSessionId": "capture-home-test-room-iphone14pro",
            "provider": "runpod",
            "gpuType": "RTX 4090",
            "toolchain": "nerfstudio-splatfacto-gsplat",
            "frameTarget": "400",
            "logKey": "processing/api-smoke/runpod-train.log",
            "notes": "Dry-run API for processing job.",
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["captureSessionId"] == "capture-home-test-room-iphone14pro"


def assert_dry_run_processing_transition(page) -> None:
    response = page.request.patch(
        f"{BASE_URL}/api/admin/processing-jobs/job-home-test-room-runpod/status",
        data=json.dumps(
            {
                "status": "running",
                "operatorNote": "Dry-run API for queued to running transition.",
                "dryRun": True,
            }
        ),
        headers={"content-type": "application/json"},
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["status"] == "running"


def assert_user_api_and_checkin(page) -> None:
    response = page.goto(f"{BASE_URL}/api/user", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    assert "checked_in" in page.content()
    assert "home-test-room-v1" in page.content()
    assert "quizAttempts" in page.content()
    assert "sample-quiz-home-observe" in page.content()

    response = post_json(
        page,
        "/api/user/place-library",
        {
            "placeSlug": "phong-thu-nghiem-tu-cong-vao",
            "status": "visited",
            "note": "Dry-run API for user place library.",
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["placeSlug"] == "phong-thu-nghiem-tu-cong-vao"
    assert body["draft"]["status"] == "visited"

    response = post_json(
        page,
        "/api/user/checkins",
        {
            "sceneId": "home-test-room-v1",
            "hotspotId": "hotspot-home-checkin",
            "reward": "local-demo-checkin",
            "note": "Dry-run API for viewer check-in.",
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["sceneId"] == "home-test-room-v1"

    response = post_json(
        page,
        "/api/user/quiz-attempts",
        {
            "sceneId": "home-test-room-v1",
            "hotspotId": "hotspot-home-quiz-observe",
            "selectedIndex": 0,
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["sceneId"] == "home-test-room-v1"
    assert body["draft"]["correct"] is True


def assert_scene_asset_api(page) -> None:
    response = page.goto(
        f"{BASE_URL}/api/admin/scenes/home-test-room-v1/assets",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.ok
    assert "scene.sog" in page.content()
    assert "collision.voxel.json" in page.content()
    assert "localFiles" in page.content()
    assert "objectFiles" in page.content()

    response = page.request.put(f"{BASE_URL}/api/admin/scenes/home-test-room-v1/assets", data={})
    assert response.ok
    body = response.json()
    assert "persisted" in body
    assert "localFiles" in body
    assert "objectFiles" in body
    assert body["draft"]["contentKey"].endswith("scene.sog")
    assert body["localFiles"][0]["publicUrl"].startswith("/scene-assets/")
    assert body["localFiles"][0]["qaStatus"] == "missing"
    assert body["objectFiles"][0]["storageKey"].endswith("scene.sog")
    assert "exists" in body["objectFiles"][0]


def assert_hotspot_api(page) -> None:
    response = page.goto(
        f"{BASE_URL}/api/admin/scenes/home-test-room-v1/hotspots",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.ok
    assert "hotspot-home-entry-info" in page.content()
    assert "quiz" in page.content()
    body = response.json()
    first_hotspot = body["hotspots"][0]

    response = post_json(
        page,
        "/api/admin/scenes/home-test-room-v1/hotspots",
        {
            "kind": "quiz",
            "title": "API smoke quiz",
            "body": "Dry-run API for hotspot quiz.",
            "x": "1",
            "y": "1.5",
            "z": "-1",
            "yaw": "20",
            "sortOrder": "90",
            "payloadJson": json.dumps(
                {
                    "question": "What does this API hotspot validate?",
                    "options": ["Manifest contract", "Raw video", "Billing"],
                    "answerIndex": 0,
                }
            ),
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["kind"] == "quiz"

    position = first_hotspot.get("position") or {}
    rotation = first_hotspot.get("rotation") or {}
    response = patch_json(
        page,
        "/api/admin/scenes/home-test-room-v1/hotspots",
        {
            "hotspotId": first_hotspot["id"],
            "kind": first_hotspot["kind"],
            "title": f"{first_hotspot['title']} smoke",
            "body": first_hotspot["body"],
            "x": str(position.get("x", 0)),
            "y": str(position.get("y", 1.5)),
            "z": str(position.get("z", 0)),
            "yaw": str(rotation.get("yaw", 0)),
            "sortOrder": str(first_hotspot.get("sortOrder", 10)),
            "payloadJson": json.dumps(first_hotspot.get("payload") or {"label": "Smoke"}),
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["hotspotId"] == first_hotspot["id"]

    response = delete_json(
        page,
        "/api/admin/scenes/home-test-room-v1/hotspots",
        {
            "hotspotId": first_hotspot["id"],
            "confirmDelete": True,
            "dryRun": True,
        },
    )
    assert response.ok
    body = response.json()
    assert body["ok"] is True
    assert body["persisted"] is False
    assert body["draft"]["hotspotId"] == first_hotspot["id"]


def assert_manifest_api(page) -> None:
    response = page.goto(
        f"{BASE_URL}/api/scenes/home-test-room-v1/manifest",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.ok
    assert "home-test-room-v1" in page.content()
    assert "readiness" in page.content()
    assert "hotspots" in page.content()
    assert "quiz" in page.content()
    assert "checkin" in page.content()


def post_json(page, path: str, payload: dict):
    return page.request.post(
        f"{BASE_URL}{path}",
        data=json.dumps(payload),
        headers={"content-type": "application/json"},
    )


def patch_json(page, path: str, payload: dict):
    return page.request.patch(
        f"{BASE_URL}{path}",
        data=json.dumps(payload),
        headers={"content-type": "application/json"},
    )


def delete_json(page, path: str, payload: dict):
    return page.request.delete(
        f"{BASE_URL}{path}",
        data=json.dumps(payload),
        headers={"content-type": "application/json"},
    )
