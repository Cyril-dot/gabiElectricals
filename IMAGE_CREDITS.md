# Image & Artwork Credits

All product and hero artwork served from `/public/images/**` is **self-hosted** — no hotlinking.

## AI-generated photorealistic catalog (current build)

- `public/images/products/<slug>-{1,2,3}.webp` — three photorealistic studio photos per product (74 products): front hero shot, three-quarter detail view, and in-use context scene. Clean light-gray studio background, consistent catalog art direction.
- `public/images/hero/hero-{wiring,solar,technician}.webp` — wide homepage banners: electrician wiring a distribution board, rooftop solar at golden hour, technician with clamp meter.
- `public/images/services/<service-slug>.webp` — one scene photo per bookable service (12 services).
- `public/images/uploads/transfer-proof-sample.webp` — sample payment-proof image used by the demo payment record.
- License: owned by GabiElectricals (generated work, no third-party content). Free to use commercially.
- Note: these are AI-generated product *representations*, not manufacturer photography. They are consistent, on-brand catalog imagery. When swapping in real manufacturer or studio photos, keep the same filenames/paths (or update via Admin → Products) and record the source below.

## Replacing with real photography before/at go-live (recommended path)

1. Search sources with commercial-free licenses: Unsplash (`unsplash.com/license`), Pexels (free), Pixabay (free), Wikimedia Commons (filter: CC0 / CC-BY-SA, note attribution).
2. Suggested queries: “electrician working Ghana”, “African electrician wiring”, “solar panel installation Africa”, “distribution board wiring”, “copper cable roll”, “LED panel ceiling”, “inverter battery room”, “Accra shopfront”, “West African technician portrait”.
3. Convert: `cwebp -q 78 -resize 1280 in.jpg -out out-1280.webp` (+ 640/960 variants), place under `public/images/products/<slug>/`, update the `images` JSON on the product via admin.
4. Add each photo below with source + license + author.

| File | Subject | Source | License | Author |
|------|---------|--------|---------|--------|
| (add entries when photos are swapped in) | | | | |

## Icons & fonts

- UI glyphs: inline SVG drawn by this project.
- Emoji used decoratively (system font).
- Fonts: **Manrope** and **Plus Jakarta Sans** — Google Fonts, OFL license, self-hosted via `next/font` at build time.
