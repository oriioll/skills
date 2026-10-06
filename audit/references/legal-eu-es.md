# Category: legal (EU + Spain: GDPR/RGPD, LOPDGDD, LSSI-CE, ePrivacy, consumer law)

> This is a **technical compliance aid, not legal advice**. State this in the report. Findings say "missing/incomplete versus common requirements"; they never say "compliant". Recommend legal review for production, especially for e-commerce, minors, health, or large-scale tracking.

## Contents
- Applicability
- Detecting what the site really does
- Checks LEG-01 to LEG-08
- Cookie consent requirements (AEPD-aligned)

## Applicability (decide from the project profile)

| Situation | What is needed |
|---|---|
| Collects any personal data (forms, accounts, newsletter, analytics, logs with IP) | Privacy policy (RGPD arts. 12-14, LOPDGDD) |
| Cookies/localStorage/SDKs that are not strictly necessary | Consent before they run + cookie policy (LSSI-CE art. 22.2, ePrivacy) |
| Any business or commercial activity online (including freelancers) | Legal notice / *Aviso legal* with identity data (LSSI-CE art. 10) |
| Sells or offers services to consumers | Terms/conditions of sale: price incl. taxes, shipping, 14-day withdrawal right and exceptions, warranty, complaints channel (TRLGDCU) |
| Targets under-14s in Spain | Parental consent rules (LOPDGDD art. 7): flag and recommend review |
| Purely private tool with no personal data | Probably N/A: state the reasoning |

Other regional or sector rules may add duties (for example language-availability rules in some autonomous communities): flag "verify with legal counsel", do not assert.

## Detecting what the site really does (do this before judging any page)

Legal texts must match reality. Inventory from code:
- **Forms and data**: field names (email, name, phone, address, payment), auth/accounts, newsletter providers
- **Trackers/third parties**: `gtag`, `googletagmanager`, `analytics.js`, `fbq`/Meta Pixel, `hotjar`, `clarity`, `plausible`/`umami` (check config; cookieless is still personal-data processing in some setups), `intercom`, `crisp`, reCAPTCHA, Google Maps embeds, YouTube/Vimeo iframes, Stripe/PayPal, Mailchimp/Brevo, Sentry (can capture IP/PII)
- **Remote assets**: Google Fonts/CDN-loaded fonts and scripts (visitor IP leaves the EU before consent). Prefer self-hosting (`@fontsource`) or `youtube-nocookie.com` plus consent
- **Storage**: `localStorage`/`sessionStorage`/`IndexedDB`/cookies and what they hold (consent rules cover all of these, not just cookies)
- **Backend**: what is stored, where it is hosted (EU or transfers outside), retention, logs

## Checks

### LEG-01 Privacy policy
- **Pass**: page exists and is reachable, and covers (RGPD art. 13): controller identity and contact; DPO contact if any; each purpose with its **legal basis**; categories of data; recipients/processors; international transfers and safeguards; retention periods; rights (access, rectification, erasure, restriction, portability, objection, withdraw consent); right to complain to the **AEPD** (aepd.es); whether data is obligatory; automated decisions/profiling if any. Layered/short summary at the top is good practice.
- **Severity**: 🔴 if personal data is collected and no page exists; 🟠 if incomplete or contradicts the code.

### LEG-02 Cookie policy
- **Pass**: describes what cookies/storage exist in a **table**: name, provider, purpose, duration, type (necessary/analytics/preferences/marketing), first/third party; says how to change/withdraw consent; matches the real trackers found in the inventory.
- **Severity**: 🟠 (🔴 if trackers exist and there is no policy or banner).

### LEG-03 Terms and conditions
- **Pass**: service description, acceptable use, accounts, IP, liability limits (not excluding unwaivable consumer rights), changes, governing law and jurisdiction (Spanish consumer jurisdiction rules cannot be waived), contact. E-commerce adds: pricing and taxes, payment, delivery, withdrawal right (14 days, form), returns, warranty (legal conformity guarantee), complaints/claims sheet where applicable. The EU ODR platform was discontinued in July 2025: do not require a link to it, verify current wording.

### LEG-04 Legal notice (*Aviso legal*)
- **Pass** (LSSI-CE art. 10): owner's name or company name, tax ID (NIF/CIF), registered address, email and a second direct contact means, commercial registry data if registered, professional regulation data if applicable, price information if relevant.
- Often combined with terms; keep it as a separate section/page if the site is commercial.

### LEG-05 Cookie consent mechanism
Requirements (AEPD cookie guide, aligned with EDPB guidance):
- Non-essential cookies/storage/trackers **do not load before consent** (script gating), not merely hidden behind the banner
- "Accept all", **"Reject all"** and "Configure" visible in the **first layer**, equal prominence (no dark patterns); no pre-ticked boxes; granular by purpose
- Continuing to scroll/browse is **not** consent; no cookie wall for general content
- Consent is withdrawable as easily as given: a persistent **"Cookie settings"** link (footer)
- Consent is recorded (what, when, version) and re-requested when purposes change and periodically (AEPD suggests not more than 24 months)
- Strictly necessary cookies (session, security, load balancing, the consent cookie itself, cart) do not need consent
- Google tools: if used, Consent Mode v2 defaults to `denied` until consent
- **Fix** (propose, then apply): integrate a framework-agnostic library such as **`vanilla-cookieconsent`** (works in Vue, Angular, Next, vanilla; categories + script gating). Alternatives: Klaro, Orejime; commercial CMPs (Cookiebot, Usercentrics) for larger sites. Do not hand-roll a banner.

### LEG-06 Placement and access
- **Pass**: links to privacy, cookies, terms, legal notice in the **footer of every page**; privacy link next to every form submit and sign-up; banner links to the cookie policy; pages in the site's language(s) (Spanish at least for a Spanish audience); not behind login; included in the sitemap (public) and not `noindex` unless intended.

### LEG-07 Consent and marketing in forms
- **Pass**: unticked checkbox for marketing/newsletter, separate from accepting terms; privacy info shown at the point of collection; newsletter with double opt-in and easy unsubscribe (LSSI-CE art. 21 bans unsolicited commercial email); no data collected that is not needed (minimisation).

### LEG-08 Third parties before consent
- **Pass**: nothing from the inventory that sets identifiers or transmits visitor data (analytics, ads, embeds, remote fonts, maps, reCAPTCHA) runs before consent unless strictly necessary or replaced by a privacy-friendly alternative (self-hosted fonts, `youtube-nocookie.com` with click-to-load, privacy-first analytics configured without identifiers).
- **Severity**: 🔴.
