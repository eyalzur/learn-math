---
name: app-design-system
description: Defines the visual identity of an app or game - theme, color palette, typography, spacing, radius, shadows - and implements it as design tokens in the codebase. Use at the start of a project, when the app looks generic, dry or inconsistent, or before running ui-ux-polish.
---

# App Design System

Your job: give this app a distinctive, cohesive, premium-feeling visual identity, and wire it into the code so every screen inherits it.

## Process

1. **Understand the product.** Read README, package files, and a few screens. Identify: what the app does, who uses it, the emotional tone it should create (calm, energetic, trustworthy, playful, luxurious...), the tech stack (Tailwind, CSS vars, styled-components, React Native, Flutter, SwiftUI, Unity, Phaser...), and whether the UI language is RTL (e.g. Hebrew/Arabic). If something essential is unclear, make a reasonable assumption and state it - do not stall.

2. **Propose 3 distinct aesthetic directions**, each in one line plus a short palette/type sketch (e.g. "warm editorial minimalism", "dark glassy fintech", "soft playful pastel", "bold neo-brutalist"). Be bold, not safe. Pick the strongest one for this product (or the one I choose if I specified) and commit. Avoid generic defaults: no default Material/Bootstrap look, no purple-gradient-on-white, no unstyled system fonts unless deliberate. Every later choice must serve the chosen direction. If I gave reference apps/games, extract what makes them feel good (not copy them).

3. **Produce the tokens:**
   - **Color**: primary, secondary, accent; a 10-step neutral scale (50-900); semantic colors (success, warning, error, info); surface/background/border/text roles. Provide BOTH light and dark mode. Check contrast: body text >= 4.5:1, large text and UI components >= 3:1. Compute it, do not guess.
   - **Typography**: 1-2 font families max (characterful, readable, available for the stack; if RTL, ensure real Hebrew/Arabic glyph support and good weights). Define a modular scale (e.g. 12/14/16/20/24/32/40), weights, line-heights, letter-spacing.
   - **Spacing**: 4px base grid (4/8/12/16/24/32/48/64).
   - **Radius, elevation/shadows, borders, opacity states** (hover, pressed, disabled, focus ring).
   - **Iconography & imagery**: one icon set, consistent stroke/size; illustration/photo style guidance.
   - (Motion tokens are defined by the `motion-feedback-rewards` skill; leave a placeholder section in DESIGN.md.)

4. **Define core component styles** in words + tokens: buttons (primary/secondary/ghost/destructive, all states), inputs, cards, lists, nav bars/tabs, modals/sheets, toasts, empty states, loaders/skeletons.

5. **Implement it.** Write the tokens into the project's native mechanism (tailwind.config, CSS custom properties, theme.ts, ThemeData, etc.). Add a dark-mode switch if the platform supports it. Replace hard-coded colors/sizes in existing code with tokens where it is low-risk. Do not rewrite app logic.

6. **Document it** in `DESIGN.md` at the repo root: aesthetic direction, token tables, component rules, do/don't list, RTL notes if relevant. This file is the single source of truth that `motion-feedback-rewards`, `ui-ux-polish` and the reviewer agent read.

7. **Verify**: the app builds/runs, dark and light both look correct, contrast checks pass. Summarize what changed in 10 lines or fewer.

## Rules
- Consistency beats novelty: fewer, well-chosen tokens used everywhere.
- Never use pure #000 on pure #fff for body text; use softened neutrals.
- One accent color does the heavy lifting; do not scatter five.
- "Simple" must not mean "plain": use depth (layered surfaces, soft shadows, subtle gradients/texture where on-brand), rich typography contrast, and generous whitespace deliberately.
- Prefer logical CSS properties (margin-inline-start) so RTL/LTR both work.
