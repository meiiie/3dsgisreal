# Clean Code And Architecture

Last reviewed: 2026-06-02.

## Short Answer

The target architecture is not full enterprise DDD.

The target is:

```text
modular monolith
  + clean/hexagonal boundaries
  + DDD-lite for core domain language
  + explicit ports/adapters for DB, storage, viewer, and GPU pipeline
```

This gives us enough structure to go long-term without creating a heavy architecture ceremony too early.

## Why Not Pure DDD Yet

Pure DDD is useful when the domain has complex business rules, multiple teams, and rich invariants. This project has important domain concepts, but the immediate risk is different:

- validating 3DGS capture/training/runtime
- keeping the map and scene manifest clean
- preserving self-hostable infrastructure
- shipping a usable web/mobile prototype

So we should use strategic DDD ideas, not all tactical DDD patterns.

Use:

- ubiquitous language
- bounded contexts
- aggregates only where invariants are real
- repositories/ports only at meaningful boundaries
- domain events later, only when workflows need them

Avoid for now:

- deep inheritance hierarchies
- abstract factories for simple CRUD
- event sourcing
- CQRS everywhere
- microservices
- anemic "manager/service" sprawl with no ownership

## Architecture Style

### Modular Monolith

One deployable app/runtime first, split internally by domain.

Why:

- faster local development
- simpler Docker/VM deployment
- easier transaction boundaries with PostGIS
- fewer distributed-system problems while the product is young
- still allows later extraction of workers/services if the boundary is real

### Clean / Hexagonal Boundaries

Core product logic should not depend directly on external tools.

Use ports/adapters at these boundaries:

- PostgreSQL/PostGIS
- S3/MinIO storage
- PlayCanvas/SuperSplat viewer assets
- GPU/Nerfstudio/Postshot/OpenSplat processing
- map tile generation/serving

Dependency direction:

```text
route/page/api
  -> feature application logic
  -> domain types/contracts
  -> ports
  -> adapters: db/storage/viewer/gpu/map
```

Rules:

- domain/shared contracts do not import Next.js, React, MapLibre, PlayCanvas, Kysely, or storage clients
- React components do not talk directly to Postgres/MinIO
- client components do not import server-only code
- database adapters can use SQL/Kysely/PostGIS directly
- viewer runtime consumes a scene manifest, not training-tool internals

### Pattern Discipline

Use design patterns only when they clarify ownership or protect an important boundary.

Allowed early patterns:

- repository/adapter for data access
- pure domain helpers for state labels, permissions, and derived values
- typed manifest contracts for viewer/runtime handoff
- small client components for imperative engines such as MapLibre and PlayCanvas
- server route handlers as thin API boundaries
- explicit status values for workflows

Use later, only when pressure is real:

- domain events for multi-step processing workflows
- background workers for GPU/import jobs
- command/query split for admin actions that become complex
- shared design-system primitives after repeated UI patterns stabilize

Avoid:

- abstract factories, base classes, or generic service layers with no concrete invariant
- CQRS everywhere
- event sourcing before audit/replay requirements exist
- microservices before deployment/team/runtime boundaries demand it
- a global `utils`, `helpers`, `lib`, or `services` folder that accepts unrelated code

Pattern acceptance test:

```text
If deleting the pattern makes the next change harder or riskier, keep it.
If deleting it makes the code easier to understand, it was probably ceremony.
```

Pattern selection ladder:

1. Use the native language/platform feature first: HTML form, semantic button/link, TypeScript type, SQL constraint, React Server Component, CSS layout primitive.
2. Use the official framework convention next: Next route handler, Server Function, React client boundary, Kysely query helper, Docker Compose service.
3. Use a small local helper only when repeated behavior appears inside one bounded context.
4. Use a shared package only when the contract crosses app/package boundaries.
5. Use a named architecture/design pattern only when it protects a real boundary or invariant.

Every step up the ladder must buy clarity, safety, or reuse. If it only buys a more impressive name, step back down.

## Initial Bounded Contexts

These are code ownership boundaries, not microservices.

| Context | Owns | Notes |
| --- | --- | --- |
| Places & Map | places, coordinates, categories, map filters, search | PostGIS-heavy, map-first domain |
| Scenes & Viewer | scenes, scene versions, manifests, hotspots, viewer config | Runtime contract for PlayCanvas/SuperSplat |
| Capture & Processing | capture sessions, GPU jobs, training outputs, job states | Bridges user capture to trained artifacts |
| Assets & Storage | asset metadata, storage keys, visibility, checksums later | S3/MinIO boundary |
| Identity & Access | profiles, project members, roles, moderation later | Keep small until auth is real |
| Learning/Interaction | quiz, audio guide, check-in, NPC later | Future context; do not build early |
| Admin/Ops | review queues, processing dashboard, data correction | Product operations, not public UX |

## Repository Shape

Keep the current monorepo shape:

```text
apps/web
  src/app/                 # Next routes only
  src/features/<context>/  # feature UI + application logic
  src/data/                # temporary seed/sample data only

packages/shared            # scene manifests, public contracts, domain literals
packages/db                # Kysely client/types/query helpers
packages/assets            # storage keys, asset metadata helpers
db/migrations              # SQL source of truth
tools                       # offline/GPU/map/asset scripts
design-lab                 # design experiments, not production code
```

As the app grows, prefer this feature shape:

```text
src/features/scenes/
  components/
  server/
  domain.ts
  schema.ts
  manifest.ts
```

Avoid:

- global `utils/` dumping ground
- huge page components
- mixing map rendering, scene business rules, and DB queries in one file
- app routes becoming the domain layer

## Clean Code Rules

### General

- Prefer small, named modules over broad generic abstractions.
- Name modules after product concepts, not implementation moods.
- Make invalid states hard to represent.
- Use explicit status values for workflows: `draft`, `processing`, `published`, `failed`, etc.
- Keep IO at the edges. Put computation/normalization in pure functions where practical.
- Do not add a new abstraction until there is a second real use case.
- Keep sample/demo data outside production components.
- Comments should explain non-obvious decisions, not restate code.
- Treat official docs and stable standards as stronger evidence than framework fashion.

### Review Habits

Before finishing a feature, check:

- Does every changed file have one primary reason to change?
- Did any page, route, component, or CSS file become a catch-all?
- Are data contracts explicit at API/viewer/storage boundaries?
- Is every external input validated or intentionally still mock-only?
- Are user-facing states represented in types instead of scattered booleans?
- Is there a direct verification command or browser path for the change?
- Would a future contributor know where to add the next related behavior?

Code review standard:

- Favor changes that improve maintainability, readability, and understandability of the system.
- Technical facts, measurements, product constraints, and official project rules overrule personal style preference.
- Do not demand fake perfection, but do not accept a change that knowingly worsens code health.
- When a practice comes from a large organization, translate it into this repo's scale before applying it.
- If the pattern needs constant explanation, rename it, shrink it, or document the local reason in an ADR/doc.

### God File Prevention

God files are an architecture smell, not a productivity shortcut.

Rules:

- No hand-written source file should grow into a 10k-line file.
- Soft target: keep most hand-written source files under 250-350 lines.
- ESLint warning threshold for TS/TSX source: 450 non-comment/non-blank lines.
- Hard review threshold: over 800 hand-written lines requires a split plan or a written rationale in the PR/task notes.
- Generated files, lockfiles, build artifacts, TypeScript build info, vendored code, and large SQL migrations are exceptions.
- CSS over 500 lines should be split into tokens/base/components/feature sections or moved closer to the feature.
- SQL migration size is acceptable when schema changes are atomic, but repeatable query logic belongs in named views/functions or application query modules.

Split when a file has more than one reason to change:

- rendering plus data fetching plus validation
- map setup plus marker business rules plus place card UI
- viewer runtime plus manifest parsing plus hotspot UI
- DB queries plus domain normalization plus route handling
- style tokens plus feature-specific layout plus animation details

Preferred split order:

1. extract pure domain/types/schema helpers
2. extract repeated UI components
3. extract IO adapters/server queries
4. extract imperative engine setup for MapLibre/PlayCanvas
5. keep the route/page as orchestration only

Do not split just to create tiny files with no ownership. A good split makes the next change easier to locate.

### TypeScript

- Use strict types as product contracts, not decoration.
- Prefer discriminated unions for stateful UI and job states.
- Avoid `any`; use `unknown` at external boundaries and validate/narrow.
- Keep shared types in `packages/shared` only when they are truly cross-package contracts.
- Avoid large barrel files that hide ownership.
- Encode domain states with names the product uses; do not let loose strings leak across route/API/viewer/storage boundaries.
- Keep parser/normalizer functions close to the boundary that receives untrusted input.
- Treat casts as code-review events. A cast should explain a limitation of a library or be replaced with validation.

### React / Next.js

- Server Components by default.
- Client Components only for interactive surfaces: MapLibre, PlayCanvas/viewer, filters, local controls.
- Keep React render pure; side effects belong in events/effects or server code.
- React owns lifecycle and UI state. MapLibre and PlayCanvas own their imperative render loops.
- Route files should orchestrate, not contain all feature logic.
- Do not put secrets, DB clients, or storage credentials in client bundles.
- If a component needs many local states/effects, first ask whether it hides a state machine, a hook, or an engine adapter.
- Keep `page.tsx` and `layout.tsx` thin. Push feature logic into `src/features/<context>/`.
- Do not start an effect-driven client component when a server-rendered form or server data fetch can solve the workflow more simply.
- When a Client Component wraps an imperative engine, isolate setup/teardown and keep business rules outside the render loop.

### Tailwind / CSS

- Use Tailwind for product surfaces, but keep a small token layer for colors/radius/shadows.
- Avoid one-off arbitrary values unless the layout truly needs them.
- Keep mobile text readable; no tiny decorative labels.
- Do not create generic card-heavy layouts for operational map/admin screens.
- Do not solve every design problem by adding another card, badge, pill, gradient, or shadow.
- If the CSS becomes hard to scan, split by purpose: tokens, base, map shell, viewer shell, reusable controls, feature-specific styles.
- Reusable UI patterns must define states before styling: default, hover, focus-visible, active, disabled, loading, success, error, and reduced-motion.
- Prefer layout primitives that prevent overlap and shifting: explicit grid tracks, min/max widths, aspect-ratio, reserved media space, and stable control dimensions.

### AI Slop Prevention

Before calling UI work done, check for these failures:

- generic landing page instead of the actual map/product experience
- giant hero copy where the user needs a tool
- fake metrics, fake charts, fake avatars, or filler dashboards
- repeated cards with shallow differences
- nested cards inside cards
- too many badges, chips, and pills
- tiny unreadable labels on mobile
- inconsistent icon sizes/strokes
- random gradients, decorative blobs, or colors unrelated to the brand
- layout that works only at one viewport size
- buttons or links with no real state or destination
- missing empty/loading/error states for data surfaces
- placeholder copy that would embarrass the product if shipped

The app should feel designed and operational, not auto-generated.

### SQL / PostgreSQL / PostGIS

- SQL migrations are the source of truth.
- Use explicit constraints and enums/checks where they protect real data.
- Use GiST indexes for geometry columns.
- Prefer spatial index-aware functions such as `ST_DWithin` for distance filters.
- Keep PostGIS SQL visible; do not hide important spatial logic behind a heavy ORM.

### Kysely

- Use Kysely as a thin type-safe SQL builder.
- Let the database schema drive generated TypeScript types later.
- Use raw SQL fragments where PostGIS expressions are clearer than forcing a query-builder shape.

### Python / GPU Scripts

- Python is for pipeline scripts, data prep, and GPU notebooks/workers.
- Prefer small CLI scripts with explicit inputs/outputs.
- Use virtual environments or container images for reproducibility.
- Use Ruff for lint/format when Python code grows.
- Use pytest for reusable pipeline helpers.
- Record exact Nerfstudio/gsplat commands in docs or scripts.

### Docker

- Docker Compose is the local/runtime harness.
- Keep dev and production-shaped concerns separable with override files later.
- Never bake secrets into images.
- Prefer reproducible commands over manual dashboard steps.
- Keep configuration in environment variables or explicit config files, not hard-coded local paths.
- A Docker change should be explainable as local reproducibility, production-shaped runtime, or an explicit deployment need.

### MapLibre / PlayCanvas

- Treat both as imperative rendering engines.
- React mounts/unmounts containers and passes stable config.
- Keep map style, layer config, scene manifest, and viewer config as data.
- Do not let viewer code depend on how the 3DGS was trained.

### Pattern Intake In Code

Before introducing a non-trivial code pattern, write down:

- Source: official doc, standard, or proven ecosystem pattern.
- Local fit: which Loi Vao problem it solves now.
- Boundary: which bounded context owns it.
- Cost: added files, indirection, runtime cost, onboarding cost.
- Verification: typecheck, lint, test, browser path, migration check, or smoke script.
- Exit point: when to split it further, replace it, or delete it.

Default decision:

- adopt official stack conventions when they fit directly
- adapt large-company practices to modular-monolith scale
- reject ceremony that only makes the repo look more "enterprise"

## Best-Practice Review Checklist

Use this when a change claims to follow a top-tier pattern or expert practice:

- Source: is it an official standard/doc or a named expert/organization reference?
- Fit: does it solve a current Loi Vao user, operator, data, runtime, or maintenance problem?
- Scale: is the implementation small enough for one repo and one team?
- Boundary: which bounded context owns it?
- State: what user-visible states or failure modes does it create?
- Security/privacy: does it move or expose private rooms, locations, assets, credentials, or admin control?
- Performance: does it affect first load, map interaction, viewer load, or mobile memory?
- Verification: what command, screenshot, smoke flow, migration, or manual check proves it?
- Exit: when should it be split, deleted, or replaced?

If a rule cannot answer these questions, keep it as research, not architecture.

## Current Reference Set

Use official/current docs first:

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [React purity rules](https://react.dev/reference/rules/components-and-hooks-must-be-pure)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Tailwind CSS docs](https://tailwindcss.com/docs/styling-with-utility-classes)
- [Node.js Learn](https://nodejs.org/learn)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
- [PostGIS spatial indexes FAQ](https://postgis.net/documentation/faq/spatial-indexes/)
- [Kysely docs](https://kysely.dev/docs/intro)
- [Docker Compose docs](https://docs.docker.com/compose)
- [MapLibre GL JS](https://maplibre.org/projects/gl-js/)
- [PlayCanvas Gaussian Splatting](https://developer.playcanvas.com/user-manual/gaussian-splatting/)
- [SplatTransform](https://developer.playcanvas.com/user-manual/splat-transform/)
- [Nerfstudio Splatfacto](https://docs.nerf.studio/nerfology/methods/splat.html)
- [Ruff formatter/linter](https://docs.astral.sh/ruff/)
- [pytest docs](https://docs.pytest.org/en/stable/)
- [Alistair Cockburn: Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture)
- [Martin Fowler: Bounded Context](https://martinfowler.com/bliki/BoundedContext.html)

## Rule Of Thumb

If a pattern makes a real boundary clearer, use it.

If a pattern only makes the code look "architected", skip it.
