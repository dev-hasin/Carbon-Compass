---
kind: frontend_style
name: Tailwind-based Dark Geospatial Design System
category: frontend_style
scope:
    - '**'
source_files:
    - frontend/tailwind.config.js
    - frontend/src/index.css
    - frontend/postcss.config.js
    - frontend/package.json
    - frontend/src/components/RiskBadge.tsx
    - frontend/src/components/ScoreBar.tsx
    - frontend/src/components/MetricCard.tsx
    - frontend/src/components/AppHeader.tsx
    - frontend/src/pages/LandingPage.tsx
---

## What system/approach is used

The frontend styling stack is built around **Tailwind CSS v3** with PostCSS and Autoprefixer, configured in a Vite + React (TypeScript) project. There is no CSS-in-JS library or component UI kit — all visual presentation is expressed as Tailwind utility classes plus a small set of custom CSS rules in `src/index.css`. The design follows a **dark-mode-first geospatial / intelligence-dashboard aesthetic**, explicitly referenced against Figma designs under `Figma design/`.

## Key files and packages

- `frontend/tailwind.config.js` — central theme definition: custom color palette (`carbon-*`, `accent-*`, `risk-*`), font family (`Inter`), and shared `boxShadow` tokens (`card`, `glow`).
- `frontend/src/index.css` — global styles: CSS custom properties for design tokens, Leaflet dark-theme overrides, scrollbars, keyframe animations (`radar-sweep`, `pulse-dot`, `fade-up`), and print media rules that invert the dark theme for shareable reports.
- `frontend/postcss.config.js` — wires Tailwind and Autoprefixer into the build pipeline.
- `frontend/package.json` — declares Tailwind, PostCSS, Autoprefixer, Leaflet, react-leaflet, and leaflet.heat as dependencies; Vite is the dev/build tool.
- `frontend/src/components/RiskBadge.tsx` — maps risk bands (`low`, `medium`, `high`, `unknown`) to consistent chip/panel variants using the `risk-*` color tokens.
- `frontend/src/components/ScoreBar.tsx` — renders weighted risk bars using the same band-to-color mapping from `../utils/risk` (`BAND_HEX`).
- `frontend/src/components/MetricCard.tsx` — reusable metric card following the carbon surface/border/accent conventions.
- `frontend/src/components/AppHeader.tsx` — sticky header using `backdrop-blur`, `bg-carbon-900/90`, and accent glow.
- `frontend/src/pages/LandingPage.tsx` — hero section uses the `.geo-grid` background class defined in `index.css`.

## Architecture and conventions

1. **Design-token layer**: Colors are declared once in `tailwind.config.js` as extended tokens (`carbon.950..800`, `accent.DEFAULT/dim/soft`, `risk-green/-amber/-red` and their `-soft` variants) and mirrored as CSS custom properties (`--bg`, `--surface`, `--surface-raised`, `--accent`, `--text-primary`, `--text-muted`, `--border`, `--risk-*`) in `:root` so they can be consumed via inline `style` where needed (e.g., dynamic bar widths).
2. **Dark-mode-only baseline**: The app ships with a fixed dark palette; `darkMode: 'class'` is enabled but no light-mode overrides exist in the codebase. All surfaces use `carbon-800`/`carbon-700`/`carbon-600`, borders use `carbon-700`, and text uses `slate-100`/`slate-400`/`slate-500`.
3. **Risk semantics are centralized**: Risk colors are never hard-coded per component. `RiskBadge.tsx` and `ScoreBar.tsx` look up band-to-class/color mappings from `../utils/risk` (`BAND_LABELS`, `BAND_HEX`, `bandOfScore`), ensuring consistent traffic-light semantics across chips, panels, bars, and map markers.
4. **Leaflet integration**: Custom CSS in `index.css` restyles Leaflet controls, popups, and attribution to match the dark theme (dark backgrounds, cyan links, muted text). Heatmap overlays use the same palette.
5. **Animation vocabulary**: Three named keyframes live in `index.css` — `animate-radar-sweep` (rotating radar effect), `animate-pulse-dot` (pulsing status dot), `animate-fade-up` (staggered entry). Components compose these rather than defining ad-hoc `@keyframes`.
6. **Print output**: A `@media print` block neutralizes the dark theme, forces white backgrounds, hides `.no-print` elements, and applies a `.print-plain` modifier for report sections — keeping generated PDFs readable.
7. **Responsive strategy**: Purely utility-driven via Tailwind breakpoints (`sm:`, `md:`, `lg:`) — e.g., `hidden md:flex` for nav visibility, `grid-cols-1 md:grid-cols-3` for module cards, `px-4 sm:px-6 lg:px-8` for page padding. No separate mobile stylesheet.
8. **Component composition pattern**: Presentational components accept minimal props and render full styled blocks (e.g., `MetricCard` takes `label`, `value`, `icon`, optional `valueClass`/`sublabelClass`; `RiskBadge` takes `band`, `score`, `variant`). Pages assemble pages from these primitives rather than scattering layout logic.

## Conventions and constraints

- **Colors must come from the token palette**: All visible colors reference `carbon-*`, `accent-*`, `risk-*`, or `slate-*` utilities; raw hex values appear only inside `tailwind.config.js` and `index.css` tokens.
- **Risk bands are the single source of truth for risk coloring**: New components should derive color from `bandOfScore`/`BAND_HEX` rather than branching on numeric thresholds inline.
- **Surface hierarchy**: Backgrounds use `bg-carbon-900` (page), `bg-carbon-800` (cards), `bg-carbon-700` (borders, tracks); raised surfaces use `bg-carbon-850` (landing feature cards). Borders consistently use `border-carbon-700`.
- **Typography**: Font family is locked to `Inter, system-ui, -apple-system, sans-serif` via both Tailwind config and body rule; headings use `font-bold`/`tracking-tight`, labels use `uppercase tracking-widest` at small sizes.
- **Shadows**: Only the two custom shadows `shadow-card` and `shadow-glow` are used; no arbitrary `box-shadow` values are scattered in components.
- **Leaflet must be themed**: Any new map usage inherits the dark overrides in `index.css`; custom Leaflet popups/controls should follow the established dark color scheme.
- **Animations are limited to the three named ones**: Use `animate-radar-sweep`, `animate-pulse-dot`, or `animate-fade-up` instead of creating new keyframes in components.
- **Report/print mode**: Elements that should not appear in exported reports should carry the `no-print` class; printable content should use `print-plain` to force light-mode rendering.