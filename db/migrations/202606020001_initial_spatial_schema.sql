create extension if not exists pgcrypto;
create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create table public.profiles (
  id uuid primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'reviewer')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null check (category in ('rental', 'cafe', 'heritage', 'craft', 'campus', 'food', 'other')),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  summary text not null default '',
  description text not null default '',
  address text not null default '',
  ward text,
  district text,
  city text not null default 'Hai Phong',
  country_code char(2) not null default 'VN',
  geom public.geometry(Point, 4326) not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_geom_gist on public.places using gist (geom);
create index places_status_category_idx on public.places (status, category);
create index places_name_trgm_idx on public.places using gin (name gin_trgm_ops);

create table public.place_media (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  kind text not null check (kind in ('poster', 'photo', 'thumbnail')),
  storage_key text not null,
  alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  slug text not null,
  title text not null,
  entry_label text not null default '',
  status text not null default 'draft' check (status in ('draft', 'processing', 'ready', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, slug)
);

create table public.scene_versions (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.scenes(id) on delete cascade,
  version integer not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'published', 'failed', 'archived')),
  renderer text not null default 'playcanvas',
  source_format text not null default 'ply',
  runtime_format text not null default 'sog',
  asset_base_key text,
  content_key text,
  settings_key text,
  collision_key text,
  poster_key text,
  entry_pose jsonb not null default '{}'::jsonb,
  quality_profile jsonb not null default '{}'::jsonb,
  training_metadata jsonb not null default '{}'::jsonb,
  splat_count integer,
  content_size_bytes bigint,
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (scene_id, version)
);

create index scene_versions_scene_status_idx on public.scene_versions (scene_id, status);

create table public.scene_hotspots (
  id uuid primary key default gen_random_uuid(),
  scene_version_id uuid not null references public.scene_versions(id) on delete cascade,
  kind text not null check (kind in ('info', 'audio', 'quiz', 'checkin', 'link')),
  title text not null,
  body text not null default '',
  position jsonb not null,
  rotation jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.capture_sessions (
  id uuid primary key default gen_random_uuid(),
  place_id uuid references public.places(id) on delete set null,
  scene_id uuid references public.scenes(id) on delete set null,
  captured_by uuid references public.profiles(id) on delete set null,
  device text not null default '',
  capture_mode text not null default 'video',
  captured_at timestamptz,
  notes text not null default '',
  raw_asset_key text,
  status text not null default 'draft' check (status in ('draft', 'uploaded', 'processing', 'accepted', 'rejected', 'archived')),
  created_at timestamptz not null default now()
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  capture_session_id uuid references public.capture_sessions(id) on delete set null,
  scene_version_id uuid references public.scene_versions(id) on delete set null,
  provider text not null default 'runpod',
  gpu_type text,
  toolchain text not null default 'nerfstudio-splatfacto-gsplat',
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  config jsonb not null default '{}'::jsonb,
  log_key text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('place', 'scene_version', 'capture_session', 'processing_job')),
  owner_id uuid not null,
  kind text not null,
  storage_bucket text not null,
  storage_key text not null,
  mime_type text,
  size_bytes bigint,
  checksum_sha256 text,
  visibility text not null default 'private' check (visibility in ('private', 'public', 'signed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_key)
);

alter table public.profiles enable row level security;
alter table public.project_members enable row level security;
alter table public.places enable row level security;
alter table public.place_media enable row level security;
alter table public.scenes enable row level security;
alter table public.scene_versions enable row level security;
alter table public.scene_hotspots enable row level security;
alter table public.capture_sessions enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.assets enable row level security;

create policy "published places are public"
  on public.places
  for select
  using (status = 'published');

create policy "media on published places is public"
  on public.place_media
  for select
  using (
    exists (
      select 1
      from public.places p
      where p.id = place_media.place_id
        and p.status = 'published'
    )
  );

create policy "published scenes are public"
  on public.scenes
  for select
  using (status = 'published');

create policy "published scene versions are public"
  on public.scene_versions
  for select
  using (status = 'published');

create policy "hotspots on published versions are public"
  on public.scene_hotspots
  for select
  using (
    exists (
      select 1
      from public.scene_versions sv
      where sv.id = scene_hotspots.scene_version_id
        and sv.status = 'published'
    )
  );

create policy "public assets are readable"
  on public.assets
  for select
  using (visibility = 'public');
