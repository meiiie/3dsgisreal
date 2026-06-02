insert into public.scene_hotspots (
  id,
  scene_version_id,
  kind,
  title,
  body,
  position,
  rotation,
  payload,
  sort_order
) values
  (
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000301',
    'info',
    'Diem bat dau tu cong',
    'Dung o cong de so sanh anh sang, huong di va diem moc truoc khi vao phong.',
    '{"x":0,"y":1.55,"z":0}'::jsonb,
    '{"yaw":0}'::jsonb,
    '{"label":"Cong vao","importance":"entry"}'::jsonb,
    10
  ),
  (
    '00000000-0000-4000-8000-000000000602',
    '00000000-0000-4000-8000-000000000301',
    'audio',
    'Gioi thieu nhanh',
    'Audio guide ngan de giai thich cach di tu cong vao diem chinh.',
    '{"x":1.2,"y":1.45,"z":-0.6}'::jsonb,
    '{"yaw":25}'::jsonb,
    '{"audioKey":"audio/home-test-room/intro-vi.mp3","durationSeconds":35}'::jsonb,
    20
  ),
  (
    '00000000-0000-4000-8000-000000000603',
    '00000000-0000-4000-8000-000000000301',
    'quiz',
    'Kiem tra quan sat',
    'Cau hoi ngan de xem nguoi dung co nhan ra moc duong di chinh hay khong.',
    '{"x":2.1,"y":1.4,"z":-1.4}'::jsonb,
    '{"yaw":35}'::jsonb,
    '{"question":"Diem nao nen giu on dinh khi quay lai scene?","options":["Anh sang va moc duong di","Zoom camera lien tuc","Doi lens giua chung"],"answerIndex":0}'::jsonb,
    30
  ),
  (
    '00000000-0000-4000-8000-000000000604',
    '00000000-0000-4000-8000-000000000301',
    'checkin',
    'Check-in den diem chinh',
    'Diem check-in mau cho luong sinh vien xac nhan da xem het tu cong vao phong.',
    '{"x":2.8,"y":1.35,"z":-2.2}'::jsonb,
    '{"yaw":45}'::jsonb,
    '{"reward":"local-demo-checkin","userStatus":"checked_in"}'::jsonb,
    40
  )
on conflict (id) do update set
  scene_version_id = excluded.scene_version_id,
  kind = excluded.kind,
  title = excluded.title,
  body = excluded.body,
  position = excluded.position,
  rotation = excluded.rotation,
  payload = excluded.payload,
  sort_order = excluded.sort_order;
