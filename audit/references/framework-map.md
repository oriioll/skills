# Framework map: where each concern lives

Use this to locate things quickly instead of reading the whole repo. If the stack is not listed, find where `<head>` is generated, where routes are declared, and where HTTP calls are made.

## Contents
- Frontend: Vue/Vite, Nuxt, Angular, Next.js, Astro/SvelteKit, vanilla
- Backend: Spring Boot, Node, others
- Hosting/server config

## Frontend

| Concern | Vue 3 + Vite (SPA) | Nuxt | Angular | Next.js (App Router) | Vanilla JS |
|---|---|---|---|---|---|
| Routes | `src/router/index.*` | `pages/` | `app.routes.ts` / routing modules | `app/**/page.tsx` | one `.html` per page / server routes |
| Titles/meta | `index.html` + `@unhead/vue` (`useHead`, `useSeoMeta`) or router guard | `useHead`, `useSeoMeta`, `app.head` in `nuxt.config` | `Title`/`Meta` services, `title` in route config | `metadata` / `generateMetadata` in `layout.tsx`/`page.tsx` | `<title>` + `<meta>` in each page |
| 404 | catch-all `/:pathMatch(.*)*` | `error.vue` | `**` route | `app/not-found.tsx` | `404.html` + host config |
| Error/loading | `app.config.errorHandler`, `onErrorCaptured`, `<Suspense>` | `error.vue`, `<NuxtErrorBoundary>` | `ErrorHandler`, `HttpInterceptor`, `@defer` | `error.tsx`, `global-error.tsx`, `loading.tsx` | `window.onerror`, `unhandledrejection` |
| Static files | `public/` | `public/` | `src/assets` or `public/` **and must be listed in `angular.json` `assets`** | `public/` | project root |
| robots/sitemap | `public/robots.txt`, build script/plugin | `@nuxtjs/sitemap`, `@nuxtjs/robots` | `src/robots.txt` + assets entry, generate sitemap at build | `app/robots.ts`, `app/sitemap.ts` | root files |
| Public env | `import.meta.env.VITE_*` | `runtimeConfig.public` | `environment.ts` (bundled) | `NEXT_PUBLIC_*` | none (no build) |
| HTTP | `fetch`, axios, composables, Pinia actions | `useFetch`, `$fetch` | `HttpClient` | `fetch`, server actions, route handlers | `fetch`, XHR |
| A11y lint | `eslint-plugin-vuejs-accessibility` | same | `@angular-eslint` template a11y rules | `eslint-plugin-jsx-a11y` (bundled in `next lint`) | `axe-core` |

Public env prefixes (`VITE_`, `NEXT_PUBLIC_`, `NUXT_PUBLIC_`, `PUBLIC_`, `REACT_APP_`, Angular `environment.ts`) end up **in the browser bundle**. Secrets never go there.

Others: **Astro** (`src/pages`, layout `<head>`, `@astrojs/sitemap`), **SvelteKit** (`src/routes`, `+error.svelte`, `<svelte:head>`), **Remix/React Router** (`meta` export, `ErrorBoundary`).

## Backend

| Stack | Config/secrets | Errors | Rate limit | Timeouts |
|---|---|---|---|---|
| Spring Boot | `application.yml/properties` with `${ENV_VAR}`, profiles | `@RestControllerAdvice` + `ProblemDetail` | Bucket4j starter, Resilience4j `RateLimiter`, or gateway/proxy | `RestClient`/`WebClient`/Feign connect+read timeouts, Resilience4j |
| Express/Fastify | `dotenv`, `process.env` | error middleware | `express-rate-limit` (+ Redis store), `@fastify/rate-limit` | `axios` timeout, `AbortSignal.timeout` |
| NestJS | `@nestjs/config` | exception filters | `@nestjs/throttler` | same as Node |
| FastAPI / Django / Laravel | `.env` via pydantic-settings / django-environ / Laravel `.env` | exception handlers | `slowapi` / DRF throttling / `throttle` middleware | `httpx` / `requests` timeout |

## Hosting and server config (check what is in the repo)

- `nginx.conf`, `Dockerfile`, `docker-compose.yml`, `vercel.json`, `netlify.toml`, `_redirects`, `.htaccess`, `firebase.json`, `staticwebapp.config.json`, CI files in `.github/workflows`.
- SPA fallback rules (`try_files $uri /index.html`, `/* /index.html 200`) turn every unknown URL into HTTP 200. Relevant to SEO-08 (soft 404).
- Proxy/CDN rate limits, security headers and redirects often live here, not in app code.
