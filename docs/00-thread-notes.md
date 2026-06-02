# Thread Notes - 2026-06-02

## Product Idea

The product is a student-oriented interactive travel/rental map. Users browse a map of places in Hai Phong, Hanoi, or a smaller campus/neighborhood area. Clicking a marker opens a separate 3D Gaussian Splat scene for that place.

The intended experience is not a continuous full-city 3D scan. It is a set of independent scene portals:

- room rental: gate -> alley -> door -> room
- cafe: storefront -> counter -> seating area
- heritage/craft site: entrance -> walkthrough -> hotspots

## Current Capture Direction

- Use iPhone 14 Pro primarily for capture.
- Recommended capture setup: landscape, 4K 30fps, 1x main camera, no zoom, no lens switching, stable exposure/focus/white balance where possible.
- Use video plus selected still photos for important details.
- Avoid moving people, mirrors, glass, shiny surfaces, heavy lighting changes, and standing still while panning.

## 3DGS Tooling Direction

- SuperSplat is not the trainer. It is the editing/cleanup/publishing stage after a splat exists.
- Preferred open-source training path: Nerfstudio `splatfacto` + `gsplat` on NVIDIA CUDA.
- Postshot is useful as a quality benchmark/GUI but is not fully free/open-source and does not run natively on Mac M4.
- Mac M4 remains useful for 3D Splat App/RadianceKit/Brush and for preparing data, but not as the primary `gsplat` CUDA machine.
- RunPod RTX 4090 or L4 is a practical GPU rental path. GCP quota for L4 was requested but not approved immediately.

## GPU Timing

The user plans to start renting/testing GPU around 13:00 on 2026-06-02 Asia/Saigon time.

Before that, prepare the web app, map shell, data model, asset pipeline docs, and agent harness.

Pre-GPU setup progress on 2026-06-02:

- Added `docs/15-pre-gpu-setup-runbook.md` as the paid-GPU operating checklist.
- Added `tools/3dgs/create_gpu_experiment.py` to generate a local experiment folder with admin payload drafts, RunPod/Nerfstudio commands, and postprocessing commands before the pod starts.
- Added `tools/3dgs/upload_raw_capture_to_s3.mjs` plus root script `pnpm captures:upload` for private raw video/photo uploads to the `raw-captures` MinIO/S3 bucket.
- Added `tools/3dgs/pre_gpu_check.py` plus root script `pnpm gpu:preflight` to validate the generated experiment folder before renting GPU time.
- Added `tools/3dgs/runtime_preflight.py` plus root script `pnpm runtime:preflight` to check a running local app against PostGIS, MinIO/S3, admin system health, and the scene manifest before renting GPU time.
- Current rule: do not rent GPU until the raw capture exists outside git, raw upload dry-run passes, capture/job metadata is ready, and the generated RunPod script has been reviewed.
- Clean PostGIS preflight exposed that the first migration installed PostGIS into an `extensions` schema while the schema/query code expects `public.geometry` and `public.ST_*`; the initial migration was narrowed to install PostGIS in `public`, and a fresh preflight database applied all seven migrations successfully.
- The existing local `loi_vao` lab volume was re-baselined after the migration fix by clearing `public.schema_migrations` and running `pnpm db:migrate -- --baseline-existing`; `pnpm db:migrate` then reported no pending migrations without deleting seeded data.

## Web Scaffold State

Created on 2026-06-02:

- Root AI harness: `AGENTS.md`.
- Research/architecture/pipeline docs under `docs/`.
- Next.js web app under `apps/web`.
- Map-first MVP page with sample places and a route per scene.
- Placeholder viewer route for pending 3DGS assets.
- Fallback marker layer so the map remains clickable even before a production tile provider is configured.

Verification passed:

- `pnpm --filter @tro/web typecheck`
- `pnpm --filter @tro/web lint`
- `pnpm --filter @tro/web build`
- `tools/web-smoke.py` through the local web testing harness.

Updated local product slice on 2026-06-02:

- Added a typed `places` domain, sample repository, API routes, place detail route, admin route, user route, and scene manifest route.
- Kept sample data behind a repository boundary so PostGIS/Kysely can replace it without changing the UI contract.
- Split page-surface CSS out of global map styles after the stylesheet crossed the soft size threshold.
- Fixed disabled 3D actions so unavailable scenes do not accidentally navigate.
- Re-ran `typecheck`, `lint`, `build`, local Playwright smoke, and in-app browser verification.
- Current dev-server smoke shows harmless Next dev HMR WebSocket warnings in Playwright, but product routes render and pass assertions.

Backend/data progress on 2026-06-02:

- Added real workspace package `@loi-vao/db` with Kysely/Postgres client setup, initial table types, and a PostGIS-backed place/scene query.
- Wired `apps/web` server repository to use PostGIS when `DATABASE_URL` is set, with sample data only when `DATABASE_URL` is absent.
- Marked data-driven Next pages as dynamic so runtime DB data can be read after deployment/container start.
- Added local seed migration `db/migrations/202606020002_local_seed_places.sql` for the three lab places/scenes.
- Verified `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `tools/web-smoke.py` after the DB package wiring.
- Docker CLI is installed and `docker compose config --quiet` passes. Docker Desktop was not running during the first backend pass, but was later started and PostGIS/MinIO runtime verification was completed.

Admin pipeline progress on 2026-06-02:

- Added pipeline domain types for capture sessions and processing jobs.
- Added sample fallback pipeline data plus DB-backed query mapping through `@loi-vao/db`.
- Added `GET /api/admin/pipeline`.
- Updated `/admin` to show capture queue, GPU job queue, and next operator actions.
- Extended local seed SQL with one capture session and one RunPod processing job placeholder.
- Verified `pnpm typecheck`, `pnpm lint`, `pnpm build`, `tools/web-smoke.py`, and in-app browser admin inspection.

Scene asset/manifest progress on 2026-06-02:

- Added real workspace package `@loi-vao/assets` for storage URL helpers, scene asset checklist, runtime readiness, and SuperSplat Viewer URL construction.
- Scene manifest API now includes readiness data: whether the viewer can open, whether full walkthrough mode is ready, and which assets are missing.
- Viewer placeholder now shows a concrete asset checklist for SOG content, settings.json, collision, and poster.
- Viewer iframe URL construction moved out of the route file into the assets package.
- Verified `pnpm typecheck`, `pnpm lint`, `pnpm build`, `tools/web-smoke.py`, manifest API output, and viewer screenshot.
- The recurring Next dev HMR WebSocket warning still appears in Playwright smoke, but route assertions and build pass.

Asset publishing progress on 2026-06-02:

- Added a standard asset publish plan in `@loi-vao/assets`: `scene.sog`, `settings.json`, `collision.voxel.json`, and `poster.webp` under `scenes/<sceneId>/v<version>/`.
- Added DB helper to publish asset keys onto the latest `scene_versions` row and mark the scene ready when `DATABASE_URL` is available.
- Added `GET /api/admin/scenes/[sceneId]/assets` for asset publish plan and current readiness.
- Added `PUT /api/admin/scenes/[sceneId]/assets` for local dry-run without DB and DB write when PostGIS is enabled.
- Added admin link from GPU job to asset plan.
- Extended `tools/web-smoke.py` to check the asset plan API and dry-run publish response.
- Verified `pnpm typecheck`, `pnpm lint`, `pnpm build`, `tools/web-smoke.py`, direct asset plan API output, and admin screenshot.

Admin asset page progress on 2026-06-02:

- Added `/admin/scenes/[sceneId]/assets` as the human admin surface for the asset publish plan.
- The page shows current readiness, expected SOG/settings/collision/poster storage keys, and a publish form.
- Adopted a Next Server Function form action for the publish operation after local browser testing showed a client-only click handler was weaker in the current dev harness.
- Pattern record: official Next forms/Server Functions; local reason is server-owned admin mutation with progressive form behavior; boundary is admin route -> scenes server module -> `@loi-vao/db`; verification is typecheck/lint/build plus desktop/mobile Playwright smoke screenshots.
- `tools/web-smoke.py` now checks the admin asset page, submits the publish form, and captures `web-admin-assets.png` plus `web-admin-assets-mobile.png`.

Local asset presence progress on 2026-06-02:

- Added `apps/web/public/scene-assets/.gitkeep` as the local destination for runtime scene assets.
- Admin asset API/page now reports whether each planned artifact exists in `public/scene-assets`.
- The page shows `File local` count and a "File trong public" panel with public URLs and missing/present state.
- Added basic QA status for local scene files: `ready`, `missing`, or `invalid`; JSON runtime config/collision files must parse, and binary/poster files must be non-empty.
- `tools/web-smoke.py` checks `localFiles` in the API and verifies the desktop/mobile asset page panel.
- Moved local filesystem checks into a dev/local adapter so `next build` stays clean without the Turbopack NFT workspace-trace warning.

Object-storage asset presence progress on 2026-06-02:

- Extended `packages/assets/src/object-storage.ts` with S3 `HeadObject` checks for planned scene runtime objects.
- `GET /api/admin/scenes/[sceneId]/assets` and `PUT /api/admin/scenes/[sceneId]/assets` now include `objectFiles` alongside `localFiles`.
- `/admin/scenes/[sceneId]/assets` now shows an Object storage panel with S3 object URL/status, size, updated time, or error per planned artifact.
- `PUT /api/admin/scenes/[sceneId]/assets` now blocks DB writes when planned S3 objects are missing, so scene versions are not marked ready merely because key names exist.
- Smoke now asserts the `objectFiles` API contract and the admin Object storage panel.
- Current caveat: object presence is a storage gate only. Real viewer quality still requires loading the SOG in browser/mobile and checking collision/performance.

Scene runtime S3 upload tool progress on 2026-06-02:

- Added `tools/3dgs/package.json` as a small workspace package for 3DGS pipeline CLI dependencies.
- Added `tools/3dgs/upload_scene_assets_to_s3.mjs`.
- Added root script `pnpm assets:upload`.
- The tool uploads `scene.sog`, `settings.json`, `collision.voxel.json`, and `poster.webp` to the configured `scene-assets` bucket under `scenes/<sceneId>/v<version>/`.
- The tool supports `--dry-run`, `--json`, `--overwrite`, custom filenames, custom `--base-key`, and `--allow-missing-optional`.
- Safety rules: validate files are inside `--input-dir`, reject empty files, parse settings/collision JSON as objects, refuse overwrite unless explicit, verify uploads with S3 `HeadObject`, and do not touch PostGIS.
- Verified against local MinIO with a smoke-only scene prefix: dry-run passed, upload passed with all four objects verified, duplicate upload without `--overwrite` was refused, and no DB scene version was marked ready.

Local asset staging tool progress on 2026-06-02:

- Added `tools/3dgs/prepare_local_scene_assets.py`.
- The script copies `scene.sog`, `settings.json`, `collision.voxel.json`, and `poster.webp` from a prepared output folder into `apps/web/public/scene-assets/scenes/<sceneId>/v<version>/`.
- It supports `--dry-run`, `--json`, `--overwrite`, custom input filenames, and `--allow-missing-optional`.
- It refuses destination overwrite by default and blocks source/destination path escape.
- `.gitignore` now ignores `apps/web/public/scene-assets/**` except `.gitkeep`.

User surface progress on 2026-06-02:

- Added `user_place_library` migration for local saved/visited/check-in place state.
- Added `packages/db/src/user.ts` to read a local demo profile's place library through Kysely/PostGIS.
- Added `apps/web/src/features/user` with a dashboard domain, fallback sample activities, and a server repository.
- Added `GET /api/user`.
- Reworked `/user` into a real local dashboard with saved/visited/check-in counts, continue list, per-place notes, and links back to profile/viewer routes.
- `tools/web-smoke.py` now checks `/api/user` and captures desktop/mobile user screenshots.

Public map search/filter progress on 2026-06-02:

- Added `PlaceListFilters` with search text and category filtering.
- Added SQL-backed filtering in `packages/db/src/places.ts` for PostGIS and matching sample fallback filtering in `apps/web/src/features/places/server/repository.ts`.
- Updated `/` so the map/list reads `?q=...&category=...` and renders a native search/category form, result summary, and empty state.
- Updated `GET /api/places` to apply the same filters and return `meta.filters`.
- Extended smoke coverage for API filter results, form submit, filtered desktop/mobile screenshots, and empty-result map/list state.
- Expanded the same query contract with publication `status`, `near=lng,lat&radiusMeters=...`, `distanceMeters`, and accent-insensitive Vietnamese search through PostGIS `unaccent`.
- Current caveat: this is still list-scale query behavior, not clustering, pagination, vector tiling, or a full search engine.

Public place bounds filter progress on 2026-06-02:

- Extended `PlaceListFilters` with normalized WGS84 bounds: `west`, `south`, `east`, and `north`.
- `GET /api/places` now accepts either `bbox=west,south,east,north` or individual `west`, `south`, `east`, `north` query parameters.
- Invalid or incomplete bounds are ignored rather than crashing the public API.
- Sample fallback filtering and the PostGIS query path share the same bounds contract; PostGIS uses `ST_MakeEnvelope` against `places.geom`.
- Smoke now verifies one-place bounds, empty bounds, and invalid bounds behavior.
- Current caveat: the bounds API is place-list oriented only; it is not clustering, vector tiling, or pagination yet.

Admin CSV place import progress on 2026-06-02:

- Added `apps/web/src/features/places/server/place-bulk-import.ts` for CSV parsing, batch validation, duplicate detection, dry-run, and PostGIS write path.
- Added `createPlacesWithScenes` in `packages/db/src/admin-places.ts` so valid batches write draft places + first scenes in one transaction.
- Added `POST /api/admin/places/import` and `/admin/places/import`.
- Added an admin dashboard link, API smoke dry-run, and desktop/mobile smoke coverage.
- Current caveat: local importer is intentionally capped at 50 rows and is not a background ETL/file-upload system.

Admin review queue progress on 2026-06-02:

- Added `apps/web/src/features/admin` as the Admin/Ops read-model boundary for review queues.
- Added `GET /api/admin/review` behind the existing local admin session gate.
- Added `/admin/review` to group next actions for permission review, capture needed, GPU processing, publish-ready scenes, and published-place checks.
- The queue links back to existing mutation surfaces instead of creating a workflow engine: place status review, capture intake, processing job detail/intake, scene asset plan, and public place profile.
- `/admin/captures/new` now accepts `?scene=...` or `?place=...` so queue links can preselect the intended scene.
- Extended smoke coverage with API assertions and desktop/mobile screenshots for `/admin/review`.
- Current caveat: the queue is only as accurate as the underlying sample/PostGIS read models; real production auth and richer audit/history still remain future work.

Admin place privacy checklist progress on 2026-06-02:

- Added `db/migrations/202606020007_place_privacy_reviews.sql` for append-only place privacy review rows.
- Added `packages/db/src/place-privacy-reviews.ts` for latest-read and append-only write helpers.
- Added `apps/web/src/features/places/server/place-privacy-review.ts` for checklist validation, dry-run behavior, sample fallback, and PostGIS write path.
- Added `GET/POST /api/admin/places/[slug]/privacy`.
- Added `/admin/places/[slug]/privacy` as a form-backed operator surface for permission, public address safety, people/faces, private objects, audio/hotspot copy, and raw capture privacy.
- Linked the privacy checklist from the admin dashboard, place status review page, and Admin/Ops review queue.
- Extended smoke coverage with API dry-run, admin session gate, and desktop/mobile screenshots.
- Current caveat: this does not auto-publish or store legal documents; it records operator checklist evidence before the existing status/asset publish steps.

Public map viewport loading progress on 2026-06-02:

- Added a MapLibre viewport loading helper under `apps/web/src/features/map/viewport-place-loading.ts`.
- The home map now keeps server-rendered places as the initial dataset, then can refresh visible places through the bounds API.
- The viewport refresh preserves existing `q`/`category` filters and aborts stale in-flight requests before starting a newer one.
- Manual refresh is available from the sidebar, and user drag/zoom/rotate/pitch movement triggers the same loader after `moveend`.
- Smoke now verifies the homepage renders the initial map markers, clicks the viewport refresh control, observes the `bbox` API request, and checks the refreshed result state.
- Current caveat: viewport loading is still place-list/marker loading only. Clustering, pagination, URL-state sync, and vector tile overlays remain later map-scale work.

Local-first map style progress on 2026-06-02:

- Added `apps/web/public/map-styles/local-lab.json` as a tile-free MapLibre style for the local lab.
- The home map now defaults to the local style instead of `https://demotiles.maplibre.org/style.json`.
- `NEXT_PUBLIC_MAP_STYLE_URL` can still override the style when testing a real tile provider or future PMTiles style.
- Smoke now waits for the MapLibre canvas and asserts that the homepage does not call `demotiles.maplibre.org`.
- Current caveat: this is not the final Vietnam/Hai Phong basemap. The long-term path remains Geofabrik/Planetiler/PMTiles or a proper tile provider.

Local dev hydration note on 2026-06-02:

- Next dev initially blocked `/_next/webpack-hmr` requests from `127.0.0.1`, which meant server-rendered HTML was visible but the home map client component did not hydrate in Playwright.
- Added `allowedDevOrigins: ["127.0.0.1"]` to `apps/web/next.config.ts`.
- After restart, HMR connected, MapLibre canvas rendered, marker clicks hydrated, and the viewport refresh button issued the expected `GET /api/places?bbox=...` request.

Public place detail API progress on 2026-06-02:

- Added `GET /api/places/[slug]` for the public place detail contract.
- The response includes the same place/scene shape used by the page plus `meta.sceneManifestHref`, `meta.placeHref`, and runtime `meta.source`.
- Missing slugs return `404` with `error: "place_not_found"`.
- Updated `GET /api/places` and scene manifest API to report `meta.source` as `sample-repository` or `postgis` instead of hard-coding sample source.
- Smoke now verifies detail 200, missing-place 404, source metadata, and manifest link.

User place-library action progress on 2026-06-02:

- Added `packages/db/src/user.ts` generic `upsertUserPlaceLibraryStatus` for saved, visited, and checked-in place states.
- Status rule: `saved` does not downgrade `visited` or `checked_in`; `visited` does not downgrade `checked_in`; viewer check-in remains the owner of `checked_in`.
- Added `apps/web/src/features/user/server/place-library-action.ts` to validate local user save/visited actions from a place profile.
- Added `POST /api/user/place-library` with dry-run behavior when `DATABASE_URL` is unset and PostGIS write path when enabled.
- Added form-backed `Luu` and `Da xem` actions to `/places/[slug]`, with redirect feedback and `/user` revalidation.
- Extended smoke coverage so the API dry-run, desktop place-detail save/visited submits, and mobile place-detail controls are verified.
- Verification passed: DB typecheck, web typecheck, lint, build, Docker Compose config, migration script syntax check, Python smoke compile, full `python tools/web-smoke.py`, and desktop/mobile screenshot inspection.

Admin place intake progress on 2026-06-02:

- Added `packages/db/src/admin-places.ts` to create a place + first scene in one PostGIS transaction.
- Added `apps/web/src/features/places/server/place-intake.ts` for admin intake validation, slug normalization, Vietnam coordinate checks, dry-run support, and DB persistence when `DATABASE_URL` exists.
- Added `POST /api/admin/places`.
- Added `/admin/places/new` as a server-action form for adding a draft place and scene.
- `/admin` now links to the place intake flow.
- `tools/web-smoke.py` now checks the admin place-intake page, mobile layout, and API dry-run.

Admin place metadata edit progress on 2026-06-02:

- Added `packages/db/src/admin-places.ts` helper to update map metadata plus the first scene title/entry path in one transaction.
- Added `apps/web/src/features/places/server/place-edit.ts` for server-side validation, dry-run support, coordinate checks, and DB persistence when `DATABASE_URL` exists.
- Added `PATCH /api/admin/places/[slug]` for admin API metadata edits.
- Added `/admin/places/[slug]/edit` as a form-backed operator page for editing name, category, summary, address, city, coordinates, scene title, and route-from-entry.
- `/admin` and `/admin/places/[slug]/review` now link to the edit flow.
- `tools/web-smoke.py` now checks the API dry-run plus desktop/mobile admin edit page.
- Current caveat: place slug and scene slug are intentionally locked in this edit route to avoid breaking existing links, capture sessions, processing jobs, hotspots, and asset keys.

Admin place status review progress on 2026-06-02:

- Added `packages/db/src/admin-places.ts` status update helper for `places.status` by slug.
- Added `apps/web/src/features/places/server/place-status-review.ts` for server-side status validation, dry-run support, archive confirmation, and DB persistence when `DATABASE_URL` exists.
- Added `PATCH /api/admin/places/[slug]/status` for admin API status updates.
- Added `/admin/places/[slug]/review` as a form-backed operator page for draft, review, published, and archived status changes.
- `/admin` now links each place to the review status flow.
- `tools/web-smoke.py` now checks the API dry-run plus desktop/mobile admin review page.
- Current caveat: publishing a place only updates place review/publication status. Runtime scene readiness still depends on processing, SuperSplat cleanup, SOG/collision asset publish, and later access-control/auth work.

Admin capture intake progress on 2026-06-02:

- Added `packages/db/src/admin-captures.ts` to create capture-session records for an existing place/scene.
- Added `apps/web/src/features/pipeline/server/capture-intake.ts` for capture metadata validation, scene reference validation, safe raw asset key rules, dry-run support, and DB persistence when `DATABASE_URL` exists.
- Added `POST /api/admin/captures`.
- Added `/admin/captures/new` as a server-action form for recording iPhone/video/photo capture metadata before GPU processing.
- `/admin` now links to the capture intake flow.
- `tools/web-smoke.py` now checks the capture intake API dry-run, desktop form submit, and mobile layout.
- Raw capture rule is explicit: store only `raw-captures/...` storage keys in the app/database; do not commit or publish raw videos/photos.

Admin processing job progress on 2026-06-02:

- Added `packages/db/src/admin-processing-jobs.ts` to create a queued processing job from an existing capture session.
- The DB writer creates a new processing `scene_versions` row, inserts a `processing_jobs` row, and marks the capture as `processing`.
- Added `apps/web/src/features/pipeline/server/processing-job-intake.ts` for job validation, provider/toolchain defaults, frame target rules, and safe `processing/...` log keys.
- Added `POST /api/admin/processing-jobs`.
- Added `/admin/processing/new` as a server-action form for creating a queued Nerfstudio/gsplat job from capture metadata.
- `/admin` now links to the processing-job flow from both top navigation and eligible capture rows.
- `tools/web-smoke.py` now checks processing job API dry-run plus desktop/mobile form screenshots.
- Current scope is queue metadata only; real RunPod execution, live logs, cancellation, and retry controls remain future work.

Processing job status progress on 2026-06-02:

- Added `PATCH /api/admin/processing-jobs/[jobId]/status` for server-validated job status transitions.
- Added `/admin/processing/[jobId]` as the local operator detail page for status updates and GPU runbook context.
- Added DB helper logic to update `processing_jobs.status`, set `started_at`/`finished_at`, write the last operator note into `config`, and sync capture status.
- Failed/cancelled jobs mark the linked scene version `failed`; succeeded jobs do not mark runtime assets ready because SuperSplat/SOG/collision publish remains a separate gate.
- Allowed transitions are explicit: `queued -> running/failed/cancelled`, `running -> succeeded/failed/cancelled`, and `failed/cancelled -> queued`.
- `tools/web-smoke.py` now checks the job detail page on desktop/mobile and verifies a dry-run API transition.

Scene interaction progress on 2026-06-02:

- Added a typed `SceneHotspot` contract to the scene manifest: `info`, `audio`, `quiz`, `checkin`, and `link`.
- Added `packages/db/src/hotspots.ts` to read hotspots from the latest scene version in PostGIS.
- Added `db/migrations/202606020004_seed_scene_hotspots.sql` with first local hotspots for the home-test scene.
- `GET /api/scenes/[sceneId]/manifest` now includes `hotspots` for runtime consumers.
- Added `apps/web/src/features/viewer/SceneInteractionPanel.tsx` and wired it into `/viewer/[sceneId]`.
- Viewer smoke now checks desktop/mobile hotspot rendering plus manifest API hotspot data.
- Current caveat: hotspots started as runtime/read-only primitives; precise 3D placement, audio playback, quiz scoring, and real-auth user actions remain later slices.

Admin hotspot intake progress on 2026-06-02:

- Added `packages/db/src/admin-hotspots.ts` to insert a hotspot into the latest scene version for a scene.
- Added `apps/web/src/features/scenes/server/hotspot-intake.ts` for hotspot validation, dry-run support, payload JSON parsing, and type-specific checks for audio, quiz, check-in, and link payloads.
- Added `GET/POST /api/admin/scenes/[sceneId]/hotspots`.
- Added `/admin/scenes/[sceneId]/hotspots` as the operator page for adding manifest-level hotspots before 3D gizmo placement exists.
- `/admin` now links from scene jobs to the hotspot admin page.
- `tools/web-smoke.py` now checks the hotspot admin page/API and captures desktop/mobile screenshots.
- Current caveat: this is numeric/data-driven placement only. Precise PlayCanvas placement, audio playback, richer scoring, and real-auth user actions remain later slices.

Admin hotspot edit/delete progress on 2026-06-02:

- Added `packages/db/src/admin-hotspots.ts` helpers to update and delete scene hotspots on the latest scene version.
- Added `PATCH` and `DELETE /api/admin/scenes/[sceneId]/hotspots` with server-side hotspot id validation, payload validation for updates, explicit delete confirmation, dry-run behavior, and PostGIS write path when `DATABASE_URL` exists.
- Split hotspot admin route code into a thin `page.tsx`, `actions.ts`, and `HotspotEditorList.tsx` to avoid page god-file drift.
- Split hotspot payload/default/validation helpers into `apps/web/src/features/scenes/server/hotspot-payload.ts` after `hotspot-intake.ts` crossed the line-count warning threshold.
- Updated `/admin/scenes/[sceneId]/hotspots` so each existing hotspot has a collapsed edit/delete form with dry-run update and dry-run delete controls.
- Extended `tools/smoke/api_routes.py` to cover hotspot API create/update/delete dry-runs and `tools/smoke/admin_routes.py` to submit edit/delete dry-run forms on desktop plus verify mobile form presence.
- Verification passed: DB typecheck, web typecheck, lint, build, Docker Compose config, migration script syntax check, Python smoke compile, full `python tools/web-smoke.py`, and desktop/mobile screenshot inspection.

Viewer user check-in progress on 2026-06-02:

- Added `packages/db/src/user.ts` write helper to upsert a local demo profile check-in into `user_place_library`.
- Added `apps/web/src/features/user/server/check-in.ts` to validate sceneId, check-in hotspot id, reward, and note before writing.
- Added `POST /api/user/checkins` with dry-run behavior when `DATABASE_URL` is unset.
- Added a form-backed Server Function action in `apps/web/src/features/viewer/SceneInteractionPanel.tsx` so check-in hotspots in `/viewer/[sceneId]` work without relying on client hydration.
- `tools/web-smoke.py` now checks the check-in API and clicks the viewer check-in button.
- Current caveat: check-in uses the local demo profile until real auth/session is added.

Viewer user quiz progress on 2026-06-02:

- Added `db/migrations/202606020005_user_quiz_attempts.sql` for local demo profile quiz attempts tied to scene hotspots.
- Added `packages/db/src/user-quiz.ts` to write quiz attempts and derive `scene_id` from the hotspot's scene version.
- Added `apps/web/src/features/user/server/quiz-attempt.ts` to validate sceneId, quiz hotspot id, selected answer, and compute correctness server-side from hotspot payload data.
- Added `POST /api/user/quiz-attempts` with dry-run behavior when `DATABASE_URL` is unset.
- Updated `/viewer/[sceneId]` hotspot UI so quiz options submit through a form-backed Server Function with selected/correct/error feedback.
- `tools/web-smoke.py` now checks the quiz API dry-run and clicks the first viewer quiz option before check-in.
- Current caveat: quiz uses the local demo profile until real auth/session is added; answer keys still live in the manifest prototype contract.

User quiz history progress on 2026-06-02:

- Extended `packages/db/src/user-quiz.ts` with a read query for recent quiz attempts joined to scenes, hotspots, and places.
- Seeded one local quiz attempt in `db/migrations/202606020005_user_quiz_attempts.sql` so fresh PostGIS volumes have a visible quiz history.
- Extended the user dashboard domain/repository with `quizAttempts` and simple `quizStats` correct/total counts.
- Updated `/user` with a compact "Quiz gan day" panel and `/api/user` with the same data contract.
- Updated smoke coverage so `/api/user`, desktop `/user`, and mobile `/user` assert quiz history is present.

Local identity/access progress on 2026-06-02:

- Added `packages/db/src/identity.ts` and `db/migrations/202606020006_local_identity_access.sql` for local student/admin profiles and a seeded admin project member role.
- Added a local signed session boundary with an HTTP-only HMAC cookie.
- Added `/session` for switching between student and admin lab profiles.
- Added `GET/POST/DELETE /api/session` for local tools and smoke tests.
- Added `apps/web/src/proxy.ts` using the current Next.js proxy convention to gate `/admin/*` and `/api/admin/*`.
- User dashboard, save/visited actions, viewer check-in, and viewer quiz attempts now use the current local session profile instead of only the hard-coded demo profile.
- Smoke now verifies the session page, admin API 403 without an admin session, admin UI/API with an admin session, and user UI/actions with a student session.
- Current caveat: this is local lab identity/access, not production authentication. A real provider/session model is still needed before public deployment or private-room access.

Admin/Ops system health progress on 2026-06-02:

- Added `packages/db/src/health.ts` for lightweight PostGIS runtime checks: DB connection, PostGIS extension, `schema_migrations`, applied migration count, latest migration, and required table presence.
- Added `apps/web/src/features/system` with a system runtime status contract and verdict helper.
- Added `GET /api/admin/system` behind the local admin session proxy gate.
- Added `/admin/system` for operators to see whether the app is using `sample-repository` fallback or real PostGIS, plus migration/schema/storage config readiness.
- Added `/admin/system` link from the admin dashboard.
- Extended smoke coverage for admin system desktop/mobile screenshots and `/api/admin/system`.
- Current caveat: the default dev server still runs without `DATABASE_URL` unless explicitly configured, so sample fallback and PostGIS runtime checks must be treated as separate modes.

Smoke harness split on 2026-06-02:

- Split the 442-line `tools/web-smoke.py` into domain modules under `tools/smoke/`.
- `tools/web-smoke.py` is now a thin entrypoint that preserves the existing command.
- Smoke flow ownership now follows product boundaries: public routes, admin routes, API routes, viewer routes, and shared test helpers.
- New Playwright smoke cases should be added to the relevant `tools/smoke/*.py` module instead of growing the entrypoint.

Local DB migration runner progress on 2026-06-02:

- Added `packages/db/scripts/migrate.mjs` as the repo-owned SQL migration runner.
- Added root scripts `pnpm db:migrate` and `pnpm db:migrate:status`.
- The runner records applied files and SHA-256 checksums in `public.schema_migrations`.
- `compose.yaml` no longer mounts `db/migrations` into `docker-entrypoint-initdb.d`; migrations should be applied explicitly after `docker compose up -d postgres minio`.
- Older local volumes that were initialized before the runner need explicit `pnpm db:migrate -- --baseline-existing` if they already contain the current schema.

Docker/PostGIS runtime verification progress on 2026-06-02:

- Started Docker Desktop successfully after the initial daemon connection failure.
- `docker compose up -d postgres minio` brought up a healthy `tro-postgres-1` PostGIS container and a running `tro-minio-1` service.
- Initial migration exposed a real schema mismatch: the current PostGIS image installs `geometry`, `geography`, and `ST_*` functions in `public`, not `extensions`.
- Updated migrations and DB query helpers to use `public.geometry`, `public.geography`, and `public.ST_*`.
- `pnpm db:migrate` applied all seven repo migrations, ending at `202606020007_place_privacy_reviews.sql`.
- Verified seeded PostGIS data: three places, four scene hotspots, zero privacy reviews, and seven schema migration rows.
- Built `@tro/web` and ran the production-shaped standalone Next server with `DATABASE_URL=postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao`.
- Focused runtime smoke passed: `GET /api/places` returned `meta.source = "postgis"` and three places; `GET /api/admin/system` returned verdict `ready`, source `postgis`, applied migration count `7`, latest migration `202606020007_place_privacy_reviews.sql`, and required table `place_privacy_reviews = true`.
- Harness note: for production-shaped local verification, use `node apps/web/.next/standalone/apps/web/server.js` after build because the app uses Next standalone output.

Docker/MinIO runtime verification progress on 2026-06-02:

- Added `@aws-sdk/client-s3` to `@loi-vao/assets` for S3-compatible runtime checks.
- Added `packages/assets/src/object-storage.ts` to verify required object-storage buckets through S3 `HeadBucket`.
- Added `minio-setup` in `compose.yaml` using `minio/mc`.
- `minio-setup` creates `scene-assets` and `raw-captures` idempotently, sets `scene-assets` to public download for published runtime files, and leaves `raw-captures` private.
- `/admin/system` and `GET /api/admin/system` now report S3 credentials, bucket readiness, storage error, and `checks.storageReady`.
- Production-shaped runtime smoke passed with PostGIS plus MinIO env: `GET /api/admin/system` returned verdict `ready`, `storageReady = true`, and both `scene-assets` and `raw-captures` existed.
- Harness note: when validating the real local backend, run both the PostGIS migration gate and the MinIO bucket gate. A default dev server without `DATABASE_URL`/S3 env still exercises the sample fallback only.

## Architecture Decision

Current architecture direction:

- Docker-first, self-host-first.
- Develop first; do not deploy yet.
- Architecture style: modular monolith with clean/hexagonal boundaries and DDD-lite domain language, not full enterprise DDD.
- PostgreSQL + PostGIS is the database source of truth.
- Docker Compose is the first runtime harness.
- MinIO/S3-compatible storage is the local asset-storage path.
- Next.js uses standalone output so it can run in a production-shaped Docker image.
- Supabase is optional later, not the default architecture.

Clean-code and language-specific architecture rules are recorded in `docs/11-clean-code-and-architecture.md`.

Additional code/design guardrails:

- No god files. TS/TSX source over 450 non-comment lines warns in ESLint; over 800 hand-written lines needs a split plan or explicit rationale.
- No 10k-line hand-written source files. Generated files, lockfiles, build artifacts, and large atomic SQL migrations are exceptions.
- No AI-slop UI: avoid generic hero pages, fake dashboards, card piles, tiny text, random gradients, meaningless badges, and placeholder copy that does not serve the map/viewer workflow.
- Quality standards are recorded in `docs/12-quality-standards-and-practice.md`: WCAG-style accessibility, Nielsen-style heuristics, GOV.UK-style service thinking, platform design conventions, Core Web Vitals, OWASP-aware security, and restrained microinteractions.
- Best-practice adoption is evidence-based: before adopting a significant pattern, library, interaction model, or architecture boundary, record the source/reference, local product reason, owning boundary, and verification gate.

Harness assessment:

- Stable enough to begin the long-running implementation goal.
- Architecture should not be re-debated unless new evidence appears.
- Remaining flexible areas: final brand assets, exact admin workflow, auth provider, GPU provider, final viewer depth, and map tile hosting path.
- Updated with explicit pattern governance and quality gates for code, architecture, UX/UI, microinteractions, accessibility, mobile, performance, security/privacy, and documentation.
- Best-practice references should be used as decision evidence, not copied blindly; a pattern must solve a real product or maintenance problem and have a verification path.
- Added explicit mapping from W3C WCAG/WAI-ARIA, Nielsen Norman, GOV.UK service practice, Apple/Material/Fluent/Carbon design systems, web.dev Web Vitals, and OWASP ASVS/Cheat Sheets to Loi Vao's map, viewer, admin, and asset workflows.
- Added a best-practice intake rule: significant external patterns are marked `adopt`, `adapt`, or `reject`, with source, local fit, owner boundary, cost, verification gate, and exit condition.
- Added a microinteraction contract rule for critical workflows: trigger, immediate feedback, long-running state, success, error/recovery, keyboard path, touch/mobile path, reduced-motion behavior, and verification.
- Added `docs/13-practice-register.md` as the living source for accepted/adapted/rejected external practices so future goal work does not rely on vague "expert best practice" claims.
- The register currently adapts/adopts Next/React App Router boundaries, hexagonal/DDD-lite architecture, PostGIS spatial practices, WCAG/WAI-ARIA, Nielsen Norman, GOV.UK, Apple/Material/Fluent/Carbon behavior rigor, web.dev Web Vitals, OWASP ASVS/Cheat Sheets, Google code-health review, form-backed Server Functions, and design-lab-first visual exploration.
- Added a goal-readiness gate: `AGENTS.md`, `docs/10-agent-harness-and-skills.md`, `docs/11-clean-code-and-architecture.md`, `docs/12-quality-standards-and-practice.md`, and `docs/13-practice-register.md` must be enough for a long-running goal to proceed without re-debating basics.
- Added a source-backed practice gate: any "expert" or "large organization" practice must name the source, classification, local problem, owning boundary, cost, verification, and exit condition.
- Added code/UI craft gates: prefer native/platform features before named patterns, keep routes/pages thin, require state matrices for reusable controls, and verify mobile/accessibility/microinteraction behavior instead of trusting one desktop screenshot.
- Added new registered practices for TypeScript boundary contracts, React pure-render discipline, interaction-state matrices, Thoughtworks Radar as research input only, and Twelve-Factor-style config/runtime portability.
- Added a feature-done protocol for non-trivial slices: every UI/API/data/admin/viewer/pipeline slice must name the task, bounded context, state model, micro-UX behavior, accessibility/mobile behavior, security/privacy/performance assumptions, and verification evidence before it is treated as done.
- Added task-based browser smoke as a registered practice for critical workflows, using Playwright/in-app browser screenshots as product evidence instead of relying only on build success.
- Added a production build hygiene rule: route modules should not import dev/local filesystem probes directly; keep such checks behind narrow adapters and verify clean Next/Turbopack builds.

The next important milestone is a real 3DGS scene flowing through capture -> training -> SuperSplat cleanup -> SOG/collision -> manifest -> viewer, not production deployment.

## Open-Source Landscape

Recorded the filtered open-source landscape in `docs/09-open-source-landscape.md`.

Current conclusion:

- There is no mature open-source project found so far that exactly matches the product end to end.
- Do not fork a whole virtual-tour or city-scan demo as the foundation.
- Use open-source building blocks directly: MapLibre/PostGIS for GIS, Nerfstudio/gsplat/COLMAP for training, and PlayCanvas/SuperSplat/SplatTransform for web runtime/editing.
- Use SPHR, Open3DMap, GaussianSplats3D, maplibre-gl-splat, 3D Tiles 3DGS plugins, glTF `KHR_gaussian_splatting`, and SPZ as references or future tracks, not as the first architecture.

## Agent Harness And Design Lab

Recorded the goal-oriented harness in `docs/10-agent-harness-and-skills.md`.

Current operating rule:

- `AGENTS.md` is the quick root context.
- `docs/10-agent-harness-and-skills.md` is the deeper goal playbook.
- Use `karpathy-guidelines` for engineering discipline.
- Use `redesign-existing-projects`, `brandkit`, `imagegen`, and `imagegen-frontend-mobile` according to the type of design task.
- There is no installed standalone skill named `taste`; design taste is handled through the design skills plus the product guardrails in `docs/06-brand-and-design-direction.md`.
- `design-lab/` is the dedicated frontend/brand/mobile design workspace.
- If naming/visual taste is delegated, Codex may choose the strongest option and record the rationale rather than pausing.
- Logo/brand/mockup images with text should be generated as complete images using `brandkit`/`imagegen`, not made by generating a background and adding text later with scripts.

## Quota/Cloud State

Google Cloud project `the-wiii-lab` can show T4/L4/A100 options, but quota was `0/0` for global GPU and regional L4. A quota request for 1 L4 in `us-central1` plus global GPU limit 1 was submitted; Google said it may take days.

RunPod currently looked more practical:

- RTX 4090 24GB around USD 0.70/hour in the console shown.
- L4 24GB around USD 0.40/hour.
- Stop/terminate pods after use; storage/network volume can still cost small amounts if kept.
