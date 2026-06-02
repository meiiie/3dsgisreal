# Local Docker Stack

The local stack is intentionally small and Docker-first.

Current services:

- PostGIS for isolated SQL experiments.
- MinIO for S3-compatible object storage.

Run:

```bash
docker compose up -d postgres minio
pnpm db:migrate
```

Then point the web app at PostGIS:

```powershell
$env:DATABASE_URL='postgres://loi_vao:loi_vao_dev@localhost:5432/loi_vao'
pnpm --filter @tro/web dev
```

Likely services later:

- Redis for local job queues.
- Martin for local vector tile serving from PMTiles/PostGIS.

Supabase remains optional later for auth/storage/RLS workflows, but the core schema stays normal Postgres/PostGIS SQL.
