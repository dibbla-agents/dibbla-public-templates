# Kivra Brand Colors

Reference screenshot: `kivra-theme.png`

## Primary Palette

| Token                  | Hex       | Usage                                                          |
|------------------------|-----------|-----------------------------------------------------------------|
| `kivra-lime`           | `#ACD881` | Signature bright olive-lime — primary page surface              |
| `kivra-green`          | `#54A338` | Primary CTAs, action buttons, links                             |
| `kivra-green-deep`     | `#003004` | Top nav strip, wordmark, headings, dark UI accents              |
| `kivra-cream`          | `#E5D8C3` | Card surfaces, cookie consent, secondary panels                 |
| `kivra-ink`            | `#0A1A0A` | Body text (slightly green-tinted black)                         |
| `kivra-white`          | `#FFFFFF` | Elevated surfaces, modals, inputs                               |

## Tailwind Theme Tokens

```css
@theme {
  --color-kivra-lime: #ACD881;
  --color-kivra-green: #54A338;
  --color-kivra-green-deep: #003004;
  --color-kivra-cream: #E5D8C3;
  --color-kivra-ink: #0A1A0A;
  --color-kivra-white: #FFFFFF;
}
```

## Notes

- Bright, modern Swedish digital-mailbox brand — distinctive olive-lime green page surface with near-black forest green for navigation, wordmark, and headings.
- The defining choice is `kivra-lime` (`#ACD881`) as the primary surface — *not* white. This is what gives Kivra its instantly-recognisable feel; resist swapping it for a neutral background.
- Logo is a raster PNG wordmark in deep forest green with a transparent background. See `KivraLogo.tsx` — it renders an `<img>` and imports `kivra-logotyp.png` from this folder, so both files must travel together when copied into `frontend/src/components/`.
- Primary CTAs use `kivra-green` (`#54A338`) — a medium grass green that pops against the lime surface. The deeper `kivra-green-deep` is for the top nav strip, the wordmark, and headings.
- Cards and secondary surfaces (e.g. the cookie consent panel) sit on a warm cream (`kivra-cream`), not pure white. Pure white is reserved for elevated/modal surfaces.
- Hex values eyedroppered directly from kivra.se — refine if official brand values become available.
