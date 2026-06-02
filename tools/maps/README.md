# Map Tooling

Future scripts for Vietnam and Hai Phong map data.

Current local lab style:

```text
apps/web/public/map-styles/local-lab.json
```

This style is intentionally tile-free so local smoke tests do not depend on public demo map servers. It is a harness asset, not the final Hai Phong/Vietnam basemap.

Planned flow:

```text
Geofabrik Vietnam OSM PBF
  -> optional Hai Phong extract
  -> Planetiler
  -> PMTiles
  -> MapLibre style
  -> app map source
```

Keep generated `.pbf`, `.mbtiles`, and `.pmtiles` files out of git unless they are tiny fixtures.
