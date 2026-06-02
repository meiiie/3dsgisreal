# Contributing

Thanks for helping make 3DGS Real better.

This project is still in local-lab development. Contributions should improve the real end-to-end path: map -> place -> scene manifest -> published assets -> viewer -> user/admin workflows.

## Ground Rules

- Keep changes small and reviewable.
- Prefer existing architecture and naming over new abstractions.
- Do not commit raw captures, private room media, credentials, GPU checkpoints, large PLY/SOG files, or generated viewer bundles.
- Do not introduce god files or generic `utils` dumping grounds.
- Use source-backed best practices. If a pattern changes future work, update `docs/13-practice-register.md`.
- For UI work, verify desktop and mobile behavior. No screenshot-only polish.
- For backend/storage work, verify with PostGIS/MinIO when the behavior depends on runtime services.

## Local Setup

```bash
pnpm install
docker compose up -d postgres minio minio-setup
pnpm db:migrate
pnpm --filter @tro/web dev
```

The app runs at [http://localhost:4317](http://localhost:4317).

## Checks Before PR

Run the smallest relevant set, and explain any unchecked gate in the PR:

```bash
pnpm --filter @loi-vao/assets typecheck
pnpm --filter @loi-vao/db typecheck
pnpm --filter @tro/web typecheck
pnpm --filter @tro/web lint
pnpm --filter @tro/web build
docker compose config --quiet
```

For UI, API, viewer, or admin workflow changes, also run:

```bash
python tools/web-smoke.py
```

## Branches And Commits

- Branch names: `feature/<short-topic>`, `fix/<short-topic>`, or `docs/<short-topic>`.
- Commit messages: short imperative summary, for example `Add scene asset public base URL`.
- Pull requests should explain what changed, why, how it was verified, and what remains incomplete.

## 3DGS Asset Policy

Raw media and trained outputs are sensitive and heavy. Keep them out of git:

- videos/photos from rooms or private places
- Nerfstudio datasets and checkpoints
- `.ply`, `.sog`, `.compressed.ply`, `.spz`, `.ksplat`
- private object-storage keys or cloud credentials

Use `tools/3dgs` for staging and upload workflows. Published runtime artifacts belong in MinIO/S3 or local ignored folders during lab work.

## Design And Image Assets

Project-bound generated images must be saved into the workspace and referenced from there. Banner/logo/mockup images with text should be generated as complete images through the image-generation workflow, not made by adding script-rendered text over a generated background.
