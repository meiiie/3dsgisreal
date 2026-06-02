# Quality Standards And Practice

Last reviewed: 2026-06-02.

## Purpose

This document records the quality standard for engineering, UX/UI, microinteractions, accessibility, security, performance, and product polish.

The goal is simple:

```text
No god files.
No AI slop.
No cargo-cult architecture.
No UI that only looks good in a screenshot.
```

Every serious feature should feel like it was designed and engineered by someone who understood the user's task.

## Source Hierarchy

When patterns conflict, use this order:

1. Safety, privacy, security, accessibility, legal requirements.
2. Official standards and primary docs.
3. Platform conventions: web, mobile browser, iOS/Android expectations.
4. Product domain needs: map, place inspection, scene walkthrough, student workflows.
5. Brand/design taste.
6. Personal preference.

Do not use Dribbble-style visuals or random AI-generated patterns as authority.

## Pattern Governance

Patterns are tools, not decorations. Before adopting a code, architecture, UI, or motion pattern, answer:

- What user or maintenance problem does it solve?
- Which boundary owns it?
- Is there an official standard, platform convention, or proven design-system behavior behind it?
- Can we verify it with typecheck, lint, build, browser, accessibility, or a focused test?
- Does it reduce complexity in the next real change, or only make the current code look more sophisticated?

Adoption rules:

- Prefer boring, well-documented patterns used by the core stack.
- Prefer official framework guidance before blog-driven patterns.
- Prefer one clear implementation over a half-built pattern library.
- Do not introduce a pattern only because a large company uses it; match the product scale first.
- Do not mix multiple patterns that solve the same problem in one area.
- If a pattern adds ceremony, it must also remove ambiguity, duplication, or risk.
- Record stable pattern decisions in the relevant doc or ADR.

Rejected pattern signals:

- "enterprise" structure with no domain invariants
- generic `manager`, `helper`, `utils`, or `service` modules with vague ownership
- custom UI controls that mimic native controls poorly
- animation systems without state semantics
- design tokens that are unused or constantly bypassed
- architecture introduced before there is a second real use case

## Best-Practice Intake Review

Use this for practices from large organizations, expert articles, design systems, framework docs, or current industry standards.

Do not accept a practice because it sounds senior. A practice becomes project policy only after it is tied to a source, local reason, owner, cost, and verification gate.

Stable practice decisions belong in `docs/13-practice-register.md`. Chat notes are not enough when a pattern changes how future code, UI, architecture, security, or data work should be built.

Each significant practice must be marked as one of:

- `adopt`: it fits our stack and product directly.
- `adapt`: the principle is useful, but the implementation must be smaller or different for our modular monolith.
- `reject`: it does not solve a current product or maintenance problem.

Record:

- source/reference
- local product reason
- owning bounded context or UI surface
- user impact
- developer/operational cost
- accessibility/security/performance impact
- verification gate
- exit condition: when to split, replace, or remove it

Examples:

- Adopt WCAG-style focus visibility and semantic controls because every map/detail/admin workflow needs keyboard and assistive-tech reachability.
- Adapt large design-system component rigor by documenting complete states for our controls, without cloning Apple, Material, Fluent, Carbon, or GOV.UK visual branding.
- Adapt Google-style code review as "improve code health over time", not as a demand for slow perfection.
- Reject microservices, CQRS everywhere, or a heavyweight design-system package until the product pressure is real.

If the answer is only "experts do it this way", the practice is not accepted yet.

## Evidence Refresh Rule

Re-check current primary sources before making or changing decisions in unstable areas:

- framework runtime/deployment behavior
- security/auth/session/upload handling
- accessibility standards and ARIA component behavior
- browser performance metrics and Core Web Vitals
- GPU/3DGS toolchain commands and export formats
- cloud provider quotas, GPU availability, and pricing

Use stable architectural references without re-litigating them every day, but refresh official docs when the implementation depends on exact current behavior.

When research produces a new rule, write it in this format:

```text
Decision:
Source:
Adopt/adapt/reject:
Local fit:
Owning boundary:
Verification:
Exit condition:
```

Rules without a verification path are notes, not standards.

## Primary Standards And References

Use current primary sources first:

- Accessibility: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [WAI WCAG overview](https://www.w3.org/WAI/standards-guidelines/wcag/)
- Accessible component behavior: [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- Usability: [Nielsen Norman Group 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- Service design: [GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard), [GOV.UK Design](https://www.gov.uk/service-manual/design), [Government Design Principles](https://www.gov.uk/guidance/government-design-principles)
- Platform design: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines), [Material Design 3](https://m3.material.io/), [Microsoft Fluent 2](https://fluent2.microsoft.design/), [IBM Carbon Design System](https://carbondesignsystem.com/)
- Performance: [web.dev Web Vitals](https://web.dev/articles/vitals), [web.dev Performance](https://web.dev/performance)
- Security: [OWASP ASVS 5.0](https://github.com/OWASP/ASVS), [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/), especially input validation, XSS prevention, CSRF/session/auth guidance when those features exist
- Product code: official docs for Next.js, React, TypeScript, PostgreSQL/PostGIS, Docker, MapLibre, PlayCanvas, Nerfstudio, Kysely, Ruff, and pytest listed in `docs/11-clean-code-and-architecture.md`
- Code review and maintainability: [Google Engineering Practices](https://google.github.io/eng-practices/) as an adaptation source for continuous code health, not fake perfection

Design systems above are references for behavior, accessibility, interaction states, and component rigor. Do not copy their visual brand.

## Current Standards Check

Checked on 2026-06-02:

- W3C WCAG 2.2 is the current accessibility baseline for this repo.
- WAI-ARIA APG remains the reference for custom widget semantics, accessible names, keyboard behavior, and focus handling.
- OWASP ASVS 5.0 is the current application-security verification reference for future auth, uploads, admin controls, and user data.
- Thoughtworks Technology Radar Vol. 34 is useful as a 2026 research signal, but not as direct authority for architecture choices.
- Next.js, React, TypeScript, PostgreSQL/PostGIS, Docker, MapLibre, PlayCanvas, Nerfstudio, Kysely, Ruff, and pytest should be checked through their official docs before implementation-specific decisions.

This standards check supports development readiness. It does not remove the need to re-check time-sensitive docs before changing framework, security, cloud, GPU, or deployment behavior.

## Pattern Selection Standard

Use the smallest pattern that gives the strongest practical guarantee.

For code:

- native language/platform feature first
- official framework convention second
- local feature helper third
- shared package only for real cross-package contracts
- architecture pattern only for real boundaries or invariants

For UI:

- native semantic controls first
- established platform/design-system behavior second
- local component styling third
- custom widget only when native/familiar controls cannot solve the task

For process:

- direct verification first
- lightweight docs/ADR when a decision affects future work
- heavier ceremony only when it prevents real repeated mistakes

The project should feel disciplined, not bureaucratic.

## UI Craft Contract

Every reusable control or critical flow must have a state contract before it is considered polished.

State matrix:

- default
- hover where pointer exists
- focus-visible
- pressed/active
- disabled
- loading/submitting
- empty/no-data
- success/completed
- error/recovery
- reduced-motion
- keyboard path
- touch/mobile path

For each state, check:

- the control has the right semantic element or ARIA pattern
- visual feedback is immediate and does not cause layout jump
- text is readable on mobile and at zoom
- destructive or expensive actions cannot fire accidentally
- failure tells the user/operator the next useful action
- status changes are visible outside canvas/map-only surfaces when relevant

Do not ship a control merely because it looks good in one screenshot.

## Reference Mapping For Loi Vao

Use the external standards as operating evidence, not as visual templates.

W3C WCAG 2.2 maps to:

- keyboard reachability and focus visibility for map/list/detail/admin controls
- accessible names for icon buttons and viewer controls
- status messages for loading, processing, failed, unsupported, and published states
- no keyboard trap in the 3D viewer
- touch target and pointer alternatives for mobile workflows

WAI-ARIA APG maps to:

- use native HTML first
- when building a custom tab, menu, dialog, combobox, switch, or tooltip, match expected role, state, keyboard, focus, and dismissal behavior
- do not invent a custom control if a native or framework-standard control can do the job

Nielsen Norman usability heuristics map to:

- visible system status for GPU processing, asset readiness, scene load, and admin publish state
- user language in Vietnamese instead of PLY/SOG/COLMAP jargon in public UI
- clear exits from viewer/admin flows
- consistent place names, statuses, icons, and action labels across map, detail, viewer, and admin
- error prevention before expensive or destructive actions

GOV.UK service practice maps to:

- every screen must help the user complete a concrete task with minimum confusion
- test the same service flow across desktop and mobile, not only isolated pages
- keep public copy plain, direct, and consistent
- choose open standards and self-hostable technology when that protects long-term control

Apple, Material, Fluent, and Carbon map to:

- complete component states: hover, focus, active, disabled, loading, success, error
- predictable platform behavior on mobile browsers
- restrained motion that supports orientation and feedback
- accessible color/contrast and text sizing discipline

web.dev Web Vitals maps to:

- keep the map/list shell usable before heavy 3D assets load
- lazy-load viewer/runtime code at scene entry
- reserve dimensions for media, map panels, and viewer HUD elements
- watch LCP, INP, and CLS during browser verification, especially on mobile

OWASP ASVS and Cheat Sheets map to:

- server-side validation for API inputs, admin actions, uploads, and manifests
- access control for private places, draft scenes, and admin routes
- safe handling of asset URLs and uploaded metadata as untrusted input
- no credentials, private scans, or sensitive location data in git

## Engineering Practice

For each feature, define:

- user task
- success criteria
- domain boundary
- data/state shape
- error states
- verification path

Architecture gate:

- name the bounded context before adding files
- keep route/API files as orchestration
- keep domain types pure
- keep IO in adapters/server modules
- validate external data before it crosses into domain code
- avoid shared packages until a contract is truly cross-package
- split when a file has more than one reason to change

Implementation rules:

- Pick the smallest pattern that fits the problem.
- Keep route/page files thin.
- Keep IO at the boundary.
- Prefer clear data contracts over implicit prop soup.
- Use explicit states instead of booleans that conflict.
- Make invalid states hard to represent.
- Do not add architecture whose only purpose is to look serious.
- Do not leave TODO-driven half-systems behind.
- Do not introduce a new library until existing stack options are checked.

Pull from large-organization practice at the principle level:

- GOV.UK-style service thinking: make the user's task obvious, plain, and recoverable.
- Design-system discipline from Apple, Material, Fluent, IBM Carbon: complete states, accessible names, consistent interaction models.
- OWASP practice: validate on the server, encode at output, protect access control, keep secrets out of code.
- Web Vitals practice: preserve responsiveness and avoid layout instability.
- React/Next practice: keep render pure, prefer Server Components until interactivity is needed, and keep client bundles small.
- Next form/server mutation practice: for simple server-owned admin mutations, prefer a form-backed Server Function when it gives better progressive behavior, server validation, and smoke-testability than a client-only click handler.
- Local asset pipeline practice: before publishing scene asset keys, the admin surface should verify whether the expected local files exist and whether planned MinIO/S3 objects exist; with PostGIS enabled, block DB publish when planned runtime objects are missing. Do not mark a scene ready merely because key names were generated.
- Production build hygiene: local filesystem probes must live behind dev/local adapters so standalone builds do not trace the whole workspace.

## UX Rules

Apply Nielsen-style heuristics in product-specific form:

- Visibility of status: loading, saving, processing, failed, published, unsupported, and offline-ish states must be visible.
- Match the real world: use Vietnamese place/room/map language, not internal 3DGS jargon.
- User control: every immersive scene needs a clear return-to-map path; destructive/admin actions need cancel/recover paths.
- Consistency: map, place card, detail page, and viewer should use the same names, icons, statuses, and color semantics.
- Error prevention: constrain inputs, validate before submit, and warn before expensive or destructive actions.
- Recognition over recall: keep important context visible: selected place, scene quality, route start, capture date, and viewer controls.
- Efficiency: support quick scanning on map/list and fast re-entry to recently viewed places later.
- Minimalism: remove content that does not help choose, inspect, enter, or manage a place.
- Helpful errors: say what failed, why it matters, and what the user can do next.
- Help in context: use inline hints near capture/admin actions; avoid tutorial walls.

## UI Pattern Rules

Use familiar controls for familiar jobs:

- buttons for commands
- links for navigation
- segmented controls for modes
- tabs for peer sections
- toggles/checkboxes for binary settings
- sliders/steppers/inputs for numeric values
- menus for option sets
- sheets/drawers for secondary details on mobile
- modals only for focused interruptions or confirmation
- skeletons/progress indicators for async loading

Avoid:

- clickable divs without semantics
- custom controls where native/familiar patterns fit
- hover-only actions on mobile-critical workflows
- hidden destructive actions
- icons with no accessible name
- controls with no focus/pressed/disabled/loading state

## UX/UI Delivery Standard

Every product surface should be designed around a task, not a visual theme.

For map surfaces:

- the map and list must remain in sync
- selected place must be obvious in both views
- mobile must support thumb-friendly scanning
- users must be able to reach the same place detail without relying on map gestures
- marker, card, detail page, and viewer must use consistent names and statuses

For detail surfaces:

- first screen answers what this place is, where it is, whether it is trusted/published, and whether 3D is available
- unavailable scene actions must not navigate accidentally
- private or draft locations must avoid exposing precise address data unless intentionally published
- route-from-entry information must stay visible because the product promise starts from "gate to inside"

For admin surfaces:

- make workflow state visible: draft, capture needed, processing, failed, published
- show the next operator action, not just data
- destructive actions need confirmation and recovery when possible
- long processing jobs need durable status and logs later

For viewer surfaces:

- load the 3D runtime only when entering the scene
- show loading, unsupported, failed, and empty states outside the canvas
- preserve a visible return-to-map/detail path
- do not trap focus inside immersive controls
- controls must work with touch and keyboard where practical

## Microinteraction Rules

Every interactive element should have a complete state model.

Minimum states:

- idle
- hover where pointer exists
- focus-visible
- pressed/active
- disabled
- loading
- success or completed when relevant
- error when relevant

Microinteraction checklist:

- trigger is obvious
- feedback is immediate
- animation supports the task, not decoration
- state change is reversible when possible
- focus stays predictable
- pointer, keyboard, and touch behavior are considered
- no layout jump during interaction
- no accidental double-submit
- `prefers-reduced-motion` is respected
- long-running actions show progress or at least durable status

For critical workflows, also write a small interaction contract before or during implementation:

```text
Action:
Trigger:
Immediate feedback:
Long-running state:
Success state:
Error/recovery:
Keyboard path:
Touch/mobile path:
Reduced-motion behavior:
Verification:
```

Use this especially for:

- enter scene / return to map
- admin publish asset keys
- upload/import/capture forms
- GPU job start/stop/retry
- viewer controls
- map filters and place selection

Motion guidance:

- small hover/press transitions: roughly 120-200ms
- panel/sheet transitions: roughly 200-320ms
- avoid slow decorative motion in operational UI
- never make motion the only way to understand state
- do not animate map/viewer controls in a way that fights spatial orientation

Microcopy rules:

- use Vietnamese user-facing language for product state
- avoid internal jargon such as PLY, SOG, COLMAP, and splatfacto in public UI unless the user is in an admin/developer context
- button text must describe the action, not the implementation
- error text should include the next useful action
- do not ship placeholder copy that sounds like a scaffold

## Accessibility Rules

Target WCAG 2.2 AA for product UI where practical.

Baseline:

- semantic HTML first
- keyboard reachable controls
- visible focus
- accessible names for icon buttons
- sufficient color contrast
- status messages exposed to assistive tech when relevant
- no color-only meaning
- touch targets large enough for mobile
- content readable at mobile sizes and zoom
- meaningful alt text for content images
- decorative images marked appropriately
- reduced motion respected
- forms have labels, errors, and descriptions

For map and 3D viewer:

- provide non-visual place list/detail fallback
- keep a clear escape/return path
- expose scene loading/failure state outside the canvas
- do not require precision gestures for essential navigation
- do not trap keyboard focus inside viewer controls

## Performance Rules

Performance is product quality.

Use Core Web Vitals as a reference:

- LCP: keep first meaningful product surface fast
- INP: interactions should respond quickly, especially map filters and viewer controls
- CLS: reserve space for media, maps, panels, and loading states

Product-specific rules:

- basic map/list UI must not require heavy 3D assets
- lazy-load 3D viewer/runtime when entering a scene
- do not block the map on asset pipelines or GPU job data
- keep scene manifests small and cacheable
- provide lower-quality/mobile-friendly asset paths later
- prefer stable dimensions for cards, map panels, viewer HUD, and media frames

## Security And Privacy Rules

Security and privacy matter because this product may handle private rooms and real locations.

Rules:

- never commit credentials or private scans
- validate on the server before processing user-controlled data
- treat asset URLs, scene manifests, and uploaded metadata as untrusted
- use allowlists for file types and formats
- keep private/draft scenes inaccessible by default
- avoid exposing exact private addresses unless intentionally published
- record permission/privacy status for real captures
- do not trust client-side checks for access control

Use OWASP guidance when adding auth, uploads, admin actions, sessions, or user-generated content.

## Product-Specific Quality Bar

A feature is not done if:

- it only works on desktop
- it breaks or becomes unreadable on mobile
- it has no empty/loading/error state
- it cannot be used by keyboard where applicable
- it depends on fake data with no path to real data
- it hides user status during processing
- it adds visual decoration without user value
- it introduces a broad catch-all module
- it makes the map/viewer flow harder to understand

For `Loi Vao`, the strongest product loop is:

```text
find place
  -> understand trust/context
  -> enter scene
  -> move around
  -> learn/check/decide
  -> return to map
```

Everything should support that loop.

## Feature Review Checklist

Before a serious feature is called complete:

- Does it solve a real user task?
- Is the accepted pattern/source recorded when the feature adds a significant new pattern?
- Is the code in the right bounded context?
- Did we avoid god files?
- Did we avoid AI-slop UI?
- Are states explicit and complete?
- Are loading, empty, error, and unsupported states handled?
- Is keyboard/focus behavior acceptable?
- Is mobile layout readable?
- Are icon buttons named?
- Is motion restrained and reduced-motion safe?
- Are inputs/server boundaries validated?
- Are performance-sensitive assets lazy-loaded?
- Did docs/ADR need an update?
- Did typecheck/lint/build/browser checks run where relevant?

## Quality Gate

A feature is "green" only when these gates are satisfied:

- Code gate: typecheck passes, lint passes, files stay within ownership and size limits.
- Architecture gate: dependency direction is respected and no route/component became a domain dump.
- UX gate: primary task is clear, states are complete, microcopy is production-shaped.
- Accessibility gate: semantic controls, keyboard/focus behavior, names, contrast, and reduced motion are acceptable.
- Mobile gate: viewport check confirms no overlap, tiny text, clipped controls, or hover-only workflow.
- Performance gate: heavy map/viewer/asset work is lazy or isolated from the first product surface.
- Security/privacy gate: server validation and access-control assumptions are explicit where user data exists.
- Documentation gate: stable decisions and non-obvious tradeoffs are recorded.

If a gate cannot be verified yet, record the blocker and keep the scope honest instead of pretending the feature is done.

## Feature-Done Protocol

This is the mandatory pre-final review for non-trivial feature work.

1. Task: name the concrete public user, student, operator, or admin job that now works.
2. Boundary: name the bounded context and confirm the code lives there.
3. Code health: confirm routes/pages/API files orchestrate, domain/server/DB/storage logic is separated, and no hand-written god file or broad dumping-ground module was created.
4. State model: confirm relevant default, loading, empty, success, error, disabled, unsupported, and recovery states exist.
5. Micro-UX: confirm trigger, immediate feedback, no accidental double-submit, focus behavior, keyboard path, touch/mobile path, and reduced-motion impact.
6. Accessibility/mobile: confirm semantic controls, accessible names, visible focus, readable mobile layout, and no hover-only critical workflow.
7. Security/privacy/performance: confirm server validation, access-control/privacy assumptions, asset exposure, first-load impact, and layout stability.
8. Evidence: name the checks or screenshots that prove the slice, or explicitly record the unchecked gate.

The final answer for a serious slice should summarize the evidence, not only the implementation.

## Harness Stability Assessment

As of 2026-06-02, the repo harness is stable enough to start the long-running implementation goal.

Stable:

- product definition
- architecture direction
- stack choice
- backend/PostGIS/Docker direction
- 3DGS capture/training/runtime direction
- design lab workflow
- clean-code and no-god-file rules
- AI-slop prevention
- quality standards and reference hierarchy
- external best-practice mapping for accessibility, usability, service design, platform design, performance, and security
- explicit best-practice intake review: adopt/adapt/reject, source, local fit, owner, cost, verification, and exit condition
- `docs/13-practice-register.md` as the living register for accepted/adapted/rejected external practices
- explicit microinteraction contracts for critical user/admin workflows
- clean Next/Turbopack production build after local filesystem checks were moved behind a dev/local adapter
- Docker/PostGIS/MinIO local runtime has been proven through Compose, repo migrations, MinIO bucket setup, and a standalone Next server reading PostGIS plus verifying S3 buckets through `/api/admin/system`

Still intentionally flexible:

- final product name/domain
- final logo and brand assets
- exact admin workflow
- exact auth provider
- exact GPU provider
- final viewer implementation depth: SuperSplat Viewer bridge vs direct PlayCanvas runtime
- exact map tile generation/hosting path

This is the right level of stability for development. The next goal should implement and verify, not keep debating architecture unless new evidence forces a change.

Current verdict:

- Stable enough to start substantial implementation work.
- Strong enough to prevent obvious god-file and AI-slop drift if followed.
- Stronger than a docs-only harness now because the backend runtime gate has concrete PostGIS and MinIO/S3 bucket evidence, not just planned architecture.
- Not a substitute for verification: every meaningful feature still needs typecheck/lint/build and browser/mobile review.
- Not a substitute for real 3DGS testing: capture/training quality remains the highest-risk technical unknown.
- Strong enough to begin goal-driven development now; future changes should mostly implement and verify, not reopen stack debates without new evidence.
