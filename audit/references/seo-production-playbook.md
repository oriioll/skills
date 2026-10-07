# SEO production playbook (fix specs)

How to **generate** SEO artifacts at production level in `/audit fix`. Read `site-brief.md` first: everything here is applied through the project's own design, copy and conventions.

> Stack APIs change. Verify names and options against the **installed version's docs** before writing code.

## Contents
1. Principles
2. Single source of truth (site config + SEO helper)
3. Head tags: full set
4. Structured data (JSON-LD)
5. sitemap.xml
6. robots.txt and indexation control
7. Custom 404 and error views
8. Verification and manual steps

## 1. Principles

- **Correct beats numerous.** Emit every signal that has a real effect. Do not emit signals search engines ignore or that were retired (listed where relevant). Explain omissions in one line instead of padding.
- **One source of truth.** Origin, site name, locales, default image and organization data live in one config. Per-page values come from one SEO helper. No copy-pasted tags per page.
- **Everything agrees.** Title, `h1`, canonical, `og:url`, sitemap `<loc>`, hreflang and JSON-LD `url` describe the same canonical URL (same scheme, host, trailing-slash policy).
- **Generated from data, at build or request time**, from the route table or content source. Never hand-maintained lists for dynamic content.
- **Visible in the HTML response.** Crawlers and social scrapers must see tags without running JavaScript: SSR or prerender for public routes (see SEO-11).
- **No placeholders in served files.** `robots.txt`, sitemap, canonical and JSON-LD resolve the origin from `SITE_URL` (env/config). If it is missing, fail the build or stop and ask. Never ship `[SITE_URL]`.
- **Verify** with `scripts/seo-verify.mjs` and report what you could not verify.

## 2. Single source of truth

**Site config** (one module): `name`, `origin`, `defaultLocale`, `locales`, `defaultOgImage` (+ width/height/alt), `themeColor` (light/dark), `twitterHandle` (if any), `organization` (legal/brand name, logo, `sameAs`, contact), `environment` (prod|staging).

**SEO helper** (one function or service), input per page:
`{ title, description, path, locale, alternates?, image?, type?, noindex?, jsonLd?, published?, modified? }` → sets title, description, canonical, robots, OG/Twitter, hreflang and the JSON-LD graph.

| Stack | Idiomatic place |
|---|---|
| Next.js (App Router) | `generateMetadata` / `metadata` (supports `alternates.canonical`, `alternates.languages`, `openGraph`, `robots`), `app/sitemap.ts`, `app/robots.ts`, `opengraph-image.tsx`; JSON-LD via a `<script>` in the page |
| Nuxt | `useSeoMeta`, `useHead`, `@nuxtjs/seo` family (sitemap, robots, schema.org, og-image) |
| Angular | `SeoService` wrapping `Title`, `Meta`, a managed `<link rel=canonical>` and JSON-LD script; called from route `title`/resolvers; **SSR or prerender required** for scrapers |
| Vue + Vite | `@unhead/vue` (`useSeoMeta`, `useHead`); `vite-ssg`/prerender for public routes |
| Astro | one `<SEO>`/`BaseHead.astro` component in the layout; `@astrojs/sitemap` |
| SvelteKit | `<svelte:head>` in a shared component; `sitemap.xml/+server.ts` |
| Vanilla | a build-time partial/template for `<head>`; a build script for sitemap |

Angular reference shape (adapt names, typing and DI to the project):

```ts
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly site = inject(SITE_CONFIG);

  update(page: SeoPage): void {
    const url = new URL(page.path, this.site.origin).toString();
    this.title.setTitle(page.title === this.site.name ? page.title : `${page.title} | ${this.site.name}`);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: page.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' });
    this.setLink('canonical', url);
    this.setOpenGraph(page, url);
    this.setJsonLd(page.jsonLd);
  }

  private setLink(rel: string, href: string): void {
    let el = this.doc.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) { el = this.doc.createElement('link'); el.rel = rel; this.doc.head.appendChild(el); }
    el.href = href;
  }

  private setJsonLd(graph?: object): void {
    this.doc.head.querySelector('script[data-seo="jsonld"]')?.remove();
    if (!graph) return;
    const el = this.doc.createElement('script');
    el.type = 'application/ld+json';
    el.dataset['seo'] = 'jsonld';
    el.textContent = JSON.stringify(graph).replace(/</g, '\\u003c'); // prevents </script> injection
    this.doc.head.appendChild(el);
  }
  // setOpenGraph: updateTag for og:* and twitter:* from the same data
}
```

## 3. Head tags: full set

Order: `charset` and `viewport` first, then title, description, canonical, robots, alternates, social, icons/manifest.

| Tag | Rule |
|---|---|
| `<meta charset="utf-8">` | Within the first 1024 bytes |
| `viewport` | `width=device-width, initial-scale=1` (never `user-scalable=no`/`maximum-scale=1`); add `viewport-fit=cover` only if safe-area insets are handled |
| `<html lang>` | Correct per page/locale (BCP 47: `es`, `ca`, `es-ES`) |
| `<title>` | Unique, about 30-60 chars (Google truncates by pixel width), main topic first, `| Brand` suffix, matches `h1` intent. Home: brand + value proposition |
| `description` | Unique, about 70-160 chars, says what the page offers and why click, no stuffing. Google may rewrite it; still write it |
| `canonical` | One, absolute, self-referencing, matches sitemap `<loc>`. Not on `noindex` pages and not on the 404 |
| `robots` | Indexable content: default is fine; for content/e-commerce sites add `max-image-preview:large, max-snippet:-1, max-video-preview:-1` (enables large image previews, incl. Discover). Utility pages (search results, cart, account, thank-you, 404): `noindex,follow` |
| `hreflang` links | See SEO-13. Self-reference + every variant + `x-default`, reciprocal, absolute |
| `theme-color` | Two tags, one per `prefers-color-scheme` media query (light and dark), using the brand tokens |
| `color-scheme` | `light dark` if the site supports both |
| Icons + manifest | `favicon.ico`, SVG icon, `apple-touch-icon` 180x180, manifest icons 192/512 (+ maskable) if a manifest exists; `application-name` / `apple-mobile-web-app-title` |
| Feeds | `<link rel="alternate" type="application/rss+xml">` if a feed exists |
| `preconnect` | Only for origins needed for the LCP (fonts/CDN), never speculative |

Do **not** add: `meta keywords`, `generator`, `rel=prev/next` (ignored by Google), `priority`-style hints, duplicate tags from both a framework and a plugin (check the rendered head for duplicates).

**Open Graph** (all absolute URLs): `og:type` (`website`; `article` for posts; `product` for products), `og:site_name`, `og:title`, `og:description`, `og:url` (= canonical), `og:image` + `og:image:width` + `og:image:height` + `og:image:alt`, `og:locale` (`es_ES`, `ca_ES`) + `og:locale:alternate` per other locale. Articles: `article:published_time`, `article:modified_time`, `article:author`, `article:section`, `article:tag`.

**Twitter/X**: `twitter:card=summary_large_image`, plus `twitter:site`/`twitter:creator` only if handles exist. Title, description and image fall back to OG, so do not duplicate them.

**OG image**: 1200x630 (1.91:1) JPG or PNG (no SVG), ideally under 300 KB, absolute `https` URL, key content inside the central square (it gets cropped to 1:1 in some apps), text large and high-contrast, brand colours/logo/font from the Site Brief. Per-page images for dynamic content: Next `opengraph-image.tsx`, `nuxt-og-image`, or a build step with `satori` + `resvg` using the brand tokens. For small sites: one branded template per section. Never a stock photo with unrelated text.

## 4. Structured data (JSON-LD)

Format: one `<script type="application/ld+json">` per page containing an `@graph`, nodes linked by `@id` (`{origin}/#organization`, `/#website`, `{url}#webpage`, `{url}#breadcrumb`). Absolute URLs. `inLanguage` set. Escape `<` as `\u003c` when serialising. **Markup must describe what is visible on the page**; never mark up hidden or invented content.

| Site/page type | Nodes |
|---|---|
| Every site, home | `Organization` (name, url, `logo` as `ImageObject` at least 112x112 px, `sameAs` real profiles, `contactPoint` if real) and `WebSite` (name, `alternateName` if any, url, inLanguage) |
| Every indexable page | `WebPage` (or `AboutPage`, `ContactPage`, `CollectionPage`, `ProfilePage`) with `isPartOf` → WebSite, `primaryImageOfPage`, `breadcrumb` |
| Deep pages (3+ levels) | `BreadcrumbList` mirroring the visible breadcrumb |
| Blog/news | `Article`/`BlogPosting`/`NewsArticle`: `headline`, `image` (1200 px wide or more, ideally 16:9, 4:3, 1:1), `datePublished`, real `dateModified`, `author` (`Person` with url), `publisher` → Organization |
| E-commerce | `Product` (name, image, description, `sku`, `brand`, `gtin` if known) + `Offer` (price, `priceCurrency`, `availability`, url; must equal the visible price), `hasMerchantReturnPolicy` and `shippingDetails` when the store has them. `AggregateRating`/`Review` only for real, visible, first-party-collected reviews |
| Local business | The specific subtype (`Restaurant`, `Dentist`, …): `address`, `geo`, `telephone`, `openingHoursSpecification`, `priceRange`, `areaServed`, `sameAs`, `hasMap`. Self-written reviews on your own business do not earn review stars |
| Software/web app | `SoftwareApplication`/`WebApplication`: `applicationCategory`, `operatingSystem`, `offers`; rich result needs a rating or an offer |
| Portfolio/personal | `Person` (+ `ProfilePage`): name, `jobTitle`, `sameAs`, `knowsAbout` |
| Events, jobs, recipes, video | `Event`, `JobPosting`, `Recipe`, `VideoObject` with every property Google marks required for that type (check the current gallery) |

**Do not generate as an SEO measure** (and do not report their absence as a finding): `FAQPage` (FAQ rich results stopped appearing in Google on 7 May 2026, after being restricted to authoritative government/health sites since 2023), `HowTo` (deprecated 2023), the types retired in June 2025 (Course Info, Claim Review, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing) and `WebSite` `SearchAction` (the sitelinks search box was retired in 2024). Schema.org markup for these stays valid and harmless; add it only if the user asks for it for other consumers.

Validation: JSON parses; every node has `@type`; `@id` references resolve inside the graph; URLs absolute; required properties present. Then the Schema Markup Validator (syntax) and the Rich Results Test (eligibility) as manual steps.

## 5. sitemap.xml

**What goes in**: only canonical, indexable, `200`, same-origin URLs. Exclude `noindex`, redirects, `404`s, parameter/filter/search URLs, paginated duplicates, auth and checkout pages.

**Entries**
- `<loc>`: absolute, XML-escaped (`&amp;`), same trailing-slash policy as the canonical.
- `<lastmod>`: W3C date (`2026-10-07` or full datetime with offset), **the real last meaningful content change**: CMS `updated_at`, front-matter `updated`, or `git log -1 --format=%cI -- <source file>` (CI needs full history, `fetch-depth: 0`). If it cannot be known, **omit it**; never stamp every URL with the build time (search engines learn to ignore it).
- `<changefreq>` and `<priority>`: **omit**. Google ignores both (documented) and Bing relies on `lastmod`. Say so in one line if the user asks why.
- **Alternates** (multilingual): `xmlns:xhtml="http://www.w3.org/1999/xhtml"`, and in each `<url>` one `<xhtml:link rel="alternate" hreflang="…" href="…"/>` for every variant **including itself**, plus `x-default`. Must be reciprocal and equal to any on-page hreflang.
- **Images** (galleries, e-commerce, portfolios whose images are not plainly discoverable in HTML): `xmlns:image` with `<image:image><image:loc>` per image. Only `image:loc` is used; the caption/title/license/geo tags were deprecated.
- **Video** (self-hosted video on dedicated watch pages): `xmlns:video` with thumbnail, title, description, `content_loc` or `player_loc`, duration, publication date. **News** sitemap only for registered news publishers.

**Structure and limits**: UTF-8; at most 50,000 URLs and 50 MB uncompressed per file; above that, or when split by type is useful (pages, posts, products, images), use a **sitemap index** (`sitemap-index.xml` → `sitemap-pages.xml`, …) with `lastmod` per child. Served as `application/xml`/`text/xml` at the root, not blocked by robots, listed in `robots.txt` with an absolute URL. Do not use ping endpoints (Google retired its own in 2023).

**Generation**: prefer the stack's maintained generator (Next `app/sitemap.ts` + `generateSitemaps`, `@nuxtjs/sitemap`, `@astrojs/sitemap` with `i18n` and `serialize`, SvelteKit `+server.ts`). For Angular/Vue/vanilla with no generator, adapt `assets/sitemap-generator.mjs` (hreflang, images, index splitting, validation) and run it in `postbuild` from the same route list used for prerendering. Angular: also list the output in `angular.json` `assets` if it lives in source.

**After deploy (manual, list in the report)**: submit in Google Search Console and Bing Webmaster Tools. Optional for e-commerce/news: IndexNow (Bing, Yandex, Naver, Seznam; not Google) with the key file served from the root.

## 6. robots.txt and indexation control

- Generated from `SITE_ENV`: **production** allows crawling; **staging/preview** serves `Disallow: /` **and** `X-Robots-Tag: noindex` plus auth. The robots file alone does not protect staging; a staging file shipped to production is a 🔴.
- Production file: `User-agent: *`, `Allow: /`, `Disallow` for `/api/`, admin, internal search and cart/checkout/account paths that exist. **Never disallow CSS/JS/image paths** needed to render. `Sitemap:` lines with absolute URLs (one per sitemap or the index). No `Crawl-delay` (ignored by Google), no `Host`.
- Do not combine `Disallow` with `noindex` on the same URL: a blocked page is never fetched, so `noindex` is never seen. To keep a page out of the index, allow crawling and use `noindex`.
- Non-HTML files (PDFs, feeds) that must not be indexed: `X-Robots-Tag: noindex` header.
- **AI crawlers**: policy is the owner's decision. Ask once, offer the split between search/answer bots and training bots (examples: `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `Google-Extended`, `PerplexityBot`, `CCBot`, `Applebot-Extended`; verify current names in each vendor's docs). Never decide silently.
- robots.txt is not security. Anything private needs authentication.

## 7. Custom 404 and error views

The 404 is a **page of this site**, not a template. Build it from the Site Brief.

**Design and content**
1. Copy the structure of the closest existing view; keep the real header, footer and navigation so the visitor can keep going.
2. Headline and one line of explanation in the site's voice, in **every locale** (the locale is taken from the URL prefix when routing is localised). Say what happened and what to do, no jokes that clash with the brand.
3. **Primary action** = the site's main destination (home, catalogue, projects, booking), using the project's primary button.
4. **Recovery paths from real data**: the site search box if one exists; 3-6 links taken from the real navigation/top sitemap entries (top categories, key sections); a **"did you mean"** suggestion computed against the known route/slug list (edit distance) so `/prodcuts` offers `/products`; a contact link when the site has one.
5. Visual: typographic "404" or brand-derived SVG using tokens; respects `prefers-reduced-motion`; no stock art.
6. Same for `500`/maintenance/offline: copy the 404 pattern, add a retry action, never expose stack traces.

**Technical**
- **HTTP status must be 404**, not 200 and never a redirect to the home page (soft 404).
  - SSR: Next `notFound()` + `app/not-found.tsx`; Nuxt `createError({ statusCode: 404 })` + `error.vue`; Astro `src/pages/404.astro`; Angular SSR sets the response status (`RESPONSE_INIT` in `@angular/ssr`, or `res.status(404)` in the Express server); SvelteKit `error(404)`.
  - Static hosting: `404.html` at the output root (Netlify, Vercel, Cloudflare Pages, GitHub Pages), or `error_page 404 /404.html;` in nginx. A catch-all `/* /index.html 200` rule turns every URL into a 200: scope it to real app routes, or prerender.
  - SPA-only with no way to send 404: the 404 view sets `noindex`, a title like `Página no encontrada | Brand`, and no canonical.
- **Data-driven 404s** (`/products/does-not-exist`): the resolver/guard/loader must render the 404 view (Angular: resolver → `router.navigateByUrl('/404', { skipLocationChange: true })`; Next `notFound()`), not an empty template. Distinguish route-404 from API-404.
- `<title>` localised, `robots: noindex`, no canonical, excluded from the sitemap, correct `lang`, focus moved to the `h1` on SPA navigation.
- Analytics: if analytics already exists **and** runs behind consent, log the broken path and referrer so broken inbound links can be fixed. Otherwise skip.
- **Moved URLs**: if git history shows renamed/removed routes (`git log --diff-filter=RD --name-only`), propose `301` redirects old → new in the hosting config. Do not redirect unknown URLs to home.

**Verify**: `curl -sI <origin>/zz-audit-404` returns `404` and the body has `noindex`; view at 320px and 1440px, light and dark, by keyboard; localised variants render the right language.

## 8. Verification and manual steps

Run `node <skill-dir>/scripts/seo-verify.mjs <origin>` against a local server or the deployed site (read-only requests). It checks robots, sitemap structure and `lastmod`, hreflang reciprocity, per-URL status/title/description/canonical/robots/OG/JSON-LD, `og:image` reachability and the 404 probe. Fix what it reports as `ERROR`, explain each `WARN`, and list what it cannot see.

Manual steps to list at the end of the report: submit sitemaps (Search Console, Bing Webmaster Tools), Rich Results Test and Schema Markup Validator on the main templates, social debuggers (Facebook Sharing Debugger, LinkedIn Post Inspector) for OG images, real-device check of the 404, set `SITE_URL`/`SITE_ENV` in the deployment.
