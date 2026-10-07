# Category: seo (discoverability, indexing, routing hygiene)

**Fix quality**: for any fix in this category, build the Site Brief (`site-brief.md`) and follow `seo-production-playbook.md`. Verify with `scripts/seo-verify.mjs <origin>` when a URL is available.

Applies mainly to **public** sites. For a **private** backoffice: expect `noindex` + `Disallow: /`, mark SEO-02, 05, 06, 10 as ➖ N/A, and still check SEO-07, 08, 09.

## SEO-01 Unique page titles
- **Pass**: every indexable route has its own `<title>`, 30-60 characters, primary topic first, brand suffix (`Page | Brand`), consistent with the page `<h1>`. No duplicates, no framework default ("Vite App", "Angular App", "Document", "React App").
- **Detect**: enumerate routes, then locate the title source per stack (see `framework-map.md`). In SPAs the title must change on navigation (router `title`, `useHead`, `Title` service). Static HTML: one `<title>` per file.
- **Fix**: add per-route titles through one SEO helper (playbook section 2), never per-page copy-paste. Wording is proposed, then applied.

## SEO-02 Meta descriptions
- **Pass**: unique per page, 70-160 characters, describes the page and invites the click. No placeholder or keyword stuffing.
- **Fix**: propose texts per route; apply on confirmation.

## SEO-03 Canonical tags
- **Pass**: exactly one `<link rel="canonical" href="https://…">` per indexable page, absolute `https`, self-referencing, matching the sitemap URL, consistent trailing-slash policy, updated on client-side navigation in SPAs.
- **Fix** (auto when the site origin is known; otherwise `[SITE_URL]` placeholder from an env var).

## SEO-04 robots.txt
- **Pass**: served at the site root; sensible `Allow`/`Disallow` (admin, API, private/search-result paths); `Sitemap: https://…/sitemap.xml` line; production does **not** contain `Disallow: /` by accident; staging is blocked via `noindex`/auth, not by robots alone. Remember robots.txt is **not** security.
- **Detect**: file in the public/static folder; Angular needs the file in `angular.json` `assets`; Next may use `app/robots.ts`.
- **Fix** (auto): generate per playbook section 6: env-driven (`SITE_ENV`), production allows crawling, `Disallow` only for real private/utility paths (`/api/`, admin, internal search, cart/account), never CSS/JS, absolute `Sitemap:` line(s) resolved from `SITE_URL` (never a `[PLACEHOLDER]`). Staging gets `Disallow: /` plus `X-Robots-Tag: noindex` and auth. AI-crawler policy (GPTBot, ClaudeBot, etc.) is the owner's choice: ask, do not decide.

## SEO-05 sitemap.xml
- **Pass**: lists every indexable canonical URL (absolute, `https`, same trailing-slash policy as the canonical); excludes `noindex`, redirects, 404s and parameter/filter URLs; **real** `lastmod` (never one build timestamp on every URL; omitted when unknown); no `changefreq`/`priority` (ignored by Google); `xhtml:link` alternates (self + variants + `x-default`, reciprocal) when multilingual; `image:loc` entries for image-led sites; under 50,000 URLs / 50 MB per file, split with a sitemap index otherwise; served as XML at the root; referenced in robots.txt; **generated at build** from the same route/content source as prerendering, never hand-maintained for dynamic content.
- **Fix** (auto): the stack's generator (Next `app/sitemap.ts`, `@nuxtjs/sitemap`, `@astrojs/sitemap`, SvelteKit `+server.ts`) or, for Angular/Vue/vanilla, `assets/sitemap-generator.mjs` adapted to the project's route source (playbook section 5). Manual after deploy: submit in Search Console and Bing Webmaster Tools.

## SEO-06 llms.txt
- **Pass**: `/llms.txt` in Markdown: `# Site name`, a `> one-line summary`, optional context paragraph, then `##` sections with `- [Page title](https://url): short note`; optional `## Optional` section for secondary links.
- **Honest note for the report**: adoption by AI crawlers is unproven and major search engines do not use it for ranking. It is cheap, so 🟡 Nice-to-have.
- **Fix** (auto when titles/descriptions exist, built from them; otherwise propose).

## SEO-07 Favicon
- **Pass**: `/favicon.ico` (or a linked `.ico`) + `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` + `apple-touch-icon` (180x180) + manifest icons (192, 512) if a PWA/manifest exists. Files exist and `<link>` tags point to them.
- **Detect**: `<head>` links vs files in `public/`. Next: `app/icon.*`, `app/favicon.ico`. Framework default favicons (Vite/Angular logo) count as missing.

## SEO-08 Custom 404
- **Pass**: unknown URLs show a **brand-native** page (the project's layout shell, tokens, components, language(s) and voice, built from the Site Brief) with a clear message, the primary action, recovery paths from real navigation/search and a "did you mean" suggestion; localised per locale; and the HTTP status is **404**, not 200 and not a redirect to home. Data-driven 404s (unknown slug/id) render the same view with a 404 status. `noindex`, no canonical, not in the sitemap.
- **Detect**: catch-all route per stack (`framework-map.md`). SPA fallback hosting rules return 200 for everything (soft 404): then at least `noindex` on the 404 view, or prefer SSR/prerender that returns a real 404. Verify with `scripts/seo-verify.mjs` or `curl -I https://site/does-not-exist` (🔍 runtime). A generic template that ignores the site's design is a 🟠 finding even if the status is correct.
- **Fix** (auto): the view and catch-all route per playbook section 7, copy proposed in every locale. Moved URLs: propose `301` redirects from git history, never blanket-redirect to home.

## SEO-09 Broken internal links
- **Method**: (1) collect the route table; (2) collect targets from `href`, `routerLink`, `<RouterLink to>`, `<NuxtLink>`, `<Link href>`, `router.push/navigate`, sitemap, nav/footer config; (3) compare. Also check: `#anchor` ids exist, referenced files in `public/` (images, PDFs) exist, no `href="#"` or `javascript:void(0)`, external links with `target="_blank"` have `rel="noopener noreferrer"`, links in legal pages and footer resolve.
- **Fix** (auto when the target is unambiguous). Full crawl of a running site is 🔍 runtime (`npx linkinator http://localhost:PORT`).

## SEO-10 Social tags
- **Pass**: `og:title`, `og:description`, `og:image` (absolute, 1200x630 JPG/PNG, reachable, with width/height/alt), `og:url` (= canonical), `og:type`, `og:site_name`, `og:locale` (+ alternates), `twitter:card`; article/product extras where relevant. The image is branded from the Site Brief, not a stock photo.
- **Detect**: head tags per route; image URL returns 200 and an image content-type (`seo-verify`).
- **Fix**: via the SEO helper (playbook sections 2-3); text proposed, OG image design proposed. Social scrapers do not run JavaScript: see SEO-11.

## SEO-11 Rendering mode
- **Concern**: public content served by a client-only SPA exposes empty HTML to crawlers and social scrapers; titles/meta set in JavaScript may not be seen. Severity 🟠 for public marketing/content/e-commerce, ➖ N/A for private apps.
- **Recommendation** (propose, never auto-apply): pre-render or server-render public routes: Nuxt, Angular SSR (`@angular/ssr`), Next.js, Astro, or `vite-ssg`/prerender plugin for small Vue sites. Mention the migration cost honestly (S for prerender plugin, L for a framework switch).

## SEO-12 Structured data (JSON-LD)
- **Pass**: one `@graph` per public page with `@id`-linked nodes: `Organization` + `WebSite` on home, `WebPage` (or subtype) + `BreadcrumbList` on deep pages, plus the type that matches the page (`Article`, `Product`+`Offer`, `LocalBusiness` subtype, `SoftwareApplication`, `Person`/`ProfilePage`) with the properties Google requires. Markup matches visible content, absolute URLs, `<` escaped when serialised, valid JSON.
- **Not findings**: absence of `FAQPage`/`HowTo` (no Google rich result any more) or `WebSite` `SearchAction`. See playbook section 4 for the current list.
- **Detect**: `application/ld+json` in rendered HTML; `seo-verify` checks parsing, `@id` references and absolute URLs. Eligibility is a manual Rich Results Test.
- **Fix**: propose which types and business facts (never invent ratings, prices or contact data), then generate from the same data as the page. Severity 🟡 (🟠 for e-commerce products and local businesses).

## SEO-13 Multilingual (hreflang)
- **Applies when** the site has more than one locale. Otherwise ➖ N/A.
- **Pass**: each locale has its own URL; `<html lang>` matches; hreflang (page or sitemap) has a self-reference, every variant and `x-default`, is reciprocal and absolute; canonical is self-referencing per locale (not pointing to the default language); `og:locale` alternates; no automatic redirect by IP/Accept-Language that hides variants from crawlers.
- **Fix**: via the SEO helper and sitemap alternates (playbook sections 3 and 5). Severity 🟠.

## SEO-14 Indexation hygiene
- **Pass**: one canonical host (www vs apex) and one trailing-slash policy, each reached in a single `301`/`308` hop; `http` redirects to `https`; utility pages (search, cart, account, thank-you) are `noindex,follow` and not blocked in robots.txt (so the tag can be read); no `noindex` on pages in the sitemap; parameter and filter URLs canonicalised; non-HTML files that must stay out of the index send `X-Robots-Tag`; lowercase hyphenated URLs; no orphan pages (reachable from navigation or links, and in the sitemap).
- **Detect**: hosting/proxy config in the repo; `seo-verify` (redirects, `noindex` vs sitemap); `curl -I` for header checks (🔍 runtime).
- **Fix**: propose redirect/header changes (they alter runtime behaviour). Severity 🟠 (🔴 if the whole production site is `noindex`).
