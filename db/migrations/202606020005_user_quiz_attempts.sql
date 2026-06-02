create table if not exists public.user_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  scene_hotspot_id uuid not null references public.scene_hotspots(id) on delete cascade,
  scene_id uuid references public.scenes(id) on delete set null,
  selected_index integer not null check (selected_index >= 0),
  correct boolean not null,
  reward text not null default '',
  payload jsonb not null default '{}'::jsonb,
  answered_at timestamptz not null default now()
);

create index if not exists user_quiz_attempts_profile_answered_idx
  on public.user_quiz_attempts (profile_id, answered_at desc);

create index if not exists user_quiz_attempts_hotspot_profile_idx
  on public.user_quiz_attempts (scene_hotspot_id, profile_id, answered_at desc);

alter table public.user_quiz_attempts enable row level security;

create policy "local quiz attempts are readable"
  on public.user_quiz_attempts
  for select
  using (true);

insert into public.user_quiz_attempts (
  id,
  profile_id,
  scene_hotspot_id,
  scene_id,
  selected_index,
  correct,
  reward,
  payload,
  answered_at
) values (
  '00000000-0000-4000-8000-000000000701',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000201',
  0,
  true,
  'local-demo-quiz',
  '{"question":"Diem nao nen giu on dinh khi quay lai scene?","selectedOption":"Anh sang va moc duong di"}'::jsonb,
  now() - interval '2 hours'
)
on conflict (id) do update set
  selected_index = excluded.selected_index,
  correct = excluded.correct,
  reward = excluded.reward,
  payload = excluded.payload,
  answered_at = excluded.answered_at;
