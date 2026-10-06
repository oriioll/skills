# Category: security (config hygiene + API protection)

Format per check: **Pass** = what good looks like, **Detect** = how to verify, **Fix** = brief remedy.

## SEC-01 Secrets live in a private `.env`, never in git
- **Pass**: every secret (DB password, API keys, JWT secret, SMTP, OAuth client secret, third-party tokens) is read from environment or a secret manager. `.env` and variants are git-ignored and docker-ignored. Only `.env.example` is tracked.
- **Detect**: `.gitignore` contains `.env` and `.env.*` (or `.env.local`) plus `!.env.example`. `git ls-files | grep -E '(^|/)\.env'` returns only `.env.example`. `.dockerignore` excludes `.env*`. Compose uses `env_file` or `${VAR}`, not literals. CI uses secrets, not literals in workflows.
- **Fix**: add ignore patterns (auto). A tracked real `.env` is 🔴 Critical: `git rm --cached .env`, **rotate every secret in it**.

## SEC-02 `.env.example` exists and is complete
- **Pass**: tracked `.env.example` lists every variable the code reads, with placeholder values (`DB_PASSWORD=change-me`) and a short comment per variable. README says how to use it.
- **Detect**: collect variables used: `process.env.X`, `import.meta.env.X`, `environment.ts` fields, `@Value("${x}")`, `${X}` in `application.yml`, `System.getenv`, `os.environ`. Diff against `.env.example` keys.
- **Fix** (auto): create/extend `.env.example` with **keys only** and placeholders. Never copy values from a real `.env`.

## SEC-03 No hardcoded secrets or sensitive data
- **Detect** (grep source, config, tests, fixtures, Docker, CI; skip lock files and build output):
  - Literal passwords/secrets: `password\s*[:=]\s*['"][^'"]+`, `secret`, `spring.datasource.password=<literal>`, `jwt.secret=<literal>`
  - Token shapes: `AKIA[0-9A-Z]{16}`, `sk_live_`, `ghp_`, `xox[bp]-`, `-----BEGIN (RSA |EC )?PRIVATE KEY-----`, long base64 strings next to `key`/`token`
  - Secrets under public prefixes (`VITE_`, `NEXT_PUBLIC_`, Angular `environment.ts`): they ship to the browser
  - PII or credentials in logs and committed fixtures
- **Not secrets** (avoid false positives): Firebase web config, Stripe publishable keys (`pk_`), Google Maps browser keys (should be referrer-restricted), analytics IDs.
- **Fix**: move to env + `${VAR}` placeholders (auto when mechanical). Real leaked secret: report 🔴 and say rotate.
- **Recommendation**: add `gitleaks` as a pre-commit hook or CI step.

## SEC-04 Secrets in git history
- **Detect**: `git log --all --oneline -- .env '*.pem' '*.key'`; optionally `gitleaks detect`.
- **Fix**: 🔴 if found. Rotate secrets. Never rewrite history automatically; mention `git filter-repo` as the user's decision.

## SEC-05 API rate limiting
- **Applies when** the repo contains a backend/API. If the frontend only consumes third-party APIs: N/A (optionally note client-side debounce).
- **Pass**: a global limit plus stricter limits on login, signup, password reset, OTP, contact/forms and expensive endpoints; responses are `429` with `Retry-After`; key is IP **and** user/API key; correct client IP behind a proxy (`X-Forwarded-For` trusted only from the proxy); shared store (Redis) if more than one instance. Gateway-level limits (nginx `limit_req`, Cloudflare, API gateway) count if the config is in the repo.
- **Detect**: look for the libraries in `framework-map.md` (Bucket4j, Resilience4j, `express-rate-limit`, `@nestjs/throttler`, `slowapi`, DRF throttling), proxy config, or filters/interceptors named `*RateLimit*`/`*Throttle*`. Check auth endpoints are covered.
- **Fix** (propose, then apply): add the idiomatic library for the stack, protect auth endpoints first, make limits configurable via env. Spring Boot: Bucket4j starter or a gateway limit; Node: `express-rate-limit` (+ Redis store when scaled).
- **Severity**: 🟠 Important; 🔴 if login/password-reset is unprotected on a public API.

## SEC-06 Security headers, CORS, transport (bonus)
- **Pass**: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, a CSP (even report-only to start), `frame-ancestors`/`X-Frame-Options`. CORS is an explicit origin allow-list, never `*` together with credentials. Cookies for sessions are `HttpOnly; Secure; SameSite`. Input is validated server-side.
- **Detect**: Spring `SecurityFilterChain` headers/CORS config, Helmet (`helmet()`), `next.config` `headers()`, proxy config. Production headers are `🔍 needs runtime check` (`curl -I https://site`).
- **Severity**: 🟠 / 🟡. Propose before applying.
