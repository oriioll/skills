# Site Brief: understand the site before generating anything

Everything user-facing that fix mode generates (404/error/maintenance views, empty and loading states, legal pages, cookie banner, titles and descriptions, OG images, structured data) must look and sound like the project's own team made it. A generic output is a failed fix, even if it is technically correct.

## Contents
- When to build it
- Where to look
- The brief (output format)
- Reuse rules
- Missing information
- Self-check before writing

## When to build it

- **Fix mode**: always, before the first change. It is the input to every generated view, copy and asset.
- **Audit mode**: build a short version (purpose, audience, languages, primary action). It drives applicability (`public`/`private`, `ecommerce`, `multilingual`) and the recommendations.
- Cost: a few greps and reads. Do not read `node_modules`, `dist`, lock files or minified files.

## Where to look

| Question | Signals (check in this order, stop when clear) |
|---|---|
| What is it and who is it for? | `README`, `package.json` `name`/`description`, `<title>` and `<meta description>` in the entry HTML, home page copy, about page, route names, data model entity names (`Product`, `Booking`, `Project`), i18n files |
| Sector and primary action | What the main CTA does (buy, book, contact, sign up, read, browse portfolio). The primary action is what error and empty states should lead back to |
| Languages | i18n config (`@angular/localize`, `ngx-translate`, `vue-i18n`, `next-intl`, `@nuxtjs/i18n`), locale files, URL pattern (`/es/…`, subdomain, none), `<html lang>`. Default locale and fallback |
| Colour, type, shape | Tailwind `tailwind.config.*` (`theme.extend`) or `@theme` in CSS; `:root { --… }` in global CSS; SCSS `_variables.scss`/`_tokens.scss`; Angular Material `mat.theme`/`define-theme`; Vuetify/PrimeVue/MUI/Chakra theme object; shadcn `components.json` + `globals.css` |
| Dark mode | `prefers-color-scheme`, `.dark` class, `data-theme`, theme service/store |
| Fonts | `@font-face`, `@fontsource/*`, `next/font`, `<link>` to a font host, `font-family` stacks |
| Logo and imagery | `public/`, `src/assets/`, favicon set, `logo.*`, illustration style (flat, photo, 3D, none), icon library (Material Icons, Lucide, Heroicons, custom SVG sprite) |
| Layout shell | Root layout/app component, `Header`/`Navbar`/`Footer`/`Layout` components, page container pattern (max width, padding, grid), breakpoints |
| Components to reuse | Button, link, card, alert, empty-state, spinner/skeleton, form field, modal. Prefer the project's own over any library default |
| Closest existing view | The simplest existing page (about, contact, login, terms) and any existing 404/error/empty state. **Copy its structure** (layout, imports, styling method, i18n usage, SEO helper call) |
| Conventions | Folder and file naming, standalone vs module components, styling method (scoped CSS, CSS modules, utilities, BEM), state management, TypeScript strictness, lint and format config |
| Voice | Read 8-10 real UI strings (buttons, errors, headings, empty states). Derive: person (tú/usted/vosotros, "we"/"I"), formality, humour, emoji, sentence length, how errors are phrased |

If the project has **no design system** (plain CSS), derive the palette and fonts from what is actually most used (most frequent colours and `font-family` in the stylesheets). Never invent a new look. Add a 🟡 recommendation to extract tokens.

## The brief (output format)

Keep it to about 10 lines. Print it in the report (under the project header) and use it for every generated artifact.

```
Site brief: <name> · <sector> · audience: <who> · primary action: <what>
Languages: <default> + <others> (routing: /es /ca | none) · Voice: <e.g. informal tú, friendly, no emoji>
Tokens: primary <#…> · surface <#…> · text <#…> · font <family> · radius <…> · dark mode: <strategy|none>
  (source: <file:line>)
Shell: <Layout/Header/Footer component names and paths> · container: <pattern>
Components: <button>, <link>, <alert>, <empty-state> (paths)
Template view for new pages: <path> · SEO helper: <path|none> · i18n: <how strings are used>
Conventions: <naming, styling method, lint/TS rules that matter>
```

## Reuse rules

1. Use **tokens, not literals**: `var(--color-primary)`, theme classes, SCSS variables. No new hex values in generated code.
2. Use the project's **layout shell and components**. The generated view keeps the header, footer, navigation and page container.
3. Follow the project's **styling method and file layout**. No new CSS framework, no new UI dependency for a single view.
4. Match **dark mode, responsive behaviour (320px up), focus styles, reduced-motion** exactly as existing views do.
5. Strings go through the project's **i18n mechanism** in **every locale** the site has, in the site's voice. Never default to English on a non-English site. Copy is proposed to the user in one batch (see SKILL.md section 6).
6. Illustrations and images: only reuse existing assets or build from the logo/tokens with simple SVG/CSS. No stock art, no emoji as decoration unless the site already uses them. If a bespoke image is needed (OG image, 404 illustration), say so and propose a brand-derived template instead of generating random art.
7. Follow the project's **code conventions** (naming, typing, lint). Run the linter on what you generated.

## Missing information

- Infer first and state the assumption in one line.
- Ask **once**, in the same batch as the other proposals, only for brand-critical facts you cannot infer: the production origin (`SITE_URL`), legal entity data, whether a logo or OG image exists, the AI-crawler policy.
- Never fill gaps with invented facts or lorem ipsum. Use env/config values and list what is still missing at the end of the report.

## Self-check before writing

- Could this view be dropped into a different site unchanged? If yes, redo it.
- Does it use only tokens, components and strings that exist in this repo (or are added through the project's own mechanisms)?
- Same language(s) and register as the rest of the UI?
- Works in light and dark, at 320px and 1440px, by keyboard, with reduced motion?
- Does the primary action lead where this site's users want to go next?
