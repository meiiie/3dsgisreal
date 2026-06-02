from pathlib import Path
import json
import os
import sys


ARTIFACT_DIR = Path("artifacts")
ARTIFACT_DIR.mkdir(exist_ok=True)
BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:4317")


def capture_page(page, screenshot_name: str) -> None:
    page.screenshot(path=str(ARTIFACT_DIR / screenshot_name), full_page=True, caret="initial")


def wire_logging(page) -> None:
    page.on("console", lambda msg: safe_print(f"console:{msg.type}:{msg.text}"))
    page.on("pageerror", lambda err: safe_print(f"pageerror:{err}"))


def safe_print(message: str) -> None:
    encoding = sys.stdout.encoding or "utf-8"
    print(message.encode(encoding, errors="backslashreplace").decode(encoding))


def set_local_session(browser, role: str) -> None:
    page = browser.new_page()
    set_local_session_on_page(page, role)
    page.close()


def set_local_session_on_page(page, role: str) -> None:
    response = page.request.post(
        f"{BASE_URL}/api/session",
        data=json.dumps({"role": role}),
        headers={"content-type": "application/json"},
    )
    assert response.ok, response.text()
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["role"] == role
