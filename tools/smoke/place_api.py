from smoke.common import BASE_URL


def assert_places_filter_api(page) -> None:
    response = page.goto(f"{BASE_URL}/api/places?category=cafe", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    body = response.json()
    assert body["meta"]["filters"]["category"] == "cafe"
    assert body["meta"]["count"] >= 1
    assert any(item["slug"] == "quan-cafe-sinh-vien-mau" for item in body["data"])

    response = page.goto(f"{BASE_URL}/api/places?q=zz-no-place-smoke", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    body = response.json()
    assert body["meta"]["filters"]["search"] == "zz-no-place-smoke"
    assert body["meta"]["count"] == 0

    response = page.goto(f"{BASE_URL}/api/places?q=Phong thu nghiem", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    body = response.json()
    assert body["meta"]["filters"]["search"] == "Phong thu nghiem"
    assert body["meta"]["count"] >= 1
    assert body["data"][0]["slug"] == "phong-thu-nghiem-tu-cong-vao"

    response = page.goto(f"{BASE_URL}/api/places?status=published", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    body = response.json()
    assert body["meta"]["filters"]["status"] == "published"
    assert body["meta"]["count"] >= 1
    assert all(item["publicationStatus"] == "published" for item in body["data"])
    assert any(item["slug"] == "cong-di-tich-mau" for item in body["data"])

    response = page.goto(
        f"{BASE_URL}/api/places?bbox=106.687,20.844,106.689,20.846",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.ok
    body = response.json()
    assert body["meta"]["filters"]["bounds"] == {
        "west": 106.687,
        "south": 20.844,
        "east": 106.689,
        "north": 20.846,
    }
    assert body["meta"]["count"] == 1
    assert body["data"][0]["slug"] == "phong-thu-nghiem-tu-cong-vao"

    response = page.goto(
        f"{BASE_URL}/api/places?west=0&south=0&east=1&north=1",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.ok
    body = response.json()
    assert body["meta"]["filters"]["bounds"] == {
        "west": 0,
        "south": 0,
        "east": 1,
        "north": 1,
    }
    assert body["meta"]["count"] == 0

    response = page.goto(f"{BASE_URL}/api/places?bbox=bad", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    body = response.json()
    assert "bounds" not in body["meta"]["filters"]

    response = page.goto(
        f"{BASE_URL}/api/places?near=106.6881,20.8449&radiusMeters=450",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.ok
    body = response.json()
    assert body["meta"]["filters"]["near"] == {"lng": 106.6881, "lat": 20.8449, "radiusMeters": 450}
    assert body["meta"]["count"] == 1
    assert body["data"][0]["slug"] == "phong-thu-nghiem-tu-cong-vao"
    assert body["data"][0]["distanceMeters"] == 0

    response = page.goto(f"{BASE_URL}/api/places?near=bad&radiusMeters=450", wait_until="domcontentloaded", timeout=60_000)
    assert response is not None and response.ok
    body = response.json()
    assert "near" not in body["meta"]["filters"]


def assert_place_detail_api(page) -> None:
    response = page.goto(
        f"{BASE_URL}/api/places/phong-thu-nghiem-tu-cong-vao",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.ok
    body = response.json()
    assert body["data"]["slug"] == "phong-thu-nghiem-tu-cong-vao"
    assert body["data"]["scene"]["id"] == "home-test-room-v1"
    assert body["meta"]["sceneManifestHref"] == "/api/scenes/home-test-room-v1/manifest"
    assert body["meta"]["source"] in ("postgis", "sample-repository")

    response = page.goto(
        f"{BASE_URL}/api/places/zz-no-place-smoke",
        wait_until="domcontentloaded",
        timeout=60_000,
    )
    assert response is not None and response.status == 404
    body = response.json()
    assert body["error"] == "place_not_found"
