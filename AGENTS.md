# Agent Harness

This file is the root context for AI-assisted development in this repository. Keep it short and update it when decisions become stable.

## Product

Build a map-first tourism/rental web app where users browse a 2D map, click a place, and enter an independent 3D Gaussian Splat scene with first-person/walk controls, hotspots, audio, quiz/check-in, and a return-to-map flow.

The app is not an open-world city scan. Each place is an isolated scene: for example gate -> alley -> room.

## Current Decisions

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS.
- Map: MapLibre GL JS for open-source, web-native map rendering.
- 3D runtime: PlayCanvas ecosystem first, starting with SuperSplat Viewer for quick embedding and PlayCanvas Engine for deeper custom interactivity later.
- Runtime splat format: SOG for web/mobile delivery; keep PLY as source/editing artifact.
- Collision: generate voxel/collision data from `@playcanvas/splat-transform` where possible; use manual proxy geometry when needed.
- 3DGS training: Nerfstudio `splatfacto` + `gsplat` on NVIDIA CUDA GPU, with Postshot only as a benchmark/paid GUI option.
- Data/backend: PostgreSQL + PostGIS as source of truth, Docker Compose as the first runtime harness, SQL migrations in `db/migrations`, Kysely as the TypeScript query layer once DB access is added.
- Package manager: pnpm.

## Repository Map

- `apps/web`: user-facing web app.
- `packages/db`: Kysely client, generated DB types, and shared query helpers.
- `packages/shared`: scene manifest and public API contracts.
- `packages/assets`: storage key, manifest, and asset metadata helpers.
- `db/migrations`: SQL schema source of truth, used by local Docker PostGIS and compatible with managed Postgres if needed.
- `compose.yaml`: self-hostable app, PostGIS, and object-storage stack.
- `tools/*`: offline pipeline helpers such as splat conversion, manifest generation, and RunPod scripts.
- `docs/*`: decisions, architecture, pipeline notes, and task plans.
- `docs/13-practice-register.md`: accepted/adapted/rejected external practices and local verification gates.
- `public/sample-data`: temporary seed data and placeholders.

## Working Rules

- Prefer small, verifiable changes.
- Do not add abstractions until a second real use case appears.
- Keep 3DGS capture/training artifacts out of git unless they are tiny fixtures.
- Do not commit raw scans, PLY/SOG production assets, private room images, or credentials.
- Use `rg` for code search.
- GitHub repo identity: public repository `meiiie/3dsgisreal`, project name `3DGS Real`, with `Loi Vao` kept as the product/lab codename in existing docs.
- Repository presentation assets live under `.github/assets`; generated banner/logo images with text must be generated as complete bitmap images through the image-generation workflow, not assembled by scripting text over a background.
- Before changing architecture, update `docs/02-architecture.md` or add a short ADR.
- For frontend changes, verify with a local browser test/screenshot before calling the work done.
- For PostGIS/backend behavior, do not trust the sample fallback. Verify with `DATABASE_URL`, repo migrations, and `/api/admin/system` or a focused API smoke.
- For S3/MinIO behavior, do not trust bucket names in env alone. Run `minio-setup` and verify `/api/admin/system` reports `storageReady`.
- For substantial goal-based work, read `docs/10-agent-harness-and-skills.md` before implementation.
- Architecture target: modular monolith with clean/hexagonal boundaries and DDD-lite domain language. See `docs/11-clean-code-and-architecture.md`.
- No god files: split source files before they become broad catch-alls. TS/TSX files over 450 non-comment lines warn in ESLint; over 800 lines need a split plan or explicit rationale.
- No AI slop UI: avoid generic hero pages, fake dashboard clutter, card piles, tiny text, random gradients, and decorative features that do not serve the product flow.
- Follow quality standards from `docs/12-quality-standards-and-practice.md`: WCAG-style accessibility, Nielsen-style usability, platform conventions, restrained microinteractions, OWASP-aware security, and Core Web Vitals-aware performance.
- Apply pattern governance before adding architecture or UI systems: use proven official/platform patterns only when they solve a real product or maintenance problem, and verify them through the quality gates in `docs/12-quality-standards-and-practice.md`.
- Do not cargo-cult best practices from large organizations. Record the local product reason, boundary, source, and verification path before adopting a significant code, architecture, UI, motion, security, or data pattern.
- Best-practice intake rule: every significant pattern must be accepted, adapted, or rejected explicitly. Record the source, local fit, tradeoff, owner boundary, rollback/split point, and verification gate before it becomes project convention.
- Evidence refresh rule: re-check current primary docs before locking time-sensitive framework, deployment, security, accessibility, performance, cloud/GPU, or 3DGS toolchain decisions into code.
- Build hygiene rule: production route modules must not import dev/local filesystem probes directly. Put local `fs/path` checks behind dev-only adapters so Next/Turbopack standalone tracing stays scoped and warning-free.
- Micro-UX matters: disabled actions must not accidentally execute, loading/error/empty states must be visible, touch/keyboard/focus behavior must be considered, and public copy should use user language rather than implementation jargon.
- Interaction quality rule: every reusable control or critical workflow must define trigger, feedback, state, recovery, accessibility, and mobile behavior before it is considered polished.
- Practice register rule: before adopting a significant architecture, UI, UX, motion, security, data, runtime, or review pattern, check `docs/13-practice-register.md`; update it when the practice changes project behavior.
- Source-backed practice rule: "best practice" is not a valid reason by itself. Tie it to a primary source, a Loi Vao user/operator problem, an owning boundary, a verification gate, and an exit condition.
- Code-pattern rule: prefer official stack conventions, plain language names, explicit types, thin routes/pages, and boring data flow before adding a named pattern. If a pattern cannot be tested or explained in one paragraph, shrink it.
- UI-pattern rule: every reused UI pattern needs a state matrix: default, hover, focus-visible, pressed, disabled, loading, empty, success, error, reduced-motion, keyboard, and touch/mobile behavior.
- Large-organization rule: use Google/GOV.UK/W3C/OWASP/Apple/Material/Fluent/Carbon/Thoughtworks as evidence sources, not visual or process templates. Adapt to the modular-monolith prototype scale.
- Craft review rule: before calling a UI/API/workflow slice done, review code health, accessibility, mobile ergonomics, microcopy, interaction feedback, privacy/security boundary, and the relevant screenshot or smoke path.
- Feature-done protocol: a non-trivial feature is not done until its user/operator task, owning bounded context, state model, server/input boundary, mobile/accessibility behavior, and verification evidence are all clear. If any gate cannot be checked yet, record the gap instead of presenting the slice as finished.

## Goal Workflow

Before starting a large goal:

- read this file, `docs/00-thread-notes.md`, and `docs/08-architecture-decision-record.md`
- scan `docs/13-practice-register.md` when the goal may introduce a new pattern or reusable convention
- read the relevant domain doc under `docs/`
- state assumptions and success criteria when ambiguity matters
- update the plan as work progresses
- update docs when a stable decision is made
- run the relevant quality gate from `docs/12-quality-standards-and-practice.md` before calling substantial UI or architecture work done

## Skills And Design Lab

- Engineering/default behavior: use `karpathy-guidelines` principles.
- Existing UI redesign: use `redesign-existing-projects`.
- Brand/logo boards: use `brandkit`.
- Raster assets and visual concepts: use `imagegen`.
- Mobile screen-flow concepts: use `imagegen-frontend-mobile`.
- Browser verification: use `webapp-testing` and the in-app browser for localhost.
- Design experiments live in `design-lab/`; production assets are promoted deliberately into the app.
- GitHub-specific project hygiene is recorded in `docs/14-github-repository-setup.md`.
- Local browser smoke uses `http://127.0.0.1:4317`; keep Next `allowedDevOrigins` aligned so client hydration and HMR work in the harness.

## Commands

These are expected after dependencies are installed:

```bash
pnpm install
pnpm dev   # web app runs on http://localhost:4317
pnpm build
pnpm lint
pnpm typecheck
```

## Verification Targets

- Map loads on desktop and mobile viewport.
- Place cards and map markers stay in sync.
- Scene route handles missing 3D assets gracefully.
- Viewer route can load a SOG URL once the first trained scene exists.
- No page requires GPU-heavy assets to render the basic UI.
