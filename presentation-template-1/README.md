# Dibbla Presentation Template

A corporate slide deck template built with **React**, **TypeScript**, and **Tailwind CSS**. Slides are fixed at 1920x1080, scaled to fit the viewport. Navigate with arrow keys or click left/right zones. Deployable via `dibbla deploy`.

## Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 (built with Vite)
- **PDF Export:** Playwright + pdf-lib (captures each slide, merges into one PDF)
- **Deployment:** Docker (multi-stage: node build + nginx serve), port 80

## Project Structure

```
├── src/
│   ├── slides/           # Slide components organized by section
│   │   ├── intro/        # Title, about, opportunity, enablers
│   │   ├── usecases/     # Case study slides + section divider
│   │   └── outro/        # Offer, pricing, next steps
│   ├── components/       # SlideLayout, Navigation, SectionDivider
│   ├── hooks/            # useKeyboardNavigation, useSlideScaling
│   ├── contexts/         # ExportContext (for PDF generation)
│   └── types/            # SlideConfig, SlideSection
├── scripts/generate-pdf.ts  # PDF generator (Playwright)
├── Dockerfile            # Multi-stage: node build + nginx serve
├── nginx.conf            # SPA routing, gzip, caching
└── dibbla-task.yaml      # Build/dev pipeline
```

## Run Locally

```bash
npm install
npm run dev              # http://localhost:5173
```

## Build

```bash
npm run build            # Output: dist/
```

## Generate PDF

```bash
npm run generate-pdf:full   # Starts server, captures slides, saves to public/
```

## Run with Docker

```bash
docker build -t presentation .
docker run -p 80:80 presentation
```

## Theming

Edit `src/index.css` to change the color scheme. Three CSS variables control the entire theme:

```css
@theme {
  --color-accent: #1e40af;      /* Brand/accent color */
  --color-primary-bg: #ffffff;   /* Slide background */
  --color-card-bg: #f1f5f9;     /* Card background */
}
```

## Adding Slides

1. Create a new `.tsx` component in `src/slides/<section>/`
2. Import and add to the `SLIDES` array in `src/slides/index.ts`
3. Use `<SlideLayout>` for consistent padding and title rendering

## How It Works

1. Vite builds the React frontend into `dist/`.
2. Nginx serves the static files with SPA fallback routing.
3. Slides are fixed at 1920x1080, CSS-scaled to fit any viewport.
4. Arrow keys, click zones, and progress dots handle navigation.
5. Export mode (`?export=true`) disables nav for PDF capture.
