# DESIGN.md

Design system for the daily production-incident site (Next.js + MDX + Tailwind).
opencode: read this file before any UI work. Follow it exactly. Never hardcode colors, fonts, spacing, or radii; use the tokens below. If a rule is missing, extend this file rather than improvising.

> Note on values: the numbers below were estimated from screenshots of designeer.xyz (used as a style reference only). Before locking them in, open DevTools on the reference site and compare computed values (font-family, colors, padding, radius). Update the tokens here, and the rest of the app follows. Do not copy the reference site's logo, copy, or assets.

---

## 1. Principles

1. **Quiet and editorial.** The UI is a neutral frame. Content (the incident, the code, the diagrams) provides all the interest.
2. **Dense but airy.** Small type, generous whitespace, tight rows. Lots of information without feeling crowded.
3. **Structure through lines, not boxes.** Dashed hairlines, hatched gutters, and thin borders do the organizing. Avoid heavy cards and shadows.
4. **Engineered feel.** Monospace labels, index numbers, keycap hints, and counts make it feel like a tool built by an engineer.
5. **One accent, used rarely.** A soft blue tint for promotional or highlighted surfaces. Everything else is grayscale.
6. **Fast and calm.** Subtle 120-150ms transitions. No bounces, parallax, or scroll-jacking.

---

## 2. Design tokens

Put these in `app/globals.css` (Tailwind v4 `@theme`) or `tokens.css`. Light is the default; dark is via `prefers-color-scheme` plus a `data-theme` override.

```css
:root {
  /* Surfaces */
  --bg: #ffffff;
  --bg-subtle: #fafafa;        /* hover fill for rows */
  --bg-muted: #f4f4f5;         /* active pill, keycaps, inputs */
  --bg-tint: #f3f8fc;          /* soft blue promo surface */

  /* Text */
  --fg: #0a0a0a;               /* titles, active items */
  --fg-secondary: #404040;     /* body copy */
  --fg-muted: #737373;         /* descriptions, inactive nav */
  --fg-faint: #a3a3a3;         /* index numbers, separators, counts */

  /* Lines */
  --border: #e5e5e5;           /* dashed dividers, card borders */
  --border-strong: #d4d4d4;    /* hover / focus-adjacent borders */
  --hatch: #e9e9e9;            /* gutter stripe color */

  /* Accent (single) */
  --accent: #2b6cb0;           /* links, "Visit site"-style CTAs, SPONSORED-style labels */
  --accent-tint: #f3f8fc;      /* same as --bg-tint */
  --accent-border: #dbe8f3;

  /* Feedback (used only in rubric scoring and streaks) */
  --success: #15803d;
  --warning: #b45309;
  --danger: #b91c1c;

  /* Radii */
  --radius-sm: 6px;            /* keycaps, badges */
  --radius-md: 10px;           /* nav pills, list rows, inputs */
  --radius-lg: 16px;           /* cards, promo panel */
  --radius-full: 9999px;

  /* Shadows (nearly invisible) */
  --shadow-pill: 0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03);
  --shadow-card: 0 1px 2px rgba(0,0,0,0.04);

  /* Motion */
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 120ms;
  --dur: 180ms;
}

:root[data-theme="dark"] {
  --bg: #0b0b0c;
  --bg-subtle: #121214;
  --bg-muted: #1a1a1d;
  --bg-tint: #0e1620;

  --fg: #f5f5f5;
  --fg-secondary: #d4d4d4;
  --fg-muted: #8a8a8f;
  --fg-faint: #5c5c62;

  --border: #26262a;
  --border-strong: #3a3a40;
  --hatch: #1c1c20;

  --accent: #6aa9e8;
  --accent-tint: #0e1620;
  --accent-border: #1d3350;

  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #f87171;

  --shadow-pill: 0 1px 2px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
  --shadow-card: none;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* mirror the dark block above */ }
}
```

Rules:
- `body { background: var(--bg); color: var(--fg-secondary); }`. Titles use `--fg`.
- Never use pure-saturated colors, gradients on UI chrome, or additional accent hues.
- Contrast: body text and muted text must meet WCAG AA against their backgrounds. `--fg-faint` is for decorative or supplementary text only (index numbers, separators), never essential information.

---

## 3. Typography

**Fonts** (load with `next/font`, no external CSS requests):
- **Sans:** Geist Sans (fallback: Inter, system-ui, sans-serif). Used for all body and headings.
- **Mono:** Geist Mono (fallback: JetBrains Mono, ui-monospace, monospace). Used for labels, index numbers, keycaps, counts, metadata, and all code.

**Scale** (rem at 16px base):

| Role | Size / Line height | Weight | Font | Color |
|---|---|---|---|---|
| Site wordmark | 24px / 1.1 | 500 | Sans | `--fg`, with the TLD or suffix in `--fg-muted` |
| Page title (question title) | 32px / 1.15 | 600 | Sans | `--fg` |
| Section title | 20px / 1.3 | 600 | Sans | `--fg` |
| Row title | 15px / 1.4 | 500 | Sans | `--fg` |
| Body | 15-16px / 1.65 | 400 | Sans | `--fg-secondary` |
| Description / subtitle | 14px / 1.5 | 400 | Sans | `--fg-muted` |
| Mono label | 11-12px / 1.2, uppercase, letter-spacing 0.08em | 400-500 | Mono | `--fg-muted` |
| Index number ("01") | 12px | 400 | Mono | `--fg-faint` |
| Count (right-aligned in nav) | 12px, tabular-nums | 400 | Mono | `--fg-faint` |
| Keycap | 11px | 500 | Mono | `--fg-muted` |
| Code (inline) | 0.9em | 400 | Mono | `--fg` on `--bg-muted`, radius 4px, padding 2px 5px |

Rules:
- Headings use slightly tight tracking (`-0.01em` to `-0.02em`). Mono labels use wide tracking.
- Use `font-variant-numeric: tabular-nums` for all counts, streaks, scores, and dates.
- Sentence case everywhere except mono labels (uppercase).
- Max prose line length: 68ch.

---

## 4. Layout

### 4.1 Page shell
- The page is a **centered fixed-width shell** with the body background visible on both sides.
- Shell max-width: about 1100px (verify against the reference; the shell should feel narrow and focused on large monitors).
- On both sides of the shell sit **hatched gutters**: thin diagonal stripes framed by 1px solid `--border` lines. Hidden below the `lg` breakpoint.

```css
.gutter {
  width: 24px;
  border-inline: 1px solid var(--border);
  background-image: repeating-linear-gradient(
    135deg,
    var(--hatch) 0 1px,
    transparent 1px 6px
  );
}
```

- Inside the shell, two columns: **sidebar** (fixed ~300px) and **main pane** (fluid), separated by a 1px dashed `--border`.

### 4.2 Sidebar (desktop)
Sticky, full viewport height, padding 40px 32px, vertical stack:

1. **Avatar / logo mark:** a ~76px circular dithered orb (pixelated blue-violet gradient). For this site, generate a unique dithered orb or a simple mark, not the reference's image.
2. **Wordmark:** `sitename` in `--fg` plus a lighter suffix (e.g., `.dev`) in `--fg-muted`.
3. **Tagline:** 2-3 lines, 15px, `--fg`. Example: "One production incident a day. Diagnose the system, not the algorithm."
4. Dashed divider.
5. **NAVIGATION** (mono label), then nav items (see 6.1):
   - Today
   - Archive (count)
   - Topics (count)
   - Streak
   - About
6. **SECTIONS** (mono label): topic filters, each with a count. Examples: Databases, Networking, Concurrency, Caching, Observability, Queues.
7. Spacer, then a dashed divider pinned to the bottom, then a footer row: small icon buttons on the left, text links ("Newsletter", "Info") on the right in 14px `--fg-muted`.

### 4.3 Top bar (main pane)
Height ~76px, bottom dashed border, items vertically centered, padding-inline 40px.
- **Left:** `Subscribe` pill (replaces the reference's "Log in" because there are no accounts at launch) with a small user/mail icon, followed by a `+` icon button (e.g., "Suggest a topic").
- **Right:** search icon plus keycap `⌘ K`; a thin vertical divider; a second action plus keycap (e.g., `⌘ E` for "random question"); a divider; **view toggle** (list icon vs. 2x2 grid icon); theme toggle (sun/moon).
- Keyboard shortcuts are real, not decorative: `⌘/Ctrl+K` opens search, `⌘/Ctrl+E` opens a random archived question, `T` toggles theme.

### 4.4 Main content
- Padding: 40px horizontal, 40px vertical between blocks.
- Blocks are separated by 1px dashed `--border` lines that span the full width of the main pane (edge to edge, not inset).
- Promo/notice block sits at the top (see 6.6), then sections.

### 4.5 Responsive behavior
- **< 1024px:** hide gutters; sidebar collapses into a top bar with a menu button opening a sheet. Sections become horizontally scrollable pill filters.
- **< 640px:** padding 20px; grid becomes single column; keycap hints hidden (touch devices don't need them); top bar shows Subscribe, search, theme.
- Use `env(safe-area-inset-*)` for fixed bars on mobile.

---

## 5. Borders, lines, and surfaces

- **Dashed dividers:** `1px dashed var(--border)`. Use for section separation, sidebar blocks, and the sidebar/main split. This is the signature detail; use it consistently.
- **Solid hairlines:** `1px solid var(--border)` for cards, inputs, and gutter edges.
- **Cards:** `--bg`, 1px solid `--border`, `--radius-lg`, padding 8px around an inner thumbnail area with its own `--radius-md` (the reference's grid cards have a visible inset frame around the preview).
- **Shadows:** only `--shadow-pill` (active nav item) and `--shadow-card` (on hover for cards). Nothing heavier.
- **Focus ring:** `outline: 2px solid var(--accent); outline-offset: 2px`, with `--radius-md`. The reference shows a soft light-blue ring on focused buttons; use a 3px ring of `color-mix(in srgb, var(--accent) 25%, transparent)` as an alternative.

---

## 6. Components

### 6.1 Nav item
- Height 40px, padding 0 12px, radius `--radius-md`, gap 12px.
- Structure: 16px line icon (1.5px stroke, `--fg-muted`) + label (15px) + right-aligned count (mono 12px, `--fg-faint`).
- **Inactive:** label `--fg-muted`, transparent background.
- **Hover:** background `--bg-subtle`, label `--fg`.
- **Active:** background `--bg-muted` (or `--bg` with `--shadow-pill`), label `--fg` at weight 500, icon `--fg`.
- Section filters (topics) use the same pattern without icons, with a slightly larger left padding.

### 6.2 Mono section label
`NAVIGATION`, `SECTIONS`, `SYMPTOM`, `CONSTRAINTS`: mono 11-12px, uppercase, tracking 0.08em, `--fg-muted`, margin-bottom 12px.

### 6.3 Section header
Inline row: index number (`01`, mono, `--fg-faint`) + title (20px, 600, `--fg`) + description (14px, `--fg-muted`) on the same baseline, wrapping on small screens. Used to head each group in the archive (e.g., "01 Databases  Queries, indexes, and locks that go wrong.").

### 6.4 List row (archive, list view)
- Height 36-40px, padding 0 8px, radius `--radius-md`.
- Structure: 20px rounded-square icon or topic glyph, then bold title (15px, 500, `--fg`), then a dot separator (`·`, `--fg-faint`, 8px margin), then description (14px, `--fg-muted`, single-line ellipsis).
- Right side (optional): mono date and difficulty tag.
- Hover: `--bg-subtle`. Entire row is a link.
- Rows are packed tightly (no borders between them); spacing alone separates them.

### 6.5 Grid card (archive, grid view)
- Two columns in the main pane on desktop, one on mobile, 16px gap.
- Card: see section 5. Inside: an inset preview panel (aspect 16/10, `--bg-muted` background, `--radius-md`) showing a generated abstract diagram or the incident's title in a mono treatment; below it, title, and a mono footer (`Catalogue Entry` style): left topic, right date.
- Hover: border `--border-strong`, `--shadow-card`, no movement.

### 6.3b Toggle (view / theme)
Icon-only 32px buttons, radius `--radius-md`, icon `--fg-muted`, hover `--bg-muted` and `--fg`. The view toggle shows the icon of the mode you would switch to.

### 6.6 Promo / notice panel (the "sponsored" pattern)
Used for the morning-email signup and any announcement.
- Background `--bg-tint`, 1px solid `--accent-border`, `--radius-lg`, padding 28px 32px.
- Top row: small megaphone or mail icon in `--accent` + bold title (16px, `--fg`); right-aligned mono label in `--accent` (e.g., `NEWSLETTER`).
- Body: 16px `--fg-secondary`, max 2 lines.
- CTA: text link in `--accent`, weight 500, with a trailing `↗` or `→`.
- Only one such panel per page.

### 6.7 Keycap
Inline-flex, height 24px, min-width 24px, padding 0 6px, radius `--radius-sm`, background `--bg-muted`, mono 11px 500, `--fg-muted`. Symbols (`⌘`, `K`) are separate keycaps with 4px gap.

### 6.8 Buttons
- **Pill button (secondary, e.g., Subscribe):** height 32px, padding 0 12px, radius `--radius-md`, background `--bg-muted`, text 14px `--fg`; leading 16px icon.
- **Primary:** background `--fg`, text `--bg`, radius `--radius-md`, height 40px, padding 0 16px, weight 500. Use sparingly (Reveal solution, Submit).
- **Ghost:** transparent, `--fg-muted`, hover `--bg-muted`.
- No colored (blue/green) filled buttons.

### 6.9 Inputs and textareas
Background `--bg`, 1px solid `--border`, `--radius-md`, padding 12px 14px, 15px text. Focus: border `--fg-muted` plus the focus ring. The answer textarea uses mono placeholder text and autosizes.

### 6.10 Search (command palette)
`⌘K` opens a centered dialog: max-width 560px, `--radius-lg`, 1px solid `--border`, `--bg`, backdrop `rgba(0,0,0,0.4)` with slight blur. Input on top, results as list rows (6.4) below, grouped by mono labels, arrow-key navigation, `Esc` closes.

### 6.11 Tags and badges
Mono 11px uppercase, padding 2px 8px, radius `--radius-full`, 1px solid `--border`, `--fg-muted`. Difficulty variants may tint text only (never fill): easy `--success`, medium `--warning`, hard `--danger`.

---

## 7. Product-specific patterns

These extend the reference language to this site's features.

### 7.1 Today (home)
- Promo panel (morning email), then a section header `01 Today's incident`, then a single large incident card (not a grid): title, one-line symptom, topic and difficulty badges, primary button `Start diagnosing`.
- Below: `02 Recent` list rows (last 7 days), then a `View archive` ghost link.

### 7.2 Incident page
Single column, max-width 720px, centered within the main pane, generous vertical rhythm (32px between blocks). Blocks in order, each headed by a mono label:
1. `SYMPTOM`: what is broken, in plain prose, plus optional metrics snippet.
2. `CONSTRAINTS`: a bulleted list; each bullet has a mono key (`p99`, `RPS`, `Region`) in `--fg` and a value in `--fg-muted`.
3. `EVIDENCE`: code, logs, or graph blocks (see 8).
4. `YOUR TASK`: the "figure out why" prompt, in `--fg` at 17px.
5. **Predict step:** a segmented choice or short textarea for the cause guess, then a second textarea for the interview-style explanation. Primary button `Reveal solution` (disabled until the reader has typed something, with helper text in mono).
6. **Solution (after reveal):** fades in below (opacity and 8px translate, 180ms). Sections: `DIAGNOSIS`, `FIX`, `WHAT TO REMEMBER` (3 items).
7. **Rubric self-score:** three rows (Process, Correctness, Depth), each with a 0-3 segmented control (four small keycap-style buttons). Total shown in a mono `--fg` badge (`7 / 9`). No confetti or celebratory animation.

### 7.3 Streak
Small mono indicator in the sidebar footer or top bar: flame-free, e.g., `STREAK 12`. A contribution-style 7x N dot grid on the Streak page using `--bg-muted` (empty), `--fg-faint` (missed), `--fg` (done). Tabular numerals.

### 7.4 Archive
- Sticky filter row under the top bar: topic pills, difficulty, and sort. Uses the same pill styling as nav items.
- List view is the default; grid view via the toggle. Remember the choice in `localStorage` (no accounts).
- Groups use section headers (6.3) by topic, with counts.

### 7.5 Email signup
Inline in the promo panel: one email input plus a `Subscribe` primary button, side by side on desktop, stacked on mobile. Success state replaces the form with one line in `--fg-secondary`. No modals or popups.

---

## 8. Content and MDX styling

MDX prose lives in a `.prose-site` wrapper (do not use `@tailwindcss/typography` defaults unmodified).

- Paragraphs: 16px / 1.7, `--fg-secondary`, margin-bottom 1.25em.
- `h2`: 20px 600 `--fg`, margin-top 2em, with a leading mono index if it is a numbered section. `h3`: 16px 600.
- Links: `--accent`, underline on hover, `text-underline-offset: 3px`.
- Lists: 1.25em indent, marker color `--fg-faint`.
- Blockquote (used for interviewer prompts): 2px left border `--border-strong`, padding-left 16px, `--fg-muted`, italic off.
- **Code blocks:** background `--bg-subtle`, 1px solid `--border`, `--radius-md`, padding 16px, mono 13px / 1.6, horizontal scroll inside the block, filename or language as a mono label in the top-right in `--fg-faint`. Syntax theme: muted and low-saturation (e.g., Shiki with a GitHub light/dark style), never neon.
- **Callouts** (`<Note>`): tinted like the promo panel (6.6) but with a smaller radius (`--radius-md`) and no right-aligned label.
- **Tables:** no zebra striping; 1px dashed row borders, mono header row in uppercase 11px, tabular numerals.
- **Diagrams and graphs:** grayscale lines on `--bg-subtle` inside a bordered frame; use `--accent` for the single highlighted element (e.g., the bottleneck).
- Images: `--radius-md`, 1px solid `--border`, caption in mono 12px `--fg-muted`.

---

## 9. Motion

- Transitions on color, background, border, and opacity only: 120-180ms `--ease`.
- Page and reveal transitions: opacity 0 to 1 and translateY(8px) to 0, 180ms.
- Hover states never move layout. No scale transforms on cards.
- Respect `prefers-reduced-motion`: disable all transforms and keep opacity fades at 0ms.

---

## 10. Icons and imagery

- Icon set: Lucide (or Phosphor Light), 16px in nav and buttons, 1.5px stroke, `currentColor`.
- Topic glyphs and row icons: 20px rounded-square (radius 6px) tiles with a flat single-color or monochrome mark. Generate simple SVGs per topic; do not use third-party brand logos.
- Avatar/orb: a small dithered-gradient SVG or canvas (blue to violet), generated once and stored as a static asset.
- OG images: generated per question with `next/og`, white or near-black background, mono label, title in Sans 600, hatched border, same tokens.

---

## 11. Accessibility

- Semantic landmarks: `<nav>`, `<main>`, `<aside>`, `<header>`.
- All interactive elements keyboard reachable with a visible focus ring (section 5).
- Keycap hints are decorative (`aria-hidden`); the real shortcuts are documented in an "Info" dialog and via `aria-keyshortcuts`.
- Nav counts have `aria-label` ("Archive, 122 questions").
- Segmented controls and rubric use `role="radiogroup"` / `radio`.
- Minimum tap target 40px on touch devices, even where the visual size is 32px (use padding).
- Do not rely on color alone for difficulty or rubric state; always include text.

---

## 12. Implementation guide (Next.js)

- **Stack:** Next.js App Router, Tailwind CSS v4, `next/font` (Geist), `next-themes` for theme (attribute `data-theme`, default system), MDX via `@next/mdx` or Contentlayer/Velite, `cmdk` for the command palette, Shiki for code.
- **Tailwind mapping:** expose tokens as theme colors (`bg-bg`, `text-fg-muted`, `border-border`) so no raw hex appears in components.
- **Structure:**
  ```
  app/
    layout.tsx            # shell: gutters, sidebar, top bar
    page.tsx              # Today
    archive/page.tsx
    q/[slug]/page.tsx     # incident page
  components/
    shell/  sidebar.tsx topbar.tsx gutters.tsx
    ui/     nav-item.tsx keycap.tsx pill-button.tsx badge.tsx promo-panel.tsx
    list/   list-row.tsx grid-card.tsx section-header.tsx
    incident/ predict-form.tsx rubric.tsx reveal.tsx
  content/questions/*.mdx
  ```
- Build order: tokens, fonts, shell (gutters + sidebar + top bar), nav item, section header, list row, promo panel, archive views, incident page, command palette, then polish.
- After each component, compare against reference screenshots side by side at the same width and fix spacing before moving on.

---

## 13. Don'ts

- No gradients on UI chrome (the dithered orb is the only exception).
- No heavy shadows, glows, or glassmorphism (except the light backdrop blur on the command palette).
- No solid heavy borders between sections; use dashed hairlines.
- No filled colored buttons, and no accent colors beyond the single blue.
- No emoji in UI chrome. No confetti or celebration animations.
- No large border radii (over 16px) except pills.
- No centered hero sections or marketing-style landing layouts; this is a tool, not a brochure.
- No third-party brand assets copied from the reference site.
- No new hex values, font sizes, or spacings outside this file.

---

## 14. Definition of done for any UI change

1. Uses only tokens from section 2 and type roles from section 3.
2. Looks right in light and dark themes.
3. Works at 375px, 768px, and 1440px widths.
4. Keyboard navigable with a visible focus state.
5. Matches the reference feel: dashed lines, mono labels, quiet neutral surfaces, tight rows.
6. Any new pattern is documented in this file in the same change.
