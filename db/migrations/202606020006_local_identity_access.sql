insert into public.profiles (
  id,
  display_name
) values
  (
    '00000000-0000-4000-8000-000000000001',
    'Sinh vien thu nghiem'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Quan tri local'
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  updated_at = now();

insert into public.project_members (
  user_id,
  role
) values
  (
    '00000000-0000-4000-8000-000000000002',
    'admin'
  )
on conflict (user_id, role) do nothing;
