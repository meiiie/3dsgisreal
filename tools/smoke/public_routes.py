from smoke.common import BASE_URL, capture_page, set_local_session_on_page, wire_logging


def check_home(browser, screenshot_name: str, viewport: dict[str, int]) -> None:
    page = browser.new_page(viewport=viewport)
    external_map_requests: list[str] = []
    page.on(
        "request",
        lambda request: external_map_requests.append(request.url)
        if "demotiles.maplibre.org" in request.url
        else None,
    )
    wire_logging(page)
    page.goto(f"{BASE_URL}/", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".brand-title", timeout=20_000)
    page.wait_for_selector(".place-filter-form", timeout=20_000)
    page.wait_for_selector(".place-item", timeout=20_000)
    page.wait_for_selector(".maplibregl-canvas", timeout=20_000)
    page.wait_for_timeout(4_000)
    capture_page(page, screenshot_name)
    assert "home-test-room-v1" in page.content()
    assert page.locator(".fallback-marker").count() == 3
    assert page.locator(".viewport-sync-button").count() == 1
    assert not external_map_requests
    with page.expect_response(lambda response: "/api/places?" in response.url and "bbox=" in response.url):
        page.locator(".viewport-sync-button").click()
    page.wait_for_selector('.viewport-sync-status[data-state="ready"]', timeout=20_000)
    assert page.locator(".place-item").count() >= 1
    capture_page(page, "web-home-viewport-sync.png")
    page.close()


def check_home_filters(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(page)
    page.goto(f"{BASE_URL}/", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".place-filter-form", timeout=20_000)
    page.fill('input[name="q"]', "cafe")
    page.select_option('select[name="category"]', "cafe")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator('.place-filter-form button[type="submit"]').click()
    page.wait_for_selector(".place-item", timeout=20_000)
    assert "quan-cafe-sinh-vien-mau" in page.content()
    assert page.locator(".place-item").count() >= 1
    assert page.locator(".fallback-marker").count() >= 1
    capture_page(page, "web-home-filtered.png")
    page.close()

    empty = browser.new_page(viewport={"width": 1280, "height": 900})
    wire_logging(empty)
    empty.goto(f"{BASE_URL}/?q=zz-no-place-smoke", wait_until="domcontentloaded", timeout=60_000)
    empty.wait_for_selector(".empty-place-state", timeout=20_000)
    assert empty.locator(".fallback-marker").count() == 0
    capture_page(empty, "web-home-filter-empty.png")
    empty.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    mobile.goto(f"{BASE_URL}/?category=cafe", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".place-filter-form", timeout=20_000)
    assert mobile.locator(".place-item").count() >= 1
    capture_page(mobile, "web-home-filtered-mobile.png")
    mobile.close()


def check_place_detail(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 820})
    wire_logging(page)
    set_local_session_on_page(page, "student")
    page.goto(
        f"{BASE_URL}/places/phong-thu-nghiem-tu-cong-vao",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    page.wait_for_selector("text=Manifest", timeout=20_000)
    assert "home-test-room-v1" in page.content()
    assert page.locator(".place-user-action-form").count() == 1
    page.locator('.place-user-action-form button[value="saved"]').click()
    page.wait_for_url("**/places/phong-thu-nghiem-tu-cong-vao?userPlace=saved&persisted=0", timeout=60_000)
    page.wait_for_selector("text=Dry-run luu dia diem hop le", timeout=20_000)
    page.locator('.place-user-action-form button[value="visited"]').click()
    page.wait_for_url("**/places/phong-thu-nghiem-tu-cong-vao?userPlace=visited&persisted=0", timeout=60_000)
    page.wait_for_selector("text=Dry-run da xem hop le", timeout=20_000)
    capture_page(page, "web-place-detail.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "student")
    mobile.goto(
        f"{BASE_URL}/places/phong-thu-nghiem-tu-cong-vao",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    mobile.wait_for_selector(".place-user-action-form", timeout=20_000)
    assert mobile.locator('.place-user-action-form button[value="saved"]').count() == 1
    assert mobile.locator('.place-user-action-form button[value="visited"]').count() == 1
    capture_page(mobile, "web-place-detail-mobile.png")
    mobile.close()


def check_session_page(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 820})
    wire_logging(page)
    page.goto(f"{BASE_URL}/session?next=/admin", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".session-choice-card", timeout=20_000)
    assert page.get_by_text("Identity & Access local").count() == 1
    capture_page(page, "web-session.png")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator('form:has(input[name="role"][value="admin"]) button').click()
    page.wait_for_selector("text=Admin local", timeout=20_000)
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    mobile.goto(f"{BASE_URL}/session", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".session-choice-card", timeout=20_000)
    capture_page(mobile, "web-session-mobile.png")
    mobile.close()


def check_admin_and_user(browser) -> None:
    user_cases = (
        ("/user", ".user-place-card", "web-user.png"),
    )

    for path, selector, screenshot_name in user_cases:
        page = browser.new_page(viewport={"width": 1280, "height": 820})
        wire_logging(page)
        set_local_session_on_page(page, "student")
        page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_selector(selector, timeout=20_000)
        assert page.locator(selector).count() >= 1
        if path == "/user":
            assert page.locator('a[href="/api/user"]').count() == 1
            assert page.locator('a[href="/places/phong-thu-nghiem-tu-cong-vao"]').count() >= 1
            assert page.locator(".quiz-attempt-list li").count() >= 1
        capture_page(page, screenshot_name)
        page.close()

    page = browser.new_page(viewport={"width": 1280, "height": 820})
    wire_logging(page)
    set_local_session_on_page(page, "admin")
    page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector('a[href="/admin/scenes/home-test-room-v1/assets"]', timeout=20_000)
    assert page.locator('a[href="/admin/scenes/home-test-room-v1/assets"]').count() >= 1
    capture_page(page, "web-admin.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    set_local_session_on_page(mobile, "student")
    mobile.goto(f"{BASE_URL}/user", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".user-place-card", timeout=20_000)
    assert mobile.locator('a[href="/api/user"]').count() == 1
    assert mobile.locator(".quiz-attempt-list li").count() >= 1
    capture_page(mobile, "web-user-mobile.png")
    mobile.close()
