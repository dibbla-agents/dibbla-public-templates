---
name: presentation
description: Create, manage, and deploy slide deck presentations. Use when the user wants to add/remove slides, re-theme a presentation, generate a PDF, scaffold a new presentation, or understand the slide architecture.
---

# Presentation Template

A corporate slide deck built with React 19, TypeScript, Tailwind CSS 4, and Vite 7. Slides are fixed at 1920x1080 and CSS-scaled to fit any viewport. No framer-motion — all interactions are pure CSS.

## Commands at a glance

| Task | Command |
|------|---------|
| Dev server | `npm run dev` → http://localhost:5173 |
| Build | `npm run build` → `dist/` |
| Generate PDF | `npm run generate-pdf:full` |
| Deploy | `dibbla deploy --alias <name>` |
| Update deploy | `dibbla deploy --alias <name> --update` |

## Slide architecture

- Each slide is a React component wrapping `<SlideLayout title="..." subtitle="...">`.
- Slides are registered in `src/slides/index.ts` as a `SlideConfig[]` array — this controls slide order.
- Slides are organized by section in `src/slides/<section>/` folders.
- `SlideSection` type: `'intro' | 'usecases' | 'outro'`. Section breaks use `<SectionDivider>`.
- Slide frame is fixed at 1920x1080, scaled to viewport via `useSlideScaling` hook.

### Adding a slide

1. Create a `.tsx` component in `src/slides/<section>/`
2. Wrap content in `<SlideLayout title="..." subtitle="..." centerContent>`
3. Import and add to the `SLIDES` array in `src/slides/index.ts`

### Slide patterns available in template

- **Title slide** — logo, company name, tagline, date
- **Text-heavy** — narrative paragraphs with accent bar
- **Icon + text rows** — vertical list with icons and descriptions
- **Metric cards** — 3-column grid with icon, number, description
- **Numbered details** — ordered breakdown with checkmark value items
- **Two-column grid** — side-by-side cards for features/offerings
- **CTA cards** — call-to-action closing slide
- **Section divider** — clean break between sections

## Theming

Edit `src/index.css` `@theme` block — three CSS variables control the entire look:

```css
@theme {
  --color-accent: #1e40af;      /* Brand/accent color */
  --color-primary-bg: #ffffff;   /* Slide background */
  --color-card-bg: #f1f5f9;     /* Card background */
}
```

All components use semantic Tailwind classes (`bg-accent`, `text-accent`, `bg-primary-bg`, `bg-card-bg`). Text uses the `slate-*` scale (slate-900 primary, slate-600 secondary, slate-400 muted).

To re-theme: change these 3 values. No other files need editing for basic color changes.

## PDF generation

```bash
npm run generate-pdf:full   # Starts server, captures slides, merges to PDF
```

- Uses Playwright + pdf-lib to navigate each slide and capture as PDF page
- Output: `public/presentation.pdf`
- Requires Playwright + Chromium (installed via npm dependencies)
- The `?export=true` query param triggers export mode (hides nav for capture)
- To use a custom port: `PDF_BASE_URL=http://localhost:5174 npx tsx scripts/generate-pdf.ts`

## PDF download button

`App.tsx` has a download button that serves `/presentation.pdf`. The PDF must be generated before it works. If the PDF is missing, the button downloads the SPA fallback HTML instead.

## Deployment

Each presentation deploys as its own containerized app:

```bash
dibbla deploy --alias my-presentation          # First deploy
dibbla deploy --alias my-presentation --update  # Rolling update
```

Available at `https://<alias>.dibbla.com`. Uses multi-stage Docker (node build + nginx serve) on port 80.

## Key files

| File | Purpose |
|------|---------|
| `src/slides/index.ts` | Slide order and registration |
| `src/index.css` | Theme variables (`@theme` block) |
| `src/components/SlideLayout.tsx` | Slide wrapper (padding, title, accent bar) |
| `src/components/Navigation.tsx` | Progress dots |
| `src/components/SectionDivider.tsx` | Section break component |
| `src/hooks/useKeyboardNavigation.ts` | Arrow keys, click zones |
| `src/hooks/useSlideScaling.ts` | 1920x1080 viewport scaling |
| `src/contexts/ExportContext.tsx` | Detects `?export=true` for PDF mode |
| `scripts/generate-pdf.ts` | Playwright PDF generator |
| `Dockerfile` | Multi-stage: node 22 build + nginx alpine |
| `nginx.conf` | SPA routing, gzip, cache headers |
| `dibbla-task.yaml` | Build/dev pipeline for Dibbla desktop app |
