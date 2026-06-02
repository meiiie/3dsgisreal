# 3DGS Tools

Offline helpers for the capture -> training -> SuperSplat -> web-runtime pipeline.

These tools do not train 3DGS models and should not commit raw/private scene assets.

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
