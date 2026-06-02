# Architecture Decision Record

Last reviewed: 2026-06-02.

## Decision

Use a Docker-first, self-host-first architecture while the product is still in development.

Do not deploy yet. The current goal is to develop and validate:

1. map/product UX
2. PostGIS data model
3. 3DGS capture and training pipeline
4. scene manifest contract
5. first real SOG/collision asset in the viewer

Deployment work starts only after the first real scene can move through the pipeline and load from the app.

## Current Architecture

```text
Next.js web app
  -> MapLibre map
  -> PostGIS place/scene metadata
  -> S3-compatible asset storage
  -> PlayCanvas/SuperSplat scene runtime

iPhone capture
  -> rented NVIDIA GPU
  -> Nerfstudio splatfacto + gsplat
  -> PLY export
  -> SuperSplat cleanup
  -> SOG + collision assets
  -> scene manifest
```

Local/prototype runtime:

```text
docker compose
  |-- web: Next.js standalone container
  |-- postgres: postgis/postgis
  `-- minio: S3-compatible object storage
```

The app can still be run with `pnpm --filter @tro/web dev` during normal UI development. Docker is the target runtime shape, not a requirement for every frontend edit.

## Decisions By Layer

### Architecture Style

Use a modular monolith with clean/hexagonal boundaries and DDD-lite domain language.

Reason:

- the product needs strong domain boundaries around places, scenes, assets, capture/processing, and admin
- one deployable runtime is simpler while the product is still validating map UX and 3DGS capture/runtime
- ports/adapters keep PostGIS, MinIO/S3, PlayCanvas/SuperSplat, and GPU training details from leaking through the app
- full tactical DDD would be too heavy before the domain rules are proven

See `docs/11-clean-code-and-architecture.md`.

### Frontend

Use Next.js, React, TypeScript, Tailwind CSS, MapLibre GL JS, and PlayCanvas.

Reason:

- Next.js supports self-hosting and Docker standalone output.
- React is only the UI shell; MapLibre and PlayCanvas own their imperative rendering loops.
- TypeScript is important because scene manifests, storage keys, and asset states need strict contracts.
- Tailwind is fine for product/admin UI if design tokens stay controlled.
- MapLibre is the map engine, not a temporary demo choice.
- PlayCanvas is the long-term scene runtime; SuperSplat Viewer is an early bridge.

Rejected for now:

- Vite-only SPA: simpler, but weaker for admin/API/metadata/SEO and server-side product surfaces.
- Native mobile first: premature until web/mobile browser performance is measured.
- Unity/Unreal first: too heavy for web-first student/location browsing.

### Backend

Use PostgreSQL + PostGIS as the system of record.

Reason:

- Places, map bounds, distance search, districts, and future spatial filtering are core product features.
- PostGIS gives spatial types, GiST indexes, and spatial query functions.
- Keeping SQL migrations in `db/migrations` avoids dashboard drift.

Use Kysely later for TypeScript query code. Do not introduce a heavy ORM as the primary data layer because PostGIS SQL must stay easy to express.

### Identity And Access

Use a local signed session boundary for the lab prototype.

Reason:

- user and admin flows need different server-visible profiles before production auth is chosen
- admin pages and admin APIs should no longer be public local lab surfaces
- Next.js 16 uses the `proxy.ts` convention for request-time auth-style gates, replacing deprecated `middleware.ts`
- an HTTP-only HMAC-signed cookie gives enough local integrity for smoke tests without locking the product into an auth provider yet

Current scope:

- `/session` switches between student and admin local profiles
- `/api/session` exposes GET/POST/DELETE for local tools and smoke tests
- `/admin/*` and `/api/admin/*` require an admin-capable local session through `src/proxy.ts`
- user dashboard, save/visited, check-in, and quiz attempts use the current local session profile

Rejected for now:

- production username/password implementation
- OAuth/social login
- full RBAC policy engine

Revisit when real user accounts, public deployment, private room access, or external contributors/operators appear.

### Runtime / Infrastructure

Use Docker Compose as the first runtime harness.

Reason:

- Local and VM deployment have the same shape.
- PostGIS and MinIO can be developed without managed-service lock-in.
- A future worker/GPU orchestration service can be added as another container.
- GCP/VM deployment later can start with the same compose model plus a reverse proxy and backups.

No deployment now. The compose files are preparation, not a signal to spend time on production operations yet.

### Map Data

Use OpenStreetMap-derived data for Vietnam/Hai Phong.

Path:

```text
Geofabrik Vietnam OSM PBF
  -> optional Hai Phong extract
  -> Planetiler
  -> PMTiles
  -> MapLibre
```

Use Martin later only when we need dynamic composition from PostGIS, PMTiles, or MBTiles.

### 3DGS Pipeline

Use Nerfstudio `splatfacto` + `gsplat` on NVIDIA CUDA as the open-source baseline.

Use Postshot only as a benchmark/GUI comparison, not as the architectural foundation.

Use SuperSplat for cleanup and publishing. Use SOG for current web/mobile runtime. Track glTF Gaussian Splatting, SPZ, and 3D Tiles as the interoperability/geospatial future.

## Expert / Organization References Reviewed

### Web And Self-Hosting

- Next.js official self-hosting and deployment docs: self-hosting with Node/Docker is supported, and standalone output is the Docker-friendly production shape.
- Docker official Compose docs: Compose models services, networks, volumes, and can be adapted for production with production-specific compose files.

### Spatial Database

- PostGIS official docs: spatial indexes should use `USING GIST`; PostGIS uses spatial index-aware functions such as `ST_DWithin`, `ST_Intersects`, and related predicates.
- `postgis/postgis` Docker image: official PostGIS Docker image based on the official Postgres image, with Postgres/PostGIS version tags.

### Map Stack

- MapLibre GL JS: open-source TypeScript library for GPU-accelerated web maps from vector tiles.
- Geofabrik: official Vietnam OSM extract is available as PBF, Shapefile, and GeoPackage; this gives us a real Vietnam/Hai Phong map data path.
- Planetiler: builds OpenStreetMap/vector data into MBTiles/PMTiles for MapLibre-compatible clients.
- Martin: tile server that serves/generates vector tiles from PostGIS, PMTiles, and MBTiles.

### 3DGS And Runtime Standards

- Nerfstudio Splatfacto docs: Nerfstudio uses `gsplat` as its Gaussian rasterization backend and exports PLY for viewers such as SuperSplat.
- PlayCanvas/SuperSplat/SOG docs: SuperSplat is the editing/publishing layer, SOG is a compact runtime container, and PlayCanvas is the web engine path.
- Khronos glTF `KHR_gaussian_splatting`: release-candidate standard for storing Gaussian splats in glTF.
- Cesium 3D Tiles + Gaussian Splats: large geospatial splat datasets are moving toward 3D Tiles, glTF payloads, and LOD.

### Open-Source Product Fit

- See `docs/09-open-source-landscape.md` for the filtered source landscape.
- Current decision: do not adopt a whole open-source app as the foundation. Build our own product around durable open-source components.
- Use SPHR/Open3DMap/maplibre-gl-splat/3D Tiles 3DGS work as references and future tracks, not as the initial architecture.

## Current Rule

Develop first, deploy later.

The next high-value milestone is not a server deployment. It is:

1. capture one small scene
2. train/export it
3. clean it in SuperSplat
4. convert to SOG/collision
5. store/load it through the app manifest contract
6. measure desktop/mobile load and FPS
