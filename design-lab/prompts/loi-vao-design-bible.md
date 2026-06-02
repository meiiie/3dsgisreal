# Loi Vao Design Bible

Last reviewed: 2026-06-02.

## Product

`Loi Vao` is a map-first product for entering real places through independent 3D Gaussian Splat scenes.

The core flow:

```text
Vietnam/Hai Phong map
  -> choose place
  -> inspect metadata/trust/route
  -> enter independent 3D scene
  -> return to map
```

## Visual Direction

Modern Vietnamese cartographic utility.

Keep the app:

- local
- precise
- calm
- student-useful
- map-first
- mobile-readable
- scene-led when real scans exist

Avoid:

- metaverse styling
- generic AI demo visuals
- purple-blue startup gradients
- decorative blobs/orbs
- tiny mobile text
- nested card clutter

## Palette

- Base: warm off-white
- Text: ink black
- Map neutral: muted gray
- Primary accent: deep green
- Active/entry accent: warm clay orange
- Optional verification accent: civic blue

## Shape And Surface

- small radii
- restrained panels
- sharp map markers
- utilitarian controls
- subtle texture only when it helps
- real photos/scans should carry emotion

## Typography

Use clean sans-serif typography with strong Vietnamese diacritics support.

Text should be short, direct, and readable.

## UI Language

Good user-facing Vietnamese:

- Mo khong gian
- Vao xem
- Tu cong vao
- Di tiep
- Diem dung
- Nghe gioi thieu
- Kiem tra phong
- Luu dia diem
- Bao loi scan

Avoid user-facing technical terms:

- Gaussian
- splat
- point cloud
- neural rendering
- metaverse

## Logo Direction

Core metaphor:

```text
map pin + doorway + perspective path
```

The mark should work as:

- app icon
- favicon
- map marker
- scene watermark
- poster stamp

## Image Generation Rule

For logo, wordmark, poster, brand board, and mobile concept images:

- generate the full intended image with typography/text inside the image when text is part of the concept
- do not create only a background and add important text later with a script or quick overlay
- save prompts and selected outputs in `design-lab/`
- promote only final selected assets into app public assets
