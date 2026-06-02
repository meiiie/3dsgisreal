create table if not exists public.user_place_library (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  status text not null default 'saved' check (status in ('saved', 'visited', 'checked_in')),
  note text not null default '',
  saved_at timestamptz not null default now(),
  last_viewed_at timestamptz,
  primary key (profile_id, place_id)
);

create index if not exists user_place_library_profile_status_idx
  on public.user_place_library (profile_id, status, saved_at desc);

alter table public.user_place_library enable row level security;

create policy "local user library is readable"
  on public.user_place_library
  for select
  using (true);

insert into public.profiles (
  id,
  display_name
) values (
  '00000000-0000-4000-8000-000000000001',
  'Sinh viên thử nghiệm'
)
on conflict (id) do update set
  display_name = excluded.display_name,
  updated_at = now();

insert into public.user_place_library (
  profile_id,
  place_id,
  status,
  note,
  saved_at,
  last_viewed_at
) values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000101',
    'visited',
    'Theo dõi scene lab đầu tiên từ cổng vào phòng.',
    now() - interval '2 days',
    now() - interval '3 hours'
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000102',
    'saved',
    'Dùng để thử hotspot, audio và quiz ngắn.',
    now() - interval '1 day',
    null
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000103',
    'checked_in',
    'Mẫu luồng di tích cho check-in và quay lại bản đồ.',
    now() - interval '5 days',
    now() - interval '1 day'
  )
on conflict (profile_id, place_id) do update set
  status = excluded.status,
  note = excluded.note,
  saved_at = excluded.saved_at,
  last_viewed_at = excluded.last_viewed_at;
