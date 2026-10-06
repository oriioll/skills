# Category: ux (states, CTAs, tooltips, breadcrumbs)

## Method for UX-01 to UX-04
1. Enumerate every data-fetching site: `fetch`, axios, `HttpClient`, `useFetch`/`$fetch`, TanStack Query, Pinia/NgRx effects, server actions.
2. Build a small matrix (route/component x loading / error / empty / timeout) and fill it from the code. Report only the gaps, grouped by component.

## UX-01 Loading states
- **Pass**: every async load shows feedback: **skeletons** for content-shaped areas (lists, cards, pages; layout does not jump), **spinners** for short or inline actions. Submit buttons are disabled and show progress while pending. Loading always ends (reset in `finally`/`complete`, never stuck on error).
- **Detect**: `loading`/`isLoading`/`isPending` flags rendered in templates; Vue `<Suspense>`; Angular `@if (loading)`, `@defer`, `async` pipe with placeholder; Next `loading.tsx`/`<Suspense fallback>`; for vanilla: class toggles. Flag fetches whose result is rendered with no pending state.
- **Fix**: add skeleton/spinner component reusing the project's design system; use `aria-busy="true"` or `role="status"` for announcements.

## UX-02 Error states
- **Pass**: failures are caught and shown in the UI with a human message and a **retry** action. No raw stack traces, status codes only or `[object Object]`. One failing widget does not blank the app: global handler + route/component boundaries exist. No empty `catch {}`; `console.error` alone is not handling.
- **Detect**: Vue `app.config.errorHandler`, `onErrorCaptured`; Angular `ErrorHandler`, `HttpInterceptor`; Next `error.tsx` + `global-error.tsx`; Nuxt `error.vue`; vanilla `window.addEventListener('unhandledrejection', ...)`. Form errors inline and tied to fields (see A11Y-03).
- **Fix**: add the global handler + a shared error component (auto if boilerplate; user-visible copy is proposed).

## UX-03 Empty states
- **Pass**: every list, table, search, dashboard and cart has an explicit empty UI: what is missing, why, and the next action (button). It distinguishes **no data yet**, **no results for this filter** and **error**. Never a blank area, `undefined` or `0 results` with no help.
- **Detect**: iterations (`v-for`, `@for`, `*ngFor`, `.map`) over fetched data with no `length === 0` / `@empty` / `v-else` branch. Angular `@for` supports `@empty`.

## UX-04 Failed requests and timeouts
- **Pass**:
  - Timeouts set on every outbound call (axios `timeout`, `fetch` + `AbortSignal.timeout(ms)`, RxJS `timeout()`; on the backend, connect/read timeouts on `RestClient`/`WebClient`/Feign/HTTP clients)
  - Retries only for idempotent requests, with exponential backoff + jitter, capped
  - Specific handling: offline/network error, `401` (refresh/redirect to login), `403`, `404`, `429` (tell the user to wait), `5xx` (friendly message + retry)
  - In-flight requests cancelled on navigation/unmount (`AbortController`, `switchMap`, unsubscribe)
  - Backend calling other services: circuit breaker/fallback where the failure would cascade (Resilience4j for Spring)
- **Detect**: grep HTTP call sites and check each for the above; central interceptor/wrapper is the ideal single place.
- **Fix**: add timeout + interceptor handling (auto if unambiguous). 
- **Recommendation**: if 5+ components hand-roll loading/error/retry, suggest **TanStack Query** (adapters for Vue, Angular, React, Svelte): it provides pending/error/empty/retry/cancel/caching uniformly. If the project has few call sites, keep the current approach.

## UX-05 Prominent CTAs
- **Applies**: public pages (home, landing, pricing, product, contact). For backoffice screens, check there is one clear primary action per screen instead.
- **Pass**: one **primary** CTA visible above the fold, one primary per view, verb-led and specific ("Get a free quote", not "Submit"/"Click here"), visually dominant over secondary actions, real `<button>`/`<a>`, comfortable touch target (about 44px), repeated at the end of long pages, destination works.
- **Detect**: inspect hero/section components and page templates; generic labels; multiple equal-weight buttons; CTA links to `#` or broken routes.
- **Fix**: propose label and placement (copy is proposed, never silently changed).

## UX-06 Tooltips (only if present)
- **Pass**: reachable by keyboard and touch, not hover-only; `role="tooltip"` + `aria-describedby`; shown on hover **and** focus; dismissible with `Esc`; pointer can move onto it; no essential information only in a tooltip; native `title` is not the only mechanism.
- **Rich tooltips**: if the content has links, buttons or formatting, it is a **popover/disclosure**, not a tooltip (`popover` attribute, non-modal dialog, or the UI library's popover).
- **Recommendation**: use the UI library's tooltip (Angular CDK/Material, PrimeVue/Vuetify, Radix, Floating UI) rather than hand-rolled positioning.

## UX-07 Breadcrumbs (only if the app needs them)
- **Applies when** navigation is 3+ levels deep (catalog > category > product, docs, nested dashboards). Flat sites: ➖ N/A, and do **not** add them.
- **Pass**: `<nav aria-label="Breadcrumb"><ol>…</ol></nav>`, last item `aria-current="page"`, mirrors the URL hierarchy, `BreadcrumbList` JSON-LD on public pages.
