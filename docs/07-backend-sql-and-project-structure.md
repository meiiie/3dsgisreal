# Backend, SQL, And Project Structure

Last reviewed: 2026-06-02.

## Backend Decision

The long-term backend choice is:

```text
PostgreSQL + PostGIS as the system of record
Docker Compose as the first runtime harness
SQL migrations owned in the repo
Kysely as the TypeScript query builder
S3-compatible object storage for 3D assets
Worker services for asset processing/orchestration
```

Managed services are optional accelerators, not the default architecture. The default path is self-hostable containers that can run locally, on a VM, or on GCP. The database schema remains normal PostgreSQL/PostGIS SQL.

## Why This Stack

### PostgreSQL + PostGIS

This product is spatial. Places, map bounds, distance search, district filtering, tile overlays, and later route/area features all belong in a spatial database.

PostGIS is the correct core choice because it provides:

- `geometry` and `geography` spatial types.
- `GiST` spatial indexes.
- spatial functions like `ST_DWithin`, `ST_Intersects`, `ST_Contains`, and `ST_MakePoint`.
- a path to dynamic vector tiles later.

### Docker First

Use Docker Compose first because it gives:

- the same shape locally and on a VM
- PostgreSQL/PostGIS without platform lock-in
- MinIO/S3-compatible object storage for local asset flow
- a direct path to GCP Compute Engine or any VPS
- easier GPU/worker sidecars later

Use managed services later only when they clearly remove operational pain. Supabase remains a valid option for Auth/Storage/Admin tooling, but it should not force the core architecture.

### Kysely, Not A Heavy ORM

Use Kysely for application queries because it is a thin, type-safe SQL query builder. The database stays the source of truth.

Avoid Prisma/Sequelize/TypeORM as the main data layer for this product because spatial SQL and PostGIS-specific functions are central, not edge cases. We want SQL escape hatches without fighting an ORM.

Drizzle is also viable, but for this project Kysely is the better default because:

- it maps closely to SQL
- it supports generated DB types
- it does not try to own the schema
- raw PostGIS SQL stays straightforward

## SQL Ownership Rule

The SQL schema is the contract. Application types are generated from or aligned with SQL, not the other way around.

Recommended rule:

- migrations live in `db/migrations`
- shared TypeScript query helpers live in `packages/db`
- scene/API contracts live in `packages/shared`
- storage paths and manifest utilities live in `packages/assets`

## Project Structure

Target monorepo:

```text
.
|-- apps/
|   |-- web/                  # public map, place pages, viewer, early admin route
|   |-- admin/                # later, if admin grows beyond route group
|   |-- worker/               # asset validation, manifest generation, async jobs
|   `-- api/                  # later, only if Next route handlers are not enough
|-- packages/
|   |-- db/                   # Kysely client, generated DB types, query helpers
|   |-- shared/               # scene manifest, enums, API DTOs
|   |-- assets/               # storage keys, manifest validation, asset utilities
|   `-- ui/                   # shared components only after duplication appears
|-- db/
|   `-- migrations/           # SQL source of truth; usable by Docker PostGIS
|-- tools/
|   |-- 3dgs/                 # Nerfstudio/RunPod/SOG/collision scripts
|   `-- maps/                 # Geofabrik/Planetiler/PMTiles scripts later
|-- infra/
|   |-- docker/               # PostGIS, MinIO, Redis, Martin local stack later
|   `-- terraform/            # production infra later
`-- docs/
```

Do not create all apps immediately. Create the folders when the second real use case appears. For now:

- keep public and small admin flows in `apps/web`
- add `packages/db` now
- add `db/migrations` now
- add `apps/worker` after the first real 3DGS asset exists

## Main Tables

### Identity And Access

- `profiles`: app profile mapped to local signed sessions now, and to the production auth user later.
- `project_members`: local/admin roles for admin/editor/reviewer workflows.
- `user_place_library`: local saved/visited/check-in state for a profile and place.
- `user_quiz_attempts`: local quiz answer attempts for a profile and scene hotspot.

### Places And Map

- `places`: canonical location entry.
- `place_media`: photos/posters for cards and detail pages.
- `place_privacy_reviews`: append-only operator evidence before public/private status decisions.
- `place_categories`: optional later if categories need admin editing.

Use `geom public.geometry(Point, 4326)` as the canonical coordinate column in the current local PostGIS image. Create a `GiST` index on it.

For nearest/distance queries, cast `geom` to `geography`:

```sql
public.ST_DWithin(
  geom::public.geography,
  public.ST_SetSRID(public.ST_MakePoint(:lng, :lat), 4326)::public.geography,
  :meters
)
```

### 3D Scenes

- `scenes`: logical walkthrough for a place, e.g. "gate to room".
- `scene_versions`: immutable published/runtime asset versions.
- `scene_hotspots`: annotations, audio triggers, quiz points, check-in points.
- `scene_quality_reports`: later, mobile FPS/load-size/visual QA records.

Keep scene versions immutable. If a scene is reprocessed, create a new version.

### Capture And Processing

- `capture_sessions`: capture metadata from iPhone/camera.
- `processing_jobs`: RunPod/local/cloud job records.
- `assets`: generic storage records for videos, PLY, SOG, collision, posters, logs.

Raw private capture data should not be public. Published runtime assets can be public only after review.

## Initial Schema Principles

- All primary ids are UUIDs.
- Use `status` text fields with check constraints at first.
- Use `jsonb` for flexible machine-specific metadata.
- Use immutable `scene_versions`.
- Use `storage_key` in the database, not just public URLs.
- Keep raw capture and production assets out of git.
- Add RLS before exposing any client-side write path.

## Backend API Shape

Start with Next.js route handlers/server functions:

- `GET /api/places` - public places with `q`/`search`, `category`, `status`, bounds, and near filters. Bounds can be passed as `bbox=west,south,east,north` or as `west`, `south`, `east`, `north`; near search can use `near=lng,lat&radiusMeters=...`.
- `GET /api/places/:slug` - public place detail with scene metadata, source, page href, and scene manifest href.
- `GET /api/scenes/:sceneId/manifest` - runtime manifest for viewer, asset readiness, and scene hotspots.
- `GET /api/session` - return the current local signed session or default student session.
- `POST /api/session` - set the local signed session to `student` or `admin`.
- `DELETE /api/session` - clear the local signed session cookie.
- `GET /api/admin/system` - admin-only runtime health for app, PostGIS, migrations, required tables, and storage config.
- `GET /api/admin/review` - admin-only review queues for permission, capture, GPU processing, publish readiness, and published-place checks.
- `GET /api/user` - local user dashboard for the current session profile's saved/visited/check-in places and recent quiz attempts.
- `POST /api/user/place-library` - validate and create/update/dry-run a local saved or visited place state.
- `POST /api/user/checkins` - validate and create/dry-run a local user check-in from a viewer hotspot.
- `POST /api/user/quiz-attempts` - validate and create/dry-run a local quiz answer from a viewer hotspot.
- `POST /api/admin/places` - validate and create/dry-run a draft place plus first scene.
- `POST /api/admin/places/import` - validate/import/dry-run a CSV batch of draft places plus first scenes.
- `PATCH /api/admin/places/:slug` - validate and update/dry-run place metadata and first scene entry metadata.
- `PATCH /api/admin/places/:slug/status` - validate and update/dry-run a place review/publication status.
- `GET /api/admin/places/:slug/privacy` - return the latest privacy checklist/read model for one place.
- `POST /api/admin/places/:slug/privacy` - validate and append/dry-run a privacy checklist review.
- `POST /api/admin/captures` - validate and create/dry-run a capture session for an existing scene.
- `POST /api/admin/processing-jobs` - validate and create/dry-run a queued processing job for an existing capture.
- `PATCH /api/admin/processing-jobs/:jobId/status` - validate and update/dry-run a processing job status transition.
- `GET /api/admin/scenes/:sceneId/hotspots` - list admin hotspot data for one scene.
- `POST /api/admin/scenes/:sceneId/hotspots` - validate and create/dry-run a scene hotspot on the latest scene version.
- `PATCH /api/admin/scenes/:sceneId/hotspots` - validate and update/dry-run an existing scene hotspot.
- `DELETE /api/admin/scenes/:sceneId/hotspots` - validate confirmation and delete/dry-run an existing scene hotspot.
- admin routes later for processing job start/retry/cancel.
- `/admin/*` and `/api/admin/*` are protected by the local signed session proxy gate. They require an admin/editor/reviewer/owner role in the local cookie session.

Do not create a separate Express/Nest backend yet. Add `apps/api` only when:

- multiple clients need a stable public API
- background jobs need a service boundary
- route handlers become too large
- we need separate deployment/scaling

## Search

Start in PostgreSQL:

- `pg_trgm` for fuzzy name/address search.
- `unaccent` where available for Vietnamese accent-insensitive search.
- full-text search for descriptions and categories.

Move to Meilisearch/Typesense only when PostgreSQL search is measurably insufficient.

## Local Development

Preferred local path:

1. Use `docker compose up -d postgres minio` for local backend services.
2. Use `docker compose up -d minio-setup` after MinIO starts so the required local buckets exist.
3. Run `pnpm db:migrate` to apply `db/migrations/*.sql` and record `public.schema_migrations`.
4. Keep Next.js dev on the host while iterating UI quickly.
5. Use `docker compose up --build web` after migrations to test the production container shape.
6. Add Redis/worker only after background jobs are real.
7. Add Martin only when self-hosted vector tiles are actively being developed.

## Current Implementation State

As of 2026-06-02:

- `packages/db` is now a real workspace package.
- It provides a Kysely/Postgres client, initial DB table types, a PostGIS-backed place/scene query, and capture/job pipeline queries.
- `apps/web` can read from PostGIS when `DATABASE_URL` is set.
- If `DATABASE_URL` is unset, `apps/web` uses the sample repository so frontend work stays unblocked.
- The public map and `GET /api/places` share search/category/status/bounds/near filtering through the same repository contract, with sample fallback filtering and SQL filtering when PostGIS is enabled.
- Bounds filtering uses normalized WGS84 longitude/latitude bounds at the app boundary and a PostGIS `ST_MakeEnvelope` predicate in `packages/db`, so future viewport-driven map loading can reuse the same API contract.
- Near filtering accepts `near=lng,lat&radiusMeters=...` or `lng/lat/radiusMeters`; sample fallback uses Haversine distance, and PostGIS uses `ST_DWithin` plus `ST_Distance` on geography.
- Public search now uses accent-insensitive local normalization in the sample fallback and `public.unaccent(...) ilike public.unaccent(...)` in the PostGIS path.
- The public map can now refresh its visible place list from the current MapLibre viewport through `GET /api/places?bbox=...`, while preserving the existing search/category/status/near filters.
- `GET /api/places/[slug]` returns the same public place detail contract used by the detail page, including a `sceneManifestHref`, and returns `404 place_not_found` for missing slugs.
- `GET /api/places`, `GET /api/places/[slug]`, and scene manifest APIs now report `meta.source` as `sample-repository` or `postgis` based on the current runtime data source.
- Data-driven Next pages are marked dynamic so Docker/runtime DB data is not frozen at build time.
- `db/migrations/202606020002_local_seed_places.sql` seeds three local lab places/scenes plus one capture session and one processing job for fresh Docker PostGIS volumes.
- `packages/db/scripts/migrate.mjs` applies SQL migrations through `pnpm db:migrate`, records checksums in `public.schema_migrations`, and supports explicit `--baseline-existing` for older local volumes initialized before the runner existed.
- `GET /api/admin/pipeline` exposes capture sessions, processing jobs, and status counts for the local admin surface.
- `/admin/scenes/[sceneId]/assets` exposes the asset publish plan as an admin page and uses a Next Server Function form action for the publish operation.
- The admin asset page/API now reports local `public/scene-assets` file presence for each planned artifact.
- The admin asset page/API now also reports `objectFiles` by checking planned SOG/settings/collision/poster keys in the configured `scene-assets` S3/MinIO bucket.
- `tools/3dgs/upload_scene_assets_to_s3.mjs` uploads prepared runtime artifacts to MinIO/S3, refuses accidental overwrite, validates JSON artifacts, and verifies each upload with `HeadObject`.
- `GET /api/admin/scenes/[sceneId]/assets` returns the standard asset publish plan.
- `PUT /api/admin/scenes/[sceneId]/assets` performs a dry-run without `DATABASE_URL`, blocks when planned MinIO/S3 objects are missing, and writes asset keys to the latest scene version only when PostGIS is enabled and object storage checks pass.
- `GET /api/user` returns the local user dashboard.
- `/user` now uses the same user dashboard repository as the API and shows saved, visited, checked-in, and continue states for the current local session profile.
- `/session` lets the local lab switch between student and admin profiles through an HTTP-only signed cookie.
- `GET/POST/DELETE /api/session` expose the same local session contract for smoke tests and local tools.
- `src/proxy.ts` gates `/admin/*` and `/api/admin/*`, returning a redirect for pages and a 403 JSON response for admin APIs when the local session is missing or not admin-capable.
- `/admin/system` and `GET /api/admin/system` report local app runtime, PostGIS connection, `schema_migrations`, required table presence, and S3/MinIO bucket readiness.
- When `DATABASE_URL` is unset, system health explicitly reports `sample-repository` so operators know they are not testing the real PostGIS path.
- Docker Desktop was started successfully in the local lab, `docker compose up -d postgres minio` brought up a healthy PostGIS container and MinIO service, and all seven repo-owned migrations apply through `pnpm db:migrate`.
- Runtime PostGIS verification passed with `DATABASE_URL=postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao`: the standalone Next server returned `GET /api/places` with `meta.source = "postgis"`, `GET /api/admin/system` returned verdict `ready`, `appliedMigrationCount = 7`, latest migration `202606020007_place_privacy_reviews.sql`, and required table `place_privacy_reviews = true`.
- Current local PostGIS installs `postgis`, `geometry`, and `geography` in the `public` schema, so app SQL and migrations use `public.ST_*`, `public.geometry`, and `public.geography` instead of `extensions.*`.
- `packages/assets/src/object-storage.ts` verifies object-storage runtime readiness with S3 `HeadBucket` checks for `scene-assets` and `raw-captures`, not only environment-variable presence.
- `compose.yaml` includes a repeatable `minio-setup` service using `minio/mc` to create `scene-assets` and `raw-captures`. `scene-assets` is set to public download for published runtime files; `raw-captures` remains private.
- Runtime storage verification passed with `S3_ENDPOINT=http://127.0.0.1:9000`, local MinIO credentials, `SCENE_ASSETS_BUCKET=scene-assets`, and `RAW_CAPTURE_BUCKET=raw-captures`: `/api/admin/system` returned `storageReady = true` and both buckets existed.
- `db/migrations/202606020003_user_place_library.sql` adds a local demo profile and `user_place_library` seed rows for the three lab places.
- `POST /api/user/place-library` validates saved/visited place actions, supports dry-run, and writes to `user_place_library` when PostGIS is enabled.
- `/places/[slug]` now has form-backed local user actions for saving a place or marking its profile as viewed.
- `POST /api/user/checkins` validates scene/hotspot check-in actions and writes `checked_in` state to `user_place_library` when PostGIS is enabled.
- `/viewer/[sceneId]` now lets the local user check in from a check-in hotspot through a form-backed Server Function with success/error UI states.
- `db/migrations/202606020005_user_quiz_attempts.sql` adds `user_quiz_attempts` for local quiz answer tracking against scene hotspots.
- `POST /api/user/quiz-attempts` validates scene/hotspot quiz answers, computes correctness server-side from hotspot payload data, supports dry-run, and writes quiz attempts when PostGIS is enabled.
- `/viewer/[sceneId]` now lets the local user answer quiz hotspots through a form-backed Server Function with selected/correct/error UI states.
- `GET /api/user` and `/user` now include recent quiz attempts and correct/total quiz stats through the same user dashboard repository.
- `POST /api/admin/places` validates admin place intake, supports explicit dry-run, and writes a draft place + first scene when PostGIS is enabled.
- `/admin/places/new` is a form-backed admin route using the same place intake contract.
- `POST /api/admin/places/import` validates a CSV batch, supports dry-run, and writes multiple draft places + first scenes in one PostGIS transaction when enabled.
- `/admin/places/import` is a form-backed admin route for local CSV import, with dry-run checked by default.
- `GET /api/admin/review` returns the Admin/Ops review queue read-model for permission review, capture needed, GPU processing, publish-ready, and published checks.
- `/admin/review` is the human operator surface for that queue and links back to the existing review, capture, processing, asset, and public-place routes.
- `packages/db/src/admin-places.ts` performs single and batch place + scene writes in transactions and constructs `places.geom` through PostGIS.
- `PATCH /api/admin/places/[slug]` validates admin place metadata edits, supports dry-run, and writes place plus first-scene entry metadata when PostGIS is enabled.
- `/admin/places/[slug]/edit` is a form-backed operator route for updating map metadata, coordinates, scene title, and entry path while keeping slugs stable.
- `PATCH /api/admin/places/[slug]/status` validates admin place review status updates, supports dry-run, and writes `places.status` when PostGIS is enabled.
- `/admin/places/[slug]/review` is a form-backed operator route for moving a place through draft, review, published, or archived states.
- `GET/POST /api/admin/places/[slug]/privacy` validates and appends/dry-runs a place privacy checklist review.
- `/admin/places/[slug]/privacy` is the form-backed operator route for checking permission, public address safety, people/faces, private objects, audio/hotspot copy, and raw capture storage before publication.
- `packages/db/src/place-privacy-reviews.ts` owns the latest-read and append-only write helpers for `public.place_privacy_reviews`.
- `packages/db/src/admin-places.ts` also owns the SQL write helper for updating a place status by slug.
- `POST /api/admin/captures` validates capture metadata, supports explicit dry-run, and writes a capture session when PostGIS is enabled.
- `/admin/captures/new` is a form-backed admin route for recording iPhone/video/photo capture metadata before GPU training.
- `packages/db/src/admin-captures.ts` performs the capture-session write for an existing place/scene pair.
- `POST /api/admin/processing-jobs` validates processing job intake, supports explicit dry-run, and writes a queued job when PostGIS is enabled.
- `/admin/processing/new` is a form-backed admin route for turning a capture session into a queued GPU/Nerfstudio job.
- `packages/db/src/admin-processing-jobs.ts` creates the next processing scene version, inserts the job row, and marks the capture as processing.
- `PATCH /api/admin/processing-jobs/[jobId]/status` validates explicit status transitions and writes status updates when PostGIS is enabled.
- `/admin/processing/[jobId]` is the local operator detail page for job status, allowed transitions, and GPU runbook context.
- `db/migrations/202606020004_seed_scene_hotspots.sql` seeds the first local info/audio/quiz/check-in hotspots for the home-test scene.
- `GET /api/scenes/[sceneId]/manifest` now includes hotspot data through `packages/db/src/hotspots.ts` when PostGIS is enabled, or sample data when `DATABASE_URL` is unset.
- `POST /api/admin/scenes/[sceneId]/hotspots` validates hotspot kind, position, rotation, payload JSON, and type-specific payload requirements before writing to PostGIS.
- `PATCH /api/admin/scenes/[sceneId]/hotspots` validates and updates an existing hotspot by id, and supports dry-run.
- `DELETE /api/admin/scenes/[sceneId]/hotspots` validates explicit confirmation before deleting an existing hotspot by id, and supports dry-run.
- `/admin/scenes/[sceneId]/hotspots` is the local operator surface for adding, editing, and deleting manifest-level hotspots before the future PlayCanvas placement gizmo exists.

Admin mutation pattern:

- Source/reference: official Next.js App Router forms and Server Functions guidance.
- Local reason: asset publishing is server-owned and should still work as a plain form-style admin action instead of relying only on client-side click handlers.
- Owning boundary: `apps/web` admin route calls the scenes asset-publishing server module, which then calls `@loi-vao/db` when `DATABASE_URL` exists.
- Verification gate: typecheck, lint, build, and `tools/web-smoke.py` cover the admin page, form submit, API fallback, and desktop/mobile screenshots.

Admin/Ops system health pattern:

- Source/reference: Docker-first local runtime, Twelve-Factor-style environment configuration, S3 `HeadBucket`, Next route handlers, and the existing admin proxy gate.
- Local reason: operators need to know whether the app is using sample fallback or real PostGIS, and whether MinIO/S3 buckets exist, before testing capture, processing, asset publish, or viewer runtime.
- Owning boundary: `apps/web/src/features/system` maps runtime health; `packages/db/src/health.ts` owns database/schema health queries; `packages/assets/src/object-storage.ts` owns S3 bucket checks; `/admin/system` presents the operator surface.
- Verification gate: DB/assets/web typecheck, lint, build, `tools/web-smoke.py`, `docker compose config --quiet`, `docker compose up -d minio-setup`, standalone runtime smoke with `DATABASE_URL` and S3 env, and desktop/mobile screenshots for `/admin/system`.
- Current caveat: local development still defaults to sample fallback when `DATABASE_URL` or S3 env is unset. Treat PostGIS/S3-specific testing as a separate explicit runtime check, not as something proven by the default dev server alone.

Local asset presence check:

- Source/reference: Next.js public folder convention plus Node server-side filesystem checks in a local admin-only route.
- Local reason: after SuperSplat/SplatTransform, the operator needs to know whether `scene.sog`, `settings.json`, `collision.voxel.json`, and `poster.webp` are actually in the local web asset folder before publishing keys.
- Owning boundary: `apps/web/src/features/scenes/server/asset-publishing.ts` owns publish planning; `apps/web/src/features/scenes/server/local-scene-asset-files.ts` owns dev/local filesystem checks.
- Verification gate: `tools/web-smoke.py` asserts `localFiles` in the API response and checks the admin page's "File trong public" panel on desktop and mobile.
- Build hygiene: local filesystem checks are behind a dev/local adapter so `next build` stays warning-free under Next/Turbopack standalone tracing.

Object-storage asset presence check:

- Source/reference: S3 `HeadObject` and the existing `@loi-vao/assets` storage-key contract.
- Local reason: after local staging or direct upload, the operator needs to know whether planned SOG/settings/collision/poster keys actually exist in MinIO/S3 before attaching keys to a scene version.
- Owning boundary: `packages/assets/src/object-storage.ts` owns S3 object checks; `apps/web/src/features/scenes/server/asset-publishing.ts` maps checks to the scene asset plan; `/admin/scenes/[sceneId]/assets` presents them.
- Verification gate: assets/web typecheck, lint, build, `tools/web-smoke.py`, API assertion for `objectFiles`, and standalone runtime smoke with S3 env when object storage is under test.
- Current caveat: `objectFiles` proves storage presence only. It does not prove the SOG visually renders, collision is usable, or mobile FPS is acceptable.
- Publish rule: when PostGIS is enabled, object-storage presence is a hard gate before writing asset keys to the latest scene version.

Scene runtime upload tool:

- Source/reference: S3 `PutObject`/`HeadObject`, the existing scene asset publish plan, and the local 3DGS tool folder.
- Local reason: after SuperSplat/SplatTransform output exists, operators need a repeatable command to upload SOG/settings/collision/poster to MinIO/S3 before the DB publish gate can pass.
- Owning boundary: `tools/3dgs/upload_scene_assets_to_s3.mjs` owns CLI validation/upload; `packages/assets/src/object-storage.ts` owns app-side S3 checks; `/admin/scenes/[sceneId]/assets` owns operator review.
- Verification gate: script syntax check, dry-run with prepared files, upload to a smoke-only prefix, duplicate-upload refusal without `--overwrite`, and admin/API `objectFiles` check.
- Current caveat: this uploads runtime artifacts only. Raw captures stay in `raw-captures/...` and must not use this public scene asset uploader.

Local asset basic QA:

- `localFiles[*].qaStatus` is `ready`, `missing`, or `invalid`.
- Missing files stay `missing`.
- Zero-byte files are `invalid`.
- `settings.json` and `collision.voxel.json` must parse as JSON objects.
- SOG and poster assets must be non-empty.
- This is a pre-publish sanity check only; visual quality, mobile FPS, load budget, and walkthrough usability still belong in later scene quality reports.

Local asset staging tool:

- `tools/3dgs/prepare_local_scene_assets.py` copies prepared runtime artifacts into `apps/web/public/scene-assets/scenes/<sceneId>/v<version>/`.
- It validates required files, refuses overwrite unless `--overwrite` is passed, supports `--dry-run`, and prints JSON with `--json`.
- `apps/web/public/scene-assets/**` is ignored by git except `.gitkeep`, so real SOG/settings/collision/poster files do not become source artifacts by accident.

User dashboard pattern:

- Source/reference: Next.js Server Components and route handlers using the same server repository, plus the existing PostGIS/Kysely adapter pattern.
- Local reason: the local prototype needs a real user surface before auth, showing whether a student has saved, visited, or checked in to places.
- Owning boundary: `apps/web/src/features/user` with DB reads in `packages/db/src/user.ts`.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, and desktop/mobile screenshots for `/user`.

User place-library action pattern:

- Source/reference: official Next forms/Server Functions, native form buttons, and the existing local demo profile boundary.
- Local reason: the user can now act from a place profile before entering a scene, closing the map/detail -> user dashboard loop for saved and viewed places.
- Owning boundary: `apps/web/src/features/user/server/place-library-action.ts` validates place/status/note input; `packages/db/src/user.ts` owns `user_place_library` writes; `/places/[slug]` owns the form UI and feedback.
- Status rule: saved actions do not downgrade visited/check-in; visited actions do not downgrade check-in. Check-in remains owned by viewer hotspot actions.
- Verification gate: DB typecheck, web typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/places/[slug]`.
- Current caveat: actions use the local signed session profile until a production auth provider exists.

Viewer check-in pattern:

- Source/reference: official Next forms/Server Functions, native button/form behavior, OWASP-style server-side validation, and the existing local user profile boundary.
- Local reason: check-in is the first user action that connects scene hotspot interaction back to the user dashboard.
- Owning boundary: `apps/web/src/features/viewer/SceneInteractionPanel.tsx` owns the form action and user feedback; `apps/web/src/features/user/server/check-in.ts` validates scene/hotspot input; `packages/db/src/user.ts` owns `user_place_library` writes.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile viewer screenshots.
- Current caveat: this uses the local signed session profile until a production auth provider exists.

Viewer quiz attempt pattern:

- Source/reference: official Next forms/Server Functions, native button/form behavior, OWASP-style server-side validation, and the existing local user profile boundary.
- Local reason: quiz is the first learning interaction that turns a scene hotspot into user progress instead of static manifest text.
- Owning boundary: `apps/web/src/features/viewer/SceneInteractionPanel.tsx` owns the answer form and feedback; `apps/web/src/features/user/server/quiz-attempt.ts` validates scene/hotspot/answer input and computes correctness server-side; `packages/db/src/user-quiz.ts` owns `user_quiz_attempts` writes.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile viewer screenshots.
- Current caveat: this stores attempts against the local signed session profile until production auth exists. The manifest still carries quiz answer data for the prototype; hiding answer keys belongs to the later runtime contract hardening pass.

User quiz history pattern:

- Source/reference: existing Next Server Component dashboard pattern, the `@loi-vao/db` read adapter boundary, and the same local demo profile used by check-in/quiz attempts.
- Local reason: viewer learning interactions need to reappear in the user surface so the local prototype has a complete scene -> answer -> profile loop.
- Owning boundary: `apps/web/src/features/user/server/repository.ts` maps DB/sample read models; `apps/web/src/app/user/page.tsx` presents the compact quiz history; `packages/db/src/user-quiz.ts` owns SQL reads/writes for `user_quiz_attempts`.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, `/api/user` contract assertions, and desktop/mobile `/user` screenshots.
- Current caveat: quiz stats are intentionally simple correct/total counts until real auth, richer learning progression, or per-place scoring requirements exist.

Admin place intake pattern:

- Source/reference: official Next.js Server Functions/forms for server-owned mutations, and explicit PostGIS SQL for geometry creation.
- Local reason: operators need a local way to add one independent place/scene before capture, without editing seed files by hand.
- Owning boundary: `apps/web/src/features/places/server/place-intake.ts` validates product input; `packages/db/src/admin-places.ts` owns SQL persistence.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/places/new`.
- Current caveat: the route is protected by the local signed admin session gate, but this is not a production auth provider yet.

Admin place CSV import pattern:

- Source/reference: official Next.js Server Functions/forms, route handlers, server-side validation, and explicit PostGIS transaction writes.
- Local reason: operators need to prepare multiple Hải Phòng places/scenes before capture without editing SQL or seed files by hand.
- Owning boundary: `apps/web/src/features/places/server/place-bulk-import.ts` parses and validates CSV batches; `packages/db/src/admin-places.ts` owns all-or-none batch persistence.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/places/import`.
- Current caveat: this is a small local-lab CSV importer with a 50-row limit, not a full ETL system with file uploads, background import jobs, or duplicate resolution against existing DB rows.

Admin/Ops review queue pattern:

- Source/reference: GOV.UK-style task-first service thinking, Nielsen-style visibility of system status, and the existing Next Server Component/API read-model pattern.
- Local reason: admin operators need to see the next concrete action for each place/scene/job instead of scanning separate lists for permission, capture, GPU, asset, and publish state.
- Owning boundary: `apps/web/src/features/admin/server/review-queues.ts` composes Places and Pipeline read models; existing route-specific pages still own mutations.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, `GET /api/admin/review`, and desktop/mobile screenshots for `/admin/review`.
- Current caveat: this is a read-only operator queue. It does not replace the existing review/capture/processing/asset pages and is not a full workflow engine.

Admin place edit pattern:

- Source/reference: official Next.js Server Functions/forms, server-side validation, and the existing PostGIS/Kysely adapter boundary.
- Local reason: operators need to correct map metadata, coordinates, scene title, and real-world entry path after initial intake without editing SQL or seed files.
- Owning boundary: `apps/web/src/features/places/server/place-edit.ts` validates product input; `packages/db/src/admin-places.ts` owns SQL persistence for the place and first scene metadata.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/places/[slug]/edit`.
- Current caveat: slugs are intentionally locked in this route so existing links, capture sessions, processing jobs, hotspots, and asset paths remain stable. The route has local admin gating, but production auth is still future work.

Admin place status review pattern:

- Source/reference: official Next.js Server Functions/forms, server-side workflow validation, and the existing PostGIS/Kysely adapter boundary.
- Local reason: operators need to review privacy/publication readiness without editing SQL manually before a place becomes part of a public pilot.
- Owning boundary: `apps/web/src/features/places/server/place-status-review.ts` validates product input; `packages/db/src/admin-places.ts` owns SQL persistence.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/places/[slug]/review`.
- Current caveat: status changes are behind the local admin session gate, but production auth is still future work. Publishing a place does not automatically mark scene versions/assets published.

Admin place privacy checklist pattern:

- Source/reference: OWASP-style privacy/security boundary thinking, GOV.UK-style task evidence, and the existing Next form/API dry-run pattern.
- Local reason: scanned rooms, shops, and routes can expose people, private addresses, documents, screens, audio, or raw captures; operators need a concrete checklist before a place is public.
- Owning boundary: `apps/web/src/features/places/server/place-privacy-review.ts` validates the product checklist; `packages/db/src/place-privacy-reviews.ts` persists append-only review rows.
- Verification gate: DB/web typecheck, lint, build, migration syntax check, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/places/[slug]/privacy`.
- Current caveat: this records privacy evidence only. It does not automatically publish/unpublish a place and does not replace production auth, legal consent storage, or raw-media moderation.

Admin capture intake pattern:

- Source/reference: official Next.js Server Functions/forms for server-owned mutations, server-side input validation, and the existing capture/processing bounded context.
- Local reason: operators need to register raw iPhone capture metadata before uploading/renting GPU so processing jobs can trace back to a real scene and raw asset key.
- Owning boundary: `apps/web/src/features/pipeline/server/capture-intake.ts` validates product input; `packages/db/src/admin-captures.ts` owns SQL persistence.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/captures/new`.
- Current caveat: raw media storage itself is not implemented yet; only `raw-captures/...` keys are recorded, and real videos/photos must stay outside git/public folders.

Admin processing job intake pattern:

- Source/reference: official Next.js Server Functions/forms for server-owned mutations, existing PostGIS/Kysely adapter pattern, and the local 3DGS pipeline contract.
- Local reason: after capture metadata exists, operators need a durable queued job that records provider/GPU/toolchain/log config before renting GPU time.
- Owning boundary: `apps/web/src/features/pipeline/server/processing-job-intake.ts` validates product input; `packages/db/src/admin-processing-jobs.ts` owns SQL persistence.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/processing/new`.
- Current caveat: this only queues metadata. Real GPU execution, live logs, and cost controls still need a worker/runtime integration.

Admin processing job status pattern:

- Source/reference: explicit workflow state transitions, server-side validation, and the existing admin Server Function/API pattern.
- Local reason: operators need to track whether a queued GPU job has started, succeeded, failed, or been cancelled without editing SQL manually.
- Owning boundary: `apps/web/src/features/pipeline/server/processing-job-status.ts` validates transitions; `packages/db/src/admin-processing-jobs.ts` persists job/capture/scene-version state.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/processing/[jobId]`.
- Current caveat: there is no live log ingestion yet; `log_key` is still a storage reference, not streamed UI content.

Scene hotspot/runtime interaction pattern:

- Source/reference: viewer manifest as a stable runtime contract, with server-side data reads from PostGIS and sample fallback for local frontend work.
- Local reason: a 3D travel/rental scene needs info, audio, quiz, and check-in points before the full PlayCanvas placement/editor exists.
- Owning boundary: `apps/web/src/features/places/domain.ts` owns the manifest contract; `packages/db/src/hotspots.ts` owns PostGIS reads; `apps/web/src/features/viewer/SceneInteractionPanel.tsx` owns the current viewer-side presentation.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, manifest API assertions, and desktop/mobile viewer screenshots.
- Current caveat: hotspot placement is still numeric/data-driven; precise 3D gizmo placement, update/delete editing, audio playback, quiz scoring, and real-auth user actions are future work.

Admin hotspot intake pattern:

- Source/reference: official Next forms/Server Functions, server-side input validation, and the existing admin dry-run/write pattern.
- Local reason: operators need to test info/audio/quiz/check-in/link hotspot contracts before PlayCanvas editor tooling exists.
- Owning boundary: `apps/web/src/features/scenes/server/hotspot-intake.ts` validates product input; `packages/db/src/admin-hotspots.ts` owns SQL persistence to the latest scene version.
- Verification gate: typecheck, lint, build, `tools/web-smoke.py`, API dry-run, and desktop/mobile screenshots for `/admin/scenes/[sceneId]/hotspots`.
- Current caveat: creating/updating/deleting a hotspot requires an existing `scene_versions` row when PostGIS is enabled; new scenes without versions still need the processing/asset pipeline. Placement is still numeric/data-driven until the future PlayCanvas placement gizmo exists.

Local DB verification path:

```bash
docker compose up -d postgres
docker compose up -d minio minio-setup
pnpm db:migrate
docker compose exec -T postgres psql -U loi_vao -d loi_vao -c "select slug, name from public.places order by created_at;"
```

```powershell
$env:DATABASE_URL='postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao'
$env:S3_ENDPOINT='http://127.0.0.1:9000'
$env:S3_REGION='us-east-1'
$env:S3_ACCESS_KEY_ID='loi_vao'
$env:S3_SECRET_ACCESS_KEY='loi_vao_dev_password'
$env:SCENE_ASSETS_BUCKET='scene-assets'
$env:RAW_CAPTURE_BUCKET='raw-captures'
pnpm --filter @tro/web dev
```

If the Docker CLI exists but `docker compose up` cannot connect to `dockerDesktopLinuxEngine`, Docker Desktop is not running. Start Docker Desktop, then rerun the verification path.

Production-shaped standalone verification path after `pnpm --filter @tro/web build`:

```powershell
$env:DATABASE_URL='postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao'
$env:NODE_ENV='production'
$env:PORT='4318'
$env:HOSTNAME='127.0.0.1'
node apps/web/.next/standalone/apps/web/server.js
```

Then verify `GET /api/places` reports `meta.source = "postgis"` and, with an admin session cookie, `GET /api/admin/system` reports verdict `ready`, `storageReady = true`, and both required buckets exist.

## Deployment Direction

Start with a single VM or GCP Compute Engine instance:

- Docker Compose.
- Nginx/Caddy in front for HTTPS.
- PostGIS volume on persistent disk.
- MinIO data volume on persistent disk, or later Cloudflare R2/GCS/S3.
- Daily database backups.
- Object storage lifecycle/backups for raw captures and published scene assets.

Move away from a single VM only when load, reliability, or team operations demand it.
