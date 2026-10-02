# DESIGN.md

Design system for the daily production-incident site (Next.js + MDX + Tailwind).

opencode: read this file before any UI work. Follow it exactly. Never invent visual tokens in components. If a rule is missing, extend this file instead of improvising.

**Structure at a glance:** a `max-w-[60rem]` frame, an `18rem` desktop sidebar, dashed `border-line` separators, `rounded-chip` and `rounded-control` primitives, `font-display`, `font-pixel`, `font-mono`, `text-body`, `text-small`, and `text-micro` typography roles, 32px toolbar controls, and responsive `lg`/`sm` behavior.

This is this project's own design language. Every value below is a decision made here, and the tokens in `app/globals.css` and `app/fonts.ts` are its single source of truth. Do not invent replacement values in component code, and do not re-derive a token from an external source — if a value is not listed here, promote it into this document first.

---

## 1. Design language

1. **Quiet, editorial, technical.** The interface is a frame around the content. It should feel like a carefully engineered catalogue/tool rather than a marketing site.
2. **Dense but breathable.** Rows are compact, typography is small, and whitespace separates major sections.
3. **Lines do the structural work.** Prefer dashed hairlines and subtle separators over heavy cards, shadows, or nested containers.
4. **Typography creates hierarchy.** Use display type for section/title moments, pixel type for the product wordmark or special identity moments, mono for metadata/labels/counts, and the normal sans role for body copy.
5. **Neutral first, accent second.** Most surfaces remain neutral. Accent appears on selected/highlighted elements, promotional treatment, and occasional actions.
6. **Micro-interactions are tactile, not decorative.** Use short transitions and small active-state scale changes. Use these sparingly and consistently.
7. **Responsive by composition, not shrinkage.** Desktop has a persistent sidebar; below `lg`, navigation becomes mobile-first and the desktop chrome disappears.
8. **No visual noise.** Avoid gradients in UI chrome, large shadows, excessive rounded cards, glass effects, bounce animations, or oversized hero sections.

---

## 2. Structural foundations

The frame, the sidebar, and the section rhythm the rest of this document builds on.

### 2.1 Page shell

Structure:

```
frame
└── desktop grid
    ├── sidebar: 18rem
    └── main: minmax(0, 1fr)
```

Classes:

- `.frame mx-auto w-full max-w-[60rem]`
- desktop layout: `lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]`
- sidebar: `lg:sticky lg:top-0 lg:h-dvh`
- sidebar/main separator: `lg:border-r lg:border-dashed lg:border-line`
- main top bar: `lg:sticky lg:top-0 lg:z-30`
- main sections use `border-b border-dashed border-line`
- horizontal padding is consistently driven by `--pad-x`
- vertical page padding is driven by `--pad-y`

**Implementation rule:** use a 60rem maximum shell and an 18rem desktop sidebar.

### 2.2 Desktop sidebar

The sidebar:

- full-height sticky sidebar
- horizontal padding via `--pad-x`
- top spacing that reaches `clamp(2rem, 6vh, 3.25rem)` on large screens
- logo/orb around `size-25` = 100px at the Tailwind default spacing scale
- desktop wordmark uses `font-pixel`
- intro copy is `text-body`, relaxed leading, max-width `34ch`
- navigation starts after a dashed top border
- navigation label is `font-mono text-micro tracking-wider uppercase`
- nav rows use `rounded-chip`, `text-body`, `px-2 py-1.5`
- nav counts use `font-mono text-micro tabular-nums`
- desktop sidebar footer also uses a dashed top border

**Implementation rule:** keep the sidebar visually light. It is a column of identity, intro, navigation, optional sections, and footer — not a stack of cards.

### 2.3 Main top bar

The top bar:

- `border-b border-dashed border-line`
- `bg-page`
- `px-(--pad-x) py-2.5`
- sticky on desktop
- toolbar controls are `h-8`
- controls use `rounded-control`
- shortcut hints are `h-5`, `rounded-chip`
- shortcut separators are `h-4 w-px`
- toolbar actions use `text-ink-3`, changing to `text-ink` on hover
- active controls may use `bg-field`
- interaction includes a small `active:scale-[0.98]`

**Implementation rule:** the toolbar is compact. Use the tokenized horizontal padding and 32px controls.

### 2.4 Section rhythm

Section structure:

```
section
  border-b border-dashed border-line
  px-(--pad-x)
  py-(--pad-y)
  lg:min-h-(--section-min-h)
```

Section heading pattern: `mono index` → `display heading` → `body/description`.

Classes:

- index: `font-mono text-micro text-ink-3 tabular-nums`
- heading: `font-display text-lead font-medium tracking-display text-ink`
- description: `text-body text-ink-3 text-pretty`
- heading row: `flex flex-wrap items-baseline gap-x-2.5 gap-y-1`

**Implementation rule:** preserve this index → title → description rhythm for archive/topic sections.

### 2.5 List rows

A compact list pattern:

- rows are grouped inside a list
- row links use `rounded-chip`
- vertical padding is approximately `0.3rem`
- content uses `gap-2.5`
- topic/icon mark is `size-[1.125rem]`
- rows use opacity choreography on pointer devices: hovered row remains full opacity while sibling rows fade
- hover/focus uses underline rather than large background changes
- active interaction uses a small scale-down

**Implementation rule:** archive rows should feel like catalogue entries, not cards. Do not add individual borders around every row.

### 2.6 Promotional panel

Structure:

- `rounded-card`
- `bg-accent-tint/40`
- compact padding: `px-4 py-3.5`, increasing to `sm:px-5 sm:py-4`
- top row uses `gap-4`
- label is `font-mono text-micro tracking-wider uppercase`
- body uses `text-body leading-relaxed`
- CTA is an underlined text action, not a filled button

**Implementation rule:** promotional/notice UI should be a soft tinted surface with a restrained radius and typography-led CTA.

### 2.7 Mobile behavior

- desktop navigation is hidden with `lg:hidden` / `max-lg:hidden`
- mobile chrome is a compact sticky bar
- mobile bottom utility strip uses safe-area inset
- touch targets become larger using `pointer-coarse`
- desktop sidebar exists only at `lg`
- some desktop controls disappear below `lg`
- mobile navigation rows can use stronger surface contrast

**Implementation rule:** breakpoint behavior should follow this pattern: desktop composition at `lg`, compact/mobile composition below `lg`, and touch targets expanded without changing the visual density on pointer devices.

---

## 3. Tokens

Put these in `app/globals.css` / Tailwind v4 theme tokens.

### 3.1 Naming

These semantic concepts:

| Concept | Token |
|---|---|
| page | page background |
| surface | elevated/secondary neutral surface |
| field | interactive/input background |
| line | normal separator |
| line-strong | stronger separator |
| ink | primary text |
| ink-2 | secondary text |
| ink-3 | muted text |
| accent | accent text/icon |
| accent-tint | soft accent surface |

Use the project's existing token names below. Components must never introduce raw colors.

### 3.2 Light theme

```css
:root {
  /* Surfaces */
  --bg: #ffffff;
  --bg-subtle: #fafafa;
  --bg-muted: #f5f5f5;
  --bg-field: #f5f5f5;
  --bg-tint: #f7f5ff;

  /* Text */
  --fg: #111111;
  --fg-secondary: #3f3f46;
  --fg-muted: #71717a;
  --fg-faint: #a1a1aa;

  /* Lines */
  --border: #e4e4e7;
  --border-strong: #d4d4d8;
  --hatch: #ededee;

  /* Accent */
  --accent: #7c3aed;
  --accent-tint: #f5f3ff;
  --accent-border: #ddd6fe;

  /* Feedback */
  --success: #15803d;
  --warning: #a16207;
  --danger: #b91c1c;

  /* Radius — keep these semantic and centralized */
  --radius-control: 8px;
  --radius-chip: 10px;
  --radius-card: 14px;
  --radius-full: 9999px;

  /* Motion */
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --dur-hover: 120ms;
  --dur-ui: 180ms;

  /* Layout */
  --shell-width: 60rem;
  --sidebar-width: 18rem;
}
```

> **Important:** these hex values are the design system's own definition, set here and consumed from `app/globals.css`. They are not measurements of anything. Changing one is a design decision that belongs in this document, not a drift into the code — if a value needs to move, change it in both places deliberately.

### 3.3 Dark theme

```css
:root[data-theme="dark"] {
  --bg: #0b0b0c;
  --bg-subtle: #121214;
  --bg-muted: #1a1a1d;
  --bg-field: #1a1a1d;
  --bg-tint: #15111f;

  --fg: #f4f4f5;
  --fg-secondary: #d4d4d8;
  --fg-muted: #a1a1aa;
  --fg-faint: #71717a;

  --border: #27272a;
  --border-strong: #3f3f46;
  --hatch: #1c1c20;

  --accent: #a78bfa;
  --accent-tint: #1c1528;
  --accent-border: #4c3a70;

  --success: #4ade80;
  --warning: #facc15;
  --danger: #f87171;
}
```

The dark accent is a lighter step of the same hue as the light theme's, so the accent holds its identity across both themes while staying legible on a dark surface. Every other value pairs with its light counterpart rather than being an independent choice.

### 3.4 Layout tokens

Do not scatter arbitrary padding values throughout components.

```css
:root {
  --pad-x: 1rem;
  --pad-y: 1.25rem;
  --section-min-h: 0;

  @media (min-width: 640px) {
    --pad-x: 1.25rem;
    --pad-y: 1.5rem;
  }

  @media (min-width: 1024px) {
    --pad-x: 1.5rem;
    --pad-y: 1.75rem;
  }
}
```

These are the design system's values. `--pad-x` and `--pad-y` are the only horizontal and vertical padding components should reach for; change the token here and the layout follows.

### 3.5 Spacing scale

One base unit, one named step per value, and a small set of semantic tokens for
the relationships that recur across files.

**The base unit is 2px, not 4px.** Every measurement this design language is built
on is a 2px multiple, so a 4px-only scale cannot express them without silently
resizing the chrome the rest of this document specifies:

| From | Value | Step |
|---|---|---|
| 7.1 nav rows | `px-2 py-1.5` → 6px vertical | `--space-1-5` |
| 5.4 toolbar, 2.5 list rows | `py-2.5` → 10px | `--space-2-5` |
| 2.6 promo panel | `px-4 py-3.5` → 14px | `--space-3-5` |
| 7.5 controls | padding and gap 6px | `--space-1-5` |
| 11 tag mark | 18px | outside the scale, on `--size-mark` |

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /*  4px */
  --space-1-5: 0.375rem;/*  6px */
  --space-2: 0.5rem;    /*  8px */
  --space-2-5: 0.625rem;/* 10px */
  --space-3: 0.75rem;   /* 12px */
  --space-3-5: 0.875rem;/* 14px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

#### Semantic spacing

Prefer these over a raw step whenever the value means a recurring
relationship. Each is mapped into Tailwind's spacing namespace, so it resolves
to a real utility.

| Token | Value | Relationship |
|---|---|---|
| `--space-section` | 32px | between top-level page sections |
| `--space-block` | 20px | between sibling blocks forming one module |
| `--space-item` | 8px | between adjacent items, and label → its body |
| `--space-row` | 10px | reading-list row: constraints, evidence, rubric, options |
| `--space-row-compact` | 6px | compact catalogue row: sidebar nav, archive list |
| `--space-divider` | 20px | a standalone dashed divider, **same above and below** |

```
gap-section  py-row  py-row-compact  my-divider  pt-divider  mb-item  gap-item  gap-block
```

Rules:

- **One value per relationship.** If two components express the same
  relationship, they use the same token. A second close-but-different value for
  the same job is the defect this section exists to prevent.
- **Dividers are symmetric.** Every standalone dashed divider gets
  `--space-divider` above and below. A divider that terminates a reading column
  lives *outside* the column's `gap-section` flow, or it inherits the 32px
  section gap on one side and its own padding on the other.
- **Raw steps are for one-off offsets only.** Where a value is genuinely a
  single local adjustment, use Tailwind's own numeric utility, which resolves
  to the same step. Do not invent a parallel naming scheme for the steps — the
  semantic tokens are the vocabulary.
- If a value genuinely does not fit the scale, promote it here with a reason
  first, the same way `--size-mark` and `--press` were.


---

## 4. Typography

Four distinct font roles: `font-display`, `font-pixel`, `font-mono`, and the body sans. Semantic size roles: `text-lead`, `text-body`, `text-small`, `text-micro`.

### 4.1 Font roles

- **Display** — used for section/page titles. Medium weight. Slightly tight/characterful tracking.
- **Pixel** — used for product wordmark/identity moments. Do not use for paragraphs.
- **Mono** — used for navigation labels, indices, counts, metadata, keyboard hints, dates, and technical labels.
- **Body sans** — used for descriptions, paragraphs, controls, and normal UI copy.

Use `next/font/local` for the local font assets. Do not make components request fonts from external CSS.

**Resolution in this repo** (`app/fonts.ts`): body sans `Geist`, display `Space_Grotesk`, pixel `Geist Pixel`, mono `Geist_Mono`. The pixel face pairs with the Geist superfamily so the wordmark reads as one system. Each loader exposes only a CSS variable, so components reference the roles by name and never by family.

> The pixel role renders with `adjustFontFallback: false`. `Geist Pixel`'s ELSH axis has no published override metrics, so Turbopack cannot synthesise a fallback and prints a cosmetic `Failed to find font override values` warning on every build. It is expected; the role is a single short wordmark where the CLS benefit is negligible.

### 4.2 Type scale

| Role | Size | Utility |
|---|---|---|
| `text-micro` | 11–12px | `text-micro` |
| `text-small` | 13–14px | `text-small` |
| `text-body` | 15–16px | `text-body` |
| `text-lead` | 20–24px | `text-lead` |
| page title | 28–32px | `text-title` |

> The page-title size role is named `text-title`, not `text-page`. In Tailwind v4 `--color-page` also generates a `text-page` **colour** utility, which shadows a same-named size utility. Keep the page title on `text-title`.

Do not create one-off font sizes in components. If a size is genuinely missing, add a semantic role here.

### 4.3 Rules

- Mono labels: uppercase + wider tracking.
- Counts/dates: `font-variant-numeric: tabular-nums`.
- Headings: medium weight; avoid overly bold typography.
- Body text: relaxed line-height.
- Descriptions should use `text-pretty` where supported.
- Prose max width: `68ch`.
- Avoid all-caps except mono metadata labels.
- The wordmark may use pixel typography; normal headings must not.

---

## 5. Layout

### 5.1 Shell

```css
.frame {
  width: 100%;
  max-width: var(--shell-width); /* 60rem */
  margin-inline: auto;
}
```

Desktop:

```css
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  align-items: start;
}
```

The desktop sidebar is exactly `18rem`. Do not add a wide marketing-style centered hero. The shell should feel like a compact application/catalogue.

### 5.2 Hatched gutters

Hatched gutters are optional and should only be used where they reinforce the composition. They must not visually compete with the content.

```css
.gutter {
  border-inline: 1px solid var(--border);
  background-image: repeating-linear-gradient(
    135deg,
    var(--hatch) 0 1px,
    transparent 1px 6px
  );
}
```

No hatch should be used inside ordinary cards or every section.

### 5.3 Sidebar

```
desktop:
  sticky
  top: 0
  height: 100dvh
  width: 18rem
  dashed right border
```

Internal order:

1. identity/orb
2. wordmark
3. short intro
4. dashed divider
5. `NAVIGATION` label
6. nav items
7. optional `TOPICS` section links
8. flexible spacer
9. dashed footer divider
10. footer controls/links

The mark is `size-25` (100px under default Tailwind spacing). It is a custom abstract glyph, not a reproduction of anything.

### 5.4 Main top bar

```
sticky on desktop
border-bottom: 1px dashed
background: page
padding-inline: --pad-x
padding-block: 0.625rem
controls: 32px high
```

Toolbar groups are separated by thin vertical rules. Shortcut hints are 20px high chips.

### 5.5 Sections

Every major content section should use:

```css
border-bottom: 1px dashed var(--border);
padding-inline: var(--pad-x);
padding-block: var(--pad-y);
```

Do not inset the separator inside the content.

---

## 6. Borders, surfaces, radii, and shadows

### 6.1 Borders

- Signature divider: `1px dashed var(--border)`.
- Stronger separator: `1px solid var(--border-strong)`.
- Inputs: `1px solid var(--border)`.
- Avoid thick solid section borders.

### 6.2 Radius vocabulary

Use only these semantic levels:

- `rounded-control` → buttons, toolbar controls, inputs
- `rounded-chip` → nav rows, tags, compact metadata
- `rounded-card` → larger promotional/content surfaces
- `rounded-full` → avatars and circular controls

Do not introduce `rounded-xl`, `rounded-2xl`, etc. directly in product components.

### 6.3 Shadows

The language is intentionally flat.

**Allowed:**

- small inset/edge treatment for keyboard chips
- very subtle overlay shadow where required for a floating control

**Avoid:**

- large card shadows
- glows
- colored shadows
- neumorphism
- glassmorphism

---

## 7. Components

### 7.1 Navigation item

Pattern:

```css
display: flex;
align-items: center;
gap: 0.5rem;
border-radius: var(--radius-chip);
padding: 0.375rem 0.5rem;
font-size: var(--text-body);
```

States:

- **inactive:** `text: ink-2`
- **hover:** `text: ink`, optional field background
- **active:** `text: ink`, medium weight, use a subtle background/hover plate rather than a heavy filled card

Counts: `font-mono`, `text-micro`, `tabular-nums`, muted, `margin-left: auto`.

A hover plate may move between navigation rows. If implemented, animate the plate rather than independently animating every row background.

### 7.2 Section header

Structure: `[index] [display title] [description]`

Desktop can keep all three on one baseline. Mobile may wrap.

- index: mono / micro / muted / tabular
- title: display / lead / medium
- description: body / muted / pretty

### 7.3 Archive list row

Use a catalogue-row composition:

```
[topic mark] [title] [description] ................ [date/tag]
```

Rules:

- compact vertical padding
- no permanent card border
- no background box per row
- row hover may reveal underline
- pointer devices may fade sibling rows while preserving the hovered row
- focus always restores full opacity
- active press may use a subtle scale-down

### 7.4 Grid card

Grid is an alternate view, not the default visual language.

```
card
  rounded-card
  thin border
  inset preview
  title
  mono metadata footer
```

Hover: border becomes slightly stronger, optional subtle shadow. No translation, no scale-up.

### 7.5 Toolbar/control button

Controls are `h-8` (32px).

```css
height: 32px;
border-radius: var(--radius-control);
color: muted;
padding-inline: 6px;
gap: 6px;
```

- Hover: background `field`, color `ink`
- Active: `scale: 0.98`
- Focus: visible 2px outline/ring
- Cursor: `pointer`

**Cursor is explicit, not inherited.** A control that renders a `<button>` must set `cursor: pointer` itself. Tailwind's preflight leaves `button` on the UA default arrow and only `a[href]` picks up a pointer from the UA stylesheet, so without the class a button control and a link control sit next to each other in the same bar with different cursors for the same action. `disabled:cursor-default` so a control that has gone dead stops advertising that it can be pressed.

**Resolution in this repo** (`components/ui/control.tsx`): the focus ring is global rather than per-component, so nothing can drift:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

**One instance per breakpoint.** Never mount a control twice and toggle visibility with `lg:hidden` / `hidden lg:flex`. Two mounted copies each attach their own listeners — a duplicated keyboard shortcut fires twice and cancels itself out. Compose one row and switch variants with `order` plus `hidden`, or move the listener to a component that renders exactly once.

### 7.6 Keyboard shortcut chip

Pattern: `height: 20px`, `min-width: 20px`, `rounded-chip`, small horizontal padding, small sans text, subtle neutral background.

Keyboard hints are decorative UI affordances only. The actual shortcuts must work.

### 7.7 Primary button

For product actions such as `Reveal solution`: height 40px, padding-inline 16px, `rounded-control`, medium weight, dark/ink background, page-colored text.

Use sparingly. Do not introduce bright filled accent buttons unless a new product requirement explicitly calls for them.

### 7.8 Ghost/text action

Use text + underline behavior where possible: `decoration-transparent` by default and `decoration-current` on hover. This is preferable to surrounding every action with a border.

Two shapes in `components/ui/button.tsx`: `GhostLink` renders an `<a>`, and
`PrimaryButton` / `DangerAction` are the `<button>` shapes. Section 7.5's
`cursor: pointer` rule is carried by the shared variants rather than left to each
call site.

#### Destructive action

`DangerAction` is the third variant and the only coloured one. It is **outlined**,
never filled, and that outline is the whole reason colour is allowed here at all:
section 7.7 forbids bright filled buttons, and a solid red block at the foot of an
article is exactly that. A hairline costs one glance to read and nothing at rest.

| | value |
|---|---|
| height | `h-8` (32px), not section 7.7's 40px |
| radius | `rounded-control` |
| border | `border-danger/40`, solid `--danger` on hover |
| text | `text-danger` |
| fill | `hover:bg-danger/5` — never at rest |
| type | `text-small` |
| label | the verb *and* the consequence |

Four of those are decisions rather than defaults:

- **32px, not 40px.** A destructive action should be the smallest thing in view,
  not a peer of the primary it sits under. `data-touch-target` carries the
  coarse-pointer minimum from section 12.
- **The border is partial opacity at rest and only goes solid on hover.** A page
  carrying one of these is not permanently red. The colour has to mean "this is
  how you undo things", not "something is wrong here" — the latter would make
  every reader who lands on it look for a fault that does not exist.
- **The fill is 5%.** Enough to register under the cursor, far too little to read
  as a pressed state on a neutral surface. Section 10 allows `background-color`;
  it does not ask for a fill that shouts.
- **The label names the consequence.** Section 13 does not require it, because the
  label is text and the state is not colour-only. But a control this irreversible
  should not depend on the reader recognising red, so `Start this incident over`
  carries the verb and its supporting line carries what goes.

Where a destructive action is confirmed, the confirmation is a replacement, not a
dialog: the control is replaced by a quiet sentence saying what was cleared
(section 8.5's pattern). That sentence stays neutral — it reports a finished
action, so tinting it would leave a red mark on a page that is now a blank form.

### 7.9 Promo / notice

Use: `rounded-card`, accent-tint with restrained opacity, `px-4 py-3.5`, `sm:px-5 sm:py-4`.

Top row: `icon + title ......... MONO LABEL`

Body: body size, relaxed line-height, max-width around `52ch`.

CTA: text action, accent, underline appears on hover.

Do not turn this into a large marketing banner.

### 7.10 Inputs

Background `bg`, `border: 1px solid border`, `rounded-control`, padding 10–14px, body typography.

Focus uses the global focus ring. Avoid colored glowing inputs.

### 7.11 Search command palette

Centered dialog, restrained card radius, thin border, page background, subtle backdrop. Results use the same archive-row language; grouped labels use mono/micro typography. Keyboard navigation must be real. `Esc` closes.

---

## 8. Product-specific patterns

### 8.1 Today / home

Composition:

1. compact promo/notice panel
2. `01 Today's incident`
3. one featured incident surface
4. `02 Recent`
5. compact archive rows
6. `View archive` text/ghost action

The home page should not become a generic SaaS dashboard.

### 8.2 Incident page

Single-column reading area, approximately 720px maximum width. Sections, each separated by the same dashed structural language:

1. `SYMPTOM`
2. `CONSTRAINTS`
3. `EVIDENCE`
4. `YOUR TASK`
5. prediction form
6. solution reveal
7. self-score
8. things to remember

#### The attempt flow

The last three are one sequence gated on a single act of commitment:

```
prediction form  →  lock in  →  solution reveal  →  self-check  →  score
```

- **Before lock-in**, nothing below the form is in the DOM. The diagnosis is
  already in the page payload, so this is pacing, not a paywall — the same
  reasoning as the home page's reveal.
- **No feedback before lock-in.** Every option looks identical until the reader
  commits. A pick that visibly favours one answer is not a prediction.
- **Lock-in is irreversible *within the attempt*.** The picks and the explanation
  become read-only the moment it is set, and there is no per-answer edit and no
  unlock, because a self-score is only worth something if the answer it scores was
  written first. The reader can still discard the whole attempt and start again
  (see below) — that is a different act from changing an answer in place, and it
  is the one that cannot be undone.
- **The free text is optional.** Only answering no picks at all blocks the
  button. Forcing prose to unlock the page would be a writing test dressed up as a
  diagnostic one.

#### Starting over

One control, at the end of the flow after the score and the closing list, present
whenever the attempt holds anything at all — including a draft that was never
locked in, because a reader who picked two options and left has no other way back.

It clears the whole attempt in one action: the picks, the prose, the lock-in, the
rubric ticks and the self-score. One control rather than a row of per-field undos,
because the attempt is the unit a reader thinks in — "I want to do that one again"
— and asking them to choose which half of their own answer they meant would be a
worse question than the one they were trying to answer.

It is a `DangerAction` (`Start this incident over`), outlined in `--danger` per
section 7.8, and it does not ask first. Those choices are one decision: this is
the only irreversible action on the site, so the affordance is small, the colour
says which of the article's quiet sentences is the one that destroys, and there
is no dialog — a confirm step in front of a choice the reader has already made by
reading the label is chrome arguing with them. After it fires, the control is
replaced by a quiet confirmation line saying what was cleared, which is also the
`role="status"` announcement.

The outline replaced a ghost text link, and that was the actual defect. As a
ghost action it looked like every other quiet sentence at the end of an article,
so nothing on the page told a scanning reader that this one was different *in
kind*. See section 7.8 for why the fix is an outline and not a filled red button.

Two things go with the record and are stated on the page rather than discovered:
the streak day the attempt earned (section 8.3 counts submissions, not history)
and the archive's `read · solved` mark (section 8.4 derives from the lock-in on the
same record). A reader who resets an incident they got wrong is trading their
place in the archive for the chance to do it honestly, and that is the trade the
control exists to let them make.

The removal is unconditional — it does not require a submitted attempt first —
because the case that matters most is the reader who wants to redo an incident
they have already scored badly. Gating it on submission would gate the useful case
behind the useless one.

#### Two scores, never merged

The score card shows them separately, and they must stay separate:

| | source | wording |
|---|---|---|
| Picks | auto-graded against `pick.answer` | "1 of 2 correct" |
| Rubric | ticked by the reader | "2 of 4 covered" |

Averaging these would lend the self-reported half a certainty it has not earned.
The rubric is a raw count rather than a percentage: a percentage invites "67%, so
I was mostly right?", and the honest answer is that it is a list of things a
complete answer contains, not an exam with partial credit.

Verdicts are always spelled out in words — "Correct.", "Not quite.", "Skipped.",
"Wrong." — never carried by colour alone (section 13).

#### Storage

Per incident under `p99:attempt:<slug>`, with `p99:attempts:index:v2` naming the
locked-in slugs so the archive need not enumerate every key on the origin. The
version suffix is there because membership moved from "self-check submitted" to
"locked in" — see section 15a for what a stale index would have cost.

- **Saved on every keystroke and selection**, not on submit. A reader interrupted
  mid-thought returns to their own words; the commitment is the lock-in, not the
  typing.
- **Client-only and untrusted.** The schema is user-writable, survives across
  schema versions, and is occasionally corrupt. No read may throw, and every
  field is coerced individually so a half-written record degrades to the parts
  that survived.
- **Not a security boundary.** The diagnosis ships in the payload regardless.
  This is a pacing device for the reader, not access control.

### 8.3 Streak

Use a compact contribution-style grid. It should feel informational rather than gamified. No confetti, fireworks, badges, or celebratory motion.

Two views, and they answer different questions:

- **The published grid** is site-level: which days have an incident. Derived from
  `publishedAt` and filtered through `isPublished`, so a scheduled incident cannot
  draw as diagnosed before its day. It is a real Monday-to-Sunday calendar, sized
  to the site's own history and capped at a year, and it reads the wall clock so a
  run can visibly break — which is why `/streak` sets `revalidate = 86400` instead
  of being a frozen snapshot. See section 15a.
- **The reader's record** is personal: current streak, longest streak, incidents
  completed, computed from submitted attempts. Local calendar days, not UTC — "did
  I do something today" is a question about the reader's clock, and a submission
  at 23:30 local time is today even when it is tomorrow in UTC.

The published grid has three tones, and the third one is not a value:

| Tone | Meaning |
|---|---|
| `done` | An incident published that day |
| `missed` | The site was live and published nothing |
| `none` | Before the first incident, or later than today |

`none` deliberately merges the two ends of the window. A day before the site
existed has not failed at anything, and a day that has not happened yet cannot
have; sharing the `missed` tone made a five-day-old site render as delinquent.
It carries no legend entry, because it is an absence rather than a value and the
grid's `aria-label` states what it covers. Both views use local calendar days, so
a day means the same day throughout.

A day counts once a self-check is **submitted**, not when it is locked in — a
lock-in is a draft, and it is enough for the archive's mark (section 8.4) but not
for a streak day. Today counts toward the current streak, and yesterday still counts
so an unfinished today does not read as a broken streak first thing in the
morning. The empty state is a sentence explaining how to start, not a zeroed
scoreboard.

### 8.4 Archive

Default: list view, compact filter row, grouped section headers, tag/difficulty/sort controls.

Optional: grid view; persist view choice in `localStorage`.

**Tags are a filter axis, not a navigation axis.** The filter row narrows by tag
(`bloat`, `jvm`, `autovacuum`); `/topics` is the coarse browse. They are separate
because they answer different questions — "show me every bloat incident" and
"show me the incidents about storage engines" have different answers. Keeping
them apart is also what lets each incident sit under exactly one section.

**The archive shows the reader's own progress.** An incident this reader has been
shown the solution for is marked `read · solved`, in accent, in both views. The
definition is section 8.2's record: an attempt with a `lockedAt`, i.e. one that got
through prediction → reveal. Nothing new is written to `localStorage` to support
it. The self-check is deliberately *not* part of it — see section 15a.

The mark is worded, never a tick and never opacity: section 13 forbids carrying a
state by colour alone, and this row already carries a difficulty badge, a tag
list and a date. Accent is reserved for it — section 1.5's "selected or
highlighted" case, and nothing else in the archive row is tinted, so it cannot be
mistaken for difficulty. It sits ahead of the difficulty badge (list) or in the
metadata footer (grid), and it renders at every width: the date is the only thing
in that group that hides.

A third filter axis, `Progress`, offers `all` and `unread`. `unread` is the useful
direction: hiding what is finished is a queue, and hiding what is not is a backlog
that on this site is every future post. The other two axes describe the incident;
this one describes the reader, which is why it is the only one whose result
changes without the archive changing.

### 8.5 Email signup

Inline in the promo panel: desktop input + button, mobile stacked. After success, replace the form with a quiet confirmation line. No modal signup.

Implemented as capture-only for now. `POST /api/subscribe` validates the address
and writes it to a Redis set; there is no send and no double opt-in, because daily
sends need a content cadence worth mailing and a half-built confirmation flow is
worse than none. The endpoint answers identically for a new and a returning
address — "you are already subscribed" is a small leak about a stranger's
membership for no product gain.

---

## 9. Content / MDX

Use a `.prose-site` wrapper. Do not apply generic typography defaults without overriding them with these tokens.

- **paragraph:** body / relaxed leading / secondary text
- **h2:** lead / medium / primary
- **h3:** body / medium / primary
- **links:** accent, underline on hover
- **lists:** normal indent, muted markers
- **blockquote:** 2px left border, secondary/muted text, no italic requirement
- **code:** mono, subtle neutral surface, thin border, `rounded-control`, horizontal scrolling

Code blocks should be quiet and readable. Never use neon syntax colors.

**Tables:** no zebra stripes, dashed row separators, mono header, tabular numerals.

**Diagrams:** mostly grayscale, one accent for the important/highlighted element.

---

## 10. Motion

Two motion tokens: `--dur-hover` and `--dur-ui`.

Use approximately:

- hover/control feedback: 100–140ms
- UI/reveal transitions: 160–200ms

Allowed properties: `color`, `background-color`, `border-color`, `opacity`, `text-decoration`, small active scale.

For content reveals: `opacity: 0 → 1`, `translateY: 8px → 0`.

Rules:

- no bounce
- no parallax
- no scroll-jacking
- no layout-shifting hover
- no card scale-up
- respect `prefers-reduced-motion`

---

## 11. Icons and imagery

Use Lucide or Phosphor Light.

Defaults: nav/button icon 16px, stroke 1.5px, color `currentColor`.

Topic icons: ~18px, `rounded-chip` container, monochrome/simple mark.

Do not import brand logos or third-party artwork. Prefer abstract diagrams, system topology, query/trace motifs, and small technical illustrations over decorative photography.

---

## 12. Responsive behavior

### ≥ 1024px

- `18rem` sticky sidebar
- main pane fills remaining shell
- desktop top bar
- desktop shortcut hints
- full navigation
- optional hatched outer treatment

### 640–1023px

- hide desktop sidebar
- use mobile/compact navigation
- retain dashed section separators
- reduce horizontal padding through `--pad-x`
- grid may remain 2-column only where content comfortably fits

### < 640px

- single-column content
- ~20px visual side padding through the layout token
- hide keyboard shortcut hints
- top bar contains only essential actions
- stack forms
- preserve minimum 40px touch targets even if the visual control is 32px

Use `padding-bottom: env(safe-area-inset-bottom)` for fixed mobile controls where needed.

**Touch targets.** Controls render at 32px but must present a 40px hit area on coarse pointers, without changing density on pointer-fine devices. `app/globals.css` handles this centrally:

```css
@media (pointer: coarse) {
  [data-touch-target] {
    min-height: var(--touch-target);
    min-width: var(--touch-target);
  }
}
```

Mark any interactive element that renders smaller than 40px with `data-touch-target`. Do not compensate by making the control taller on touch.

---

## 13. Accessibility

- Use semantic `<header>`, `<nav>`, `<aside>`, and `<main>`.
- Every interactive element is keyboard reachable.
- Focus state must be visible.
- Do not rely on color alone for difficulty/state.
- Counts need accessible labels.
- Segmented controls use `radiogroup`/`radio`.
- Decorative shortcut chips use `aria-hidden`.
- Keyboard shortcuts must be functional, not decorative.
- Minimum touch target: 40px.
- Maintain WCAG AA contrast for essential text.

---

## 14. Tailwind mapping

Expose semantic tokens rather than raw values:

```
bg-page        bg-surface     bg-field       bg-accent-tint
text-ink       text-ink-2     text-ink-3     text-accent-ink
border-line    border-line-strong
rounded-control    rounded-chip    rounded-card    rounded-hairline
font-display   font-pixel     font-mono
text-micro     text-small     text-body      text-lead      text-title
gap-section    gap-block      gap-item
py-row         py-row-compact my-divider     pt-divider     mb-item
```

Spacing appears twice on purpose: section 3.5's numeric steps are the scale of
record, and the semantic tokens are what components actually reach for.

Do not write `bg-[#...]`, `text-[#...]`, `rounded-[...]`, `text-[17px]`, or `px-[13px]` unless the value is first promoted into this design system.

> **Scanner gotcha:** Tailwind v4 extracts class-shaped strings from *any* scanned file, including Markdown and code comments. This document quotes literal class names as examples, so `app/globals.css` carries `@source not "../DESIGN.md"` to keep them out of the bundle. When writing a component, do not paste a class name into a comment either — name it in prose. Otherwise the quoted value ships as dead CSS that silently shadows the token-driven class.

---

## 15. Suggested component structure

```
app/
  globals.css
  layout.tsx
  page.tsx
  archive/
    page.tsx
  q/
    [slug]/
      page.tsx

components/
  shell/
    frame.tsx
    sidebar.tsx
    topbar.tsx
    mobile-nav.tsx
  ui/
    nav-item.tsx
    keycap.tsx
    control.tsx
    button.tsx
    badge.tsx
    promo-panel.tsx
  archive/
    section-header.tsx
    list-row.tsx
    grid-card.tsx
    filters.tsx
  incident/
    predict-form.tsx
    evidence.tsx
    reveal.tsx
    rubric.tsx

content/
  questions/
    *.mdx
```

**Build order:** tokens/fonts → shell → sidebar → top bar → navigation → section header → list row → promo panel → archive filters → grid view → incident page → command palette → responsive polish → accessibility pass.

After each stage, compare at 375px, 768px, 1024px, and 1440px.

---

## 15a. Deviations from the structure above, and why

Recorded so the code and this document do not drift. Each of these was a
deliberate decision, not an omission.

**Incident content is typed data, not `.mdx` files.** `lib/questions.ts` holds a
`Question` type and the incident array. The structured fields the UI actually
needs — `constraints` for the spec table, `evidence` for the labelled blocks,
`remember` for the takeaway list — have no clean MDX representation, and
modelling them as frontmatter would mean parsing at request time to render
something a literal already describes. Section 9's `.prose-site` styles are
implemented in `globals.css` and used on `/about`; they are ready for incident
prose if it is ever moved into files. Revisit if a non-technical editor needs to
write incidents.

**The list/grid switch lives in the archive filter row, not the top bar.**
Section 7.1 groups it with the top bar's search and theme controls, but the top
bar is shared by six routes and a view choice means nothing on five of them.
Keeping it with the filters also keeps the state in one owner instead of
requiring a shared context. The top bar is unchanged in every other respect.

**Signup has no backend, so it composes a message instead of faking one.**
Section 8.5 specifies a quiet confirmation after success. With no endpoint
there is no success to report, and a form that shows "thanks" while delivering
nothing is worse than no form. `components/about/mailto-signup.tsx` opens a
prefilled message in the visitor's own mail client, which genuinely delivers.
`CONTACT_EMAIL` in `lib/site.ts` gates the whole thing: while it is `null` the
form is not rendered and `/about` shows where to follow along instead. Set the
constant to a real address and the forms appear with no other change.

**Not yet built: the prediction form and self-score.** Section 8.2 lists both as
incident-page components. They are real product features rather than broken
controls, so they were left out of the wiring pass. See section 8.2 — they need
decisions on scale, persistence, and whether a self-score is honest without
server-side state.

**`NavItem` derives its own active state.** It reads the pathname instead of
taking an `active` prop, so the highlight cannot drift from the route. Hash links
(`/topics#caching`) deliberately stay inactive: the router does not expose the
fragment, and guessing would light up every topic at once.

**Sibling-row fade lives in CSS, not in class names.** Section 7.3's "fade the
siblings of the hovered row" is one `:has()` rule in `globals.css` under
`.list-rows`. Expressed as utility classes it is unreadable, and focus restoring
full opacity is easier to guarantee in one place.

**Press scale is a token.** `--press` exists so the 0.98 active transform is
promoted into the system per section 14, rather than written as an arbitrary
value in the control.

**The homepage has no lede paragraph.** Section 8.1 asks for one featured
incident surface, and the incident detail template leads with its numbered
sections. An earlier version rendered `symptom` twice in a row on `/`: once in a
`text-lead` lede under the title, then again in `01 SYMPTOM` immediately below.
The duplicate was on the home page only — `/q/[slug]` never had a lede. It is
removed rather than given its own field, because a `summary` would be a second
source for the same paragraph and would drift the moment an incident was edited
in one place and not the other. `01 SYMPTOM` owns that text.

**The incident footer sits outside `<article>`.** Section 5.5 wants symmetric
divider spacing. As a child of the reading column it inherited the 32px
`gap-section` above its dashed rule and 16px of its own padding below it — the
exact mismatch section 3.5 now forbids. As a sibling it gets
`--space-divider` on both sides, like every other divider on the site.

**The two sidebar lists were never out of rhythm.** A review flagged the primary
nav and the topic list as using different vertical rhythms. Measured, both render
`NavItem` and come out at 36.75px with 6px/6px padding and an 8px gap — already
identical. The topics read as secondary because of the indent and the count, not
because their rows are shorter. A different row height there would have been an
arbitrary mismatch, so the fix was to pin both to `--space-row-compact` and
leave the geometry alone.

**Sections are a partition by topic, and tags are not sections.** The first
version derived `/topics` and the sidebar's section list from each incident's
`tags`, which was wrong twice over. It was a cross-index, so the same post
appeared under `postgres`, `autovacuum`, *and* `bloat` — on a five-post archive
that made the page read as padding. And because tags are free-text, the taxonomy
was accidental: `postgres` was both a section and a filter that returned almost
everything, and eleven of the twelve headings held exactly one post.

The fix separates the two axes rather than merging them. Each incident now carries
exactly one `topic`, drawn from a curated `TOPICS` list in
`content/incidents/types.ts`, and `/topics` groups by that alone — so a post is
filed once and the counts sum to the incident total. `tags` stay as the archive
filter and the incident-page badges, which is the question they were actually good
at answering. `TOPICS` is a literal union on purpose: a mistyped topic in an
incident file is a type error, not a fifth section.

The taxonomy is Caching / Databases / Runtime / Platform. Caching is split from
Databases because a cache stampede and a bloat problem fail differently and are
diagnosed differently. Revisit the count when the archive is large enough that a
section has more than a handful of posts; the taxonomy is meant to stay at four.

**The spacing base is 2px, not 4px.** Section 3.5 records why, with the values that
force it. This is the one place where the obvious choice — a 4px scale — would have
quietly contradicted sections 2.5, 2.6, 5.4, 7.1, 7.5, and 11.

**The rubric is now interactive, and the reason it was not has been answered.**
The previous version rendered it as a read-only list on the grounds that "a
self-score with no stored history teaches nothing on the second visit, and a fake
score that resets every load is worse than no score." That reasoning holds only
while nothing is stored. Attempts are now persisted per incident in
`localStorage`, so the second visit shows the reader's own ticks and the score
they produced, and the read-only rubric stays where it still earns its place: the
home page's reveal, where there is no attempt to score.

**The picks are no longer checked one at a time.** Each pick used to have its own
`Check` button and its own immediate verdict. The flow is now a single lock-in
across all picks plus the free text, because a per-pick verdict told the reader
the answer to pick 1 before they had committed to pick 2 — which is the
sequential version of the same problem the withheld diagnosis solves. The
per-pick `Check` component is deleted, not deprecated.

**No new motion token was added for the reveal.** `DiagnosisReveal` reuses the
existing `.reveal` class — the 8px rise and fade over `--dur-ui` that section 10
defines and that `globals.css` already guards under `prefers-reduced-motion`. A
second keyframe for the same gesture would have been the motion equivalent of a
second spacing scale.

**The newsletter is no longer gated on `CONTACT_EMAIL`; the suggestion form still
is.** Section 15a originally gated both on a receiving address, which was correct
while the only way to subscribe was composing a mailto — with no inbox, there was
nothing to address. Capture changes that: `POST /api/subscribe` writes to a Redis
set and needs no destination, so hiding the form behind that flag would leave a
working endpoint with no way to reach it, and section 15's "a control that
pretends to accept a subscription it never sends is worse than no control" now
cuts the other way. The topic-suggestion form keeps the gate, because it is still
a mailto and still needs a real inbox to be worth anything.

**There is one Redis client and it is constructed lazily.** `lib/redis.ts` exports
a getter, not a `const`. The env vars are read inside the function so that
importing the module on a machine with no credentials does not throw — which
matters because route handlers import at module scope, and a build machine is not
always the machine that holds the secrets. The same reasoning is why the
`Ratelimit` instance in `app/api/subscribe/route.ts` is built on first call rather
than at module scope. A second `new Redis(...)` anywhere would mean two connection
pools and two sets of credentials, so there is deliberately no other one.

**`site.description` exists because the sentence was already in two places.** The
full tagline was hardcoded in the sidebar intro and in the document metadata while
`site.tagline` held only "One production incident a day." Adding a third copy for
the RSS channel would have been the path of least resistance and would have left
the sentence with no owner. It is promoted to `lib/site.ts` and referenced by all
three; `tagline` stays the short form, which is what the About page's own heading
wants.

**The self-check indicator has no `data-touch-target`.** Section 12's global
`pointer: coarse` rule sets both `min-height` and `min-width` to 40px, which
would stretch the 16px checkbox to 40px square and break the density the rubric
list is built on. The hit area is instead the surrounding `<label>` row, which is
already 46px at every width — so the target clears the 40px minimum without the
control growing. Worth knowing before the next small control reaches for the
global hook.

**`/topics` has no index on its page title, so its sections number from 01.**
Section 2.4's implementation rule is preserved everywhere except here, and the
exception is a consequence of the partition rather than a new pattern. Because
each incident belongs to exactly one topic, `/topics` is a single page of
sibling sections rather than a document that opens with a section and continues;
the other pages number their title 01 only because something follows it. Keeping
01 on the title and pushing the sections to 02-05 would have left the page
opening on "02 Caching", which reads as a rendering fault. `SectionHeader`'s
`index` is therefore optional, and the omission is reserved for a page-level
title — the numbered sections themselves still pass it. Worth revisiting if
`/topics` ever gains material above the partition that wants numbering.

**The published streak grid reads the wall clock, and section 8.3's old promise
that it could not is withdrawn.** The rule was that a prerendered page must not
depend on when it was built, and the grid honoured it by anchoring to the newest
incident instead of today. That was the wrong invariant for this page: a day that
published nothing has to be *rendered* as missed, and anchoring to the newest
incident means a skipped day is never rendered at all, so a streak can never
visibly break. The page is now `revalidate = 86400`, which keeps it prerendered
and static while bounding the staleness at a day. A literal, because Next has to
statically analyse the value.

Three geometry bugs came from the same anchor, and all three were invisible until
rendered rather than computed. Rows were `anchor + n`, so row 0 was whatever
weekday the newest incident fell on and the grid was not a calendar; because the
row was also the offset, five consecutive days rendered as a diagonal staircase
with no two filled cells sharing a column; and a fixed twelve-week window put 73
of 84 cells in `missed` on a site five days old, so the page argued against its
own "one incident a day" premise. It is now a Monday-to-Sunday calendar sized to
the site's real history and capped at a year, which grows as the site ages. Worth
revisiting if the site ever publishes retroactively, since a backdated incident
would appear in a column that already scrolled past.

**The social card is one definition in `lib/metadata`, and every page spreads it.**
Adding a per-page `openGraph` object to fix its `og:url` silently deleted the
image, the type and the site name from all five routes. Next merges metadata by
*replacing duplicate keys*, and `openGraph` is a single key, so a page declaring
`openGraph: { url }` overrides the layout's object instead of merging into it.
Nothing failed — the build passed and every page still looked correct — which is
what makes it worth writing down: the only symptom is a missing card in someone
else's feed. `title` and `description` are absent from the shared object for the
mirror-image reason, since leaving them unset is what lets each page's own title
win. `twitter` stays in the layout alone and is never spread, which is safe only
because no page overrides it; the same rule that breaks `openGraph` is what keeps
it inherited intact.

**No canonical or `og:url` in the layout.** Both are inherited by every route
underneath, so one `"/"` there would tell crawlers that `/topics`, `/streak` and
`/archive` are duplicates of the home page. Each page declares its own, and
`app/page.tsx` grew a metadata export purely to carry `"/"`. The brand suffix
moved the same way: the four page titles hardcoded `— p99`, and a `title.template`
in the layout is now the only place it is written.

**`theme-color` is in `viewport` with two media queries, not `metadata` with one.**
Next has deprecated it in `metadata`, and a dual-theme site following the system
preference cannot be correct with a single value. The colours mirror `--bg`.

**`public/favicon/site.webmanifest` was scaffolding, and it was never linked.**
It declared `name: "MyWebSite"`, and its icon `src` paths pointed at the site root
while the files sat in `/favicon/` — so both resolved to 404s. Nothing referenced
it, which is the only reason it had gone unnoticed. It now names the site, points
at the real files, and is declared from the layout. The `maskable` purpose was
dropped rather than kept: it cannot be confirmed without viewing the icons, and
claiming it falsely makes Android crop them.

**`app/favicon.ico` and `public/favicon/favicon.ico` are the same file.** Both
were added by one commit and are byte-identical. The layout declares only the SVG,
because `app/favicon.ico` is the file convention and Next already emits a link for
it — declaring the `.ico` as well put two `rel="icon"` links in the head pointing
at one picture, and which a browser picks is not worth leaving to chance. The
`public/` copy and an unreferenced `favicon-96x96.png` were both deleted rather
than left as dead weight; the `app/` one stays, because that one is the
convention.

**"Things to remember" is a closing section, and it is gated.** The last
list on the article, after the score, numbered, unindexed — the score above takes
no index either, and these are the article's bookends, so numbering one of them
would imply it belongs to the rubric. It repeats nothing the fix says: the fix is
what to do about *this* incident, and these are what generalises past it.

The label names the section rather than counting it. It read "three things to
remember" until the first incident carried five, and a heading that asserts a
count the content is free to contradict is a lie only the content can catch.

It was ungated at first, on the reasoning that a lesson is not an answer. That
reasoning is wrong, and the cache-stampede incident is why: "a cache that is 98%
effective can still be the whole outage" *is* the diagnosis, written as a
generality. Ungated, a reader who never committed got the answer in the last three
bullets, which is the one thing section 8.2 exists to prevent. So the component
is presentational and `RememberGate` holds the check, because the two callers
disagree — the home page's `Reveal` is already behind its own button and needs no
second gate.

Like the diagnosis, it ships in the page payload either way. That is deliberate
and unchanged: it is pacing, not a paywall.

**`/llms.txt` is generated, and it points at the HTML pages.** A route handler
for the same reason as `rss.xml` — the link list depends on `publishedAt <= now`,
and a static file would keep advertising a future-dated incident. Sections are
one per topic, in `TOPICS` order, rather than one flat list, so the sections
partition the archive the way `/topics` does; the `Optional` heading marks the
links skippable in a short context. The file carries the site's rule that the
diagnosis is withheld until the reader commits, because a consumer that fetched a
page to summarise it would otherwise hand the reader the thing they came not to
have.

The spec's two discovery mechanisms split awkwardly here, and the useful one is
the one Next cannot emit. `rel="describedby"` is what points a consumer at the
file; `rel="alternate" type="text/markdown"` points at markdown versions of the
pages, and is what `alternates.types` actually produces. So the layout declares
`/llms.txt` as a markdown alternate — honest about what the file is, but not what
makes it get found, since consumers find `/llms.txt` by having learned the path.

Two of the spec's recommendations are deliberately not followed. There are no
`.md` versions of the linked pages, so the links point at server-rendered HTML,
which is small enough to serve as a substitute; and the file grows by roughly 90
bytes per incident against the spec's advice to keep it inside a context window.
Both are fine at five incidents and are a deliberate trim decision when they are
not, with `/archive` as the escape hatch.

**"Read" is the lock-in, and no new localStorage key was added for it.** The
archive marks incidents the reader has been shown the answer for (section 8.4),
which sounds like it wants a `p99:read:<slug>` written by a scroll listener on
`/q/[slug]`. It does not, and the reason is that the mark means exactly one thing —
the solution was revealed — and that is what the `lockedAt` section 8.2 already
stores, because the same button both writes it and renders the diagnosis. A third
record would have been a third copy of "this reader got to the end of this
incident", free to disagree with the ones already there.

**It used to require a submitted self-check as well, and that was wrong.** The
mark read `lockedAt && submittedAt`, on the reasoning that "read to the end" is
only provable by a reader who finished the whole sequence. But a reader who locked
in, read the diagnosis, and closed the tab had read the incident, and the archive
said otherwise — the mark denying the very thing it exists to record. The
self-check scores an answer against a rubric; it is evidence of self-assessment,
not of attention, and using it as a reading receipt made the archive stricter than
the reader's own behaviour. Now `isResolved` is `isLocked`, and the narrower
question it used to answer moved to where it belonged: `/streak` still counts
submissions, so a streak day is still earned by finishing the self-check rather
than by opening a page.

The two sets are read separately rather than derived from each other, which is the
part worth keeping. `readResolvedAttempts` walks the index and returns every
locked-in attempt for the archive's mark and its `unread` filter;
`readCompletedAttempts` narrows that to the submitted ones for `/streak`. Before
this change the streak read the archive's set and filtered out the unsubmitted, so
the two were the same walk; now the archive's set is strictly wider, and one
caller that reached for the wrong one would award a streak day for a page view.

The index moved with it, and that needed a version bump rather than just a
changed predicate. `syncIndex` derives membership from the record it is handed, so
it follows the definition automatically — but the index is the *fast path*, and
the fast path takes whatever it finds at face value. A returning reader's existing
index names only the slugs they submitted, which under the new rule is a strictly
smaller set than their records support, and every lock-in missing from it would
have stayed unmarked forever. Incompleteness is not detectable from the outside:
`readIndex` returns a populated list, so nothing downstream can tell a short index
from a correct one.

So the key is `p99:attempts:index:v2`. A stale index becomes a *missing* one, which
is the single condition the repair path already handles — it enumerates the attempt
records, which are the durable copy, and rebuilds — and `writeIndex` drops the old
key rather than leaving it to rot beside the new one. The alternative was to walk
every key on the origin on every read to find the gap, which is the cost the index
exists to avoid.

**The mark is a boolean prop, not a store subscription in each row.**
`ListRow` and `GridCard` are shared with `/` (recent) and `/topics` (the
partition), and the attempt store is keyed per slug — so subscribing in each row
would mean one `localStorage` read per row per write, and would spread a single
piece of state across four files. `ArchiveView` already owns client state as the
filter and view owner, so `useResolvedSlugs` subscribes once there and the rows
take a plain `solved` prop, optional and off by default. Off by default is what
keeps `/` and `/topics` unchanged: on those two pages the question "have *you*
finished this" is not the question being asked. The set is computed and cached
against its sorted slug list for the same reason `StreakRecord` caches its
numbers — a `Set` snapshot has to be referentially stable or React loops.

Server rendering has no localStorage, so every row starts unmarked and a
returning reader's marks arrive on hydration. That is accepted rather than
worked around: marking rows on the server would mean rendering the archive per
reader, and a badge appearing where a row already stood is not a layout shift
worth preventing.

**Section 8.2's "lock-in is irreversible" was true for two commits and is now
scoped, because a reader can now discard an attempt.** The original wording —
"the picks and the explanation become read-only the moment it is set" — is not
false, but read alone it reads as *and nothing can ever undo it*, which is a
stronger promise than the design needs and one the product should not make. A
reader who misreads an incident, gets it wrong, and wants to reason through it
again with the answer already known has no route today: they cannot re-lock, and
clearing site data to escape their own history is not a feature.

The bullet now says irreversible *within the attempt*, and the new control is a
different act from editing an answer in place. That distinction is the whole
design: what section 8.2 exists to prevent is seeing the verdict, changing your
answer, and re-scoring — a self-score of an answer written after the diagnosis
was known. Throwing the attempt away and starting a fresh one cannot produce
that, because the new attempt has no score attached to it yet.

The other three decisions were made against the obvious alternative and are worth
the reasoning, since each could reasonably go the other way:

- **No confirmation.** This is the only irreversible action on the site, which is
  the argument *for* a dialog, and it lost anyway. A dialog asks the reader to
  confirm a choice they have made by reading the label, and the label already
  names everything being discarded. What it took instead is the danger outline
  (section 7.8) and the quiet line that follows — the affordance is small, the
  colour says which sentence on the page is the destructive one, and the
  confirmation that earned its place is the one afterwards.
- **After the score, not in the form.** Everything the control destroys is above
  it, so a reader who wants it has seen all of it. Inside `04 Your prediction` it
  would mean scrolling back up past three screens to find it.
- **Available on a draft.** A draft with two picks and no lock-in is progress the
  reader can see, and hiding the control until they had committed would leave them
  stranded with a half-answered question and no way back.

**The supporting line sits under the control, not beside it.** With a bordered
control the sentence on the same baseline reads as a label hanging off the edge of
a box, and at 375px the wrap left its first word alone on a row underneath. A
block stack is also the honest shape: the button is an action and the line is
about what it does, and those are not the same kind of thing.

`GhostAction` was deleted rather than left behind. It existed only for this
control, and the moment the control became a `DangerAction` it had no callers —
the same reasoning that deleted the per-pick `Check` component.

**`PrimaryButton` never set `cursor: pointer`,** which section 7.5 requires of any
control rendering a `<button>`. Tailwind's preflight leaves buttons on the UA
arrow and only `a[href]` picks one up, so "Lock in & reveal solution" and "Submit
self-check" pointed at the reader rather than at what they could press — the exact
defect section 7.5 documents, sitting in the file that documents it. Fixed while
adding the danger variant, since the shared `variants` are the right home for it
and the rule was already written down.

**`resetAttempt` removes the key rather than writing an empty attempt over it.**
Overwriting would work and would leave a key per incident the reader had ever
opened, which `enumerateAttemptSlugs` would then walk on `/streak` for records
that hold nothing. Removal keeps "did this reader ever touch this incident" and
"what is in it" the same question, answered by the same absence. The index is
reconciled by handing `syncIndex` an empty attempt rather than by writing a
second index path, because `syncIndex` already derives the slug's membership from
whether the record it is given is resolved.

The consequence worth naming is that the reset silently costs the reader two
things they cannot get back — the streak day and the archive's `read · solved`
mark — so both are named in the label's supporting line rather than left to be
discovered on `/streak` a week later.

**`hasProgress` counts the rubric by value, not by key.**
`setRubricCheck` writes the entry on untick as well as on tick, so a reader who
ticked one item and unticked it holds `{item: false}` — one key, nothing true. By
key that record looks like progress and renders a "start this incident over"
control over an attempt that is, to the reader, empty. Worth remembering before
another map-shaped field is gated on its own size.

---

## 16. The decisions that define this system

If a change to this document ever makes one of these ambiguous, the rest of the
system stops being derivable. They are the load-bearing choices, collected here
so they can be defended in one place:

| Concern | Rule |
|---|---|
| Shell | 60rem maximum frame, 18rem desktop sidebar |
| Top bar | Compact `py-2.5` toolbar with 32px controls |
| Structure | Full-width dashed section boundaries, never per-row cards |
| Surfaces | Flat; only subtle utility shadows, no glows or glass |
| Radius | control / chip / card / full semantic vocabulary, no ad hoc values |
| Type | Display + pixel + mono + body sans roles, at named size roles |
| Motion | Separate hover and UI duration roles, both short |
| Nav rows | `rounded-chip`, `px-2 py-1.5`, `text-body` |
| Shortcut chips | 20px high |
| Accent | Tokenized; one hue across both themes, never hardcoded per component |
| Spacing | 2px base unit, with `--pad-x` / `--pad-y` owning page padding |

---

## 17. Don'ts

- No borrowed logo, wordmark, copy, or brand asset.
- No raw hex colors in components.
- No arbitrary spacing values in components.
- No arbitrary font sizes in components.
- No gradients in ordinary UI chrome.
- No glassmorphism.
- No large shadows or glows.
- No heavy solid section borders.
- No excessive rounded cards.
- No filled accent buttons by default.
- No emoji in application chrome.
- No giant centered marketing hero.
- No bounce/parallax/scroll-jacking.
- No hover effects that move layout.
- No card scale-up on hover.
- No decorative keyboard shortcuts without actual shortcuts.
- No one-off token names that duplicate an existing semantic role.

---

## 18. Definition of done

Every UI change must:

- Use only documented semantic tokens.
- Follow the 60rem shell / 18rem sidebar structure where desktop applies.
- Use dashed structural separators consistently.
- Use the correct typography role rather than arbitrary font sizing.
- Work in light and dark themes.
- Work at 375px, 768px, 1024px, and 1440px.
- Preserve keyboard navigation and visible focus.
- Preserve 40px minimum touch targets.
- Avoid layout movement on hover.
- Match the documented language rather than improvising a new visual idea.
- Add any genuinely new visual pattern to this document before shipping.

If a token is unresolved, do not guess a value in a component — promote it here first, then implement it.
