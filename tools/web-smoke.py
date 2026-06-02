from playwright.sync_api import sync_playwright

from smoke.admin_routes import (
    check_admin_asset_page,
    check_admin_capture_intake,
    check_admin_hotspot_page,
    check_admin_place_edit,
    check_admin_place_import,
    check_admin_place_intake,
    check_admin_place_privacy_review,
    check_admin_place_review,
    check_admin_processing_intake,
    check_admin_processing_job_status,
    check_admin_review_queues,
    check_admin_system_page,
)
from smoke.api_routes import check_api
from smoke.public_routes import (
    check_admin_and_user,
    check_home,
    check_home_filters,
    check_place_detail,
    check_session_page,
)
from smoke.viewer_routes import check_viewer


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        check_home(browser, "web-home-desktop.png", {"width": 1440, "height": 920})
        check_home(browser, "web-home-mobile.png", {"width": 390, "height": 844})
        check_home_filters(browser)
        check_session_page(browser)
        check_place_detail(browser)
        check_admin_and_user(browser)
        check_admin_place_intake(browser)
        check_admin_place_import(browser)
        check_admin_review_queues(browser)
        check_admin_place_privacy_review(browser)
        check_admin_place_edit(browser)
        check_admin_place_review(browser)
        check_admin_capture_intake(browser)
        check_admin_processing_intake(browser)
        check_admin_processing_job_status(browser)
        check_admin_system_page(browser)
        check_admin_asset_page(browser)
        check_admin_hotspot_page(browser)
        check_api(browser)
        check_viewer(browser)
        browser.close()


if __name__ == "__main__":
    main()
