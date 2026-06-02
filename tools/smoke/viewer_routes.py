from smoke.common import BASE_URL, capture_page, wire_logging


def check_viewer(browser) -> None:
    page = browser.new_page(viewport={"width": 1280, "height": 820})
    wire_logging(page)
    assert_supersplat_viewer_static(page)
    page.goto(f"{BASE_URL}/viewer/home-test-room-v1", wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_selector(".viewer-hotspot-panel", timeout=20_000)
    page.wait_for_timeout(2_000)
    assert "Scene" in page.content()
    assert "SOG" in page.content()
    assert "Hotspot" in page.content()
    assert "Check-in" in page.content()
    assert page.locator(".viewer-quiz-option").count() >= 2
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator(".viewer-quiz-option").first.click()
    assert "quiz=ok" in page.url
    assert "quizCorrect=1" in page.url
    page.wait_for_selector(".viewer-hotspot-success", timeout=20_000)
    capture_page(page, "web-viewer-quiz.png")
    with page.expect_navigation(wait_until="domcontentloaded", timeout=60_000):
        page.locator(".viewer-hotspot-action").click()
    assert "checkin=ok" in page.url
    page.wait_for_selector(".viewer-hotspot-success", timeout=20_000)
    capture_page(page, "web-viewer-placeholder.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wire_logging(mobile)
    mobile.goto(f"{BASE_URL}/viewer/home-test-room-v1", wait_until="domcontentloaded", timeout=60_000)
    mobile.wait_for_selector(".viewer-hotspot-panel", timeout=20_000)
    assert "Audio guide" in mobile.content()
    assert mobile.locator(".viewer-hotspot-action").count() == 1
    capture_page(mobile, "web-viewer-mobile.png")
    mobile.close()


def assert_supersplat_viewer_static(page) -> None:
    response = page.request.get(f"{BASE_URL}/supersplat-viewer/index.html")
    assert response.ok
    assert "SuperSplat Viewer" in response.text()

    response = page.request.get(f"{BASE_URL}/supersplat-viewer/index.js")
    assert response.ok
    assert "playcanvas" in response.text().lower()
