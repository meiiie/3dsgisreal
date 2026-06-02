# Pre-GPU Setup Runbook

Last reviewed: 2026-06-02.

## Purpose

Do as much deterministic work as possible before renting a GPU. The GPU session should
be a short execution window, not a research session.

This runbook prepares one real scene for the first Nerfstudio/gsplat test:

```text
iPhone RGB capture
  -> private raw upload
  -> admin capture row
  -> admin processing job row
  -> RunPod/Nerfstudio script
  -> PLY export
  -> SuperSplat cleanup
  -> SOG/settings/collision/poster
  -> local and S3 asset gates
  -> scene manifest/viewer check
```

LiDAR is support data only. It can help with scale, floor/collision reference, and layout,
but the main 3DGS training input is RGB video/images.

## Source Refresh

Checked primary sources on 2026-06-02:

- Nerfstudio custom data and CLI docs: `ns-process-data` uses COLMAP and FFmpeg for
  video/image inputs, and Linux/CUDA remains the practical path for training.
- Nerfstudio Splatfacto docs: `splatfacto` is the Gaussian Splatting method and uses
  `gsplat` as its rasterization backend.
- PlayCanvas Gaussian Splatting docs: PLY/compressed PLY are useful source/edit formats;
  SOG is the compact runtime delivery format; SplatTransform converts and can generate
  runtime/collision artifacts.
- SuperSplat Viewer docs: the self-hosted viewer consumes a `content` URL plus optional
  settings/collision/poster style inputs.
- RunPod pod docs: stopping a pod does not mean all storage cost disappears; download
  exports/logs and remove idle pods/volumes deliberately.

## Hard Gate Before Renting

Do not start a paid GPU until these are true:

1. At least one raw capture exists locally outside git.
2. The raw capture has a named scene id and run id.
3. `python tools\3dgs\create_gpu_experiment.py ...` has generated the experiment folder.
4. `pnpm captures:upload -- ... --dry-run` validates the raw upload plan.
5. Local PostGIS/MinIO are ready if using the admin DB path.
6. Capture and processing job metadata exist in admin, or their generated payloads are
   ready to paste.
7. The RunPod command script is reviewed before the pod starts.
8. The postprocessing commands are ready for SOG/settings/collision/poster.

## Capture Plan

For the first test, capture two takes:

- `room-a`: one small room with stable lighting.
- `gate-to-room-a`: from the entry/gate into the target room.

Recommended iPhone 14 Pro setup:

- landscape
- 4K 30fps
- 1x main camera
- no 0.5x unless the room is too tight
- no lens switching
- stable exposure/focus/white balance where practical
- walk slowly with translation; do not only stand and pan
- avoid moving people, mirrors, glass, shiny furniture, fast lighting changes

Optional support pass:

- Scaniverse/Polycam LiDAR scan for rough layout and collision reference.
- Keep it separate from the RGB training input.

## Local Experiment Folder

Create the pre-GPU folder:

```powershell
python tools\3dgs\create_gpu_experiment.py `
  --scene-id home-test-room-v1 `
  --place-slug phong-thu-nghiem-tu-cong-vao `
  --raw-input E:\captures\home-test-room\raw\gate-room-take-01.mov `
  --frame-target 400
```

Output:

```text
artifacts/gpu-experiments/<scene-id>/<run-id>/
  README.md
  experiment.json
  admin-capture-payload.json
  admin-processing-job-payload.json
  runpod-nerfstudio.sh
  postprocess-local.ps1
```

`artifacts/` is ignored by git. Do not put raw videos/photos there unless they are
temporary local files and never staged.

Check the generated folder:

```powershell
pnpm gpu:preflight -- `
  --experiment-dir artifacts\gpu-experiments\home-test-room-v1\pre-gpu-template
```

Immediately before renting the GPU, use the stricter gate:

```powershell
pnpm gpu:preflight -- `
  --experiment-dir artifacts\gpu-experiments\home-test-room-v1\pre-gpu-template `
  --require-raw `
  --require-admin-ready
```

## Raw Capture Upload

Configure local MinIO:

```powershell
$env:S3_ENDPOINT='http://127.0.0.1:9000'
$env:S3_REGION='us-east-1'
$env:S3_ACCESS_KEY_ID='loi_vao'
$env:S3_SECRET_ACCESS_KEY='loi_vao_dev_password'
$env:RAW_CAPTURE_BUCKET='raw-captures'
```

Dry-run upload:

```powershell
pnpm captures:upload -- `
  --input E:\captures\home-test-room\raw\gate-room-take-01.mov `
  --scene-id home-test-room-v1 `
  --take-id iphone14pro-gate-room-01 `
  --dry-run
```

Upload only after the printed `raw asset key` matches the admin capture plan.

For an image folder:

```powershell
pnpm captures:upload -- `
  --input E:\captures\home-test-room\raw\images-take-01 `
  --scene-id home-test-room-v1 `
  --take-id iphone14pro-images-01 `
  --dry-run
```

## Local Runtime Preflight

Before the GPU clock starts, verify the local harness:

```powershell
docker compose up -d postgres minio minio-setup
pnpm db:migrate
pnpm --filter @tro/web sync:supersplat-viewer
pnpm --filter @tro/web typecheck
pnpm --filter @tro/web lint
```

If checking full runtime readiness, start the app with PostGIS/S3 env and inspect:

```text
/admin/system
/admin/captures/new
/admin/processing/new
/admin/scenes/home-test-room-v1/assets
```

Or run the API preflight:

```powershell
pnpm runtime:preflight -- `
  --base-url http://127.0.0.1:4317 `
  --scene-id home-test-room-v1 `
  --expect-postgis `
  --expect-storage-ready
```

The system page should report PostGIS and storage ready for a true end-to-end local run.

Early lab note: if an existing local PostGIS volume reports a checksum mismatch after
pulling the PostGIS extension fix, do not reset real/private data. For this lab-only
seed volume, re-baseline migration history after confirming the schema already exists:

```powershell
docker exec tro-postgres-1 psql -U loi_vao -d loi_vao -c "delete from public.schema_migrations;"
$env:DATABASE_URL='postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao'
pnpm db:migrate -- --baseline-existing
pnpm db:migrate
```

Use this only for early local volumes that contain the repo seed schema. For any future
real deployment, create a forward migration instead of rewriting migration history.

## GPU Session

Recommended first GPU:

- RTX 4090 24GB if available.
- L4 24GB if cheaper/available and the first scene is small.
- Avoid A100 for the first proof unless cheaper GPUs fail or the scene is large.

On RunPod:

1. Use a PyTorch CUDA template.
2. Use at least 80GB total disk for the first scene.
3. Copy raw media to the path shown in the generated experiment README.
4. Run `bash runpod-nerfstudio.sh`.
5. Download exports and logs before stopping/terminating.
6. Stop/terminate deliberately; do not leave volumes/pods idle by accident.

Pass criteria for the first paid run:

- GPU is visible in `nvidia-smi`.
- `ns-process-data` completes and camera reconstruction is plausible.
- `ns-train splatfacto` produces a config.
- `ns-export gaussian-splat` exports a PLY.
- The PLY opens in SuperSplat.

Fail fast if:

- COLMAP cannot reconstruct camera poses.
- The capture is too blurry/dark/noisy.
- The scene has major moving objects or lens switches.
- Disk fills before export.

## Postprocess And Publish

After GPU export:

1. Open PLY in SuperSplat.
2. Crop floaters and align the entry view.
3. Export/create:
   - `scene.sog`
   - `settings.json`
   - `collision.voxel.json`
   - `poster.webp`
4. Put those files in the experiment `published` folder.
5. Confirm the scene version in `/admin/scenes/<sceneId>/assets`.
6. Run the generated `postprocess-local.ps1` after checking its `$Version`.

Manual equivalent:

```powershell
python tools\3dgs\prepare_local_scene_assets.py `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1 `
  --dry-run

pnpm assets:upload -- `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1 `
  --dry-run
```

Remove `--dry-run` only after the admin asset page reports the expected paths.
Replace `--version 1` with the version shown by the admin asset page if a real
processing job created `v2` or later.

## Colleague Coordination

While web development continues, keep these contracts stable:

- `GET /api/scenes/[sceneId]/manifest`
- `/viewer/[sceneId]`
- `/admin/scenes/[sceneId]/assets`
- asset keys under `scenes/<sceneId>/v<version>/`
- runtime files: `scene.sog`, `settings.json`, `collision.voxel.json`, `poster.webp`
- raw keys under `raw-captures/<sceneId>/<runId>/...`

The web side can improve UI, admin flows, and direct PlayCanvas integration, but should
not change the manifest or storage key contract without updating this runbook and
`docs/03-gpu-3dgs-pipeline.md`.

## First-Rental Checklist

Use this immediately before paying for GPU time:

```text
[ ] raw capture exists outside git
[ ] generated experiment folder exists
[ ] `pnpm gpu:preflight -- --require-raw --require-admin-ready` passed
[ ] raw upload dry-run passed
[ ] capture row/payload ready
[ ] processing job row/payload ready
[ ] `pnpm runtime:preflight -- --expect-postgis --expect-storage-ready` passed against the running app
[ ] RunPod script reviewed
[ ] local PostGIS/MinIO ready, if using DB-backed admin
[ ] SuperSplat Viewer synced locally
[ ] postprocess command ready
[ ] decision made: stop vs terminate pod after download
```
