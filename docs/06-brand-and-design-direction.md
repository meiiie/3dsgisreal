# Brand And Design Direction

Last reviewed: 2026-06-02.

## Product Personality

The product should feel like a trusted spatial guide to real places in Vietnam.

It should not feel like:

- a crypto/metaverse product
- a generic AI demo
- a heavy travel landing page
- a game UI unless the user is inside an interactive scene

It should feel:

- local
- precise
- calm
- useful for students
- visually rich when the user enters a scene
- operational and searchable on the map/admin side

## Design Style

Recommended style: modern Vietnamese cartographic utility.

Principles:

- The map is dense but readable.
- The viewer is immersive and full-bleed.
- UI panels are restrained and practical.
- Real scene thumbnails/posters do the emotional work.
- Do not use decorative gradient blobs or generic 3D illustrations.
- Use photo/scan assets as the main visual identity once available.
- Do not ship AI-slop UI: generic hero sections, random dashboard cards, fake metrics, meaningless badges, nested cards, tiny labels, or decorative visuals that do not help the map/viewer workflow.

Visual language:

- Base colors: warm off-white, ink black, muted map gray.
- Primary accent: deep green, close to street/wayfinding signage.
- Secondary accent: warm clay/orange for active markers and "enter" actions.
- Optional accent: civic blue for verified/official markers.
- Shape: small radius, utilitarian panels, clear icons.
- Typography: clean sans-serif with Vietnamese diacritics support; avoid futuristic fonts.

Product screens:

- Explorer/map: search, filters, category layers, place cards, scene readiness.
- Place page: real photos, capture status, scene versions, trust info.
- Viewer: minimal HUD, return button, compass/minimap, hotspot drawer, audio/quiz controls.
- Admin: capture sessions, processing jobs, asset versions, map placement, approval status.

Quality bar:

- Every screen should have a real job.
- Every panel should have a reason to exist.
- Every repeated card/list item should carry distinct useful data.
- Every mobile layout must be readable without zoom.
- Empty/loading/error states should feel designed, not bolted on.
- If a screen looks like a generic AI-generated SaaS/dashboard template, redesign it before implementation is considered done.

## Naming Direction

The name should work before people understand "3D Gaussian Splatting". It should say: this lets you enter real places.

Best working names:

1. Loi Vao
   - Meaning: the entrance.
   - Strong fit because scenes often start from a gate, alley, storefront, or room entrance.
   - Flexible for tourism, rentals, cafes, schools, museums.
   - Logo can be a map pin becoming a doorway.

2. Ngo 3D
   - Meaning: alley/urban passage.
   - Very Vietnamese, strong for Hanoi/Hai Phong/student/rental use.
   - Slightly narrower; may feel less suitable for heritage sites or large venues.

3. Mot Vong
   - Meaning: take a walk/one round.
   - Friendly for students and local exploration.
   - Less precise for rental/room inspection.

4. Vao Day
   - Meaning: come in / enter here.
   - Memorable and conversational.
   - More playful, less formal.

5. Dia Canh
   - Meaning: place/landscape/scene.
   - More premium and cultural.
   - Slightly abstract.

Recommended working title: Loi Vao.

The repo can remain `tro` for now, but product-facing copy should use `Loi Vao` until we verify domain/social availability.

Delegated naming rule:

- If the user does not want to decide naming details during a goal, Codex may choose the strongest working name and continue.
- Prefer names that fit real-place entry, Vietnamese local context, student usefulness, and future tourism/rental expansion.
- Record the chosen name and rationale here instead of pausing the goal for minor naming decisions.

## Logo Direction

Recommended logo concept:

```text
map pin + doorway + perspective path
```

Execution:

- Simple line mark.
- Pin outline contains a doorway or rectangular portal.
- A short perspective line suggests walking in.
- Works as app icon, map marker, favicon, and watermark on scene posters.
- Avoid literal VR headset, camera lens, or "3D" text in the mark.

Color versions:

- Primary: deep green mark on off-white.
- Active: clay/orange marker for selected place.
- Monochrome: black/white for watermark and admin.

Logo and generated-image rule:

- Use `brandkit` and/or `imagegen` to create logo, brand boards, app icon, scene posters, and complex visual concepts.
- If an image intentionally contains text, typography, labels, or a wordmark, generate the complete image with the text as part of the image direction.
- Do not generate only a background and then add important text later with a script or quick overlay. That path is visually weak and should be avoided for logo/brand/mockup work.
- Script/code text is still appropriate for real app UI implementation, but not for final generated brand images or visual concept boards.

## Copy Tone

Use plain Vietnamese. Avoid technical language in user-facing UI.

Good UI words:

- Mo khong gian
- Vao xem
- Tu cong vao
- Di tiep
- Diem dung
- Nghe gioi thieu
- Kiem tra phong
- Luu dia diem
- Bao loi scan

Avoid:

- Gaussian
- splat
- neural rendering
- point cloud
- metaverse
- photorealistic unless used in technical/admin docs

## Long-Term Visual Identity

Once real captures exist, every place should have:

- poster image from the entry viewpoint
- small route diagram, e.g. Cong -> Ngo -> Phong
- quality badge: draft, verified, mobile-friendly
- capture date
- privacy/permission status

The brand should earn trust through accurate place data, scene quality, and useful student workflows, not through flashy visual effects.
