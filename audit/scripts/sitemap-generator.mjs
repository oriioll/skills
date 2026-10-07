#!/usr/bin/env node
/**
 * sitemap-generator.mjs: production sitemap template for projects whose stack has no generator
 * (Angular, plain Vue/Vite, vanilla). Node >= 18, no dependencies. Adapt, do not rewrite.
 *
 * Usage (postbuild):
 *   SITE_URL=https://example.com node sitemap-generator.mjs --routes=./sitemap.routes.mjs --out=dist/browser
 *
 * `sitemap.routes.mjs` default-exports an array (or async function returning one) of:
 *   {
 *     path: '/es/productos/zapatos',            // required, site-relative
 *     lastmod: '2026-10-01',                    // optional, REAL last content change; omit if unknown
 *     alternates: { es: '/es/…', ca: '/ca/…', 'x-default': '/es/…' }, // optional, include every variant (self too)
 *     images: ['/img/zapatos-1.jpg'],           // optional, site-relative or absolute
 *   }
 * Build the list from the same source as prerendering (route table, CMS, content folder).
 * Only canonical, indexable, 200 URLs belong here. changefreq/priority are deliberately not emitted.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_URLS = 50000;
const W3C_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Real last-modified date of a source file from git; undefined if unavailable (CI needs fetch-depth 0). */
export function gitLastmod(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return W3C_DATE.test(out) ? out : undefined;
  } catch {
    return undefined;
  }
}

export function buildSitemaps({ siteUrl, entries, trailingSlash = false }) {
  if (!siteUrl || /\[|\]/.test(siteUrl)) throw new Error('SITE_URL is missing or contains a placeholder');
  const origin = new URL(siteUrl).origin;
  const abs = (p) => {
    const u = new URL(p, origin);
    if (u.origin !== origin) throw new Error(`URL outside the site origin: ${p}`);
    if (u.pathname !== '/' && trailingSlash !== u.pathname.endsWith('/')) u.pathname = trailingSlash ? `${u.pathname}/` : u.pathname.replace(/\/+$/, '');
    u.hash = '';
    return u.href;
  };
  const seen = new Set();
  const rows = [];
  for (const e of entries) {
    const loc = abs(e.path);
    if (seen.has(loc)) continue;
    seen.add(loc);
    let lastmod = e.lastmod;
    if (lastmod && (!W3C_DATE.test(lastmod) || new Date(lastmod) > new Date(Date.now() + 86400000))) {
      console.warn(`[sitemap] dropping invalid/future lastmod "${lastmod}" for ${loc}`);
      lastmod = undefined;
    }
    const alternates = Object.entries(e.alternates ?? {}).map(([hreflang, p]) => ({ hreflang, href: abs(p) }));
    if (alternates.length && !alternates.some((a) => a.href === loc)) console.warn(`[sitemap] ${loc}: hreflang set has no self-reference`);
    rows.push({ loc, lastmod, alternates, images: (e.images ?? []).map(abs) });
  }
  const hasAlt = rows.some((r) => r.alternates.length);
  const hasImg = rows.some((r) => r.images.length);
  const ns = ['xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"', hasAlt && 'xmlns:xhtml="http://www.w3.org/1999/xhtml"', hasImg && 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'].filter(Boolean).join(' ');
  const urlXml = (r) =>
    `  <url>\n    <loc>${esc(r.loc)}</loc>` +
    (r.lastmod ? `\n    <lastmod>${r.lastmod}</lastmod>` : '') +
    r.alternates.map((a) => `\n    <xhtml:link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}"/>`).join('') +
    r.images.map((i) => `\n    <image:image><image:loc>${esc(i)}</image:loc></image:image>`).join('') +
    '\n  </url>';
  const wrap = (body) => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${ns}>\n${body}\n</urlset>\n`;

  if (rows.length <= MAX_URLS) return { files: { 'sitemap.xml': wrap(rows.map(urlXml).join('\n')) }, entryPoint: `${origin}/sitemap.xml`, count: rows.length };

  const files = {};
  const children = [];
  for (let i = 0; i < rows.length; i += MAX_URLS) {
    const name = `sitemap-${children.length + 1}.xml`;
    const chunk = rows.slice(i, i + MAX_URLS);
    files[name] = wrap(chunk.map(urlXml).join('\n'));
    const newest = chunk.map((r) => r.lastmod).filter(Boolean).sort().pop();
    children.push(`  <sitemap>\n    <loc>${origin}/${name}</loc>${newest ? `\n    <lastmod>${newest}</lastmod>` : ''}\n  </sitemap>`);
  }
  files['sitemap-index.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${children.join('\n')}\n</sitemapindex>\n`;
  return { files, entryPoint: `${origin}/sitemap-index.xml`, count: rows.length };
}

/* CLI */
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  const routesPath = arg('routes');
  const out = arg('out');
  if (!routesPath || !out) {
    console.error('Usage: SITE_URL=https://example.com node sitemap-generator.mjs --routes=./sitemap.routes.mjs --out=dist [--trailing-slash]');
    process.exit(2);
  }
  try {
    const mod = await import(pathToFileURL(resolve(routesPath)).href);
    const entries = typeof mod.default === 'function' ? await mod.default() : mod.default;
    const { files, entryPoint, count } = buildSitemaps({ siteUrl: process.env.SITE_URL, entries, trailingSlash: process.argv.includes('--trailing-slash') });
    mkdirSync(resolve(out), { recursive: true });
    for (const [name, xml] of Object.entries(files)) writeFileSync(join(resolve(out), name), xml);
    console.log(`[sitemap] ${count} URLs -> ${Object.keys(files).join(', ')} (reference ${entryPoint} in robots.txt)`);
  } catch (err) {
    console.error(`[sitemap] ${err.message}`);
    process.exit(1);
  }
}
