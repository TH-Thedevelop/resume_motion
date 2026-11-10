# CLAUDE.md — Motion Portfolio ("The Street")

## What this is
Nguyen Thien Bui's portfolio, built as a 2D night street in Little Saigon. Each project is a
storefront. Scrolling sideways walks the street; clicking a door "enters" the store and
opens the project's case study. Unfinished projects appear as a construction lot labeled
"Next build" (never named until they're done).

Owner context: CS student transferring to CSULB, 4 years working the counter at a
Vietnamese restaurant (Toast POS). Positioning line: "Software built from the counter side."

## Stack
- Next.js 16.4.5 (App Router) + TypeScript (strict), with `cacheComponents` and `partialPrefetching` on.
  This version differs from older Next.js: read the relevant guide in `node_modules/next/dist/docs/` before writing routing or caching code (see AGENTS.md).
  With `cacheComponents`, routes you navigate away from stay mounted inside a hidden `<Activity>`, so effects clean up and re-run but state survives.
- Tailwind CSS for layout/spacing; CSS variables for color tokens
- Motion for React: `npm install motion`, import from `"motion/react"` (NOT `framer-motion`)
- Deploy: Vercel

## Architecture
This is the target structure. Check the phase list below for what exists so far.
```
app/
  layout.tsx              # Server component (exports metadata): <MotionProvider>, fonts, {children}{modal}
  page.tsx                # The street (server component that renders <PixelStreet/>)
  classic/page.tsx        # Plain, no-animation list of all projects (recruiter fast path)
  work/[slug]/page.tsx    # Full interior page (direct visits, shared links, SEO)
  @modal/default.tsx      # returns null
  @modal/(.)work/[slug]/page.tsx  # Intercepted route: interior opens OVER the street
components/
  MotionProvider.tsx      # "use client"; <MotionConfig reducedMotion="user">, keeps layout.tsx a server component
  site/SiteHeader.tsx     # name, Classic view, Résumé, Contact (<details>); on every page
  site/ContactLinks.tsx   # email, phone, GitHub from content/site.ts
  street/PixelStreet.tsx  # "use client"; canvas, game loop, input, plus the real HTML links
  intro/IntroSequence.tsx # 5s launch intro; plays once per session
  interior/Interior.tsx   # case-study layout shared by modal + full page
  interior/InteriorModal.tsx # "use client"; native <dialog>, Motion enter/exit, Esc + "Leave store" → router.back()
content/projects.ts       # single source of truth for every building
content/site.ts           # name, tagline, résumé path, public contact details
public/resume.pdf         # the résumé the header links to
lib/motion.ts             # durations, easings, springs, shared variants
lib/pixel/art.ts          # 256 x 144 screen size, fixed palette, sprites, pixel font
lib/pixel/scene.ts        # world layout, walking, shutters, all canvas drawing
```

### Why intercepting routes
The intercepted `@modal/(.)work/[slug]` route keeps the canvas street mounted underneath
while the interior panel opens over it. A direct visit to `/work/[slug]` renders the full
page instead. Both use `<Interior/>`.

The canvas handles the world. Motion for React animates the HTML on top of it (interior
panel, header, transitions). Canvas doors are not DOM elements, so they cannot use `layoutId`.

Interception only happens on client-side navigation, so stores open with `router.push` or
`next/link`, never a plain `<a>`.

## Data model (content/projects.ts)
```ts
export type Project = {
  slug: string;                 // "chef-nourish"
  name: string;                 // "Chef Nourish"
  kind: string;                 // shown above the name in the store: "Client project"
  sign: string;                 // neon text, uppercase, short: "CHEF NOURISH"
  building: "kitchen" | "shopfront" | "construction";
  status: "open" | "construction";
  palette: { neon: string; awning: string; brick: string };
  summary: string;              // one line
  problem: string;
  built: string;
  result: string;               // a number or a link; never invented
  stack: string[];
  links?: { live?: string; github?: string };
  images?: { src: string; alt: string }[];
};
```
Adding a project = adding an object. Finishing one = `status: "construction"` → `"open"`.
Never hard-code project content in components.

## Motion rules (lib/motion.ts is the only place these numbers live)
```ts
export const duration = { fast: 0.2, base: 0.4, slow: 0.8 };
export const ease = {
  out:   [0.22, 1, 0.36, 1],   // entrances
  inOut: [0.65, 0, 0.35, 1],   // things moving across the screen
};
export const spring = {
  snappy: { type: "spring", bounce: 0.25, duration: 0.5 },
  bouncy: { type: "spring", bounce: 0.4,  duration: 0.6 }, // buildings, CTA
};
```
1. Animate only `transform` and `opacity` (x, y, scale, rotate, opacity). Never width/height/top/left.
2. Entrances ease out, exits are faster than entrances.
3. One orchestrated moment per screen. Hover effects stay small (y: -6, scale ≤ 1.04).
4. Intro sequence total ≤ 5s, plays once per session (sessionStorage flag, wrapped in try/catch), and has a visible "Skip intro" button.
5. Respect reduced motion: `MotionConfig reducedMotion="user"` globally; `useReducedMotion()` to skip the intro and parallax entirely.
6. Components that use motion need `"use client"`. Keep pages as server components and pass data down.

### Intro beats (port from the Street Intro lab, which is not in this repo; this table is the spec until it is added)
| t (s) | Beat | Principle |
|---|---|---|
| 0.00–0.70 | ground scaleX 0→1 | ease-out |
| 0.45–1.57 | buildings rise, stagger 0.16 | stagger + spring overshoot |
| 1.65–2.53 | shutters scaleY [1, 1.06, 0] | anticipation |
| 2.20–3.40 | crane rotate [-14, 8, -3, 0] | follow-through |
| 2.35–3.25 | neon opacity [0,1,.15,1,.4,1], linear | texture |
| 3.00–3.94 | name letters, stagger 0.04 | letter stagger |
| 4.15–5.00 | CTA springs in, then hold | hold |

## Accessibility (non-negotiable)
- Every open store also has a real `<a href="/work/slug">` through `next/link` in the "Same stores, no game" row, outside the canvas (works without JS, middle-click, back button, screen readers).
- Walking works by keyboard (only while the canvas has focus) and by on-screen buttons for mouse and touch. Do not hijack the wheel or capture keys globally.
- Visible focus ring on the canvas and links; in the modal, Esc and a "Leave store" button close it (`router.back()`). On the full `/work/[slug]` page, "Leave store" links to `/`, since `router.back()` could leave the site.
- Header always shows: name, "Classic view" link, Résumé, Contact.
- Text contrast ≥ 4.5:1 on the night palette.
- With reduced motion on, parallax is off and shutters snap open.

## Performance
- The scene is drawn in code on a 256 x 144 canvas from `lib/pixel/`, no image files for the scene unless sprites are added from Piskel or Aseprite.
- Case-study images use `next/image` with real `alt`.
- Lighthouse targets: Performance ≥ 90, Accessibility ≥ 95 on mobile.

## Design tokens
Night stage: night #0B1020, street #191F31, edge #39425E, sign #111727,
neon pink #FF5C9E, neon teal #45E3D2, neon amber #FFC24B, paper #F4F1EA, sub #A9B2C4.
Store interior (warm paper): bg #F3EBDD, fg #1A1712, muted #5C5446, line #CDBFA6, accent #B8336A.
Fonts: Bricolage Grotesque (display), IBM Plex Sans (body), IBM Plex Mono (labels), Silkscreen (pixel: store names and labels inside a store).

## Working agreements for Claude Code
- Build one phase at a time; don't start the next phase's features early.
  1. Static street: `content/projects.ts`, `lib/motion.ts`, design tokens, buildings (no animation)
  1b. Pixel street: `PixelStreet.tsx` and `lib/pixel/` replace the SVG/CSS street (walking, shutters, parallax)
  2. Door to interior: `/work/[slug]`, `@modal` interception, animated interior panel, `MotionProvider`
  3. Header (name, Classic view, Résumé, Contact) and `/classic`
  4. Intro sequence and neon flicker, reworked for the canvas
- After each change, run `npm run lint && npm run build` and fix errors before finishing.
- Explain any new Motion API you use in 1–2 lines in the PR/commit message, I'm learning it.
- Never invent results, metrics, or links in content/projects.ts; use `"[TODO]"`.
