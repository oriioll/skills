# Category: a11y (accessibility HTML and semantics)

Baseline target: **WCAG 2.2 AA** (EN 301 549). In the EU, the European Accessibility Act has applied since 28 June 2025 to e-commerce and several consumer services (micro-enterprises providing services are exempt). Mention this only for `ecommerce` projects; do not give legal conclusions.

Static analysis finds the structural problems below. Contrast, real focus order and screen-reader behaviour are 🔍 runtime.

## A11Y-01 Alt text
- **Pass**: every `<img>`/`<Image>`/`NgOptimizedImage` has `alt`. Informative images: descriptive, concise (about 125 chars max), no "image of". Decorative images: `alt=""`. Logos that link: alt describes the destination ("Acme home"). Inline SVG meaningful: `role="img"` + `aria-label`/`<title>`; decorative: `aria-hidden="true"`. Icon-only buttons/links have `aria-label`. `<video>` has captions, `<iframe>` has `title`.
- **Detect**: grep `<img` without `alt`, `alt="image"`/filename-style alt, `<button>` containing only an icon.
- **Fix**: missing `alt` on clearly decorative images and `aria-label` on icon buttons are auto; descriptive text for informative images is proposed (copy).

## A11Y-02 Document structure
- **Pass**: `<html lang="…">` set (and updated if multilingual); one `<h1>` per page, no skipped heading levels; landmarks `<header>`, `<nav>`, `<main>` (exactly one), `<footer>`; a "skip to content" link; viewport does not disable zoom (`user-scalable=no`, `maximum-scale=1` are failures); descriptive link text (no "click here"); in SPAs, focus/announcement moves on route change.
- **Fix** (auto): `lang`, landmarks where the wrapper is a plain `<div>` and the intent is obvious, viewport.

## A11Y-03 Forms
- **Pass**: each control has a programmatic label (`<label for>`/wrapping label/`aria-label`); placeholder is not the only label; correct `type` and `autocomplete` attributes; required fields marked (`required`/`aria-required`); validation errors are text, tied to the field with `aria-describedby`, `aria-invalid="true"`, and announced (`role="alert"` or a live region); errors do not rely on colour alone.
- **Fix**: label associations and ARIA wiring are auto; message wording is proposed.

## A11Y-04 Keyboard and focus
- **Pass**: everything operable by keyboard; visible `:focus-visible` style (no bare `outline: none`); no positive `tabindex`; modals/dialogs trap focus, close on `Esc`, restore focus (`<dialog>` or the UI library's dialog); menus/accordions/tabs follow ARIA patterns or use the library's components.
- **Detect**: grep `outline:\s*none`/`outline:\s*0`, `tabindex="[1-9]`, custom dropdowns/modals built from `div`.

## A11Y-05 Interactive semantics
- **Pass**: clickable things are `<button>`/`<a href>`, not `<div (click)>`/`<span onclick>`; buttons that do not submit forms have `type="button"`; links navigate, buttons act; ARIA is used only when native HTML cannot express it (no redundant or invalid `role`/`aria-*`); live regions for async status (`role="status"`, `aria-live="polite"`); dynamic content updates announced.
- **Fix** (auto when mechanical): `div` to `button` only if styling impact is clear; else propose.

## A11Y-06 Contrast, motion, runtime (🔍)
- Contrast 4.5:1 for text (3:1 large text and UI components), `prefers-reduced-motion` respected for animations/auto-play, touch targets at least 24x24 CSS px (WCAG 2.2), text resizes to 200% without loss.
- Report as runtime checks with commands: `npx @axe-core/cli <url>`, `npx pa11y <url>`, Lighthouse accessibility audit.
- **Recommendation**: add the stack's a11y lint (`eslint-plugin-vuejs-accessibility`, `@angular-eslint` template accessibility rules, `eslint-plugin-jsx-a11y`) and axe-core in the Playwright/Cypress suite so regressions fail CI.
