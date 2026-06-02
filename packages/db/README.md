# @loi-vao/db

Database package for the Loi Vao platform.

Responsibilities:

- Kysely database client setup.
- generated database types.
- shared query helpers for places, scenes, manifests, and admin workflows.
- SQL-adjacent utilities for PostGIS queries.

Non-responsibilities:

- owning schema definitions in TypeScript.
- storing migrations.
- hiding spatial SQL behind a heavy ORM.

Schema migrations live in `db/migrations`.

## Migration Runner

Use the repository runner instead of relying on Docker init scripts:

```powershell
$env:DATABASE_URL='postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao'
pnpm db:migrate
pnpm db:migrate:status
```

The runner stores migration history in `public.schema_migrations` and verifies checksums for applied files.

If an older local Docker volume was initialized before the runner existed, it may already contain the schema without migration history. Only then, use:

```powershell
pnpm db:migrate -- --baseline-existing
```

Do not use baseline on an empty or uncertain database.

## Current State

Implemented:

- `src/schema.ts`: hand-aligned TypeScript table types for the initial migration.
- `src/client.ts`: Kysely/Postgres client factory with a cached `DATABASE_URL` connection.
- `scripts/migrate.mjs`: SQL migration runner with checksum verification and optional explicit baseline for older local volumes.
- `src/places.ts`: SQL-adjacent place/scene query using PostGIS coordinate extraction, search/category filters, and latest scene version lookup.
- `src/hotspots.ts`: SQL-adjacent scene hotspot query for the latest scene version manifest.
- `src/admin-hotspots.ts`: DB write helpers for creating, updating, and deleting scene hotspots on the latest scene version.
- `src/user.ts`: local profile library reads plus saved/visited/check-in upserts for user and viewer actions.
- `src/user-quiz.ts`: DB write/read helpers for local demo profile quiz attempts from viewer hotspots.
- `src/pipeline.ts`: SQL-adjacent capture session and processing job queries for admin pipeline surfaces.
- `src/admin-captures.ts`: DB write helper for recording capture sessions against a place/scene.
- `src/admin-processing-jobs.ts`: DB write helper for queuing a processing job, creating the next scene version, and updating job status.
- `src/admin-places.ts`: DB write helpers for creating a place plus first scene, editing place/scene metadata, and updating place review status.
- `src/scene-assets.ts`: DB write helper for publishing runtime asset keys to the latest scene version.

The web app imports this package only from server-side repository code. UI components do not talk to PostGIS directly.

If `DATABASE_URL` is unset, the web app uses sample data. If `DATABASE_URL` is set, database errors should surface instead of silently falling back.
