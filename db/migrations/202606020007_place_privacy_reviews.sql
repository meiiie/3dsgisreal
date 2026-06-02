create table public.place_privacy_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  decision text not null default 'needs_changes' check (decision in ('blocked', 'needs_changes', 'approved')),
  consent_confirmed boolean not null default false,
  address_public_safe boolean not null default false,
  faces_or_people_removed boolean not null default false,
  private_objects_removed boolean not null default false,
  audio_private_safe boolean not null default false,
  raw_capture_private boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index place_privacy_reviews_place_created_idx
  on public.place_privacy_reviews (place_id, created_at desc);

alter table public.place_privacy_reviews enable row level security;
