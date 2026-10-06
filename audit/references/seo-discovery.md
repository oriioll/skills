# Category: seo (discoverability, indexing, routing hygiene)

Applies mainly to **public** sites. For a **private** backoffice: expect `noindex` + `Disallow: /`, mark SEO-02, 05, 06, 10 as ➖ N/A, and still check SEO-07, 08, 09.

## SEO-01 Unique page titles
- **Pass**: every indexable route has its own `<title>`, 30-60 characters, primary topic first, brand suffix (`Page | Brand`), consistent with the page `<h1>`. No duplicates, no framework default ("Vite App", "Angular App", "Document", "React App").
- **Detect**: enumerate routes, then locate the title source per stack (see `framework-map.md`). In SPAs the title must change on navigation (router `title`, `useHead`, `Title` service). Static HTML: one `<title>` per file.
- **Fix**: add per-route titles. Wording is proposed, then applied.

## SEO-02 Meta descriptions
- **Pass**: unique per page, 70-160 characters, describes the page and invites the click. No placeholder or keyword stuffing.
- **Fix**: propose texts per route; apply on confirmation.

## SEO-03 Canonical tags
- **Pass**: exactly one `<link rel="canonical" href="https://…">` per indexable page, absolute `https`, self-referencing, matching the sitemap URL, consistent trailing-slash policy, updated on client-side navigation in SPAs.
- **Fix** (auto when the site origin is known; otherwise `[SITE_URL]` placeholder from an env var).

## SEO-04 robots.txt
- **Pass**: served at the site root; sensible `Allow`/`Disallow` (admin, API, private/search-result paths); `Sitemap: https://…/sitemap.xml` line; production does **not** contain `Disallow: /` by accident; staging is blocked via `noindex`/auth, not by robots alone. Remember robots.txt is **not** security.
- **Detect**: file in the public/static folder; Angular needs the file in `angular.json` `assets`; Next may use `app/robots.ts`.
- **Fix** (auto): create a base file:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin
  Disallow: /api/
  Sitemap: https://[SITE_URL]/sitemap.xml
  ```
  Adapt the Disallow list to real routes. AI-crawler policy (GPTBot, ClaudeBot, etc.) is the owner's choice: ask, do not decide.

## SEO-05 sitemap.xml
- **Pass**: lists every indexable canonical URL (absolute, `https`), optional `lastmod`; excludes `noindex`, redirects and 404s; under 50,000 URLs / 50 MB; referenced in robots.txt; **generated at build**, not hand-maintained, when routes are dynamic.
- **Fix** (auto): static file for small sites; otherwise the stack's generator: Next `app/sitemap.ts`, Nuxt `@nuxtjs/sitemap`, Astro `@astrojs/sitemap`, Vue/Angular a small build script that reads the route list.

## SEO-06 llms.txt
- **Pass**: `/llms.txt` in Markdown: `# Site name`, a `> one-line summary`, optional context paragraph, then `##` sections with `- [Page title](https://url): short note`; optional `## Optional` section for secondary links.
- **Honest note for the report**: adoption by AI crawlers is unproven and major search engines do not use it for ranking. It is cheap, so 🟡 Nice-to-have.
- **Fix** (auto when titles/descriptions exist, built from them; otherwise propose).

## SEO-07 Favicon
- **Pass**: `/favicon.ico` (or a linked `.ico`) + `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` + `apple-touch-icon` (180x180) + manifest icons (192, 512) if a PWA/manifest exists. Files exist and `<link>` tags point to them.
- **Detect**: `<head>` links vs files in `public/`. Next: `app/icon.*`, `app/favicon.ico`. Framework default favicons (Vite/Angular logo) count as missing.

## SEO-08 Custom 404
- **Pass**: unknown URLs show a branded page with a clear message, a link home and main navigation or search; keeps the site layout; and the HTTP status is **404**, not 200.
- **Detect**: catch-all route per stack (`framework-map.md`). SPA fallback hosting rules return 200 for everything (soft 404): then at least set `<meta name="robots" content="noindex">` on the 404 view, or prefer SSR/prerender that returns a real 404. Verify with `curl -I https://site/does-not-exist` (🔍 runtime).
- **Fix** (auto): add the view and catch-all route; copy is proposed.

## SEO-09 Broken internal links
- **Method**: (1) collect the route table; (2) collect targets from `href`, `routerLink`, `<RouterLink to>`, `<NuxtLink>`, `<Link href>`, `router.push/navigate`, sitemap, nav/footer config; (3) compare. Also check: `#anchor` ids exist, referenced files in `public/` (images, PDFs) exist, no `href="#"` or `javascript:void(0)`, external links with `target="_blank"` have `rel="noopener noreferrer"`, links in legal pages and footer resolve.
- **Fix** (auto when the target is unambiguous). Full crawl of a running site is 🔍 runtime (`npx linkinator http://localhost:PORT`).

## SEO-10 Social tags and structured data
- **Pass**: `og:title`, `og:description`, `og:image` (absolute URL, ~1200x630), `og:url`, `og:type`, `twitter:card`. `lang` on `<html>`, `hreflang` if multilingual. Optional JSON-LD (`Organization`/`WebSite`, `Product` for e-commerce).
- Social scrapers do not run JavaScript: see SEO-11.

## SEO-11 Rendering mode
- **Concern**: public content served by a client-only SPA exposes empty HTML to crawlers and social scrapers; titles/meta set in JavaScript may not be seen. Severity 🟠 for public marketing/content/e-commerce, ➖ N/A for private apps.
- **Recommendation** (propose, never auto-apply): pre-render or server-render public routes: Nuxt, Angular SSR (`@angular/ssr`), Next.js, Astro, or `vite-ssg`/prerender plugin for small Vue sites. Mention the migration cost honestly (S for prerender plugin, L for a framework switch).
