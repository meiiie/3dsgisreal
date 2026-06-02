import time

from smoke.common import BASE_URL, capture_page, set_local_session_on_page, wire_logging


def check_admin_place_intake(browser) -> None:
    slug = f"smoke-dia-diem-{int(time.time())}"
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(f"{BASE_URL}/admin/places/new", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".intake-form", timeout=20_000)
    page.fill('input[name="name"]', "Smoke place local")
    page.fill('input[name="slug"]', slug)
    page.fill('input[name="address"]', "Smoke test area")
    page.fill("textarea[name=\"summary\"]", "Smoke test for admin place and scene intake form.")
    page.fill('input[name="sceneTitle"]', "Smoke route from gate")
    page.fill('input[name="sceneSlug"]', f"{slug}-v1")
    page.fill('input[name="sceneEntryLabel"]', "Gate -> path -> main point")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator("article.intake-panel button.action-button").click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert slug in page.content()
    capture_page(page, "web-admin-place-intake.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(f"{BASE_URL}/admin/places/new", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".intake-form", timeout=20_000)
    capture_page(mobile, "web-admin-place-intake-mobile.png")
    mobile.close()


def check_admin_place_import(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(f"{BASE_URL}/admin/places/import", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".intake-form", timeout=20_000)
    assert page.locator('textarea[name="csv"]').count() == 1
    assert "name,slug,category" in page.content()
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator("article.intake-panel button.action-button").click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "Dry-run" in page.content()
    assert "hợp lệ" in page.content()
    capture_page(page, "web-admin-place-import.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(f"{BASE_URL}/admin/places/import", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".intake-form", timeout=20_000)
    assert mobile.locator('textarea[name="csv"]').count() == 1
    capture_page(mobile, "web-admin-place-import-mobile.png")
    mobile.close()


def check_admin_review_queues(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(f"{BASE_URL}/admin/review", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".review-queue-grid", timeout=20_000)
    assert "Review queues" in page.content()
    assert page.locator(".review-queue-panel").count() == 5
    assert page.locator('a[href="/admin/captures/new?scene=student-cafe-demo-v1"]').count() == 1
    assert page.locator('a[href="/api/admin/review"]').count() == 1
    capture_page(page, "web-admin-review-queues.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(f"{BASE_URL}/admin/review", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".review-queue-grid", timeout=20_000)
    assert mobile.locator(".review-queue-panel").count() == 5
    capture_page(mobile, "web-admin-review-queues-mobile.png")
    mobile.close()


def check_admin_place_review(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(
        f"{BASE_URL}/admin/places/phong-thu-nghiem-tu-cong-vao/review",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    page.wait_for_selector(".intake-form", timeout=20_000)
    assert "phong-thu-nghiem-tu-cong-vao" in page.content()
    page.select_option('select[name="status"]', "review")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator('button[name="dryRun"]').click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "review" in page.content()
    capture_page(page, "web-admin-place-review.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(
        f"{BASE_URL}/admin/places/phong-thu-nghiem-tu-cong-vao/review",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    mobile.wait_for_selector(".intake-form", timeout=20_000)
    assert mobile.locator('select[name="status"]').count() == 1
    capture_page(mobile, "web-admin-place-review-mobile.png")
    mobile.close()


def check_admin_place_privacy_review(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(
        f"{BASE_URL}/admin/places/phong-thu-nghiem-tu-cong-vao/privacy",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    page.wait_for_selector(".privacy-checklist-grid", timeout=20_000)
    assert "Privacy checklist" in page.content()
    page.select_option('select[name="decision"]', "approved")
    checkboxes = page.locator('.privacy-check-item input[type="checkbox"]')
    for index in range(checkboxes.count()):
        checkboxes.nth(index).check()
    page.fill("textarea[name=\"notes\"]", "Smoke dry-run approves only after all privacy checks are confirmed.")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator('button[name="dryRun"]').click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "Dry-run" in page.content()
    capture_page(page, "web-admin-place-privacy.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(
        f"{BASE_URL}/admin/places/phong-thu-nghiem-tu-cong-vao/privacy",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    mobile.wait_for_selector(".privacy-checklist-grid", timeout=20_000)
    assert mobile.locator(".privacy-check-item").count() == 6
    capture_page(mobile, "web-admin-place-privacy-mobile.png")
    mobile.close()


def check_admin_place_edit(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(
        f"{BASE_URL}/admin/places/phong-thu-nghiem-tu-cong-vao/edit",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    page.wait_for_selector(".intake-form", timeout=20_000)
    assert "home-test-room-v1" in page.content()
    page.fill('input[name="name"]', "Phong thu nghiem smoke edit")
    page.fill("textarea[name=\"summary\"]", "Smoke dry-run validates place edit form and scene metadata.")
    page.fill('input[name="sceneEntryLabel"]', "Gate -> path -> edited point")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator('button[name="dryRun"]').click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "Dry-run" in page.content()
    capture_page(page, "web-admin-place-edit.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(
        f"{BASE_URL}/admin/places/phong-thu-nghiem-tu-cong-vao/edit",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    mobile.wait_for_selector(".intake-form", timeout=20_000)
    assert mobile.locator('input[name="name"]').count() == 1
    assert mobile.locator('input[name="sceneEntryLabel"]').count() == 1
    capture_page(mobile, "web-admin-place-edit-mobile.png")
    mobile.close()


def check_admin_capture_intake(browser) -> None:
    raw_key = f"raw-captures/smoke/iphone14pro-{int(time.time())}.mov"
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(f"{BASE_URL}/admin/captures/new", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".intake-form", timeout=20_000)
    page.fill('input[name="rawAssetKey"]', raw_key)
    page.fill("textarea[name=\"notes\"]", "Smoke capture metadata before GPU job.")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator("article.intake-panel button.action-button").click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "Dry-run" in page.content() or "PostGIS" in page.content()
    capture_page(page, "web-admin-capture-intake.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(f"{BASE_URL}/admin/captures/new", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".intake-form", timeout=20_000)
    capture_page(mobile, "web-admin-capture-intake-mobile.png")
    mobile.close()


def check_admin_processing_intake(browser) -> None:
    log_key = f"processing/smoke/runpod-{int(time.time())}.log"
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(f"{BASE_URL}/admin/processing/new", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".intake-form", timeout=20_000)
    page.fill('input[name="logKey"]', log_key)
    page.fill("textarea[name=\"notes\"]", "Smoke job queues Nerfstudio gsplat from uploaded capture.")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator("button.action-button").click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "Dry-run" in page.content() or "PostGIS" in page.content()
    capture_page(page, "web-admin-processing-intake.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(f"{BASE_URL}/admin/processing/new", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".intake-form", timeout=20_000)
    capture_page(mobile, "web-admin-processing-intake-mobile.png")
    mobile.close()


def check_admin_processing_job_status(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(
        f"{BASE_URL}/admin/processing/job-home-test-room-runpod",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    page.wait_for_selector("text=Processing job", timeout=20_000)
    assert page.locator('a[href="/admin/scenes/home-test-room-v1/assets"]').count() == 1
    capture_page(page, "web-admin-processing-job.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(
        f"{BASE_URL}/admin/processing/job-home-test-room-runpod",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    mobile.wait_for_selector("text=Processing job", timeout=20_000)
    assert "Runbook GPU" in mobile.content()
    capture_page(mobile, "web-admin-processing-job-mobile.png")
    mobile.close()


def check_admin_system_page(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(f"{BASE_URL}/admin/system", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".system-health-grid", timeout=20_000)
    assert "System health local" in page.content()
    assert "PostGIS" in page.content()
    assert "sample-repository" in page.content() or "postgis" in page.content()
    capture_page(page, "web-admin-system.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(f"{BASE_URL}/admin/system", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".system-health-grid", timeout=20_000)
    assert "System health local" in mobile.content()
    capture_page(mobile, "web-admin-system-mobile.png")
    mobile.close()


def check_admin_asset_page(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(
        f"{BASE_URL}/admin/scenes/home-test-room-v1/assets",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    page.wait_for_selector(".asset-admin-grid", timeout=20_000)
    assert "scene.sog" in page.content()
    assert "collision.voxel.json" in page.content()
    assert "Object storage" in page.content()
    assert "localFiles" not in page.content()
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator("button.action-button").click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "dry-run local" in page.content() or "DB" in page.content()
    capture_page(page, "web-admin-assets.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(
        f"{BASE_URL}/admin/scenes/home-test-room-v1/assets",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    mobile.wait_for_selector(".asset-admin-grid", timeout=20_000)
    assert "scene.sog" in mobile.content()
    assert "Object storage" in mobile.content()
    capture_page(mobile, "web-admin-assets-mobile.png")
    mobile.close()


def check_admin_hotspot_page(browser) -> None:
    title = f"Smoke hotspot {int(time.time())}"
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(
        f"{BASE_URL}/admin/scenes/home-test-room-v1/hotspots",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    page.wait_for_selector(".intake-form", timeout=20_000)
    assert "Payload JSON" in page.content()
    assert page.locator(".hotspot-edit-form").count() >= 1
    assert page.locator(".hotspot-delete-form").count() >= 1
    page.locator("details summary").first.click()
    first_edit = page.locator(".hotspot-edit-form").first
    first_edit.locator('input[name="title"]').fill(f"Smoke edited hotspot {int(time.time())}")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        first_edit.locator('button[name="dryRun"]').click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "Dry-run sua" in page.content()

    page.locator("details summary").first.click()
    first_delete = page.locator(".hotspot-delete-form").first
    first_delete.locator('input[name="confirmDelete"]').check()
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        first_delete.locator('button[name="dryRun"]').click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "Dry-run xoa" in page.content()

    page.fill('input[name="title"]', title)
    page.fill("textarea[name=\"body\"]", "Smoke hotspot validates admin form and manifest contract.")
    page.fill('input[name="x"]', "0.5")
    page.fill('input[name="y"]', "1.6")
    page.fill('input[name="z"]', "-0.5")
    page.fill('input[name="yaw"]', "15")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator("article.intake-panel button.action-button").click()
    page.wait_for_selector(".publish-status", timeout=20_000)
    assert "Dry-run" in page.content() or "PostGIS" in page.content()
    capture_page(page, "web-admin-hotspots.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "admin")
    mobile.goto(
        f"{BASE_URL}/admin/scenes/home-test-room-v1/hotspots",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    mobile.wait_for_selector(".intake-form", timeout=20_000)
    assert mobile.locator(".work-list li").count() >= 1
    assert mobile.locator(".hotspot-edit-form").count() >= 1
    assert mobile.locator(".hotspot-delete-form").count() >= 1
    capture_page(mobile, "web-admin-hotspots-mobile.png")
    mobile.close()
