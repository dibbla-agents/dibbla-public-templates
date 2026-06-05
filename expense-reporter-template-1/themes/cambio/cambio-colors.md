# Cambio Brand Colors

Reference screenshot: `cambio-theme.png`

Cambio is a Nordic healthcare-IT company ("A healthier tomorrow"). The look is
clean, light, and photography-forward, anchored by a single strong red against
near-black text on white.

## Primary Palette

| Token              | Hex       | Usage                                                          |
|--------------------|-----------|----------------------------------------------------------------|
| `cambio-red`       | `#BA0020` | Cambio red — the woven "C" mark, CTAs, links, accents          |
| `cambio-red-dark`  | `#8F0019` | Hover / pressed state for red buttons and links                |
| `cambio-ink`       | `#202020` | Wordmark, headings, body text (brand near-black)               |
| `cambio-gray`      | `#F6F6F6` | Light surface for cards, section bands, table headers          |
| `cambio-border`    | `#CCCCCC` | Borders, dividers, input outlines                              |
| `cambio-white`     | `#FFFFFF` | Page background, elevated surfaces                             |
| `cambio-gold`      | `#FFD96D` | Secondary warm accent — highlights, badges, subtle callouts    |

## Tailwind Theme Tokens

```css
@theme {
  --color-cambio-red: #BA0020;
  --color-cambio-red-dark: #8F0019;
  --color-cambio-ink: #202020;
  --color-cambio-gray: #F6F6F6;
  --color-cambio-border: #CCCCCC;
  --color-cambio-white: #FFFFFF;
  --color-cambio-gold: #FFD96D;
}
```

## Notes

- Light mode design — white backgrounds, near-black (`cambio-ink`) text.
- `cambio-red` (`#BA0020`, Pantone 3517 C) is the single hero colour: use it for
  primary CTAs, the logo mark, link accents, and active states. Don't flood
  large areas with it — it reads best as a sharp accent on white.
- `cambio-gold` is a sparing secondary accent only; red leads.
- Logo is a raster PNG lockup (black `CAMBIO` wordmark + red woven `C` mark) with
  a transparent background. See `CambioLogo.tsx` — it renders an `<img>` and
  imports `cambio-logotyp.png` from this folder, so both files must travel
  together when the component is copied into `frontend/src/components/`.
- The wordmark is black, so render the logo on light surfaces only
  (`cambio-white` / `cambio-gray`). No white/negative logo variant ships with
  this theme; on a dark surface the wordmark would vanish.
- Overall feel: trustworthy, modern, clinical-clean — generous white space,
  sans-serif type, photography-forward.
