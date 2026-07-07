---
name: OmniverseOS Responsive Overhaul
description: Architecture decisions for making OmniverseOS fully responsive across mobile/tablet/desktop while preserving the cyberpunk desktop OS experience.
---

## Strategy

### Hook: useBreakpoint
- `frontend/src/hooks/useBreakpoint.js` — SSR-safe hook using `window.innerWidth`
- Returns `{ isMobile, isTablet, isDesktop, width }` based on 768/1024 breakpoints
- Consumed by Window, Dock, TopBar, Desktop components

### Window behavior by breakpoint
- **Desktop/Tablet**: floating windows, draggable, resizable — unchanged
- **Mobile (<768px)**: windows snap to fullscreen within the padded layer (topbar 56px + dock 80px); drag disabled; minimize button hidden
- Implementation: override Framer Motion `animate` props to `x:0, y:0, width:vw, height:vh-152` when `isMobile`

### CSS architecture
- `frontend/src/styles/responsive.css` — imported last in `index.css` after Tailwind
- Uses `data-testid` selectors to target individual apps without modifying markup
- Mobile: `max-width: 767px`, Tablet: `768px–1023px`, Very small: `max-width: 359px`
- Sets `font-size: 16px !important` on inputs to prevent iOS auto-zoom

### App layout patterns
- **Sidebar apps** (Notes, Memory, FileManager): `flex-col sm:flex-row`, sidebar scrolls horizontally on mobile
- **Grid apps** (Finance, Music, Videos, ImageGen): `flex-col sm:grid sm:grid-cols-3`
- **Stat grids**: `grid-cols-2 sm:grid-cols-4` (2 on mobile, 4 on desktop)
- **Kanban** (Tasks): horizontal scroll container with `minWidth: min(720px, 100%)`
- **Calendar**: cells show dots on mobile instead of text labels

### Dock changes
- Mobile: icons `w-12 h-12` (48x48 touch target), `overflow-x: auto`, no magnification
- Desktop: unchanged (magnification on hover, `w-11 h-11`)

**Why:** Framer Motion uses inline styles for x/y/width/height, so responsive geometry must be in JS (not CSS). CSS selectors using data-testid avoid modifying app markup and keep the responsive layer isolated.

**How to apply:** When adding new apps, ensure they have a `data-testid` on the root element and add responsive overrides in `responsive.css`. For layout-heavy apps, use `flex-col sm:grid` pattern.
