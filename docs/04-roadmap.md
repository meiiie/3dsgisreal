# Roadmap

## Phase 0 - Before GPU Test

- [x] Create monorepo and web app shell.
- [x] Build first map screen with sample places.
- [x] Add scene manifest model and placeholder viewer route.
- [x] Document capture/training pipeline.
- [x] Choose backend/SQL stack and add initial PostGIS migration.
- [x] Add typed place/scene sample repository and local API routes.
- [x] Add initial `@loi-vao/db` package and PostGIS query path.
- [x] Add public map/API search and category filters with empty-state handling.
- [x] Add public place API bounds filtering for future viewport-driven map loading.
- [x] Add public map viewport refresh so the client can reload places through the bounds API.
- [x] Add local-first MapLibre style so the lab map renders without public demo tile network calls.
- [x] Add public place detail API with 404 handling and scene manifest link.
- [x] Add initial admin pipeline API for capture sessions and processing jobs.
- [x] Add initial scene asset readiness contract and viewer checklist.
- [x] Add initial admin asset publish plan and dry-run/write API.
- [x] Add admin asset publish page with Server Function form action and desktop/mobile smoke screenshots.
- [x] Add local public asset file presence check for `apps/web/public/scene-assets`.
- [x] Add basic local asset QA status for missing/invalid/ready runtime files.
- [x] Add object-storage presence check for planned scene assets in MinIO/S3.
- [x] Add `tools/3dgs/prepare_local_scene_assets.py` to stage SuperSplat/SplatTransform output into the local web asset folder.
- [x] Add `tools/3dgs/upload_scene_assets_to_s3.mjs` to upload verified scene runtime artifacts to MinIO/S3.
- [x] Add initial place detail, user, and admin surfaces.
- [x] Add local user dashboard API/page for saved, visited, and checked-in places.
- [x] Add user save/visited actions from place detail with API dry-run and DB write path.
- [x] Add admin place/scene intake form and API with DB dry-run/persist path.
- [x] Add admin place metadata/scene-entry edit page/API with dry-run and DB write path.
- [x] Add admin place status review page/API with dry-run, DB write path, and archive confirmation.
- [x] Add admin capture intake form and API with safe raw capture key validation.
- [x] Add admin processing-job intake form and API to queue Nerfstudio/gsplat work from a capture.
- [x] Add admin processing-job status/detail page and API dry-run for running/succeeded/failed/cancelled/retry transitions.
- [x] Add first scene hotspot/audio/quiz/check-in manifest primitive and viewer panel.
- [x] Add admin hotspot intake page/API for scene info/audio/quiz/check-in/link contract testing.
- [x] Add admin hotspot update/delete API and form-backed dry-run controls.
- [x] Add viewer check-in action and local user check-in API/write path.
- [x] Add viewer quiz answer action and local user quiz-attempt API/write path.
- [x] Add quiz attempt history to the local user dashboard and `/api/user` contract.
- [x] Add local signed session switcher, user/admin roles, and admin page/API gate.
- [x] Add admin system health page/API for app, PostGIS, migration, schema, and storage config readiness.
- [x] Add bucket-level MinIO/S3 runtime health for scene assets and raw captures.
- [x] Add code/design quality gates to the harness.
- [x] Prepare RunPod checklist.
- [x] Verify desktop/mobile map shell with local smoke screenshots.

## Phase 1 - GPU Test At 13:00, 2026-06-02

- Rent RTX 4090 or L4 on RunPod.
- Upload one iPhone 14 Pro test capture.
- Record the raw capture key through `/admin/captures/new`.
- Queue the first processing job through `/admin/processing/new`.
- Use `/admin/processing/[jobId]` to track running/succeeded/failed/cancelled status while testing GPU.
- Run Nerfstudio `ns-process-data`.
- Train `splatfacto`.
- Export PLY.
- Validate in SuperSplat.

## Phase 2 - Web Runtime

- Convert final PLY to SOG.
- Generate collision/voxel data.
- Stage scene assets locally with `tools/3dgs/prepare_local_scene_assets.py`, then object storage.
- Use the existing admin asset page/API to write the first real SOG/settings/collision keys into a scene version.
- Wire the existing `/viewer/[sceneId]` readiness path to the first real SOG/settings/collision asset.

## Phase 3 - Product MVP

- [x] Verify Docker PostGIS runtime with `DATABASE_URL` once Docker Desktop is running, using `/admin/system` and `GET /api/admin/system` as the operator check.
- [x] Verify Docker MinIO runtime with S3 credentials and required buckets through `/admin/system` and `GET /api/admin/system`.
- [x] Expand app queries through `packages/db` beyond the initial place/scene read path with status, distance, and richer Vietnamese search behavior.
- [x] Extend admin seed/import flow with CSV/bulk import.
- [x] Add richer review queues.
- Replace local signed lab session with a production auth/session provider.
- Expand hotspot/audio/quiz/check-in primitives into precise 3D placement, audio playback, richer scoring, and real-auth user actions.
- Mobile performance profile.
- [x] Privacy checklist for public/private places.

## Phase 4 - Pilot

- 3-5 scenes around one small area.
- User testing with students.
- Load-time/FPS budget.
- Capture playbook refined from failed scans.
