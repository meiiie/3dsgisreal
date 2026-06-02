# @loi-vao/assets

Shared helpers for scene and storage assets.

Expected contents:

- storage key builders.
- scene manifest validation.
- asset visibility rules.
- SOG/collision/poster naming conventions.
- checksum and file metadata helpers.

This package should not train 3DGS models. Training and conversion scripts belong in `tools/3dgs`.

## Current State

Implemented:

- `buildStorageAssetUrl`: converts storage keys into public runtime URLs.
- `createSceneAssetPublishPlan`: creates the standard storage-key plan for SOG/settings/collision/poster artifacts.
- `getSceneAssetChecklist`: returns content/settings/collision/poster availability.
- `getSceneRuntimeReadiness`: decides whether a scene can open the viewer and whether full walkthrough mode is ready.
- `createSuperSplatViewerUrl`: builds the SuperSplat Viewer iframe URL from runtime asset URLs.

Rules:

- SOG content is required to open the viewer.
- settings.json and collision are required for a full walkthrough-ready scene.
- poster is useful for preview but does not block the viewer.
- This package stays pure TypeScript and does not import storage clients, Next.js, React, PlayCanvas, or training code.
