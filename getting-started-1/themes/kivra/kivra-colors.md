# Kivra Brand Colors

Reference screenshot: `kivra-theme.png`

## Primary Palette

| Token                  | Hex       | Usage                                                          |
|------------------------|-----------|-----------------------------------------------------------------|
| `kivra-lime`           | `#ACD881` | Signature bright olive-lime — primary page surface              |
| `kivra-green`          | `#54A338` | Primary CTAs, action buttons, links                             |
| `kivra-green-deep`     | `#003004` | Top nav strip, dark UI accents — **also** the dark wordmark colour on light surfaces |
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

## Wordmark variants — pick by surface, not by brand colour

Two PNG variants ship with this theme. The dark and light wordmarks are otherwise identical.

| Variant | File | Render on |
|---|---|---|
| `dark` (default) | `kivra-logotyp.png` | `kivra-lime`, `kivra-cream`, `kivra-white` — any light surface |
| `light` | `kivra-logotyp-light.png` | `kivra-green-deep` — the deep-green nav strip, or any other dark surface |

> ⚠️ Do **not** render the dark wordmark on the deep-green nav strip. Both are `#003004` and the logo becomes invisible — a camouflaged result that's easy to ship by accident because the colour table above lists `kivra-green-deep` as both the nav strip *and* the wordmark colour. The surface determines the variant.

```tsx
// Light surface (default — most pages, app body)
<KivraLogo />

// Dark surface (top nav strip, footer over deep green)
<KivraLogo variant="light" />
```

## Notes

- Bright, modern Swedish digital-mailbox brand — distinctive olive-lime green page surface with near-black forest green for navigation, headings, and the dark wordmark.
- The defining choice is `kivra-lime` (`#ACD881`) as the primary surface — *not* white. This is what gives Kivra its instantly-recognisable feel; resist swapping it for a neutral background.
- Both PNG variants have transparent backgrounds. See `KivraLogo.tsx` — it imports both files and selects via the `variant` prop. All three files (component + both PNGs) must travel together when copied into `frontend/src/components/`.
- Primary CTAs use `kivra-green` (`#54A338`) — a medium grass green that pops against the lime surface. The deeper `kivra-green-deep` is for the top nav strip; reserve the bright green for accents.
- Cards and secondary surfaces (e.g. the cookie consent panel) sit on a warm cream (`kivra-cream`), not pure white. Pure white is reserved for elevated/modal surfaces.
- Hex values eyedroppered directly from kivra.se — refine if official brand values become available.
