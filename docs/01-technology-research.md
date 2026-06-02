# Technology Research

Last reviewed: 2026-06-02.

## Core Conclusion

Prepare the web product now, independent of GPU training. The web app only needs scene manifests and placeholder assets at first. The 3DGS pipeline can later publish `.sog`, collision, poster, and `settings.json` files into object storage.

## Sources And Findings

### Agent Harness

Anthropic's large-codebase guidance says the harness around an agent matters as much as the model, and identifies layered context files, hooks, skills, plugins, MCP, LSP, and subagents as the practical scaffolding for large codebases. It also recommends lean, layered context files, scoped test/lint commands, ignore files, and codebase maps.

Source: https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start

Local adaptation:

- `AGENTS.md` is the root context file.
- `docs/02-architecture.md` acts as the codebase map before the repo grows.
- Future subdirectories can add local `AGENTS.md` files only when conventions differ.
- Generated assets and raw scans stay ignored.

### Web Framework

Next.js 16 is the current package latest in this environment (`npm view next version` returned `16.2.7`). Official release notes say Next.js 16 includes App Router defaults, TypeScript-first create-next-app defaults, Turbopack stable, React 19.2 integration, clearer caching, and DevTools MCP.

Sources:

- https://nextjs.org/blog/next-16
- https://nextjs.org/docs/app

Decision: use Next.js 16 App Router for the web app.

### Map Layer

MapLibre GL JS is an open-source TypeScript library for interactive, GPU-accelerated maps on the web, using WebGL and working toward WebGPU. It supports custom 3D models, clustering, data visualization, React wrappers, and PMTiles.

Source: https://maplibre.org/projects/gl-js/

Decision: use MapLibre GL JS for the map. Avoid relying on the public OpenStreetMap tile servers for production load; use a proper tile provider or PMTiles later.

### 3D Runtime

SuperSplat Viewer is an open-source, self-hostable PlayCanvas web viewer. It takes a splat file plus `settings.json` and supports orbit, pan, zoom, annotations, camera animations, post effects, optional collision/walk controls, and WebXR.

Source: https://developer.playcanvas.com/user-manual/supersplat/viewer/

Decision: start with SuperSplat Viewer integration because it gives viewer behavior quickly. Move to direct PlayCanvas Engine if we need custom NPC/game systems beyond viewer settings.

### Runtime Splat Format

PlayCanvas SOG is a compact container for 3D Gaussian Splat data. The docs describe typical SOG files as roughly 15-20x smaller than equivalent PLY. SOG can be produced with SplatTransform and previewed in the PlayCanvas Viewer.

Source: https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/sog/

Decision: web/mobile runtime uses SOG. PLY remains the editable/export interchange format.

### Collision

`playcanvas/splat-transform` can generate collision data from a Gaussian splat scene: voxel data consumed by SuperSplat Viewer and optional `.collision.glb` mesh. The guide describes a pipeline of filtering, voxelization, fill, carve, and optional collision mesh generation.

Source: https://github.com/playcanvas/splat-transform/blob/main/guides/COLLISION.md

Decision: collision generation is part of the asset pipeline. Do not depend on the splat itself for physical collision.

### Training

Nerfstudio's Splatfacto is its Gaussian Splatting implementation. Nerfstudio uses `gsplat` as the Gaussian rasterization backend, and the docs recommend initializing from COLMAP/SfM points generated via COLMAP datasets or `ns-process-data`.

Source: https://docs.nerf.studio/nerfology/methods/splat.html

Decision: use Nerfstudio + `gsplat` as the open-source training pipeline on rented NVIDIA CUDA GPU.

### Backend

Supabase gives a full Postgres database, auth, storage, realtime, and edge functions. Storage is integrated with Postgres and Row Level Security.

Source: https://supabase.com/docs/

Decision update: use Docker-first PostgreSQL/PostGIS and S3-compatible object storage as the default architecture. Supabase remains a useful managed option for Auth/Storage/Admin tooling, but it should not be the default runtime.

## OSS Projects To Track

- `playcanvas/supersplat`: editor for inspecting, editing, optimizing, and publishing 3DGS.
- `playcanvas/supersplat-viewer`: self-hostable viewer for splat scenes.
- `playcanvas/splat-transform`: CLI/library for SOG conversion and collision generation.
- `playcanvas/engine`: browser 3D engine with WebGL/WebGPU and 3DGS support.
- `nerfstudio-project/nerfstudio`: training and data processing framework.
- `nerfstudio-project/gsplat`: CUDA accelerated Gaussian splatting backend.
- `colmap/colmap`: Structure-from-Motion preprocessing.
- `maplibre/maplibre-gl-js`: interactive open-source web maps.
- `mkkellogg/GaussianSplats3D`: Three.js-based alternative viewer; useful reference, not first-choice for this app.
