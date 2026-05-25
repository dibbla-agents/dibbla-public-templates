# Centigo Brand Colors

Reference screenshot: `centigo-theme.png`

## Primary Palette

| Token              | Hex       | Usage                                              |
|--------------------|-----------|-----------------------------------------------------|
| `centigo-green`    | `#2B6B5A` | Primary brand green — buttons, accents, stat bar    |
| `centigo-green-dark` | `#1F4F43` | Hover state / darker green variant                 |
| `centigo-black`    | `#1A1A1A` | Logo, nav text, headings, body text                 |
| `centigo-gray`     | `#F5F5F5` | Light background for cards, table headers           |
| `centigo-border`   | `#E5E5E5` | Borders, dividers                                   |

## Tailwind Theme Tokens

```css
@theme {
  --color-centigo-green: #2B6B5A;
  --color-centigo-green-dark: #1F4F43;
  --color-centigo-black: #1A1A1A;
  --color-centigo-gray: #F5F5F5;
  --color-centigo-border: #E5E5E5;
}
```

## Notes

- Light mode design — white backgrounds, dark text
- The green is a muted forest/teal green, NOT a bright green
- Used for CTAs ("Boka Mote", "Kontakta Oss"), the stats section background, and hover accents
- Logo is a clean black sans-serif wordmark (see `CentigoLogo.tsx` in this folder)
- Overall feel: professional, clean, Scandinavian minimalism — white and airy
