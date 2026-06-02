# Practice Register

Last reviewed: 2026-06-02.

## Purpose

This register turns external "best practice" advice into project decisions.

It is deliberately practical:

- use strong sources as evidence
- translate large-organization practice to Loi Vao's scale
- record whether a practice is adopted, adapted, or rejected
- tie each practice to an owning boundary and verification gate

Do not treat this as a trophy list of famous sources. A practice belongs here only when it changes how we build the product.

## How To Use

Before adding a significant new architecture pattern, UI system, component behavior, security practice, data model pattern, or runtime convention:

1. Check whether it already appears in this register.
2. If it does, follow the local rule and verification gate.
3. If it does not, classify it as `adopt`, `adapt`, or `reject`.
4. Record source, local fit, owner boundary, cost/tradeoff, verification, and exit condition.

Trivial local code does not need a new row. Reusable patterns, critical workflows, and cross-boundary conventions do.

## Current Adopted Or Adapted Practices

| Practice | Source | Decision | Local fit | Owning boundary | Verification |
| --- | --- | --- | --- | --- | --- |
| Server Components by default, Client Components only for browser/interactivity | [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [React rules](https://react.dev/reference/rules) | Adopt | Keeps map/detail/admin pages light while MapLibre/PlayCanvas remain explicit client boundaries | `apps/web` route/page layer and feature UI | typecheck, build, browser smoke, client bundle review when needed |
| TypeScript types as boundary contracts | [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | Adopt | Scene manifests, asset readiness, admin input, quiz/check-in state, and spatial IDs need static contracts before runtime work | `apps/web`, `packages/shared`, `packages/db`, `packages/assets` | typecheck, boundary parser review, no loose strings crossing API/viewer/storage boundaries |
| React pure render and side-effect discipline | [React purity rules](https://react.dev/reference/rules/components-and-hooks-must-be-pure) | Adopt | Prevents map/viewer/admin UI bugs caused by hidden render side effects, especially around imperative engines | React components and hooks in `apps/web` | lint, browser smoke, client component review for setup/teardown and effects |
| Route files orchestrate; feature/domain/server modules own logic | [Next.js App Router project structure](https://nextjs.org/docs/app/getting-started/project-structure) | Adapt | Prevents god `page.tsx` files while staying close to App Router conventions | `apps/web/src/app` and `apps/web/src/features/*` | line audit, lint, smoke route coverage |
| Modular monolith with clean/hexagonal boundaries and DDD-lite language | [Alistair Cockburn hexagonal architecture](https://alistair.cockburn.us/hexagonal-architecture), [Martin Fowler bounded context](https://martinfowler.com/bliki/BoundedContext.html) | Adapt | Gives clear ownership for places, scenes, assets, capture, processing, and user interactions without premature microservices | whole repo architecture | dependency direction review, docs/ADR update, typecheck/build |
| PostGIS as spatial source of truth with GiST/index-aware queries | [PostGIS spatial indexes FAQ](https://postgis.net/documentation/faq/spatial-indexes/) | Adopt | Places, map bounds, distance search, and future Vietnam/Hai Phong filtering are core product data | `packages/db`, `db/migrations` | migration run, query review, smoke/API checks |
| WCAG 2.2 AA-oriented accessibility baseline | [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Adopt | Map, admin, detail, and viewer flows must remain reachable beyond pointer-only desktop use | all public/admin UI | semantic controls, focus review, mobile/browser checks |
| ARIA APG only when native HTML is not enough | [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) | Adopt | Avoids custom widgets that look good but mislead assistive tech | reusable controls and viewer/admin widgets | keyboard path review, role/name/state review |
| Nielsen-style usability heuristics for product review | [NN/g 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Adapt | Forces status, user language, escape paths, consistency, error prevention, and minimalism into map/viewer/admin workflows | UX review across product surfaces | browser smoke, screenshots, task checklist |
| GOV.UK service thinking | [GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard/) | Adapt | Keeps screens focused on concrete user/operator tasks instead of decorative product pages | public map/detail/user/admin flows | task-based review, docs update for stable workflows |
| Design-system rigor without copying visual branding | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines), [Material Design 3](https://m3.material.io/), [Fluent 2](https://fluent2.microsoft.design/), [Carbon](https://carbondesignsystem.com/) | Adapt | Use complete states, readable hierarchy, focus/disabled/loading/error behavior, and restrained motion; do not clone their look | design lab, app UI, reusable controls | desktop/mobile screenshots, interaction state checklist |
| Interaction state matrix for reusable controls | [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/), platform design systems | Adopt | Avoids one-screenshot UI by requiring default, hover, focus, active, disabled, loading, empty, success, error, reduced-motion, keyboard, and touch behavior | reusable controls, viewer HUD, map filters, admin forms | browser screenshot, keyboard/focus review, mobile smoke, reduced-motion review when motion is added |
| Core Web Vitals as performance reference | [web.dev Web Vitals](https://web.dev/articles/vitals) | Adopt | Heavy 3D assets must not block the map shell; viewer runtime must be lazy and measurable | frontend runtime and asset pipeline | build, smoke, future Lighthouse/Web Vitals checks |
| OWASP-aware server validation and access-control posture | [OWASP ASVS](https://github.com/OWASP/ASVS), [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Adopt | Real rooms, locations, assets, admin actions, and future auth require server-side trust boundaries | API routes, server actions, DB/storage adapters | validation tests/smoke, security review when auth/uploads land |
| Local signed session and admin proxy gate | [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication), [Next.js proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [Next.js cookies API](https://nextjs.org/docs/app/api-reference/functions/cookies), [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Adapt | Gives the local prototype a server-visible user/admin boundary and protects admin pages/APIs without choosing production auth too early | Identity & Access, `/session`, `/api/session`, `src/proxy.ts`, user/admin API boundaries | typecheck, lint, build, smoke for session switch, admin API 403 without session, admin UI with session, user actions with session profile |
| Admin/Ops runtime health | [Docker Compose docs](https://docs.docker.com/compose/), [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [The Twelve-Factor App](https://12factor.net/), [Amazon S3 API HeadBucket](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadBucket.html) | Adapt | Makes local end-to-end status visible: sample fallback vs PostGIS, migration readiness, required tables, and S3/MinIO bucket readiness | Admin/Ops, `apps/web/src/features/system`, `packages/db/src/health.ts`, `packages/assets/src/object-storage.ts`, `/admin/system`, `/api/admin/system` | DB/assets/web typecheck, lint, build, smoke API/page, desktop/mobile screenshots, Docker Compose config, standalone server check with `DATABASE_URL` and S3 env returning runtime `ready` |
| Continuous code-health review | [Google Engineering Practices](https://google.github.io/eng-practices/review/reviewer/standard.html) | Adapt | Prefer changes that improve maintainability/readability without blocking progress for fake perfection | all code review and goal work | line audit, focused refactors, typecheck/lint/build |
| Feature-done protocol for non-trivial slices | [Google Engineering Practices](https://google.github.io/eng-practices/review/reviewer/standard.html), [GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard), [NN/g usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [web.dev Web Vitals](https://web.dev/articles/vitals), [OWASP ASVS](https://github.com/OWASP/ASVS) | Adapt | Prevents long goal runs from accepting slop by requiring task, boundary, states, interaction, accessibility/mobile, security/privacy/performance, and evidence before a slice is called done | all UI/API/data/admin/viewer/pipeline work | final review note plus relevant typecheck, lint, build, smoke, screenshot, migration, or explicit unchecked-gate note |
| Task-based browser smoke for critical workflows | [Playwright docs](https://playwright.dev/docs/intro), [Next.js Playwright guide](https://nextjs.org/docs/app/guides/testing/playwright) | Adopt | Map, viewer, admin, and user workflows need real browser evidence across desktop/mobile, not only static builds | `tools/smoke/*`, app route surfaces | Playwright smoke modules, desktop/mobile screenshots, console log review for relevant UI work |
| Technology radar as research input, not project authority | [Thoughtworks Technology Radar](https://www.thoughtworks.com/en-us/radar) | Adapt | Helps notice current techniques/tools, but Loi Vao choices still need primary docs, local fit, and verification | architecture and tool research docs | record in ADR/research doc before changing stack; never adopt solely because a radar says adopt/trial/assess |
| Twelve-Factor-style config and runtime portability | [The Twelve-Factor App](https://12factor.net/) | Adapt | Supports Docker-first local/VM/cloud portability without forcing premature platform engineering | `compose.yaml`, app runtime config, future deployment docs | env/config review, no secrets in images, Docker compose config/build checks |
| Form-backed server mutation for simple server-owned actions | [Next.js forms and Server Functions](https://nextjs.org/docs/app/guides/forms) | Adapt | Current dev harness showed server forms are more reliable for admin/viewer actions than hydration-dependent click handlers | admin actions, viewer check-in/quiz, simple mutations | smoke submits real forms, API dry-run, browser screenshot |
| Scene asset object-presence gate | [Amazon S3 API HeadObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html), [PlayCanvas Gaussian Splatting](https://developer.playcanvas.com/user-manual/gaussian-splatting/) | Adapt | Operators need to know whether SOG/settings/collision/poster objects actually exist in MinIO/S3 before scene version keys are treated as runtime-ready | Assets & Storage, Scenes & Viewer, `packages/assets/src/object-storage.ts`, `/admin/scenes/[sceneId]/assets` | assets/web typecheck, lint, build, API smoke for `objectFiles`, admin desktop/mobile screenshots, standalone S3 runtime smoke when object storage is under test |
| Browser-reachable scene asset base URL | [Amazon S3 virtual hosting/path-style URL concepts](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html), [MinIO object storage docs](https://min.io/docs/minio/linux/index.html) | Adapt | Database storage keys are not enough for the browser; the manifest must resolve them through a public base URL when assets live in MinIO/S3 rather than `public/scene-assets` | Assets & Storage, Scenes & Viewer, `SCENE_ASSETS_PUBLIC_BASE_URL`, manifest repository | system API/page, manifest API with env, viewer smoke after first real asset |
| Repo-owned S3 scene asset uploader | [Amazon S3 API PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html), [Amazon S3 API HeadObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html) | Adopt | Runtime assets need a repeatable local command from SuperSplat/SplatTransform output to MinIO/S3 before DB publish can safely attach keys | `tools/3dgs/upload_scene_assets_to_s3.mjs`, Assets & Storage | script syntax check, dry-run, smoke-prefix upload, duplicate refusal, no DB mutation |
| Repo-owned raw capture uploader | [Amazon S3 API PutObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html), [Amazon S3 API HeadObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html) | Adopt | Private RGB captures need repeatable upload to the `raw-captures` bucket before GPU rental and before admin capture rows point at raw media | `tools/3dgs/upload_raw_capture_to_s3.mjs`, Capture & Processing, Assets & Storage | script syntax check, dry-run with temp raw media, duplicate refusal when S3 is exercised, no git/raw asset staging |
| Pre-GPU experiment manifest and runbook | [Nerfstudio custom data docs](https://docs.nerf.studio/quickstart/custom_dataset.html), [Nerfstudio Splatfacto docs](https://docs.nerf.studio/nerfology/methods/splat.html), [RunPod pod management docs](https://docs.runpod.io/pods/manage-pods) | Adopt | Paid GPU sessions should execute reviewed commands instead of becoming research/debug time; generated payloads keep admin capture/job metadata aligned with the run | `tools/3dgs/create_gpu_experiment.py`, `tools/3dgs/pre_gpu_check.py`, `docs/15-pre-gpu-setup-runbook.md`, Capture & Processing | generated experiment dry-run, preflight command, docs link from pipeline doc, final GPU run must record logs/exports before pod cleanup |
| Local runtime API preflight before GPU rental | [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [PostGIS docs](https://postgis.net/documentation/), [Amazon S3 API HeadBucket](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadBucket.html) | Adopt | Before renting GPU, the app should prove it can read PostGIS, verify S3 buckets, expose admin system readiness, and return the target scene manifest | `tools/3dgs/runtime_preflight.py`, Admin/Ops, Capture & Processing | run against local app with PostGIS/MinIO env and require `postgis`, `storageReady`, manifest scene id, and expected not-ready viewer state before first SOG |
| Self-hosted SuperSplat Viewer bundle | [SuperSplat Viewer README](https://github.com/playcanvas/supersplat-viewer), [PlayCanvas SuperSplat import/export docs](https://developer.playcanvas.com/user-manual/gaussian-splatting/editing/supersplat/import-export/#html-viewer-htmlzip) | Adopt | The viewer route must iframe a real local viewer bundle when the first SOG is published, not depend on a missing static path or external service | Scenes & Viewer, `apps/web/public/supersplat-viewer`, `apps/web/scripts/sync-supersplat-viewer.mjs` | sync script, build, smoke request for `/supersplat-viewer/index.html`, Docker public copy review |
| Dev/local filesystem adapters for production build hygiene | [Next.js output file tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) | Adapt | Local asset checks are useful in the harness, but production route modules must not trace the whole workspace through dynamic `fs/path` probes | `apps/web/src/features/*/server` local adapters and route modules | `pnpm --filter @tro/web build` has no NFT workspace-trace warning; typecheck/lint/smoke for affected flows |
| Design-lab-first brand exploration | local product rule plus `brandkit`, `imagegen`, `imagegen-frontend-mobile` skills | Adopt | Logo/brand/mobile concepts need iteration without polluting production assets | `design-lab/*` | prompt notes, selected asset paths, deliberate promotion into app |

## Current Rejected Practices

| Practice | Why rejected now | Revisit when |
| --- | --- | --- |
| Microservices | Adds distributed-system cost before product boundaries and runtime pressure justify it | team/runtime/deployment boundaries become independently scalable |
| CQRS everywhere | Most flows are CRUD/workflow state today; split would be ceremony | read/write models become meaningfully different and complex |
| Event sourcing | No replay/audit requirement yet | processing/admin workflows require durable replay or reconstruction |
| Full tactical enterprise DDD | Domain is important, but aggregates/events/factories everywhere would slow validation | invariants become rich enough to justify tactical DDD |
| Heavy design-system package | Premature before repeated components stabilize | repeated controls become stable across map, admin, viewer, and user surfaces |
| Custom ARIA widgets for common controls | Native/familiar controls are safer and faster | a native control cannot support a required interaction and APG pattern is followed |
| Whole-app fork from an open-source virtual-tour demo | No matching project covers Vietnam map + PostGIS + 3DGS + admin pipeline end to end | a mature open-source project matches the product boundary closely |
| Visual copying from Apple/Material/Fluent/Carbon | Their behavior rigor is useful; their brand language is not Loi Vao | never as direct visual copying; only behavior/state principles |
| 10k-line god files | Destroys ownership, reviewability, and future goal reliability | never for hand-written source; generated artifacts remain exceptions |

## New Practice Template

```text
Practice:
Source:
Decision: adopt | adapt | reject
Local fit:
Owning boundary:
Cost/tradeoff:
Verification gate:
Exit condition:
```

## Stability Verdict

This register is stable enough to guide implementation.

It is not frozen. New evidence may change a practice, but the change must be recorded here or in the relevant ADR/doc with a clear reason.
