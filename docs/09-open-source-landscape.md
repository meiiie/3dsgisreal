# Open-Source Landscape

Last reviewed: 2026-06-02.

## Purpose

This document records the open-source projects we have considered and filters which ones fit the product now.

The goal is not to collect every possible 3DGS repository. The goal is to choose a small, durable open-source stack for a serious product:

- map-first discovery of places in Vietnam
- independent 3DGS scene portals per place
- self-hosted backend/runtime
- web and mobile browser support
- long-term control over data and assets

## Short Answer

There is no mature open-source project found so far that exactly matches this product:

```text
Vietnam/Hai Phong map
  -> click place
  -> load independent 3DGS walkthrough
  -> hotspots/audio/quiz/check-in
  -> self-hosted PostGIS + S3 assets
```

But there are strong open-source building blocks. We should assemble our own product from those blocks rather than fork a whole app.

## Primary References Checked

These are the main references behind the filtering decision:

- Map/GIS: [MapLibre GL JS](https://maplibre.org/projects/gl-js/), [Geofabrik Vietnam extract](https://download.geofabrik.de/asia/vietnam.html), [PMTiles](https://github.com/protomaps/PMTiles), [Planetiler](https://github.com/onthegomap/planetiler), [Martin](https://maplibre.org/martin/), [PostGIS](https://postgis.net/).
- 3DGS training: [Nerfstudio Splatfacto](https://docs.nerf.studio/nerfology/methods/splat.html), [gsplat](https://github.com/nerfstudio-project/gsplat), [COLMAP](https://colmap.github.io/), [OpenSplat](https://github.com/pierotofy/OpenSplat), [INRIA 3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/).
- 3DGS runtime/editing: [PlayCanvas Engine](https://github.com/playcanvas/engine), [SuperSplat](https://github.com/playcanvas/supersplat), [SuperSplat Viewer](https://github.com/playcanvas/supersplat-viewer), [SplatTransform](https://developer.playcanvas.com/user-manual/splat-transform/), [SOG format](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/sog/), [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D).
- Similar/reference apps: [SPHR](https://github.com/lukehollis/sphr), [Open3DMap](https://github.com/x4dqn/Open3Dmap), [maplibre-gl-splat](https://opengeos.org/maplibre-gl-splat/), [3D-Tiles-RendererJS-3DGS-Plugin](https://github.com/WilliamLiu-1997/3D-Tiles-RendererJS-3DGS-Plugin).
- Standards/future direction: [Khronos glTF KHR_gaussian_splatting](https://www.khronos.org/news/press/gltf-gaussian-splatting-press-release?khr-2026-000=khr-2026-001), [Cesium 3D Gaussian Splats with 3D Tiles LOD](https://cesium.com/blog/2026/04/27/3d-gaussian-splats-lod/), [SPZ](https://github.com/nianticlabs/spz).

## Recommended Core Stack

Use these directly.

| Layer | Project | License | Fit | Decision |
| --- | --- | --- | --- | --- |
| Web app | Next.js | MIT | Product shell, routes, admin/API surface, Docker standalone | Use |
| UI | React | MIT | Component model for app shell | Use |
| Language | TypeScript | Apache-2.0 | Contracts for manifests/assets/API | Use |
| Styling | Tailwind CSS | MIT | Fast controlled UI styling | Use |
| Map renderer | MapLibre GL JS | BSD-3-Clause | Open web vector map renderer | Use |
| Database | PostgreSQL | PostgreSQL License | Durable relational source of truth | Use |
| GIS | PostGIS | GPL-compatible open source / PostGIS project license | Spatial types/indexes/functions | Use |
| Query layer | Kysely | MIT | Thin type-safe SQL for TypeScript | Use later |
| Container runtime | Docker Compose | Apache-2.0 | Local/runtime harness | Use |
| Object storage | MinIO | AGPLv3 | S3-compatible local asset storage | Use for development; evaluate license before embedding/distribution |
| 3D runtime | PlayCanvas Engine | MIT | WebGL/WebGPU 3D runtime with 3DGS support | Use |
| 3DGS editor | SuperSplat | MIT | Inspect/clean/optimize/publish splats | Use |
| 3DGS viewer | SuperSplat Viewer | MIT | Early scene embedding | Use as bridge |
| 3DGS conversion | SplatTransform | MIT | Convert/optimize SOG/collision pipeline | Use |
| Training | Nerfstudio | Apache-2.0 | Open research/product training framework | Use |
| Raster backend | gsplat | Apache-2.0 | CUDA accelerated Gaussian splatting backend | Use |
| SfM | COLMAP | BSD | Camera poses and sparse point cloud | Use through Nerfstudio |

## Map / GIS Projects

### MapLibre GL JS

Use directly.

Why:

- open-source TypeScript map renderer
- GPU-accelerated vector maps
- works with custom sources/layers
- strong ecosystem and not tied to a proprietary tile provider

Role:

- main web map renderer

### Geofabrik Vietnam OSM Extract

Use as data source, not code dependency.

Why:

- provides Vietnam OpenStreetMap extracts in PBF, Shapefile, and GeoPackage formats
- enough to produce a Vietnam/Hai Phong basemap

Role:

- source data for local/vector map tiles

### Planetiler

Use later for tile generation.

Why:

- builds vector tiles from OpenStreetMap/geodata
- can output MBTiles or PMTiles

Role:

- `vietnam-latest.osm.pbf` -> PMTiles/MBTiles

### PMTiles / Protomaps

Use later for static vector tile hosting.

Why:

- single-file tile archive
- works well with MapLibre
- good fit for self-hosting a regional basemap

Role:

- self-hosted Vietnam/Hai Phong basemap archive

### Martin

Use later, not now.

Why:

- serves/generates vector tiles from PostGIS, PMTiles, and MBTiles
- useful when we need dynamic tile composition

Role:

- future tile server for dynamic overlays or PostGIS-driven map layers

### OpenMapTiles

Track, not default.

Why:

- mature schema/style ecosystem
- heavier operationally than Planetiler-first path

Role:

- reference schema/style option if custom map styling gets serious

## 3DGS Training And Processing

### Nerfstudio

Use directly.

Why:

- open-source framework for neural rendering/3DGS work
- `splatfacto` is the practical baseline
- integrates with COLMAP-style preprocessing and PLY export

Role:

- primary training framework on rented NVIDIA CUDA GPU

### gsplat

Use through Nerfstudio first.

Why:

- CUDA accelerated Gaussian splatting backend
- Apache-2.0
- strong research/community backing

Role:

- training/rasterization backend

### COLMAP

Use through Nerfstudio first.

Why:

- established SfM/MVS pipeline
- useful for camera poses and sparse geometry

Role:

- preprocessing/camera reconstruction

### OpenSplat

Keep as fallback/benchmark.

Why:

- open-source C++ 3DGS implementation
- portable across Windows/macOS/Linux
- useful if we need local/Mac experiments

Decision:

- not primary because Nerfstudio + gsplat is a stronger default for CUDA cloud training

### Original INRIA Gaussian Splatting

Reference only.

Why:

- original research implementation
- historically important

Decision:

- do not build product pipeline around it directly

## 3DGS Web Runtime

### PlayCanvas Engine

Use directly long-term.

Why:

- MIT
- web-native WebGL/WebGPU engine
- active Gaussian Splatting support
- better fit for first-person movement, hotspots, audio, collision, and custom interaction than a generic viewer

Role:

- serious product runtime

### SuperSplat

Use directly.

Why:

- MIT
- browser-based 3DGS editor
- crop/delete floaters/align scene/export SOG

Role:

- manual cleanup/editing stage after training

### SuperSplat Viewer

Use now as bridge.

Why:

- MIT
- self-hostable viewer
- supports settings, annotations, camera, optional walk/collision behavior

Decision:

- use early; migrate to direct PlayCanvas Engine when interaction needs exceed viewer settings

### SplatTransform

Use directly.

Why:

- MIT
- converts and processes splats
- handles SOG/collision-related workflow

Role:

- postprocessing CLI/library

### GaussianSplats3D

Reference/fallback only.

Why:

- popular Three.js-based viewer
- useful to compare rendering behavior

Decision:

- not primary because PlayCanvas ecosystem gives better SOG/SuperSplat/editor/runtime alignment

### maplibre-gl-splat

Track and prototype later, not core now.

Why:

- MIT
- MapLibre plugin for georeferenced Gaussian Splats
- supports `.splat`, `.ply`, `.spz`, `.ksplat`, `.sog`

Decision:

- useful if we want small georeferenced splat previews directly on the map
- not the main walkthrough runtime because our scene experience should open in a dedicated viewer route

## Similar Open-Source Apps / Product References

### SPHR

Reference only.

What it is:

- MIT virtual tour/digital twin builder
- Three.js
- supports 360 images, Gaussian splats, annotations, tour JSON, first-person/orbit modes

Why it matters:

- validates that open-source virtual-tour style UX exists
- good reference for tour data structures, nodes, annotations, and transitions

Why not adopt:

- not map-first
- not PostGIS/self-host asset pipeline
- small project and not our chosen PlayCanvas/SOG stack

### Open3DMap

Reference only, not adopt.

What it is:

- GPS-anchored 3D mapping platform with crowdsourced mobile scans
- includes Android capture, web portal, cloud processing, COLMAP pipeline, WebGPU/Brush training ideas

Why it matters:

- closest conceptual reference for “open spatial scans on a map”
- useful to study GPS anchoring, scan metadata, privacy, and crowdsourcing

Why not adopt:

- license is CC BY-NC 4.0, not suitable as a product code foundation
- Android/ARCore/Firebase direction differs from our iPhone + Docker/PostGIS + PlayCanvas path
- aimed at public infrastructure/crowdsourcing, while our first product is curated independent place scenes

### 3D-Tiles-RendererJS-3DGS-Plugin

Track for future WebGIS.

What it is:

- Apache-2.0 plugin for loading Gaussian splat tile content in `3d-tiles-renderer`/Three.js
- uses glTF `KHR_gaussian_splatting` with SPZ compression

Why it matters:

- aligns with Khronos/Cesium direction for large geospatial splat datasets
- relevant if we ever stream large outdoor areas or city-scale scenes

Why not core now:

- our scenes are independent place portals, not large 3D Tiles datasets
- Three.js/Spark/3D Tiles path would split us away from PlayCanvas/SuperSplat/SOG too early

### Open3Dmap / SplatJSON Ideas

Track concepts only:

- GPS anchoring
- scan metadata
- privacy filtering
- composability metadata
- incremental scan extension

Do not adopt code as foundation.

## Future Standards / Formats To Track

### glTF `KHR_gaussian_splatting`

Track closely.

Why:

- Khronos release-candidate standard
- likely long-term interchange path

Use now?

- not as primary runtime until ecosystem stabilizes more

### SPZ

Track and test.

Why:

- open compressed Gaussian splat format from Niantic
- growing support in glTF/3D Tiles ecosystem

Use now?

- secondary test format; SOG remains current PlayCanvas web runtime

### Cesium / 3D Tiles

Track for large geospatial streaming.

Why:

- Cesium is pushing Gaussian Splats with 3D Tiles, glTF payloads, and LOD

Use now?

- no, because our current experience is place-level walkthroughs, not city-scale LOD streaming

## Filtered Decision

### Use Now

- Next.js
- React
- TypeScript
- Tailwind CSS
- MapLibre GL JS
- PostgreSQL
- PostGIS
- Docker Compose
- MinIO for local S3-compatible storage
- PlayCanvas Engine
- SuperSplat
- SuperSplat Viewer
- SplatTransform
- Nerfstudio
- gsplat
- COLMAP

### Use Later

- Kysely
- Planetiler
- PMTiles
- Martin
- OpenMapTiles
- MapLibre Native
- direct PlayCanvas Engine runtime replacing iframe viewer
- worker container for asset processing

### Track / Reference

- SPHR
- Open3DMap
- OpenSplat
- GaussianSplats3D
- maplibre-gl-splat
- 3D-Tiles-RendererJS-3DGS-Plugin
- CesiumJS / 3D Tiles
- glTF `KHR_gaussian_splatting`
- SPZ

### Avoid As Foundation

- Postshot: useful GUI benchmark but not open source and not Docker-first.
- Scaniverse app: useful capture/export app but not open-source product foundation.
- Polycam/Luma cloud-only workflows: useful comparison, but not enough long-term control.
- Open3DMap codebase: interesting but CC BY-NC and architectural mismatch.
- Whole-city 3DGS: too hard and not the product goal.

## Current Product-Specific Conclusion

Build our own product, but do not reinvent the hard engines:

- own the product UX, map model, scene manifest, database, and asset pipeline
- rely on MapLibre/PostGIS for GIS
- rely on Nerfstudio/gsplat/COLMAP for training
- rely on PlayCanvas/SuperSplat/SplatTransform for web runtime and editing
