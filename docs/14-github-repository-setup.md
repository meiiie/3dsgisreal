# GitHub Repository Setup

Last reviewed: 2026-06-02.

## Repository

- Owner/name: `meiiie/3dsgisreal`
- Public project name: 3DGS Real
- Product/lab codename in existing docs: Loi Vao
- Default branch: `main`

## Purpose

The GitHub repository should communicate the project clearly before the first public reader opens the app:

- map-first GIS product
- isolated real-place 3DGS scenes, not an open-world scan
- Docker-first PostGIS/MinIO backend path
- Nerfstudio/gsplat + SuperSplat + PlayCanvas runtime pipeline
- strong privacy posture for private rooms and raw captures
- clean-code and source-backed practice rules

## Added GitHub Files

- `.github/assets/github-banner.png`
- `.github/workflows/ci.yml`
- `.github/dependabot.yml`
- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `.github/ISSUE_TEMPLATE/*`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
- `LICENSE`

## Banner Rule

The repository banner was generated with the `imagegen` workflow as a complete bitmap image. Do not create a generated background and then add title text through script overlays. If the title changes, regenerate the full banner image and inspect the text before committing it.

Current banner text:

```text
3DGS Real
```

## CI Scope

Initial GitHub Actions CI verifies:

- dependency install
- assets package typecheck
- db package typecheck
- web app typecheck
- web app lint
- web app build
- Docker Compose config

Playwright smoke remains a local gate for now because it depends on a running local dev server and produces local screenshots. Add it to CI later only after the workflow can start the app, install browser dependencies, and archive artifacts reliably.

## Publishing Rule

Do not push private or heavy scene artifacts:

- raw capture videos/photos
- private room data
- Nerfstudio checkpoints/datasets
- PLY/SOG/SPZ/KSP files
- `.env` and credentials
- generated `apps/web/public/supersplat-viewer/**`

Generated GitHub imagery under `.github/assets` is allowed when intentionally created for repository presentation.
