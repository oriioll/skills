#!/usr/bin/env node
/**
 * seo-verify.mjs: read-only SEO and indexation verifier. Node >= 18, no dependencies.
 *
 * Usage: node seo-verify.mjs <origin> [--max=25] [--timeout=10000] [--json]
 * Example: node seo-verify.mjs http://localhost:4200
 *
 * Only issues GET/HEAD requests. Exit code 1 when at least one ERROR is found.
 * Static HTML only: it sees what a crawler sees without running JavaScript.
 */

const args = process.argv.slice(2);
const flag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};
const originArg = args.find((a) => !a.startsWith('--'));
if (!originArg) {
  console.error('Usage: node seo-verify.mjs <origin> [--max=25] [--timeout=10000] [--json]');
  process.exit(2);
}
const ORIGIN = new URL(originArg).origin;
const MAX = Number(flag('max', 25));
const TIMEOUT = Number(flag('timeout', 10000));
const AS_JSON = args.includes('--json');

const findings = [];
const add = (sev, id, where, msg) => findings.push({ sev, id, where, msg });

async function get(url, { method = 'GET' } = {}) {
  try {
    const res = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT), headers: { 'user-agent': 'seo-verify/1.0 (+audit skill)' } });
    const text = method === 'HEAD' ? '' : await res.text();
    return { ok: true, status: res.status, headers: res.headers, text, url };
  } catch (err) {
    return { ok: false, status: 0, headers: new Headers(), text: '', url, error: err.message };
  }
}

const decodeXml = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const parseAttrs = (tag) => {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1].toLowerCase()] = m[2] ?? m[3];
  return out;
};
const isAbsolute = (u) => /^https?:\/\//i.test(u);
const norm = (u) => { try { const x = new URL(u); x.hash = ''; return x.href; } catch { return u; } };
const W3C_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/;
const DEFAULT_TITLES = /^(vite app|vite \+ \w+|angular(app)?|react app|document|untitled|home|index|my app|create next app|nuxt app)$/i;

/* ---------------- robots.txt ---------------- */
async function checkRobots() {
  const res = await get(`${ORIGIN}/robots.txt`);
  if (!res.ok) { add('WARN', 'SEO-04', '/robots.txt', `unreachable: ${res.error}`); return { sitemaps: [] }; }
  if (res.status !== 200) { add('WARN', 'SEO-04', '/robots.txt', `status ${res.status}, no robots.txt served`); return { sitemaps: [] }; }
  const ct = res.headers.get('content-type') || '';
  if (!/text\/plain/i.test(ct)) add('WARN', 'SEO-04', '/robots.txt', `content-type is "${ct}", expected text/plain (SPA fallback?)`);
  if (/<html/i.test(res.text)) add('ERROR', 'SEO-04', '/robots.txt', 'serves HTML (SPA fallback), not a robots file');
  if (/\[[A-Z_]+\]/.test(res.text)) add('ERROR', 'SEO-04', '/robots.txt', 'contains an unresolved [PLACEHOLDER]');
  const sitemaps = [];
  let agents = [];
  let lastWasAgent = false;
  for (const raw of res.text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [k, ...rest] = line.split(':');
    const key = k.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (key === 'sitemap') { sitemaps.push(value); continue; }
    if (key === 'user-agent') { if (!lastWasAgent) agents = []; agents.push(value.toLowerCase()); lastWasAgent = true; continue; }
    lastWasAgent = false;
    if (key === 'disallow' && agents.includes('*')) {
      if (value === '/') add('ERROR', 'SEO-04', '/robots.txt', 'User-agent: * has "Disallow: /" (whole site blocked). Fine for staging, fatal in production');
      if (/\.(css|js)\b|\/assets\/?$|\/static\/?$/i.test(value)) add('WARN', 'SEO-04', '/robots.txt', `Disallow "${value}" may block rendering resources`);
    }
  }
  if (!sitemaps.length) add('WARN', 'SEO-04', '/robots.txt', 'no Sitemap: line');
  for (const s of sitemaps) if (!isAbsolute(s)) add('ERROR', 'SEO-04', '/robots.txt', `Sitemap URL not absolute: ${s}`);
  return { sitemaps: sitemaps.filter(isAbsolute) };
}

/* ---------------- sitemap ---------------- */
async function readSitemap(url, depth = 0, seen = new Set()) {
  if (seen.has(url) || depth > 2) return [];
  seen.add(url);
  const where = new URL(url).pathname;
  const res = await get(url);
  if (!res.ok || res.status !== 200) { add('ERROR', 'SEO-05', where, `not reachable (status ${res.status || res.error})`); return []; }
  if (!/xml/i.test(res.headers.get('content-type') || '')) add('WARN', 'SEO-05', where, `content-type "${res.headers.get('content-type')}" is not XML`);
  if (/<html/i.test(res.text)) { add('ERROR', 'SEO-05', where, 'serves HTML (SPA fallback), not XML'); return []; }
  if (/<sitemapindex/i.test(res.text)) {
    const children = [...res.text.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)].map((m) => (m[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/) || [])[1]).filter(Boolean).map(decodeXml);
    const nested = [];
    for (const c of children) nested.push(...(await readSitemap(c, depth + 1, seen)));
    return nested;
  }
  const entries = [...res.text.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
    const block = m[1];
    return {
      loc: decodeXml((block.match(/<loc>\s*([^<]+?)\s*<\/loc>/) || [])[1] || ''),
      lastmod: (block.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/) || [])[1],
      hasChangefreq: /<changefreq>/.test(block),
      hasPriority: /<priority>/.test(block),
      alternates: [...block.matchAll(/<xhtml:link\b[^>]*>/g)].map((a) => parseAttrs(a[0])).filter((a) => a.rel === 'alternate' && a.hreflang),
    };
  });
  if (entries.length > 50000) add('ERROR', 'SEO-05', where, `${entries.length} URLs (limit 50,000 per file): split with a sitemap index`);
  if (res.text.length > 50 * 1024 * 1024) add('ERROR', 'SEO-05', where, 'larger than 50 MB uncompressed');
  entries.forEach((e) => (e.source = where));
  return entries;
}

function checkSitemapEntries(entries) {
  const host = new URL(ORIGIN).host;
  const seen = new Set();
  let withLastmod = 0;
  const lastmods = new Set();
  let slash = 0, noSlash = 0, changefreq = 0, priority = 0;
  for (const e of entries) {
    if (!isAbsolute(e.loc)) { add('ERROR', 'SEO-05', e.source, `<loc> not absolute: ${e.loc}`); continue; }
    const u = new URL(e.loc);
    if (u.host !== host) add('ERROR', 'SEO-05', e.source, `<loc> on another host (${u.host}): ${e.loc}`);
    if (new URL(ORIGIN).protocol === 'https:' && u.protocol !== 'https:') add('ERROR', 'SEO-05', e.source, `<loc> is not https: ${e.loc}`);
    if (seen.has(e.loc)) add('WARN', 'SEO-05', e.source, `duplicate <loc>: ${e.loc}`); seen.add(e.loc);
    if (u.pathname !== '/') (u.pathname.endsWith('/') ? slash++ : noSlash++);
    if (e.lastmod) {
      withLastmod++; lastmods.add(e.lastmod.slice(0, 10));
      if (!W3C_DATE.test(e.lastmod)) add('ERROR', 'SEO-05', e.source, `invalid <lastmod> "${e.lastmod}" for ${e.loc}`);
      else if (new Date(e.lastmod) > new Date(Date.now() + 86400000)) add('WARN', 'SEO-05', e.source, `<lastmod> in the future for ${e.loc}`);
    }
    if (e.hasChangefreq) changefreq++;
    if (e.hasPriority) priority++;
  }
  if (entries.length > 5 && withLastmod > 0 && lastmods.size === 1) add('WARN', 'SEO-05', 'sitemap', `every <lastmod> is ${[...lastmods][0]}: looks like a build-time stamp, not real modification dates`);
  if (entries.length && !withLastmod) add('INFO', 'SEO-05', 'sitemap', 'no <lastmod> at all (acceptable; add real dates when known)');
  if (slash && noSlash) add('WARN', 'SEO-05', 'sitemap', `mixed trailing-slash policy (${slash} with, ${noSlash} without)`);
  if (changefreq || priority) add('INFO', 'SEO-05', 'sitemap', `<changefreq>/<priority> present in ${Math.max(changefreq, priority)} URLs: Google ignores them`);
  // hreflang reciprocity
  const byLoc = new Map(entries.map((e) => [norm(e.loc), e]));
  for (const e of entries.filter((x) => x.alternates.length)) {
    const self = e.alternates.find((a) => norm(a.href) === norm(e.loc));
    if (!self) add('WARN', 'SEO-13', e.source, `hreflang set for ${e.loc} lacks a self-reference`);
    if (!e.alternates.some((a) => a.hreflang === 'x-default')) add('INFO', 'SEO-13', e.source, `no x-default for ${e.loc}`);
    for (const a of e.alternates) {
      const other = byLoc.get(norm(a.href));
      if (!other) add('WARN', 'SEO-13', e.source, `alternate ${a.href} (${a.hreflang}) is not itself in the sitemap`);
      else if (!other.alternates.some((b) => norm(b.href) === norm(e.loc))) add('ERROR', 'SEO-13', e.source, `hreflang not reciprocal: ${a.href} does not link back to ${e.loc}`);
    }
  }
}

/* ---------------- pages ---------------- */
const pageData = [];
const imageChecks = new Map();

function extractHead(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => parseAttrs(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => parseAttrs(m[0]));
  const meta = (key) => metas.filter((m) => (m.name || m.property || '').toLowerCase() === key);
  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => decodeXml(m[1].replace(/\s+/g, ' ').trim()));
  const ld = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return {
    titles, metas, links, meta, ld,
    lang: (html.match(/<html[^>]*\blang\s*=\s*["']?([^"'\s>]+)/i) || [])[1],
    h1: (html.match(/<h1[\s>]/gi) || []).length,
  };
}

function walkLd(node, fn) {
  if (Array.isArray(node)) return node.forEach((n) => walkLd(n, fn));
  if (node && typeof node === 'object') { fn(node); Object.values(node).forEach((v) => walkLd(v, fn)); }
}

async function checkPage(url, inSitemap) {
  const where = new URL(url).pathname || '/';
  const res = await get(url);
  if (!res.ok) { add('ERROR', 'SEO-09', where, `request failed: ${res.error}`); return; }
  if (res.status >= 300 && res.status < 400) { add('WARN', 'SEO-14', where, `redirects (${res.status}) to ${res.headers.get('location')}; sitemap/links should point to the final URL`); return; }
  if (res.status !== 200) { add('ERROR', 'SEO-09', where, `status ${res.status}`); return; }
  const h = extractHead(res.text);
  const xrobots = res.headers.get('x-robots-tag') || '';
  const robotsMeta = h.meta('robots').map((m) => m.content || '').join(',');
  const noindex = /noindex/i.test(xrobots + ',' + robotsMeta);
  if (noindex && inSitemap) add('ERROR', 'SEO-14', where, 'noindex but listed in the sitemap');

  // title
  if (h.titles.length === 0) add('ERROR', 'SEO-01', where, 'missing <title>');
  else {
    if (h.titles.length > 1) add('ERROR', 'SEO-01', where, `${h.titles.length} <title> elements`);
    const t = h.titles[0];
    if (!t || DEFAULT_TITLES.test(t)) add('ERROR', 'SEO-01', where, `framework/default title "${t}"`);
    else if (t.length < 20 || t.length > 65) add('WARN', 'SEO-01', where, `title length ${t.length} ("${t}"), aim for about 30-60`);
  }
  // description
  const desc = (h.meta('description')[0] || {}).content;
  if (!desc) add('WARN', 'SEO-02', where, 'missing meta description');
  else if (desc.length < 50 || desc.length > 170) add('WARN', 'SEO-02', where, `description length ${desc.length}, aim for about 70-160`);
  // canonical
  const canon = h.links.filter((l) => (l.rel || '').toLowerCase() === 'canonical');
  let canonHref;
  if (!canon.length) { if (!noindex) add('WARN', 'SEO-03', where, 'missing canonical'); }
  else {
    if (canon.length > 1) add('ERROR', 'SEO-03', where, `${canon.length} canonical links`);
    canonHref = canon[0].href;
    if (!isAbsolute(canonHref || '')) add('ERROR', 'SEO-03', where, `canonical not absolute: "${canonHref}"`);
    else if (norm(canonHref) !== norm(url)) add('WARN', 'SEO-03', where, `canonical (${canonHref}) differs from the URL listed/linked (${url})`);
    if (noindex) add('WARN', 'SEO-03', where, 'canonical present on a noindex page');
  }
  // basics
  if (!h.lang) add('WARN', 'A11Y-02', where, 'missing <html lang>');
  const vp = (h.meta('viewport')[0] || {}).content;
  if (!vp) add('WARN', 'A11Y-02', where, 'missing viewport meta');
  else if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?(\s|,|$)/i.test(vp)) add('WARN', 'A11Y-02', where, `viewport blocks zoom: "${vp}"`);
  if (h.h1 !== 1 && !noindex) add('WARN', 'A11Y-02', where, `${h.h1} <h1> elements, expected 1`);
  if (/<div id=["'](root|app|__nuxt)["']>\s*<\/div>/i.test(res.text) && h.h1 === 0) add('INFO', 'SEO-11', where, 'client-rendered shell: crawlers and social scrapers see no content without JS (consider SSR/prerender)');

  // Open Graph / Twitter
  const og = (k) => (h.meta(k)[0] || {}).content;
  if (!noindex) {
    for (const k of ['og:title', 'og:description', 'og:image', 'og:url']) if (!og(k)) add('WARN', 'SEO-10', where, `missing ${k}`);
    if (og('og:image') && !isAbsolute(og('og:image'))) add('ERROR', 'SEO-10', where, `og:image not absolute: ${og('og:image')}`);
    if (og('og:url') && canonHref && norm(og('og:url')) !== norm(canonHref)) add('WARN', 'SEO-10', where, 'og:url differs from canonical');
    if (!og('twitter:card')) add('INFO', 'SEO-10', where, 'missing twitter:card');
    if (og('og:image') && isAbsolute(og('og:image')) && !og('og:image:alt')) add('INFO', 'SEO-10', where, 'og:image has no og:image:alt');
    if (og('og:image') && isAbsolute(og('og:image')) && !imageChecks.has(og('og:image'))) imageChecks.set(og('og:image'), where);
  }
  // hreflang on page
  const alts = h.links.filter((l) => (l.rel || '').toLowerCase() === 'alternate' && l.hreflang);
  if (alts.length) {
    if (!alts.some((a) => norm(a.href || '') === norm(canonHref || url))) add('WARN', 'SEO-13', where, 'on-page hreflang set lacks a self-reference');
    if (alts.some((a) => !isAbsolute(a.href || ''))) add('ERROR', 'SEO-13', where, 'hreflang href not absolute');
  }
  // JSON-LD
  const ids = new Set(); const refs = [];
  h.ld.forEach((raw, i) => {
    let data;
    try { data = JSON.parse(raw); } catch (e) { add('ERROR', 'SEO-12', where, `JSON-LD block ${i + 1} does not parse: ${e.message}`); return; }
    walkLd(data, (n) => {
      if (n['@id']) { if (Object.keys(n).length === 1) refs.push(n['@id']); else ids.add(n['@id']); }
      const types = [].concat(n['@type'] || []);
      if (types.some((t) => ['FAQPage', 'HowTo'].includes(t))) add('INFO', 'SEO-12', where, `${types.join(',')} markup: no Google rich result any more (harmless, not an SEO win)`);
      for (const k of ['url', 'logo', 'image']) if (typeof n[k] === 'string' && !isAbsolute(n[k])) add('WARN', 'SEO-12', where, `JSON-LD ${k} not absolute: ${n[k]}`);
    });
    if (!data['@context'] && !(Array.isArray(data) && data[0] && data[0]['@context'])) add('WARN', 'SEO-12', where, `JSON-LD block ${i + 1} has no @context`);
  });
  for (const r of refs) if (!ids.has(r) && (r.startsWith('#') || r.startsWith(ORIGIN))) add('WARN', 'SEO-12', where, `JSON-LD @id reference "${r}" is not defined on the page`);

  pageData.push({ where, title: h.titles[0], desc, noindex });
}

async function checkImages() {
  for (const [url, where] of imageChecks) {
    let res = await get(url, { method: 'HEAD' });
    if (!res.ok || res.status === 405 || res.status === 403) res = await get(url);
    const ct = res.headers.get('content-type') || '';
    if (res.status !== 200) add('ERROR', 'SEO-10', where, `og:image returns ${res.status || res.error}: ${url}`);
    else if (!/^image\//i.test(ct)) add('ERROR', 'SEO-10', where, `og:image content-type "${ct}": ${url}`);
    else if (/svg/i.test(ct)) add('WARN', 'SEO-10', where, `og:image is SVG (not supported by most scrapers): ${url}`);
    else if (Number(res.headers.get('content-length')) > 1024 * 1024) add('WARN', 'SEO-10', where, `og:image over 1 MB: ${url}`);
  }
}

/* ---------------- 404 and redirects ---------------- */
async function check404() {
  const probe = `/__audit-404-${Math.random().toString(36).slice(2, 8)}`;
  const res = await get(`${ORIGIN}${probe}`);
  if (!res.ok) { add('WARN', 'SEO-08', probe, `probe failed: ${res.error}`); return; }
  const h = extractHead(res.text);
  const noindex = /noindex/i.test((res.headers.get('x-robots-tag') || '') + h.meta('robots').map((m) => m.content).join(','));
  if (res.status === 404 || res.status === 410) {
    if (res.text.length < 400) add('WARN', 'SEO-08', probe, `status ${res.status} but the body is tiny (${res.text.length} chars): default server page, not a branded 404`);
    if (!h.titles.length && res.text.length >= 400) add('WARN', 'SEO-08', probe, '404 page has no <title>');
  } else if (res.status === 200) {
    add(noindex ? 'WARN' : 'ERROR', 'SEO-08', probe, `unknown URL returns 200 (soft 404)${noindex ? ', mitigated by noindex' : ' and is indexable'}; return a real 404 or at least noindex`);
  } else if (res.status >= 300 && res.status < 400) add('ERROR', 'SEO-08', probe, `unknown URL redirects (${res.status}) to ${res.headers.get('location')}: soft 404`);
  else add('ERROR', 'SEO-08', probe, `unexpected status ${res.status}`);
}

async function checkHttpsRedirect() {
  const u = new URL(ORIGIN);
  if (u.protocol !== 'https:' || /^(localhost|127\.|\[::1\])/.test(u.hostname)) return;
  const res = await get(`http://${u.host}/`);
  if (!res.ok) return;
  const loc = res.headers.get('location') || '';
  if (![301, 308].includes(res.status) || !loc.startsWith('https://')) add('WARN', 'SEO-14', 'http://' + u.host, `http does not 301/308 to https (status ${res.status}, location "${loc}")`);
}

/* ---------------- run ---------------- */
const robots = await checkRobots();
let sitemapUrls = robots.sitemaps.length ? robots.sitemaps : [`${ORIGIN}/sitemap.xml`];
let entries = [];
for (const s of sitemapUrls) entries.push(...(await readSitemap(s)));
if (!entries.length && !robots.sitemaps.length) add('ERROR', 'SEO-05', '/sitemap.xml', 'no sitemap found');
checkSitemapEntries(entries);

let targets = [...new Set(entries.map((e) => e.loc).filter(isAbsolute))];
const sitemapSet = new Set(targets.map(norm));
if (!targets.length) {
  const home = await get(`${ORIGIN}/`);
  const hrefs = [...home.text.matchAll(/<a\b[^>]*>/gi)].map((m) => parseAttrs(m[0]).href).filter((h) => h && !h.startsWith('#') && !/^(mailto|tel|javascript):/i.test(h));
  targets = [`${ORIGIN}/`, ...new Set(hrefs.map((h) => { try { return new URL(h, ORIGIN).href; } catch { return null; } }).filter((h) => h && h.startsWith(ORIGIN)))];
} else if (!sitemapSet.has(norm(`${ORIGIN}/`))) targets.unshift(`${ORIGIN}/`);
const step = Math.max(1, Math.floor(targets.length / MAX));
const sample = targets.filter((_, i) => i % step === 0).slice(0, MAX);
for (const url of sample) await checkPage(url, sitemapSet.has(norm(url)));

// cross-page duplicates
const dup = (key, id, label) => {
  const map = new Map();
  for (const p of pageData.filter((x) => !x.noindex && x[key])) map.set(p[key], [...(map.get(p[key]) || []), p.where]);
  for (const [value, pages] of map) if (pages.length > 1) add('WARN', id, pages.join(', '), `same ${label} on ${pages.length} pages: "${value.slice(0, 60)}"`);
};
dup('title', 'SEO-01', 'title');
dup('desc', 'SEO-02', 'description');

await checkImages();
await check404();
await checkHttpsRedirect();

/* ---------------- report ---------------- */
const order = { ERROR: 0, WARN: 1, INFO: 2 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.id.localeCompare(b.id));
const count = (s) => findings.filter((f) => f.sev === s).length;
if (AS_JSON) {
  console.log(JSON.stringify({ origin: ORIGIN, sampled: sample.length, sitemapUrls: entries.length, summary: { errors: count('ERROR'), warnings: count('WARN'), info: count('INFO') }, findings }, null, 2));
} else {
  console.log(`seo-verify ${ORIGIN}: ${sample.length} pages sampled, ${entries.length} sitemap URLs\n`);
  for (const f of findings) console.log(`${f.sev.padEnd(5)} ${f.id.padEnd(7)} ${f.where}: ${f.msg}`);
  console.log(`\n${count('ERROR')} error(s), ${count('WARN')} warning(s), ${count('INFO')} info`);
  console.log('Not covered (needs a browser or manual check): JS-rendered content, real contrast/focus, response headers beyond X-Robots-Tag, Rich Results Test, Search Console.');
}
process.exit(count('ERROR') ? 1 : 0);
