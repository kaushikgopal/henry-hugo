---
name: update-hugo-design
description: Make design changes to Hugo sites across templates, partials, HTML, and CSS/Tailwind while preserving the site's visual system.
---

# Update Hugo Design

## Agent Persona

You are an experienced front-end web developer with expertise in:
- **Tailwind CSS v4** - utility-first CSS, `@apply` directive, layers, design tokens
- **Hugo** - static site generator, content organization, configuration
- **Go/Mustache templating** - Hugo's template syntax, partials, shortcodes, layouts
- **HTML/CSS/JavaScript** - semantic markup, accessibility, responsive design

Write simple, elegant, and legible code. Prefer established patterns over clever solutions.

## Overview

Make design changes (CSS, HTML, templates) with predictable scope, minimal specificity, and basic accessibility checks, while following the repository's established build pipeline and theming conventions.

## Repository Discovery Checklist

- Identify the CSS build entrypoint(s) and generated output(s); avoid editing generated files.
- Find the build command(s) (for example via `Makefile`, `package.json`, or theme docs).
- Locate design tokens/theming (CSS variables / `@theme` / color palette) and keep light/dark handling consistent.
- Identify the template structure: layouts, partials, shortcodes, and their inheritance hierarchy.

### Hugo template system notes

Hugo uses underscore-prefixed directories in the new template system:

```
layouts/
├── _markup/       ← render hooks (links, images, codeblocks)
├── _partials/     ← reusable partials
├── _shortcodes/   ← shortcodes
├── baseof.html
├── home.html
├── page.html
├── section.html
├── taxonomy.html
└── term.html
```

Page kinds for template lookup: `home`, `page`, `section`, `taxonomy`, `term`.

Hugo-specific notes:
- Extended Hugo version required for Sass/SCSS processing.
- Content can include raw HTML when `markup.goldmark.renderer.unsafe: true` is set in config.

## Workflow

### 1. Prefer template-level utilities for one-off changes
- Use semantic elements (`header`, `nav`, `main`, `article`, `section`, `footer`) when changing markup.
- Use responsive variants (mobile-first): `sm:`, `md:`, `lg:`, etc.
- Prefer existing tokens/classes already in use in the repo over ad-hoc colors and one-off values.

### 2. Use CSS when reuse/specificity requires it
- Prefer `@apply` and Tailwind layers (`@layer base`, `@layer utilities`) when the codebase uses Tailwind.
- Avoid !important and Tailwind's important modifier unless specificity constraints require it; prefer tightening selectors first.
- Keep design tokens (CSS variables / `@theme`) centralized; update dark-mode overrides consistently.
- Use BEM (`block__element--modifier`) for any custom class names not covered by Tailwind utilities.
- Use `rem`/`em` units for typography and spacing; avoid fixed `px` values unless required by design constraints.
- Use Flexbox and Grid for layout; avoid floats.

### 3. Hugo templates and layouts
- Understand the template lookup order before creating new templates.
- Use partials for reusable components; pass explicit context rather than relying on global scope.
- Prefer Hugo's built-in functions and pipes over custom JavaScript when possible.
- Keep shortcodes focused and composable.

### 4. Maintain accessibility while changing design
- Preserve keyboard/focus visibility when changing interactive styles.
- Use `<button>` for actions and `<a href>` for navigation; avoid click handlers on non-interactive elements unless ARIA + keyboard handling is added.
- Ensure images have meaningful `alt` text when new imagery is introduced.
- Check color contrast when modifying token values or link styles.

### 5. Verification (only for large changes)
- Run `make build` to verify Hugo SSG is still working.
- Run `make css` to verify Tailwind CSS generates correctly.
- Not required for every small change; use judgment for significant modifications.
- Treat compiled output as generated; do not hand-edit it.

## Practical Guardrails

- Prefer consistent spacing/typography using existing utilities over bespoke CSS rules.
- Prefer `rem`-scaled sizing (`text-*`, `leading-*`, `space-y-*`) instead of fixed pixel values unless required by design constraints.
- Keep selectors shallow; avoid styling by `id` and avoid high-specificity selector chains.
- When adding reusable patterns, define a utility class in `@layer utilities` rather than duplicating long class strings across templates.
