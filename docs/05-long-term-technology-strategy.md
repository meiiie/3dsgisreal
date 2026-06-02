# Long-Term Technology Strategy

Last reviewed: 2026-06-02.

## Positioning

This project should be treated as a spatial experience platform, not a small map demo.

The map is still the first product surface, but it is not the whole product. It is the spatial index that lets users discover places in Vietnam, starting with Hai Phong. Each place can open a separate immersive 3D Gaussian Splat scene with navigation, hotspots, audio, quiz, check-in, and later NPC or guided routes.

## Core Long-Term Decision

Use an open, modular stack with clear boundaries:

```text
Vietnam/Hai Phong basemap
  -> MapLibre + self-hosted vector tiles
  -> PostGIS place database
  -> Next.js web/admin surfaces
  -> PlayCanvas runtime for immersive scenes
  -> 3DGS asset pipeline on NVIDIA CUDA GPU
  -> SOG now, glTF/SPZ/3D Tiles watched as the geospatial standard path
```

The most important boundary is the scene manifest. The app should not care whether a scene was produced by Nerfstudio, Postshot, RadianceKit, OpenSplat, or another tool. The app consumes published runtime assets.

## Recommended Production Stack

### Web Product

- Framework: Next.js App Router, React, TypeScript.
- Styling: Tailwind CSS plus a small design-token layer.
- Map renderer: MapLibre GL JS.
- 3D runtime: PlayCanvas Engine for the long term.
- Short-term bridge: SuperSplat Viewer for early SOG scenes.

Reasoning:

- Next.js is a strong default for product UI, server-rendered metadata pages, admin screens, and API edges.
- MapLibre is open-source and works with vector tiles, PMTiles, and custom styles.
- PlayCanvas has first-class web 3D, WebGL/WebGPU/WebXR direction, and active Gaussian Splatting support.
- SuperSplat Viewer is useful for fast validation, but the serious product should eventually own the PlayCanvas scene runtime directly.

### Map And GIS

Use OpenStreetMap-derived data for the Vietnam/Hai Phong basemap.

Recommended layers:

- Basemap source: Geofabrik Vietnam OSM extract.
- Tile generation: Planetiler first, OpenMapTiles if we need the full OpenMapTiles schema/tooling.
- Tile format: PMTiles for static self-hosted vector tiles.
- Tile serving: direct PMTiles over HTTP Range for simple hosting, or Martin when combining PMTiles with dynamic PostGIS sources.
- Runtime renderer: MapLibre GL JS.
- Spatial database: PostgreSQL + PostGIS.

Why this matters:

- We can have a real Vietnam/Hai Phong map before scanning any place.
- We avoid depending on public demo tile servers.
- The same data model can later support search, filters, districts, route clustering, and admin review.

Map data plan:

1. Local lab: use `apps/web/public/map-styles/local-lab.json` as an offline-safe MapLibre style so smoke tests and local demos do not depend on public demo tile servers.
2. Early development: use public vector tiles only when a real street basemap is needed for exploration.
3. Serious alpha: download `vietnam-latest.osm.pbf` from Geofabrik and build `vietnam.pmtiles`.
4. Hai Phong pilot: extract a smaller Hai Phong bounding box or polygon for faster tile generation and local iteration.
5. Production: version map tiles monthly or weekly, store them in object storage/CDN, and keep POIs/places in PostGIS.

### Backend

Use PostgreSQL + PostGIS as the durable source of truth.

Recommended hosting path:

- Default path: Docker Compose with PostgreSQL/PostGIS and S3-compatible object storage.
- Deployment path: single VM or GCP Compute Engine first, then split services only when needed.
- Optional managed path: Supabase/Postgres/Auth/Storage if speed of auth/admin tooling becomes more valuable than infrastructure control.

Application services:

- `apps/web`: public map and viewer.
- `apps/admin`: capture review, place/scene/hotspot management.
- `apps/api`: only when Next.js route handlers become too constrained.
- `packages/db`: SQL migrations and typed query helpers.
- `packages/shared`: scene manifest and API contracts.
- `tools/3dgs`: GPU/training/postprocessing scripts.

Avoid putting raw training work inside the web app. 3DGS processing is an offline asset pipeline.

### 3DGS Training Pipeline

Default open-source training path:

- Capture: iPhone 14 Pro, landscape, 4K30, 1x main camera, stable exposure/focus/white balance.
- Preprocess: Nerfstudio `ns-process-data`, COLMAP/SfM output.
- Train: Nerfstudio `splatfacto` using `gsplat` on NVIDIA CUDA.
- Benchmark/compare: Postshot when a Windows NVIDIA machine is available, but do not make it the only path.
- Alternative OSS trainer: OpenSplat for portability experiments.
- Cleanup: SuperSplat.
- Runtime conversion: `@playcanvas/splat-transform`.
- Runtime web format now: SOG.
- Collision: generated voxel/collision GLB plus manual proxy geometry where needed.

The training machine should be disposable. RunPod RTX 4090, L4, RTX 3090, or similar is enough for first scenes. A100 is not necessary for the initial room/gate tests.

### Runtime Scene Strategy

There are three tiers:

1. Viewer tier: SuperSplat Viewer loads SOG + settings quickly.
2. Product tier: direct PlayCanvas Engine integration with custom UI, input, hotspots, audio, collision, mini-map, analytics, and mobile quality controls.
3. Geospatial tier: Cesium/3D Tiles/glTF Gaussian Splatting for large georeferenced datasets if the product ever moves beyond independent place scenes.

For this product, tier 2 is the serious long-term target. Tier 3 is important to track, but not the default for room/cafe/di tích walkthroughs.

### Asset Format Strategy

Use a format ladder instead of betting everything on one file type:

- Raw capture: private videos/photos.
- Training workspace: Nerfstudio/COLMAP outputs and checkpoints.
- Source splat: PLY or trainer-native export.
- Edited source: cleaned PLY/SPLAT/SPZ as needed.
- Current web runtime: SOG.
- Future interoperability: glTF `KHR_gaussian_splatting`, SPZ compression, and 3D Tiles for LOD/geospatial streaming.

The database stores an asset manifest with version and format fields so the renderer can evolve.

## Open-Source Projects To Watch

### Map/GIS

- MapLibre GL JS: browser map renderer.
- MapLibre Native: native mobile map path if we ship mobile apps later.
- Planetiler: builds OSM vector tiles into MBTiles/PMTiles.
- OpenMapTiles: open schema/tooling for OSM vector tiles.
- Martin: Rust tile server for PostGIS, MBTiles, and PMTiles.
- PMTiles/Protomaps: single-file tile archives via HTTP Range requests.
- PostGIS: spatial database layer.

### 3DGS/Web 3D

- Nerfstudio: training framework and `splatfacto`.
- gsplat: CUDA backend for Gaussian Splatting research/training.
- graphdeco-inria/gaussian-splatting: original 3DGS implementation/reference.
- PlayCanvas Engine: web 3D runtime with Gaussian Splatting support.
- SuperSplat: editor/cleanup/publishing.
- SuperSplat Viewer: web viewer for early embedded scenes.
- SplatTransform: conversion, optimization, collision generation.
- OpenSplat: portable C++ trainer.
- GaussianSplats3D: Three.js viewer reference.
- CesiumJS and 3D Tiles: geospatial LOD path for very large splat datasets.
- Khronos glTF `KHR_gaussian_splatting`: interoperability path.

## What We Should Not Do

- Do not build on public demo map tiles for production.
- Do not treat SuperSplat as the trainer.
- Do not make Postshot the only pipeline because it is not fully open and not Mac-native.
- Do not store raw private room captures in git.
- Do not try to scan a whole city. The product is a catalog of independent, high-quality scenes.
- Do not make the viewer depend on one hardcoded format; keep the scene manifest format-aware.

## Near-Term Serious Plan

Before the first GPU test:

- Keep current web shell, but treat it as the beginning of the platform.
- Add a local map tile plan for Vietnam/Hai Phong.
- Define the scene manifest contract.
- Prepare RunPod/Nerfstudio commands.

After the first GPU test:

- Put one real scene through the full pipeline.
- Measure file size, load time, FPS, and mobile behavior.
- Decide whether direct PlayCanvas Engine work should replace the iframe viewer immediately.
- Wire the first real scene into the PostGIS schema and manifest API.
