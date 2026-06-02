# GPU 3DGS Pipeline

## Target Pipeline

```text
iPhone 14 Pro capture
  -> record capture metadata/raw storage key in admin
  -> create queued processing job in admin
  -> upload video/photos to GPU machine
  -> ns-process-data video/images
  -> ns-train splatfacto
  -> ns-export gaussian-splat
  -> SuperSplat cleanup
  -> splat-transform to SOG + collision
  -> upload runtime assets
  -> create scene manifest
  -> web app loads scene
```

## Capture Baseline

- Landscape.
- 4K 30fps.
- 1x main camera.
- No zoom.
- No lens switching.
- Lock exposure/focus/white balance where possible.
- Move slowly; do not just pan in place.
- Split harsh lighting transitions into separate scenes if needed.

## RunPod Baseline

Preferred first test:

- GPU: RTX 4090 24GB or L4 24GB.
- Template: PyTorch CUDA image.
- Disk: at least 80GB for first tests.
- Stop or terminate after use; storage/volume can still cost money if kept.

## Capture Intake Before GPU

Before renting a GPU, record the capture in the local admin surface:

```text
/admin/captures/new
```

Capture intake stores metadata only:

- place/scene reference
- device, for example `iPhone 14 Pro`
- capture mode: video, photos, or video + stills
- capture timestamp
- raw storage key under `raw-captures/...`
- operator notes about route, lighting, lens, and capture problems

Do not put raw videos/photos in git or `apps/web/public`. The app should know where a raw capture lives, but the raw private media should stay in private storage or a local transfer folder until the GPU run starts.

## Processing Job Intake Before GPU

After a capture exists, queue the training job in:

```text
/admin/processing/new
```

Processing job intake stores:

- capture session reference
- provider target, for example RunPod
- GPU target, for example RTX 4090 or L4
- toolchain, defaulting to Nerfstudio `splatfacto` + `gsplat`
- frame target for `ns-process-data`
- log key under `processing/...`
- operator notes

When PostGIS is enabled, creating a job also creates the next `scene_versions` row in `processing` status. That gives the eventual PLY/SuperSplat/SOG output a stable scene version to publish against.

This does not start billing by itself. Real GPU cost starts only when the operator rents/starts the GPU pod or cloud instance.

## Processing Job Status

After a job is queued, use:

```text
/admin/processing/<jobId>
```

The local status workflow is:

```text
queued -> running -> succeeded
queued -> failed/cancelled
running -> failed/cancelled
failed/cancelled -> queued
```

Use `running` only after the GPU pod or cloud instance is actually started. Use `succeeded` only after PLY export has completed and the output has been inspected enough to move to SuperSplat cleanup. A succeeded processing job does not mean the web viewer is ready; the asset publish gate still requires SOG/settings/collision/poster files.

Failed or cancelled jobs mark the linked scene version as failed so a new retry can create a clean version.

## Nerfstudio Commands Draft

Exact commands may need adjustment after the first RunPod image is known.

```bash
# On GPU machine
nvidia-smi
python --version

# Install nerfstudio in a fresh environment if the template does not include it.
pip install --upgrade pip
pip install nerfstudio

# Video input.
ns-process-data video \
  --data /workspace/data/raw/room-test.mov \
  --output-dir /workspace/data/processed/room-test \
  --num-frames-target 400

# Image folder input.
ns-process-data images \
  --data /workspace/data/raw/room-test-images \
  --output-dir /workspace/data/processed/room-test

# Train.
ns-train splatfacto \
  --data /workspace/data/processed/room-test

# Export PLY.
ns-export gaussian-splat \
  --load-config /workspace/outputs/.../config.yml \
  --output-dir /workspace/exports/room-test
```

## Postprocessing Draft

```bash
# Convert to web runtime format.
pnpm dlx @playcanvas/splat-transform scene.ply scene.sog

# Generate voxel collision for viewer.
pnpm dlx @playcanvas/splat-transform scene.ply scene.voxel.json

# Optional collision mesh.
pnpm dlx @playcanvas/splat-transform scene.ply --collision-mesh scene.collision.glb
```

Use SuperSplat manually between PLY export and SOG conversion for crop, delete floaters, align entry pose, and add annotations/settings.

After postprocessing, stage the runtime files for the local web app:

```powershell
python tools\3dgs\prepare_local_scene_assets.py `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1 `
  --dry-run

python tools\3dgs\prepare_local_scene_assets.py `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1
```

The script validates/copies `scene.sog`, `settings.json`, `collision.voxel.json`, and `poster.webp` into the correct local web folder. Use `--overwrite` only when intentionally replacing a version.

## Runtime Asset Contract

The web app now expects the scene manifest to expose asset readiness through `@loi-vao/assets`.

For the first real scene, publish these runtime artifacts:

- SOG content: required to open the viewer.
- `settings.json`: required for full walkthrough behavior and tuned viewer settings.
- collision asset: required for first-person/walk controls.
- poster/thumbnail: useful for preview, not required to open the viewer.

For local development, copy the files into:

```text
apps/web/public/scene-assets/scenes/<sceneId>/v<version>/
```

Example first-scene paths:

```text
apps/web/public/scene-assets/scenes/home-test-room-v1/v1/scene.sog
apps/web/public/scene-assets/scenes/home-test-room-v1/v1/settings.json
apps/web/public/scene-assets/scenes/home-test-room-v1/v1/collision.voxel.json
apps/web/public/scene-assets/scenes/home-test-room-v1/v1/poster.webp
```

Use `/admin/scenes/[sceneId]/assets` to inspect the expected storage keys before uploading/publishing. The page has a server-side form action that uses the same publish contract as the API, checks whether the local `public/scene-assets` files exist, and checks whether the planned objects exist in the configured `scene-assets` MinIO/S3 bucket.

Upload prepared runtime artifacts to MinIO/S3 after local QA:

```powershell
$env:S3_ENDPOINT='http://127.0.0.1:9000'
$env:S3_REGION='us-east-1'
$env:S3_ACCESS_KEY_ID='loi_vao'
$env:S3_SECRET_ACCESS_KEY='loi_vao_dev_password'
$env:SCENE_ASSETS_BUCKET='scene-assets'
$env:SCENE_ASSETS_PUBLIC_BASE_URL='http://127.0.0.1:9000/scene-assets'

pnpm assets:upload -- `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1 `
  --dry-run
```

Remove `--dry-run` only after the admin page and script output show the planned paths are correct. The upload tool validates non-empty files, parses `settings.json` and `collision.voxel.json` as JSON objects, refuses overwrite unless `--overwrite` is passed, and verifies upload with S3 `HeadObject`.

Set `SCENE_ASSETS_PUBLIC_BASE_URL` to the browser-reachable base URL for published scene objects. In the local MinIO harness this is usually `http://127.0.0.1:9000/scene-assets`. The manifest falls back to `/scene-assets/...` only for files staged under `apps/web/public/scene-assets`.

Local admin QA is intentionally basic but mandatory before publishing:

- missing files are reported as `missing`
- zero-byte files are reported as `invalid`
- `settings.json` and `collision.voxel.json` must parse as JSON objects
- SOG and poster files must be non-empty
- passing this check means "locally sane", not visually/performance approved

Object-storage admin checks are also mandatory once MinIO/S3 env is configured:

- missing S3 config is reported per planned object
- `scene.sog`, `settings.json`, `collision.voxel.json`, and `poster.webp` are checked with S3 `HeadObject`
- object checks prove presence in storage only; they do not prove visual quality, mobile FPS, or collision usability

Use `GET /api/admin/scenes/[sceneId]/assets` for machine-readable inspection.
Use `PUT /api/admin/scenes/[sceneId]/assets` after the objects exist to attach the keys to the latest scene version, or submit the admin page form for the same operation. When PostGIS is enabled, the publish action is blocked if any planned MinIO/S3 object is missing.

The `/api/scenes/[sceneId]/manifest` response reports whether the viewer can open, whether full walkthrough mode is ready, and which assets are still missing.

The web app self-hosts the SuperSplat Viewer from the installed `@playcanvas/supersplat-viewer` package. Run this whenever dependencies change or before checking viewer runtime behavior:

```powershell
pnpm --filter @tro/web sync:supersplat-viewer
```

`predev` and `prebuild` run the sync automatically. The generated `apps/web/public/supersplat-viewer/**` files are ignored by git; only the package version and sync script are source-controlled. Docker runtime copies `apps/web/public` into the standalone image so `/supersplat-viewer/index.html` remains available after build.

## First Test Acceptance Criteria

- The raw capture is registered in `/admin/captures/new` or `POST /api/admin/captures`.
- A queued processing job is registered in `/admin/processing/new` or `POST /api/admin/processing-jobs`.
- The processing job status can be inspected through `/admin/processing/<jobId>` and dry-run updated through `PATCH /api/admin/processing-jobs/<jobId>/status`.
- A small scene exports to PLY.
- SuperSplat can open and clean it.
- SOG loads in a browser viewer.
- Admin asset page reports local file presence and basic QA for SOG/settings/collision/poster.
- `pnpm assets:upload` uploads SOG/settings/collision/poster to MinIO/S3 and verifies them with `HeadObject`.
- Admin asset page/API reports object-storage presence for the same SOG/settings/collision/poster keys.
- Manifest readiness shows SOG/settings/collision availability correctly.
- Manifest URLs resolve through `SCENE_ASSETS_PUBLIC_BASE_URL` when assets live in MinIO/S3.
- `/supersplat-viewer/index.html` is served by the app before a ready scene tries to iframe it.
- Scene can be entered from a map placeholder.
- Mobile browser either loads successfully or receives a graceful lower-quality fallback.

## Files Not To Commit

- Raw videos/photos.
- Nerfstudio checkpoints.
- Full PLY/SOG/collision assets except tiny fixtures.
- Files under `apps/web/public/scene-assets` except `.gitkeep`.
- Private room/capture data.
- Cloud tokens and storage credentials.
