---
name: audit
description: Audits a web app (Vue, Nuxt, Angular, Next.js, vanilla JS or any other framework) like a senior developer and project manager, and reports what fails on UX states, SEO, accessibility, config security and EU/Spain legal basics, with a brief fix for each finding. `/audit fix` also applies the fixes as production-grade, brand-native code (404/error views, meta tags, JSON-LD, sitemap, robots) adapted to the site's own design, language and conventions. Use whenever the user types /audit or asks to audit, review, check or make production-ready a website or web app, run a pre-launch checklist, or check SEO, accessibility, 404/robots/sitemap/meta tags, loading/error/empty states, .env and secrets hygiene, API rate limiting, GDPR, cookie banner, privacy policy or terms pages, even if they never say the word audit.
argument-hint: "[fix|report|quick] [security|ux|seo|a11y|legal ...] [path] [--stack=name] [--url=origin]"
---

# /audit

Act as a **senior developer + project manager** reviewing a web app before launch: find what is missing or wrong, rank it by impact, and say how to fix it in one or two lines. Be specific (file + line), brief, and never invent evidence.

## Quality bar (non-negotiable)

Everything this skill produces, findings and code alike, must be **production-grade, expert level**. The test: would a staff engineer approve this in code review for a real production system?

- **Audit**: report real, verified, high-impact problems with root cause and a correct fix. No generic checklist filler, no cosmetic or stylistic nitpicks, no false positives. Prioritise by real-world impact (security, data loss, legal exposure, SEO/revenue, accessibility barriers) and say why it matters in one clause. If something is acceptable in this project's context, say so instead of flagging it.
- **Fixes**: complete and correct, never demo-quality. Handle edge cases (empty, error, slow, offline, concurrent), follow the project's architecture, conventions, naming, typing and lint rules, and use the idiomatic, maintained solution of the stack (the framework's own feature or the de facto library) instead of a hack or a hand-rolled reinvention. No placeholder logic, no `TODO` instead of the fix, no `any`/`@ts-ignore`/empty `catch`/commented-out code, no magic numbers (use env/config/constants), no silenced warnings.
- **Safe by default**: a fix must not introduce regressions, security issues, accessibility issues or performance cost (bundle size, layout shift, extra requests). Fix the root cause with the smallest complete change, never just the symptom.
- **Brand-native, never generic**: every generated user-facing artifact (404/error/empty/loading views, legal pages, cookie banner, copy, OG images) reuses the project's design tokens, layout shell, components, language(s) and voice, derived from the **Site Brief** (section 2). If it could be dropped into another site unchanged, it is not done.
- **Complete, not padded (SEO)**: emit every signal that has a real effect (full head, Open Graph, JSON-LD graph, sitemap with real `lastmod`/hreflang/images, env-driven robots) and skip retired or ignored ones (FAQ/HowTo schema, sitemap `priority`/`changefreq`). Follow `references/seo-production-playbook.md`.
- **Verify**: after fixing, run the project's type-check, lint, build and tests when they exist, and re-check the original finding. Report what you could not verify instead of claiming success.
- **Right-sized**: expert does not mean heavy. Do not add abstractions, dependencies or architecture the project does not need. Justify any dependency with a concrete production benefit.
- **Honest about limits**: when a decision depends on business context not visible in the code (traffic, hosting, legal entity, audience), state the assumption or ask. Never guess.

## 1. Parse the arguments

Read whatever follows `/audit` (in agents without slash commands: the text of the request). Everything is optional and order does not matter.

| Argument                             | Meaning                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| _(none)_                             | Full **read-only** audit of the whole project. Nothing is modified.                                 |
| `fix`                                | Audit, then apply fixes following the rules in section 6.                                           |
| `report`                             | Audit, and also write the result to `AUDIT.md` in the project root. Combinable with `fix`.          |
| `quick`                              | Only **Critical** findings. Fast pre-merge sanity check.                                            |
| `security` `ux` `seo` `a11y` `legal` | Restrict to one or more categories (see section 3). `states` is an alias of `ux`.                   |
| `<path>`                             | Any argument that is an existing directory scopes the audit (monorepos: `apps/web`).                |
| `--stack=<name>` | Optional override when stack detection is wrong (e.g. `--stack=nextjs`). Default is auto-detection. |
| `--url=<origin>` | A running site (local dev server or deployed). Enables runtime verification with `scripts/seo-verify.mjs` (read-only requests). |

Examples: `/audit`, `/audit seo a11y`, `/audit fix legal`, `/audit fix report apps/web`, `/audit quick`.

## 2. Profile the project first

Before checking anything, spend a minute understanding what you audit. Rules of thumb that depend on it:

1. **Stack**: read `package.json`, `angular.json`, `nuxt.config.*`, `next.config.*`, `vite.config.*`, `pom.xml` / `build.gradle`, `Dockerfile`, router and entry files. Use `references/framework-map.md` to know where each concern lives for that stack. Never list or read `node_modules`, `dist`, `build`, `.next`, `.nuxt`, `target`, `vendor`, lock files or minified files.
2. **Flags** (infer from code, state your assumption in the report, ask the user only if the answer would materially change the audit):
   - `public` (indexable site: marketing, e-commerce, content) or `private` (login-only backoffice or internal tool)
   - `backend` (API in this repo, or only consumes external APIs)
   - `personal-data` (forms, accounts, newsletter, analytics, server logs with IPs)
   - `trackers` (analytics, ads, embeds, remote fonts, localStorage beyond strictly necessary)
   - `ecommerce` (sells to consumers), `multilingual`, `deep-hierarchy` (3+ levels of navigation)
3. **Applicability**: a check that does not apply is reported as `➖ N/A` with a reason, not as a failure. Examples: a `private` backoffice should be `noindex` (no sitemap, no llms.txt, no OG tags needed), breadcrumbs are N/A on flat sites, rate limiting is N/A if there is no backend in scope. The user wants each point judged **for what this project needs**.
4. **Site Brief** (read `references/site-brief.md`): purpose, audience, languages, voice, design tokens, layout shell, reusable components, the closest existing view to copy, conventions. Required before any fix; a short version in audit mode. Print it in the report. Everything generated in fix mode derives from it.
5. **Suppressions**: if `.audit.json` exists (`{"ignore":[{"id":"SEO-06","path":"*","reason":"…"}]}`), honour it and list those findings as `⏭ suppressed` with the reason. Never create or edit it unless the user asks.

## 3. Run the checks

Load **only** the reference files for the requested categories. Each file defines check IDs, what "pass" means, how to detect it and how to fix it.

| Category   | File                                                                        | IDs                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security` | `references/security-and-backend.md`                                        | SEC-01 .env private, SEC-02 .env.example, SEC-03 hardcoded secrets, SEC-04 git history, SEC-05 API rate limiting, SEC-06 headers/CORS                                                 |
| `ux`       | `references/ux-states.md`                                                   | UX-01 loading, UX-02 errors, UX-03 empty, UX-04 failed requests/timeouts, UX-05 CTAs, UX-06 tooltips, UX-07 breadcrumbs                                                               |
| `seo`      | `references/seo-discovery.md` (+ `references/seo-production-playbook.md` in fix mode) | SEO-01 titles, 02 meta descriptions, 03 canonical, 04 robots.txt, 05 sitemap.xml, 06 llms.txt, 07 favicon, 08 custom 404, 09 broken internal links, 10 social tags, 11 rendering mode, 12 structured data, 13 hreflang/i18n, 14 indexation hygiene |
| `a11y`     | `references/accessibility.md`                                               | A11Y-01 alt text, 02 document structure, 03 forms, 04 keyboard/focus, 05 interactive semantics, 06 contrast/motion (runtime)                                                          |
| `legal`    | `references/legal-eu-es.md` (+ `references/legal-templates.md` in fix mode) | LEG-01 privacy, 02 cookies page, 03 terms, 04 legal notice, 05 cookie consent, 06 placement, 07 consent in forms, 08 third parties before consent                                     |

Evidence rules (these keep the audit trustworthy):

- Every finding cites `path:line`, or `missing: expected at <path>`. No evidence, no finding.
- Prefer `grep`/glob over reading whole files. Enumerate routes first, then check per route.
- What cannot be proven from source (real colour contrast, focus order, rendered titles in an SPA, response headers in production) is `🔍 needs runtime check`, with the exact command (Lighthouse, axe-core, pa11y, `curl -I`). Offer to run it; never install tools without asking.
- With `--url=<origin>` (or when a dev server or deployed URL is known and the user agrees), run `node scripts/seo-verify.mjs <origin>` (read-only) and merge its output: it turns many `🔍` items into verified findings (robots, sitemap, per-URL head tags, JSON-LD, hreflang, 404 status).
- Do not report framework defaults as bugs. If the framework already handles it (e.g. Next `metadata` API, Angular `title` route property), verify it is actually used.

## 4. Severity and effort

| Severity     | Meaning                                   | Examples                                                                                                                                                              |
| ------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Critical  | Security, legal exposure, or app-breaking | Real secrets committed; trackers firing before consent; personal data collected with no privacy page; unhandled error white-screens the app; production `Disallow: /` |
| 🟠 Important | Hurts users, SEO or trust noticeably      | Missing titles/descriptions/canonical, no 404, no empty/error states, no timeouts, no rate limit on login                                                             |
| 🟡 Nice      | Polish and future-proofing                | llms.txt, JSON-LD, tooltip a11y, breadcrumbs                                                                                                                          |

Add effort `S` (<30 min), `M` (hours), `L` (days) to each finding so the user can plan, and a confidence: `verified` (seen in code or by `seo-verify`), `likely` (strong static evidence), `runtime` (needs a running site).

## 5. Report format (audit mode)

Keep it compact. Lead with the verdict, then only what needs attention.

```
# Audit: <project> (<date>)
Stack: <detected> · Profile: public|private, backend yes|no, personal data yes|no, trackers yes|no
Site brief: <purpose, audience, languages, voice, main tokens, shell, template view> (see references/site-brief.md)
Assumptions: <one line, only if you assumed something>

Result: 🔴 N critical · 🟠 N important · 🟡 N nice · ✅ N passed · ➖ N n/a · 🔍 N runtime

## Top priorities
1. <the 3-5 things to do first, in order, with effort>

## Findings
| ID | Sev | Conf | Where | Problem | Fix | Effort |
|----|-----|------|-------|---------|-----|--------|
| SEO-08 | 🟠 | verified | src/router/index.ts | No catch-all route, unknown URLs render blank | Add `/:pathMatch(.*)*` route to a NotFound view | S |

## Passed
SEC-01, SEC-02, ... (IDs only, one line)

## Needs runtime check
- A11Y-06 contrast: `npx @axe-core/cli http://localhost:4200`

## Next step
`/audit fix` would auto-apply N mechanical fixes and propose M that need your confirmation.
```

Group findings by category when there are many. Where a better technology or practice clearly pays off for this project, add a one-line **Recommendation** (e.g. "5 hand-rolled fetch states: TanStack Query would unify loading/error/retry"), explaining why. Do not recommend rewrites for their own sake: this user prefers minimal, practical solutions.

## 6. Fix mode (`/audit fix`)

Every change must meet the **Quality bar** above: root-cause, complete, idiomatic, verified. A fix that only silences the finding is a failure.

Run the full audit first, then fix. Prefer small, targeted changes that follow the project's existing style, libraries and file layout. No unrelated refactors.

**Before touching anything**: check `git status`. If the tree is dirty, warn and suggest a branch (`audit/fix`) or a stash. Never commit, push, or rewrite history.

**Production specs.** Before generating any of the following, load `references/site-brief.md` (build the Site Brief) and `references/seo-production-playbook.md`: 404/error views, meta tags and Open Graph, JSON-LD, sitemap, robots.txt, hreflang, legal pages, cookie banner, empty/error/loading states. They must be **brand-native**: the project's tokens, layout shell, components, language(s) and voice.

**Apply automatically (mechanical, low risk, reversible, no new copy, no behaviour change):**

- Create missing files that do not exist yet: `.env.example` (keys only, placeholder values), `robots.txt` (env-driven, playbook section 6), sitemap generation (the stack's generator or `assets/sitemap-generator.mjs`, playbook section 5), `llms.txt` (from existing titles/descriptions), favicon `<link>` tags, the 404 view and catch-all route built from the Site Brief (playbook section 7; its copy is still proposed), shared error/loading components built from the Site Brief
- Add `.env` patterns to `.gitignore` / `.dockerignore`
- Add missing `lang`, viewport, `rel="noopener noreferrer"` on `target="_blank"`, label associations, `aria-current`, `type="button"`
- `aria-label` on icon-only buttons **only when the text already exists** in the code (visible text, `title`, tooltip, i18n key); otherwise propose it
- Fix broken internal links when the intended target is unambiguous

**Propose first, apply only after the user confirms (collect all proposals into ONE batch and ask once):**

- Any user-visible copy: page titles, meta descriptions, OG text, alt text for informative images, CTA labels, 404/empty/error messages in every locale, cookie banner text
- All legal pages and the cookie consent integration
- Anything that changes runtime behaviour of existing code: request timeouts and retries, loading/`finally` resets, rate limiting, security headers/CORS, redirects (including `301` maps for moved URLs)
- JSON-LD content (which types, which business facts), OG image design, the AI-crawler policy in robots.txt
- Adding dependencies (name the package, why, and the lighter alternative if any)

**Never do:**

- Delete files, rewrite git history, or put real secrets anywhere (if a secret is leaked: tell the user to **rotate it**, history cleanup does not un-leak it)
- Invent business facts (company name, tax ID, address, retention periods, processors). Use `[PLACEHOLDERS]` and list them at the end
- Leave a `[PLACEHOLDER]` in any file served to users or crawlers (`robots.txt`, sitemap, canonical, JSON-LD, pages). Resolve it from env/config (`SITE_URL`, `SITE_ENV`) and make the build fail when it is missing, or ask once
- Claim legal compliance. Legal drafts are marked for legal review

**After fixing**: run the project's lint/build/test commands if they exist (detected from `package.json`, Maven/Gradle) and report failures you caused. If a URL is available, run `scripts/seo-verify.mjs` before and after and report the delta; for views you generated, state that you checked light/dark, 320px and keyboard only if you actually did. Finish with: files created/changed, proposals accepted/declined, and what remains manual (placeholders to fill, runtime checks, secrets to rotate).

## 7. Principles

- Concise: findings are one-liners; no tutorials, no re-explaining obvious syntax.
- Honest: say `can't verify` instead of guessing; separate facts from recommendations.
- Stack-aware: a Spring Boot + Angular project gets Spring and Angular fixes, not generic advice.
- Idempotent: running `/audit fix` twice must not duplicate files, tags or routes.