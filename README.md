# 3DGS Real

![3DGS Real GitHub banner](.github/assets/github-banner.png)

[![CI](https://github.com/meiiie/3dsgisreal/actions/workflows/ci.yml/badge.svg)](https://github.com/meiiie/3dsgisreal/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-f4d99c.svg)](LICENSE)

Map-first GIS for real 3D Gaussian Splatting walkthroughs.

3DGS Real is the public engineering repository for the Loi Vao lab: a web app where a user browses a 2D map, chooses a real place, and enters an independent 3DGS scene such as gate -> alley -> room. The project is intentionally not an open-world city scan. Each place is captured, trained, reviewed, published, and loaded as its own scene.

## Status

This repository is in active local development.

Current shape:

- Next.js web app with public map, place detail, viewer, user, session, and admin surfaces.
- PostgreSQL + PostGIS as the spatial source of truth.
- MinIO/S3-compatible runtime asset storage.
- Scene manifest contract for SOG, settings, collision, poster, and hotspots.
- 3DGS pipeline notes for iPhone capture -> Nerfstudio/gsplat -> SuperSplat -> SOG/collision -> web viewer.
- Local smoke tests and screenshots for map, viewer, admin, and user flows.

The main missing milestone is the first real trained scene passing through the full 3DGS pipeline and loading in the viewer.

## Architecture

```text
Next.js web app
  -> MapLibre map
  -> PostGIS place and scene metadata
  -> MinIO/S3 published runtime assets
  -> SuperSplat Viewer / PlayCanvas runtime

iPhone capture
  -> NVIDIA GPU machine
  -> Nerfstudio splatfacto + gsplat
  -> PLY export
  -> SuperSplat cleanup
  -> SOG + settings + collision + poster
  -> manifest
  -> web/mobile viewer
```

Architecture target: modular monolith with clean/hexagonal boundaries and DDD-lite domain language. No microservices until the product pressure is real.

## Stack

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS.
- Map: MapLibre GL JS.
- 3D runtime: PlayCanvas ecosystem, SuperSplat Viewer first.
- Runtime splat format: SOG.
- Backend/data: PostgreSQL + PostGIS, SQL migrations, Kysely query helpers.
- Object storage: S3-compatible storage through MinIO locally.
- 3DGS baseline: Nerfstudio `splatfacto` + `gsplat`, with Postshot only as a benchmark/GUI comparison.
- Tooling: pnpm, Docker Compose, Playwright smoke scripts.

## Local Development

```bash
pnpm install
pnpm --filter @tro/web dev
```

The web app runs at [http://localhost:4317](http://localhost:4317).

Start local infrastructure:

```bash
docker compose up -d postgres minio minio-setup
pnpm db:migrate
```

Use PostGIS and MinIO in the app:

```powershell
$env:DATABASE_URL='postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao'
$env:S3_ENDPOINT='http://127.0.0.1:9000'
$env:S3_REGION='us-east-1'
$env:S3_ACCESS_KEY_ID='loi_vao'
$env:S3_SECRET_ACCESS_KEY='loi_vao_dev_password'
$env:SCENE_ASSETS_BUCKET='scene-assets'
$env:RAW_CAPTURE_BUCKET='raw-captures'
$env:SCENE_ASSETS_PUBLIC_BASE_URL='http://127.0.0.1:9000/scene-assets'
pnpm --filter @tro/web dev
```

## Useful Commands

```bash
pnpm db:migrate:status
pnpm --filter @loi-vao/assets typecheck
pnpm --filter @loi-vao/db typecheck
pnpm --filter @tro/web typecheck
pnpm --filter @tro/web lint
pnpm --filter @tro/web build
docker compose config --quiet
python tools/web-smoke.py
```

Prepare local scene runtime assets after SuperSplat/SplatTransform:

```powershell
python tools\3dgs\prepare_local_scene_assets.py `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1 `
  --dry-run
```

Upload prepared runtime assets to MinIO/S3:

```powershell
pnpm assets:upload -- `
  --input-dir E:\captures\home-test-room\published `
  --scene-id home-test-room-v1 `
  --version 1 `
  --dry-run
```

## Repository Map

```text
apps/web                 Next.js app: map, viewer, user, admin, APIs
packages/db              Kysely client, PostGIS query helpers, migrations runner
packages/assets          scene asset keys, readiness, object-storage helpers
packages/shared          future shared manifest/API contracts
db/migrations            SQL source of truth
tools/3dgs               capture/training/post-processing helpers
tools/smoke              Playwright smoke checks
docs                     architecture, research, harness, quality standards
design-lab               brand/mobile/frontend exploration
```

## Quality Bar

This project intentionally rejects quick AI-slop output:

- no 10k-line god files
- no fake ready state for missing 3D assets
- no raw scans, PLY/SOG production assets, private room photos, or credentials in git
- no UI that only looks good in a screenshot
- every significant pattern must have a source, local reason, owner boundary, and verification gate

See [AGENTS.md](AGENTS.md), [Clean Code And Architecture](docs/11-clean-code-and-architecture.md), [Quality Standards And Practice](docs/12-quality-standards-and-practice.md), and [Practice Register](docs/13-practice-register.md).

## Key Docs

- [Thread notes](docs/00-thread-notes.md)
- [Technology research](docs/01-technology-research.md)
- [Architecture](docs/02-architecture.md)
- [GPU 3DGS pipeline](docs/03-gpu-3dgs-pipeline.md)
- [Roadmap](docs/04-roadmap.md)
- [Long-term technology strategy](docs/05-long-term-technology-strategy.md)
- [Brand and design direction](docs/06-brand-and-design-direction.md)
- [Backend, SQL, and project structure](docs/07-backend-sql-and-project-structure.md)
- [Architecture decision record](docs/08-architecture-decision-record.md)
- [Open-source landscape](docs/09-open-source-landscape.md)
- [Agent harness and skills](docs/10-agent-harness-and-skills.md)
- [GitHub repository setup](docs/14-github-repository-setup.md)

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. The short version: keep changes small, verify them, protect private capture data, and document stable architecture or practice decisions.

## License

MIT. See [LICENSE](LICENSE).
