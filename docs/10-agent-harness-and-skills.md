# Agent Harness And Skills

Last reviewed: 2026-06-02.

## Purpose

This document is the operating harness for long-running goal-based development.

It answers:

- what Codex should read before a goal
- which skills should be used for engineering and design
- where frontend design experiments should live
- how decisions should be recorded
- how work should be verified before it is called done

The root quick-start harness remains `AGENTS.md`. This file is the deeper playbook.

## Start-Of-Goal Checklist

At the beginning of a substantial goal, read or re-scan:

1. `AGENTS.md`
2. `docs/00-thread-notes.md`
3. `docs/08-architecture-decision-record.md`
4. the relevant domain doc:
   - `docs/05-long-term-technology-strategy.md` for stack/runtime decisions
   - `docs/06-brand-and-design-direction.md` for brand/UI direction
   - `docs/07-backend-sql-and-project-structure.md` for backend/DB work
   - `docs/09-open-source-landscape.md` for open-source comparisons
   - `docs/03-gpu-3dgs-pipeline.md` for capture/training/asset work
   - `docs/11-clean-code-and-architecture.md` for code structure, DDD-lite, and clean architecture rules
   - `docs/12-quality-standards-and-practice.md` for UX/UI, accessibility, microinteraction, security, and performance standards
   - `docs/13-practice-register.md` for accepted/adapted/rejected external practices and verification gates

Then:

- use `rg` to find the current implementation
- state assumptions when the task is ambiguous
- define success criteria before implementation
- keep changes focused and verifiable
- update the relevant doc when a decision becomes stable
- check for god-file drift and AI-slop UI before calling a goal complete
- check the quality standards checklist before calling a serious UX/UI or feature goal complete
- apply the quality gate from `docs/12-quality-standards-and-practice.md` for code, architecture, UX, accessibility, mobile, performance, security/privacy, and documentation
- when a best-practice pattern is proposed, accept it only if it solves a real product or maintenance problem and has a verification path
- for a significant new pattern, library, interaction model, or architecture boundary, record four things before implementing: source/reference, local product reason, owning boundary, and verification gate
- classify each substantial external practice as `adopt`, `adapt`, or `reject`; do not leave it as a vague inspiration
- for UX/UI work, define the intended microinteraction contract before implementation: trigger, immediate feedback, state model, recovery/escape, keyboard/touch behavior, reduced-motion behavior, and mobile viewport expectation
- do not cite "experts", "large companies", or "industry best practice" as authority unless the concrete source is named and the local fit is documented
- for time-sensitive framework, security, accessibility, or deployment decisions, re-check primary docs before locking the decision into code
- keep production build traces clean: dev/local filesystem probes belong in narrow adapters and must not make route modules trace the whole workspace
- before adding a reusable component, helper, service, package, or architecture layer, confirm it has an owner boundary and at least one near-term second use case
- when a pattern changes how future work should be built, update `docs/13-practice-register.md` instead of leaving the decision only in chat
- apply the feature-done protocol from `docs/12-quality-standards-and-practice.md`: task, boundary, states, server/input boundary, mobile/accessibility, security/privacy/performance, and verification evidence

Do not start by rewriting architecture unless the goal explicitly asks for architecture.

## Goal Readiness Gate

Before a long-running implementation goal starts, the harness is considered ready only when these are true:

- `AGENTS.md` gives the quick operating rules.
- `docs/10-agent-harness-and-skills.md` gives the deeper goal workflow.
- `docs/11-clean-code-and-architecture.md` names the architecture style, boundaries, file-size discipline, and language/framework rules.
- `docs/12-quality-standards-and-practice.md` names the UX/UI, microinteraction, accessibility, security/privacy, performance, and documentation gates.
- `docs/13-practice-register.md` records accepted/adapted/rejected external practices that change how future work is built.
- The current goal has a concrete definition of done, not only an emotional "finish everything" phrase.
- Known flexible areas are named instead of treated as blockers.
- Known hard technical unknowns are named, especially the real 3DGS capture/training/viewer path.

If one of these is missing, update the harness before implementing broadly.

For the current repo state on 2026-06-02, this gate is satisfied for serious local development. It is not a production-readiness claim.

The Docker/PostGIS/MinIO runtime gate has also been proven locally: Docker Desktop can start the Compose PostGIS/MinIO services, all repo migrations apply, required MinIO buckets can be created through `minio-setup`, and the standalone Next server can read PostGIS plus verify S3 buckets through environment config. This is a development-readiness claim, not a deployment/security claim.

## Source-Backed Practice Gate

When a rule claims to follow experts, large organizations, or top-tier standards, make it concrete:

- name the source, preferably a primary source or official documentation
- classify the rule as `adopt`, `adapt`, or `reject`
- map it to a Loi Vao user/operator problem
- name the bounded context or UI surface that owns it
- record the cost and tradeoff
- define how it will be verified
- define when it should be split, replaced, or deleted

Do not copy the ceremony, visual style, or org structure of a large organization unless the local product pressure exists.

## Implementation Craft Gate

For each non-trivial feature slice, check this before finalizing:

- Code health: small files, clear names, explicit types, no broad `utils` or `manager` dumping ground.
- Architecture: route/page/API files orchestrate; domain, server, DB, storage, viewer, and GPU boundaries stay separated.
- UX: the main task is obvious; copy uses user/operator language; loading, empty, error, disabled, success, and destructive states are visible.
- Microinteraction: trigger, immediate feedback, recovery, no double-submit, keyboard path, touch path, reduced motion, and no layout jump are considered.
- Accessibility: semantic controls, names, focus, contrast, status messages, and no keyboard trap where practical.
- Mobile: controls fit, text is readable, hover-only behavior is not required, map/viewer paths remain usable.
- Security/privacy: server validation and access-control assumptions are explicit for user/admin/private-location data.
- Performance: heavy map/viewer/3D assets are lazy or isolated from the first product surface.
- Evidence: run the smallest meaningful gate: typecheck/lint/build/smoke/screenshot/doc verification depending on the slice.

## Feature-Done Protocol

Use this before the final response for any non-trivial UI, API, data, admin, viewer, or pipeline slice.

1. Name the concrete task: what the public user, student, operator, or admin can now do.
2. Name the owning boundary: Places & Map, Scenes & Viewer, Capture & Processing, Assets & Storage, User, Admin/Ops, or another documented context.
3. Check code health: route/page/API stays thin, domain/server/DB/storage code stays in its boundary, no god-file drift, no broad `utils` dumping ground.
4. Check state quality: default, loading, empty, success, error, disabled, unsupported, and recovery states are represented where relevant.
5. Check interaction quality: trigger, feedback, keyboard path, touch/mobile path, focus, double-submit prevention, and reduced-motion impact are acceptable.
6. Check trust boundaries: external input is validated server-side, private/draft asset/location assumptions are explicit, and credentials/raw captures are not exposed.
7. Check performance: heavy map/viewer/3D work is lazy or isolated, layout dimensions are stable, and mobile memory/load risk is named.
8. Record evidence: typecheck, lint, build, Docker/migration check, API smoke, browser smoke, screenshot, or the reason a gate could not be run.

If the slice cannot pass one of these checks, keep the scope honest and document the gap. Do not call it complete just because the happy path renders once.

## Engineering Skill Rules

### `karpathy-guidelines`

Use for coding, review, refactor, and goal planning.

Rules to carry forward:

- think before coding
- surface assumptions and tradeoffs
- prefer the minimum change that solves the real problem
- touch only what is necessary
- do not add speculative abstractions
- define verification criteria
- loop until checks pass or the blocker is explicit
- do not create god files or broad catch-all modules
- remove AI-generated filler instead of polishing it

This is the default engineering behavior for this repo.

### `webapp-testing`

Use when frontend behavior or layout changes need browser verification.

Expected checks:

- local page opens
- desktop and mobile viewport screenshots are non-broken
- map and route interactions still work
- console errors are reviewed when relevant
- if smoke uses `127.0.0.1`, keep Next `allowedDevOrigins` configured for `127.0.0.1`; otherwise client hydration/HMR can be blocked even when server-rendered HTML looks correct

### Browser / In-App Browser

Use the in-app browser for local targets such as `http://localhost:4317`.

Do not rely only on build success for UI work. Visual state matters.

## Design Skill Rules

There is no installed skill named `taste`. For taste/design work, use the combination below.

### `redesign-existing-projects`

Use when improving the existing web app UI.

Apply it as an audit/fix loop:

- scan the current implementation
- diagnose typography, color, layout, interaction states, content, icons, accessibility, and code quality
- make targeted upgrades without changing frameworks
- verify with browser screenshots

This skill is for code-backed UI improvement.

### `brandkit`

Use when exploring brand identity, logo systems, visual worlds, or launch boards.

Good uses for this product:

- `Loi Vao` logo explorations
- map pin + doorway + path mark studies
- color/material system boards
- app icon and favicon direction
- brand applications on map markers, viewer HUD, posters, and admin UI

This skill generates brand-kit images. It does not replace implementation work.

If the user delegates taste decisions, Codex may choose the strongest name/logo/visual direction and keep moving, then record the rationale in `docs/06-brand-and-design-direction.md`.

### `imagegen`

Use for raster images, concept art, product mockups, scene posters, hero imagery, or generated visual assets.

Rules:

- use the built-in image generation tool by default
- if a generated asset is meant for the project, copy/move the final selected file into the workspace
- do not leave project-referenced assets only in the default Codex generated-images folder
- save prompts and usage notes in `design-lab/prompts/`
- save selected design outputs under `design-lab/` first, then promote app assets into `apps/web/public/` only when used by the app
- for logos, wordmarks, posters, mobile mockups, brand boards, or complex visuals that include text, generate the complete image including the text
- do not generate a plain background and add important text later with a script/overlay for brand or concept images

### `imagegen-frontend-mobile`

Use for mobile app screen concept images and mobile flow exploration.

Important constraints:

- this skill generates images only; it does not write code
- choose a platform mode first: iOS, Android, or cross-platform premium neutral
- generate enough screens for the flow
- keep text readable at normal viewing size
- maintain one consistent design bible across the screen set
- avoid generic AI mobile patterns, tiny text, and phone-shaped websites

Use it in the lab before implementing mobile-heavy UI changes.

## Goal Objective Guidance

Avoid goals that are emotionally clear but operationally vague, such as:

```text
Lam den khi nao hoan thien hoan chinh toan bo.
```

That intent is good, but it needs a definition of done so Codex can keep working without constantly guessing.

Recommended long-running goal:

```text
Phat trien Loi Vao den ban local end-to-end hoan chinh cho giai doan prototype nghiem tuc: web map responsive, backend PostGIS/MinIO Docker runtime, place/scene data model, design system/logo/assets, viewer route san sang load SOG/collision, admin/capture/processing scaffolding, GPU 3DGS runbook, docs cap nhat, va cac check typecheck/lint/build/browser smoke deu pass. Chua deploy production.
```

If real scan data and rented GPU are available, upgrade the goal to:

```text
Hoan thien ban lab end-to-end voi it nhat 1 dia diem that: capture -> train Nerfstudio/gsplat -> export PLY -> clean SuperSplat -> SOG/collision -> asset storage -> manifest -> web/mobile viewer -> performance notes.
```

## Design Lab

`design-lab/` is the workspace for frontend and brand exploration.

Folder roles:

- `design-lab/prompts/`: prompt specs, design bibles, critique notes, regeneration instructions
- `design-lab/brand/`: logo, brand-kit, color, icon, and identity explorations
- `design-lab/mobile/`: mobile screen concepts and app-flow images
- `design-lab/web-ui/`: desktop/web UI audits, screenshots, redesign notes
- `design-lab/assets/`: selected raster assets before promotion into the app

Every serious design experiment should record:

- date
- skill/tool used
- goal
- prompt or design brief
- selected output paths
- what changed in the design direction
- whether it should influence production UI

Generated design assets are not automatically production assets. Promote them deliberately.

## Product Design Guardrails

The product design direction is "modern Vietnamese cartographic utility".

Keep:

- map-first discovery
- dense but readable operational UI
- restrained panels
- real place photos/scans as emotional material
- full-bleed immersive viewer scenes
- clear Vietnamese user-facing copy
- mobile browser usability

Avoid:

- generic AI gradients
- decorative blobs/orbs
- metaverse/crypto styling
- landing-page hero behavior as the main app
- cards inside cards
- tiny unreadable mobile text
- whole-city 3D fantasy before place-level scenes work

## Decision Notes

When a decision becomes stable:

- architecture: update `docs/08-architecture-decision-record.md`
- broad stack strategy: update `docs/05-long-term-technology-strategy.md`
- brand/UI direction: update `docs/06-brand-and-design-direction.md`
- backend/project structure: update `docs/07-backend-sql-and-project-structure.md`
- 3DGS pipeline: update `docs/03-gpu-3dgs-pipeline.md`
- open-source research: update `docs/09-open-source-landscape.md`
- accepted/adapted/rejected external practices: update `docs/13-practice-register.md`
- thread memory/state: update `docs/00-thread-notes.md`

Do not hide important decisions only in chat.

## Verification Matrix

For docs-only changes:

- run `rg` to confirm links/headings are discoverable
- confirm the updated rule is referenced from the start-of-goal flow or root harness when it affects future agent behavior
- confirm new best-practice rules are actionable: they must name a decision record, a boundary, and a verification path
- confirm significant adopted/adapted/rejected practices are captured in `docs/13-practice-register.md`

For frontend code changes:

- `pnpm --filter @tro/web typecheck`
- `pnpm --filter @tro/web lint`
- `pnpm --filter @tro/web build`
- browser/screenshot check on desktop and mobile
- inspect whether files/components are growing into god files
- inspect whether the UI contains generic AI-slop patterns
- keep Playwright smoke flows modular under `tools/smoke/`; `tools/web-smoke.py` stays a thin entrypoint

For Docker/runtime changes:

- `docker compose config --quiet`
- run the affected service locally when practical
- when PostGIS behavior matters, verify the standalone Next server with `DATABASE_URL` and assert `GET /api/places` reports `postgis` plus `GET /api/admin/system` reports `ready`
- when object-storage behavior matters, run `docker compose up -d minio minio-setup`, configure S3 env vars, and assert `/api/admin/system` reports `storageReady = true` for both required buckets

For database changes:

- validate migration syntax against local PostGIS before relying on it
- keep PostGIS-specific SQL explicit and readable

For 3DGS pipeline changes:

- record the exact capture/training/export command path
- keep raw/private scan assets out of git
- verify the final published asset through the app manifest/viewer route
