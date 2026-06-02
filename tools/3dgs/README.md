# 3DGS Tools

Offline helpers for the capture -> training -> SuperSplat -> web-runtime pipeline.

These tools do not train 3DGS models and should not commit raw/private scene assets.

## Create A GPU Experiment Folder

Before renting a GPU, create a local experiment folder with the planned admin payloads,
RunPod/Nerfstudio commands, and postprocessing commands:

```powershell
python tools\3dgs\create_gpu_experiment.py `
  --scene-id home-test-room-v1 `
  --place-slug phong-thu-nghiem-tu-cong-vao `
  --raw-input E:\captures\home-test-room\raw\gate-room-take-01.mov `
  --frame-target 400
```

The generated folder lives under `artifacts/gpu-experiments/...`, which is ignored by git.
It is safe for command notes and manifests, but raw videos/photos still stay outside git.

Check the generated folder before starting a paid GPU pod:

```powershell
pnpm gpu:preflight -- `
  --experiment-dir artifacts\gpu-experiments\home-test-room-v1\pre-gpu-template
```

Use `--require-raw --require-admin-ready` immediately before renting the GPU.

## Check Local Runtime APIs

When the app is already running with PostGIS and MinIO/S3 environment variables,
check the runtime APIs before renting GPU time:

```powershell
pnpm runtime:preflight -- `
  --base-url http://127.0.0.1:4317 `
  --scene-id home-test-room-v1 `
  --expect-postgis `
  --expect-storage-ready
```

This checks health, `/api/places`, admin system readiness, and the scene manifest.
It also handles the local admin cookie manually so production-shaped HTTP checks work.

## Upload Raw Capture To MinIO/S3

Raw capture uploads go to the private `raw-captures` bucket. Use this before creating or
updating the admin capture row:

```powershell
pnpm captures:upload -- `
  --input E:\captures\home-test-room\raw\gate-room-take-01.mov `
  --scene-id home-test-room-v1 `
  --take-id iphone14pro-gate-room-01 `
  --dry-run
```

The tool accepts a single video file or a directory of still images. It validates that raw
asset keys start with `raw-captures/`, rejects empty files, refuses overwrites unless
`--overwrite` is passed, and verifies uploads with S3 `HeadObject`.

## Prepare Local Scene Assets

After SuperSplat/SplatTransform produces runtime artifacts, copy them into the local web public folder:

```powershell
python tools\3dgs\prepare_local_scene_assets.py `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1
```

Expected default input filenames:

- `scene.sog`
- `settings.json`
- `collision.voxel.json`
- `poster.webp`

Use `--dry-run` before copying real scene files.

## Upload Scene Assets To MinIO/S3

After the local files are prepared and inspected, upload the runtime artifacts to the `scene-assets` bucket:

```powershell
pnpm --filter @loi-vao/3dgs-tools upload:scene-assets -- `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1 `
  --dry-run
```

Required S3 environment variables:

- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `SCENE_ASSETS_BUCKET`

The upload tool validates non-empty files, parses `settings.json` and `collision.voxel.json` as JSON objects, refuses to overwrite existing objects unless `--overwrite` is passed, and verifies each upload with `HeadObject`.

This tool uploads runtime scene artifacts only. Do not use it for raw captures.
