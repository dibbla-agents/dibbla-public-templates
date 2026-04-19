# Landshypotek Brand Colors

Reference screenshot: `landshypotek-theme.png`

## Primary Palette

| Token                     | Hex       | Usage                                                      |
|---------------------------|-----------|-------------------------------------------------------------|
| `landshypotek-teal`       | `#3890AB` | Goose mark, link underlines, primary accent                 |
| `landshypotek-teal-dark`  | `#5A8BA4` | Top banner stripe, muted header backgrounds                 |
| `landshypotek-brown`      | `#6F2F1B` | Wordmark, headings, body copy, breadcrumb text              |
| `landshypotek-gold`       | `#C9A055` | CTA buttons ("Logga in"), highlight accents                 |
| `landshypotek-sand`       | `#F2E9DC` | Breadcrumb strip, soft surfaces, alt row backgrounds        |
| `landshypotek-white`      | `#FFFFFF` | Page background                                             |

## Tailwind Theme Tokens

```css
@theme {
  --color-landshypotek-teal: #3890AB;
  --color-landshypotek-teal-dark: #5A8BA4;
  --color-landshypotek-brown: #6F2F1B;
  --color-landshypotek-gold: #C9A055;
  --color-landshypotek-sand: #F2E9DC;
  --color-landshypotek-white: #FFFFFF;
}
```

## Notes

- Warm, traditional Swedish bank feel — two-tone petrol blue + earthy brown, with a gold CTA.
- Logo is a raster PNG lockup (flying goose + "Landshypotek Bank" wordmark) with transparent background. See `LandshypotekLogo.tsx` — it renders an `<img>` and imports `landshypotek-logotyp.png` from this folder, so both files must travel together when the component is copied into `frontend/src/components/`.
- Body background is white; the sand tone carries secondary surfaces (breadcrumbs, section dividers).
- Primary CTA colour is gold, not teal — teal is reserved for brand mark and link accents.
- Hex values are eyedropper estimates from the reference screenshot; refine if official brand values become available.
