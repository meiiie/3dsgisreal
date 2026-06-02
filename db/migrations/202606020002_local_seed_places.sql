insert into public.places (
  id,
  slug,
  name,
  category,
  status,
  summary,
  description,
  address,
  city,
  geom
) values
  (
    '00000000-0000-4000-8000-000000000101',
    'phong-thu-nghiem-tu-cong-vao',
    'Phòng thử nghiệm từ cổng vào',
    'rental',
    'draft',
    'Scene đầu tiên dùng để kiểm tra capture iPhone, train 3DGS, collision và luồng quay lại bản đồ.',
    'Không gian lab để kiểm thử pipeline từ cổng vào đến phòng chính trước khi quay địa điểm công cộng.',
    'Khu thử nghiệm cá nhân',
    'Hải Phòng',
    public.ST_SetSRID(public.ST_MakePoint(106.6881, 20.8449), 4326)
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'quan-cafe-sinh-vien-mau',
    'Quán cafe sinh viên mẫu',
    'cafe',
    'review',
    'Địa điểm mẫu cho hotspot, audio giới thiệu, check-in và quiz ngắn.',
    'Dữ liệu mẫu để thiết kế luồng cafe dành cho sinh viên trước khi có capture thật.',
    'Gần khu trường học',
    'Hải Phòng',
    public.ST_SetSRID(public.ST_MakePoint(106.6932, 20.8424), 4326)
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'cong-di-tich-mau',
    'Cổng di tích mẫu',
    'heritage',
    'published',
    'Mẫu cho tuyến đi từ cổng vào trong, phù hợp kiểm tra cách chia scene khi ánh sáng thay đổi.',
    'Dữ liệu mẫu cho trải nghiệm di sản và tuyến tham quan từ cổng vào sân trước.',
    'Tuyến trải nghiệm di sản',
    'Hải Phòng',
    public.ST_SetSRID(public.ST_MakePoint(106.6814, 20.8498), 4326)
  )
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  category = excluded.category,
  status = excluded.status,
  summary = excluded.summary,
  description = excluded.description,
  address = excluded.address,
  city = excluded.city,
  geom = excluded.geom,
  updated_at = now();

insert into public.scenes (
  id,
  place_id,
  slug,
  title,
  entry_label,
  status
) values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000101',
    'home-test-room-v1',
    'Cổng vào phòng thử nghiệm',
    'Cổng -> lối vào -> phòng chính',
    'processing'
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000102',
    'student-cafe-demo-v1',
    'Mặt tiền và khu ngồi',
    'Mặt tiền -> quầy -> khu ngồi',
    'draft'
  ),
  (
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000103',
    'heritage-gate-demo-v1',
    'Cổng và lối vào',
    'Cổng -> sân trước -> điểm dừng giới thiệu',
    'draft'
  )
on conflict (place_id, slug) do update set
  title = excluded.title,
  entry_label = excluded.entry_label,
  status = excluded.status,
  updated_at = now();

insert into public.scene_versions (
  id,
  scene_id,
  version,
  status,
  renderer,
  source_format,
  runtime_format,
  training_metadata
) values (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000201',
  1,
  'processing',
  'playcanvas',
  'ply',
  'sog',
  '{"note":"Local seed placeholder before the first real 3DGS export"}'::jsonb
)
on conflict (scene_id, version) do update set
  status = excluded.status,
  renderer = excluded.renderer,
  source_format = excluded.source_format,
  runtime_format = excluded.runtime_format,
  training_metadata = excluded.training_metadata;

insert into public.capture_sessions (
  id,
  place_id,
  scene_id,
  device,
  capture_mode,
  captured_at,
  notes,
  raw_asset_key,
  status
) values (
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'iPhone 14 Pro',
  'video',
  now(),
  'Lab capture from gate to main room. Use this row to verify the admin pipeline before renting GPU.',
  'raw-captures/home-test-room/iphone14pro-gate-to-room.mov',
  'processing'
)
on conflict (id) do update set
  place_id = excluded.place_id,
  scene_id = excluded.scene_id,
  device = excluded.device,
  capture_mode = excluded.capture_mode,
  captured_at = excluded.captured_at,
  notes = excluded.notes,
  raw_asset_key = excluded.raw_asset_key,
  status = excluded.status;

insert into public.processing_jobs (
  id,
  capture_session_id,
  scene_version_id,
  provider,
  gpu_type,
  toolchain,
  status,
  config,
  log_key,
  started_at
) values (
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000301',
  'runpod',
  'RTX 4090',
  'nerfstudio-splatfacto-gsplat',
  'queued',
  '{"target":"first room-size lab scene","expected_output":"PLY -> SuperSplat -> SOG"}'::jsonb,
  'processing/home-test-room/runpod-first-train.log',
  null
)
on conflict (id) do update set
  capture_session_id = excluded.capture_session_id,
  scene_version_id = excluded.scene_version_id,
  provider = excluded.provider,
  gpu_type = excluded.gpu_type,
  toolchain = excluded.toolchain,
  status = excluded.status,
  config = excluded.config,
  log_key = excluded.log_key,
  started_at = excluded.started_at;
