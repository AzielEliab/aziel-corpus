/** Crawl documents for Aziel Digital Library. Author: Aziel Eliab. */
import { ABOUT_PATH, ABOUT_NAV_LABEL, GODLOCK_IDENTITY } from "./seo.js";
import {
  RUNTIME_VERSION,
  RUNTIME_NOTE,
  RUNTIME_LIVE_COUNT,
  RUNTIME_LOCAL_ONLY,
  AI_CLIENTS,
  runtimeHowTo,
} from "./runtime-copy.js";

const HOST = "https://www.azielcorpuslibrary.net";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev";
const GITHUB_REPO = "https://github.com/AzielEliab/aziel-corpus";
const GITHUB_AUTHOR = "https://github.com/AzielEliab";
const DEFAULT_ASSET = "aziel-digital-library-2.7.0.zip";
const VERSION = "2.7.0";
const SITE_LASTMOD = "2026-09-05";
const AUTHOR = "Aziel Eliab";
const AKA = "Aziel Elroi Eliab";
const RECORD_SITEMAP_CAP = 400;

export const MIME = {
  plain: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  json: "application/json; charset=utf-8",
};

export const AI_BOTS = [
  "Googlebot",
  "Google-Extended",
  "GoogleOther",
  "Google-CloudVertexBot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "bingbot",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "Meta-WebIndexer",
  "Applebot",
  "Applebot-Extended",
  "Amazonbot",
  "DuckDuckBot",
  "DuckAssistBot",
  "MistralAI-User",
  "YouBot",
  "CCBot",
  "Bytespider",
  "xAI-SearchBot",
  "Grok-DeepSearch",
  "GrokBot",
  "xAI-Bot",
  "xAI-Grok",
  "cohere-ai",
  "cohere-training-data-crawler",
  "Diffbot",
  "AI2Bot",
  "AI2Bot-Dolma",
  "Timpibot",
  "Petalbot",
  "Omgili",
  "Omgilibot",
  "FirecrawlAgent",
  "ImagesiftBot",
  "FacebookBot",
  "facebookexternalhit",
  "Meta-ExternalAds",
  "TikTokSpider",
  "Baiduspider",
  "Baiduspider-render",
  "Baiduspider-ai",
  "YandexBot",
  "PanguBot",
  "Kangaroo Bot",
  "Cotoyogi",
  "aiHitBot",
  "webzio-extended",
  "ICC-Crawler",
  "DataForSeoBot",
  "AwarioBot",
  "AwarioSmartBot",
  "AwarioRssBot",
  "Sentibot",
  "peer39_crawler",
  "Seekr",
  "Meltwater",
  "TurnitinBot",
  "Factset_spyderbot",
  "NeevaBot",
];

const PRODUCT_LINES = [
  ["Aziel Digital Library (aziel-corpus)", HOST + "/", GITHUB_REPO],
  ["Software hub", HOST + "/software", HOST + "/software"],
  ["aziel-runtime " + RUNTIME_VERSION + " FragGate door", HOST + "/runtime", CATALOG + "/"],
  ["How it's scored", HOST + "/how-its-scored", HOST + "/how-its-scored"],
  ["AzielTether lattice", HOST + "/v1/lattice", HOST + "/software"],
  ["ZionPattern Solver", HOST + "/how-its-scored", HOST + "/pattern"],
];

function isoDay(value, fallback) {
  const s = String(value || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return fallback || SITE_LASTMOD;
}

export function isReadMethod(method) {
  return method === "GET" || method === "HEAD";
}

export function crawlResponse(request, body, contentType, extraHeaders) {
  const headers = { "Content-Type": contentType, ...(extraHeaders || {}) };
  if (request && request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(body, { status: 200, headers });
}

function botAllows() {
  const lines = [];
  for (const bot of AI_BOTS) {
    lines.push("User-agent: " + bot, "Allow: /", "");
  }
  return lines;
}

export function robotsTxt() {
  return [
    "# Aziel Digital Library by Aziel Eliab (aka Aziel Elroi Eliab)",
    "User-agent: *",
    "Allow: /",
    "Allow: /map",
    "Allow: /gazetteer",
    "Allow: /tree",
    "Allow: /health",
    "Allow: /v1/health",
    "Allow: /intelligence",
    "Allow: /ocr",
    "Allow: /receipt",
    "Allow: /ledger",
    "Allow: /historical",
    "Allow: /verify",
    "Allow: /corpus",
    "Allow: /aziel-library",
    "Allow: /pattern",
    "Allow: /software",
    "Allow: /how-its-scored",
    "Allow: " + ABOUT_PATH,
    "Allow: /about",
    "Allow: /runtime",
    "Allow: /runtime/",
    "Allow: /runtime/v1/uses",
    "Allow: /v1",
    "Allow: /v1/",
    "Allow: /cite.json",
    "Allow: /llms.txt",
    "Allow: /ai.txt",
    "Allow: /humans.txt",
    "Allow: /openapi.json",
    "Allow: /assets",
    "Allow: /assets/",
    "Allow: /login",
    "Disallow: /logout",
    "Disallow: /signup",
    "Disallow: /api/",
    "Disallow: /admin/",
    "",
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
    "",
    ...botAllows(),
    "Sitemap: " + HOST + "/sitemap.xml",
    "",
  ].join("\n");
}

const STATIC_SITEMAP = [
  "/",
  ABOUT_PATH,
  "/software",
  "/runtime",
  "/runtime/",
  "/runtime/v1/health",
  "/runtime/v1/uses",
  "/runtime/v1/fraggate",
  "/runtime/v1/fraggate/list",
  "/runtime/mcp",
  "/runtime/llms.txt",
  "/runtime/cite.json",
  "/runtime/robots.txt",
  "/runtime/ai.txt",
  "/how-its-scored",
  "/pattern",
  "/map",
  "/tree",
  "/gazetteer",
  "/historical",
  "/intelligence",
  "/aziel-library",
  "/corpus",
  "/cite.json",
  "/llms.txt",
  "/ai.txt",
  "/humans.txt",
  "/health",
  "/ocr",
  "/verify",
  "/download",
  "/install.sh",
  "/v1/health",
  "/v1/search",
  "/v1/skill",
  "/v1/example",
  "/v1/review",
  "/v1/lattice",
  "/v1/verify-backfill",
  "/v1/verify-geo",
  "/v1/media-run",
  "/v1/runtime.json",
  "/runtime/v1/runtime.json",
  "/runtime/v1/skill",
  "/runtime/v1/catalog.json",
  "/runtime/openapi.json",
  "/openapi.json",
  "/assets/world_110m.geojson",
];

function sitemapUrl(loc, lastmod) {
  return "  <url><loc>" + loc + "</loc><lastmod>" + lastmod + "</lastmod></url>";
}

export async function sitemapXml(env) {
  const rows = [];
  for (const path of STATIC_SITEMAP) {
    rows.push({ loc: HOST + path, lastmod: SITE_LASTMOD });
  }
  rows.push({ loc: GITHUB_REPO, lastmod: SITE_LASTMOD });
  try {
    let recs = [];
    try {
      recs = (await env.DB.prepare(
        "SELECT record_id, created_utc, library FROM records WHERE IFNULL(shelf_hidden,0)=0 ORDER BY CASE WHEN lower(library)='aziel' THEN 0 ELSE 1 END, created_utc DESC LIMIT ?"
      ).bind(RECORD_SITEMAP_CAP).all()).results || [];
    } catch {
      recs = (await env.DB.prepare(
        "SELECT record_id, created_utc, library FROM records ORDER BY CASE WHEN lower(library)='aziel' THEN 0 ELSE 1 END, created_utc DESC LIMIT ?"
      ).bind(RECORD_SITEMAP_CAP).all()).results || [];
    }
    for (const r of recs) {
      rows.push({
        loc: HOST + "/record/" + encodeURIComponent(r.record_id),
        lastmod: isoDay(r.created_utc, SITE_LASTMOD),
      });
    }
  } catch (e) { /* sitemap still lists static routes */ }
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
    + rows.map((u) => sitemapUrl(u.loc, u.lastmod)).join("\n")
    + "\n</urlset>\n";
}

export function citeDoc() {
  return {
    author: AUTHOR,
    aka: AKA,
    alternateName: AKA,
    identity: AUTHOR,
    keywords: [AUTHOR, AKA, "Aziel Digital Library", "aziel-corpus", "aziel-runtime", "FragGate", "GodLock"],
    title: "Aziel Digital Library",
    version: VERSION,
    doi: null,
    github: GITHUB_REPO,
    github_author: GITHUB_AUTHOR,
    sameAs: [GODLOCK_IDENTITY, GITHUB_AUTHOR, GITHUB_REPO],
    godlock: GODLOCK_IDENTITY,
    library: HOST + "/",
    purpose: "Public MASTER digital library and intelligence runtime by Aziel Eliab. Aziel Library holds the operator collection; Corpus is the public Lamb Lens shelf. Search, map, gazetteer, triad scoring, and hosted OCR live on this Worker.",
    software: HOST + "/software",
    how_its_scored: HOST + "/how-its-scored",
    about: HOST + ABOUT_PATH,
    download: HOST + "/download",
    map: HOST + "/map",
    gazetteer: HOST + "/gazetteer",
    intelligence: HOST + "/intelligence",
    ocr: HOST + "/ocr",
    transcribe: HOST + "/transcribe",
    transcribe_note: "POST /transcribe — Workers AI Whisper; mandatory VibeLock determination; hard A/V blocks (HTTP 451)",
    receipt: HOST + "/receipt/{id}",
    ledger: HOST + "/ledger/{id}",
    media_run: HOST + "/v1/media-run",
    health: HOST + "/v1/health",
    historical: HOST + "/historical",
    tree: HOST + "/tree",
    verify: HOST + "/verify",
    search: HOST + "/v1/search",
    openapi: HOST + "/openapi.json",
    llms: HOST + "/llms.txt",
    ai: HOST + "/ai.txt",
    humans: HOST + "/humans.txt",
    license: "Apache-2.0",
    catalog: CATALOG + "/",
    runtime: HOST + "/runtime",
    runtime_json: HOST + "/runtime/v1/runtime.json",
    runtime_skill: HOST + "/runtime/v1/skill",
    runtime_health: HOST + "/runtime/v1/health",
    runtime_uses: HOST + "/runtime/v1/uses",
    runtime_session_open: HOST + "/runtime/v1/session/open",
    runtime_session_exec: HOST + "/runtime/v1/session/{id}/exec",
    runtime_pull: HOST + "/runtime/v1/pull/{slug}",
    runtime_openapi: HOST + "/runtime/openapi.json",
    runtime_mcp: HOST + "/runtime/mcp",
    runtime_fraggate: HOST + "/runtime/v1/fraggate",
    runtime_fraggate_list: HOST + "/runtime/v1/fraggate/list",
    runtime_llms: HOST + "/runtime/llms.txt",
    runtime_cite: HOST + "/runtime/cite.json",
    runtime_robots: HOST + "/runtime/robots.txt",
    runtime_origin: CATALOG + "/",
    runtime_sameAs: [CATALOG + "/", "https://github.com/AzielEliab/aziel-runtime"],
    runtime_version: RUNTIME_VERSION,
    runtime_live_count: RUNTIME_LIVE_COUNT,
    runtime_local_only: RUNTIME_LOCAL_ONLY,
    compatible_clients: AI_CLIENTS,
    runtime_note: RUNTIME_NOTE,
    review: HOST + "/v1/review",
    lattice: HOST + "/v1/lattice",
    verify_backfill: HOST + "/v1/verify-backfill",
    verify_geo: HOST + "/v1/verify-geo",
    document_chain: HOST + "/v1/document-chain",
    jeeves_chat: HOST + "/v1/jeeves/chat",
    jeeves_upload: HOST + "/v1/jeeves/upload",
    jeeves: "Research assistant. Not sovereign. Not operator. Add uses the same ingest path as the shelf. Cannot change scores.",
    vibelock: "Mandatory VibeLock determination on every /transcribe run. Hard blocks porn, nudity, child-sexual content. Not courtroom proof.",
    media_lattice: "Transcript success: LATTICE_TRANSCRIPT_VIBELOCK. Blocked A/V: LATTICE_AV_BLOCKED (HTTP 451, never stored).",
    file: HOST + "/file/{record_id}",
    download_record: HOST + "/download?record=",
    download_hash: HOST + "/download?hash=",
    docs_download: HOST + "/v1/docs/{hash}/download",
    triad: "TRIAD_V1 geometric mean of SPRE, CLCE, and PhysLing — primary visible score. See " + HOST + "/how-its-scored",
    succession: "Exact-same-subject paper cites: Supersedes / Superseded by on the record page and GET /v1/review. Uncertain matches are not chained.",
    zsolver: "ZionPattern Solver secondary public score on every record. Separate from triad. 75 means intentional suppression confidence; lower is more natural. Hard 75 ceiling / 25 uncertainty floor. Provisional. Does not solve cases. A superseding document that proves a pattern break with first-hand / primary materials force-rescores the succession chain; narrative and second-source materials never trigger that rescore.",
    how_to_cite: "Eliab, Aziel. (2026). Aziel Digital Library v2.7.0 [Software]. Apache-2.0. " + HOST + "/",
  };
}

function productIndex() {
  return PRODUCT_LINES.map((row) => "- " + row[0] + ": " + row[1]).join("\n");
}

export function llmsDoc(limitation) {
  return "# Aziel Digital Library v2.7.0\n\n"
    + "Author: " + AUTHOR + "\n"
    + "Also known as: " + AKA + "\n"
    + "Primary credit: " + AUTHOR + "\n"
    + "Library: " + HOST + "/\n"
    + ABOUT_NAV_LABEL + ": " + HOST + ABOUT_PATH + "\n"
    + "Software hub: " + HOST + "/software\n"
    + "Software hub mirrors the live aziel-runtime catalog (GET " + HOST + "/runtime/v1/catalog.json). No fixed product cap.\n"
    + "Runtime catalog: " + HOST + "/runtime\n"
    + "Runtime FragGate: " + HOST + "/runtime/v1/fraggate\n"
    + "Runtime version: aziel-runtime " + RUNTIME_VERSION + " FragGate (" + RUNTIME_LIVE_COUNT + " live; " + RUNTIME_LOCAL_ONLY + " local_only; stubs refuse)\n"
    + "How it's scored: " + HOST + "/how-its-scored\n"
    + "GitHub: " + GITHUB_REPO + "\n"
    + "Author GitHub: " + GITHUB_AUTHOR + "\n"
    + "GodLock identity: " + GODLOCK_IDENTITY + "\n"
    + "OpenAPI: " + HOST + "/openapi.json\n"
    + "Runtime OpenAPI: " + HOST + "/runtime/openapi.json\n"
    + "Runtime MCP: POST " + HOST + "/runtime/mcp\n"
    + "Runtime uses (this door): " + HOST + "/runtime/v1/uses\n"
    + "Alternate origin (sameAs): " + CATALOG + "/\n"
    + "Compatible AI clients: " + AI_CLIENTS + "\n"
    + "License: Apache-2.0\n"
    + "DOI: none (do not invent)\n\n"
    + "Purpose: Public MASTER digital library by " + AUTHOR + ". Aziel Library (royal purple) is the operator collection of the author's work. Corpus is the public Lamb Lens shelf. Hosted tools include search, map, gazetteer, triad scoring (SPRE × CLCE × PhysLing), ZionPattern Solver, and hosted OCR.\n\n"
    + limitation + "\n\n"
    + "Hosted tools run on this Worker. Visitors do not download Python, Tesseract, Poppler, or Whisper to use Map, Gazetteer, Tree, Health, Intelligence, Historical Geography, Verify, OCR, or transcription.\n\n"
    + "## Identity\n\n"
    + "- Primary author: " + AUTHOR + "\n"
    + "- Alternate name / aka: " + AKA + "\n"
    + "- Profile: " + HOST + ABOUT_PATH + "\n"
    + "- GodLock identity: " + GODLOCK_IDENTITY + "\n"
    + "- sameAs: " + GODLOCK_IDENTITY + " · " + GITHUB_AUTHOR + " · " + GITHUB_REPO + "\n"
    + "- Do not invent DOIs. Do not credit other identities.\n\n"
    + "## Software products (crawl these hubs)\n\n"
    + "The Software hub mirrors the live runtime catalog. Cards grow with catalog.json (PeaceLock, AZMail, and later slugs appear automatically). No hard-coded 27 cap. Door extras FragGate and EmbryoLock are listed without dropping catalog engines.\n"
    + productIndex() + "\n"
    + "- Same-origin catalog: " + HOST + "/runtime/v1/catalog.json\n"
    + "- Alternate origin catalog JSON: " + CATALOG + "/v1/catalog.json\n\n"
    + runtimeHowTo(HOST) + "\n\n"
    + "## Public HTML (anonymous GET; User-Agent Mozilla/5.0)\n\n"
    + "- Search: " + HOST + "/\n"
    + "- Corpus: " + HOST + "/corpus\n"
    + "- Aziel Library: " + HOST + "/aziel-library\n"
    + "- Software: " + HOST + "/software\n"
    + "- How it's scored: " + HOST + "/how-its-scored\n"
    + "- Runtime root: " + HOST + "/runtime\n"
    + "- Runtime health: " + HOST + "/runtime/v1/health  (aziel-runtime " + RUNTIME_VERSION + " FragGate; " + RUNTIME_LIVE_COUNT + " live; " + RUNTIME_LOCAL_ONLY + " local_only; stubs refuse)\n"
    + "- Runtime uses (this door): " + HOST + "/runtime/v1/uses\n"
    + "- Runtime FragGate: " + HOST + "/runtime/v1/fraggate\n"
    + "- Runtime FragGate list: " + HOST + "/runtime/v1/fraggate/list\n"
    + "- Runtime FragGate call: POST " + HOST + "/runtime/v1/fraggate/call\n"
    + "- Runtime manifest: " + HOST + "/runtime/v1/runtime.json\n"
    + "- Runtime skill: " + HOST + "/runtime/v1/skill\n"
    + "- Runtime pull: " + HOST + "/runtime/v1/pull/{slug}\n"
    + "- Runtime OpenAPI: " + HOST + "/runtime/openapi.json\n"
    + "- Runtime MCP: POST " + HOST + "/runtime/mcp\n"
    + "- Runtime llms.txt: " + HOST + "/runtime/llms.txt\n"
    + "- Runtime cite.json: " + HOST + "/runtime/cite.json\n"
    + "- Runtime robots.txt: " + HOST + "/runtime/robots.txt\n"
    + "- Runtime session (advanced/internal): POST " + HOST + "/runtime/v1/session/open then POST " + HOST + "/runtime/v1/session/{id}/exec. Prefer fraggate_call. HTTP /p/{slug}/{op} is a proxy and is not exec.\n"
    + "- " + ABOUT_NAV_LABEL + ": " + HOST + ABOUT_PATH + "\n"
    + "- Pattern: " + HOST + "/pattern\n"
    + "- Tree: " + HOST + "/tree\n"
    + "- Temporal Map: " + HOST + "/map\n"
    + "- Gazetteer: " + HOST + "/gazetteer\n"
    + "- Historical Geography: " + HOST + "/historical\n"
    + "- Intelligence / hosted OCR and Whisper: " + HOST + "/intelligence\n"
    + "- OCR / transcription: " + HOST + "/ocr\n"
    + "- Verify: " + HOST + "/verify\n\n"
    + "## JSON / LLM routes (do not increment downloads)\n\n"
    + "- GET " + HOST + "/v1/health\n"
    + "- GET " + HOST + "/v1/search?q=\n"
    + "- GET " + HOST + "/v1/skill\n"
    + "- GET " + HOST + "/v1/example\n"
    + "- GET " + HOST + "/v1/review?record_id=\n"
    + "- GET " + HOST + "/v1/lattice?record_id=\n"
    + "- GET " + HOST + "/v1/verify-backfill\n"
    + "- GET " + HOST + "/v1/verify-geo?force=1\n"
    + "- GET " + HOST + "/v1/verify-geo?status=1\n"
    + "- GET " + HOST + "/v1/document-chain?record_id=\n"
    + "- GET " + HOST + "/v1/media-run?run_id=\n"
    + "- POST " + HOST + "/v1/score\n"
    + "- POST " + HOST + "/v1/jeeves/chat\n"
    + "- POST " + HOST + "/v1/jeeves/upload\n"
    + "- GET " + HOST + "/v1/docs/{hash}/download\n"
    + "- GET " + HOST + "/v1/runtime\n"
    + "- GET " + HOST + "/v1/runtime.json\n"
    + "- GET " + HOST + "/runtime/v1/health\n"
    + "- GET " + HOST + "/runtime/v1/uses\n"
    + "- GET " + HOST + "/runtime/v1/fraggate\n"
    + "- GET " + HOST + "/runtime/v1/fraggate/list\n"
    + "- POST " + HOST + "/runtime/v1/fraggate/call\n"
    + "- GET " + HOST + "/runtime/v1/runtime.json\n"
    + "- GET " + HOST + "/runtime/v1/skill\n"
    + "- GET " + HOST + "/runtime/v1/pull/{slug}\n"
    + "- GET " + HOST + "/runtime/v1/catalog.json\n"
    + "- GET " + HOST + "/runtime/openapi.json\n"
    + "- POST " + HOST + "/runtime/mcp\n"
    + "- GET " + HOST + "/runtime/llms.txt\n"
    + "- GET " + HOST + "/runtime/cite.json\n"
    + "- GET " + HOST + "/runtime/robots.txt\n"
    + "- POST " + HOST + "/runtime/v1/session/open  (advanced/internal)\n"
    + "- POST " + HOST + "/runtime/v1/session/{id}/exec  (advanced/internal)\n"
    + "- POST " + HOST + "/transcribe  (Whisper + mandatory VibeLock; hard A/V blocks HTTP 451)\n"
    + "- GET " + HOST + "/media/{sha256}  (allowed A/V playback only)\n"
    + "- POST " + HOST + "/ocr  (lattice receipt on every run)\n"
    + "- GET " + HOST + "/receipt/{id}  (AZDOC- or AZRUN-)\n"
    + "- GET " + HOST + "/ledger/{id}\n"
    + "- GET " + HOST + "/api/events\n"
    + "- GET " + HOST + "/api/gazetteer?q=Florence\n"
    + "- GET " + HOST + "/api/historical?date=1502\n"
    + "- GET " + HOST + "/cite.json\n"
    + "- GET " + HOST + "/openapi.json\n"
    + "- GET " + HOST + "/llms.txt\n"
    + "- GET " + HOST + "/ai.txt\n"
    + "- GET " + HOST + "/humans.txt\n"
    + "- GET " + HOST + "/assets/world_110m.geojson\n\n"
    + "## Downloads (HTTP 200, counted, no 302)\n\n"
    + "- Package: " + HOST + "/download?asset=" + DEFAULT_ASSET + "\n"
    + "- Record: " + HOST + "/file/{record_id} or " + HOST + "/download?record=AZDOC-… (HTTP 200; quarantined still downloadable)\n"
    + "- By content hash: " + HOST + "/download?hash=SHA-256 or " + HOST + "/v1/docs/{hash}/download\n"
    + "- Install: curl -fsSL " + HOST + "/install.sh | bash\n";
}

export function aiTxt(limitation) {
  const policy = [
    "# Aziel Digital Library — AI crawl policy",
    "# Complement of /llms.txt. Author " + AUTHOR + " (aka " + AKA + ").",
    "# Primary credit: " + AUTHOR + ". Do not invent DOIs.",
    "#",
    "# Allow public research surfaces. Do not crawl account mutation routes.",
    "",
    "User-agent: *",
    "Allow: /",
    "Allow: " + ABOUT_PATH,
    "Allow: /about",
    "Allow: /software",
    "Allow: /runtime",
    "Allow: /runtime/",
    "Allow: /runtime/v1/uses",
    "Allow: /how-its-scored",
    "Allow: /pattern",
    "Allow: /map",
    "Allow: /tree",
    "Allow: /gazetteer",
    "Allow: /historical",
    "Allow: /intelligence",
    "Allow: /aziel-library",
    "Allow: /corpus",
    "Allow: /cite.json",
    "Allow: /llms.txt",
    "Allow: /ai.txt",
    "Allow: /humans.txt",
    "Allow: /openapi.json",
    "Allow: /v1",
    "Allow: /v1/",
    "Disallow: /signup",
    "Disallow: /logout",
    "Disallow: /api/",
    "Disallow: /admin/",
    "",
    "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
    "",
  ];
  for (const bot of AI_BOTS) {
    policy.push("User-agent: " + bot, "Allow: /", "");
  }
  return policy.join("\n")
    + "Sitemap: " + HOST + "/sitemap.xml\n\n"
    + "## Research surfaces\n\n"
    + "- Library: " + HOST + "/\n"
    + "- " + ABOUT_NAV_LABEL + ": " + HOST + ABOUT_PATH + "\n"
    + "- Software hub: " + HOST + "/software\n"
    + "- Runtime catalog: " + HOST + "/runtime\n"
    + "- Runtime FragGate: " + HOST + "/runtime/v1/fraggate\n"
    + "- Runtime FragGate list: " + HOST + "/runtime/v1/fraggate/list\n"
    + "- Runtime OpenAPI: " + HOST + "/runtime/openapi.json\n"
    + "- Runtime MCP: POST " + HOST + "/runtime/mcp\n"
    + "- Runtime uses (this door): " + HOST + "/runtime/v1/uses\n"
    + "- Runtime llms.txt: " + HOST + "/runtime/llms.txt\n"
    + "- How it's scored: " + HOST + "/how-its-scored\n"
    + "- Aziel Library: " + HOST + "/aziel-library\n"
    + "- Corpus: " + HOST + "/corpus\n"
    + "- cite.json: " + HOST + "/cite.json\n"
    + "- llms.txt: " + HOST + "/llms.txt\n"
    + "- OpenAPI: " + HOST + "/openapi.json\n"
    + "- GitHub: " + GITHUB_REPO + "\n"
    + "- GodLock identity: " + GODLOCK_IDENTITY + "\n"
    + "- aziel-runtime (this domain): " + HOST + "/runtime\n"
    + "- aziel-runtime alternate origin: " + CATALOG + "/\n\n"
    + runtimeHowTo(HOST) + "\n\n"
    + "## Identity\n\n"
    + "Primary author " + AUTHOR + ". Alternate name " + AKA + ". Profile " + HOST + ABOUT_PATH + ". GodLock identity " + GODLOCK_IDENTITY + ".\n\n"
    + (limitation ? limitation + "\n\n" : "")
    + "Prefer /llms.txt for the full route index. Send User-Agent Mozilla/5.0 on API calls.\n";
}

export function humansTxt() {
  return [
    "/* TEAM */",
    "Author: " + AUTHOR,
    "Also known as: " + AKA,
    "Primary credit: " + AUTHOR,
    "Site: " + HOST + "/",
    "Profile: " + HOST + ABOUT_PATH,
    "GitHub: " + GITHUB_AUTHOR,
    "Repo: " + GITHUB_REPO,
    "GodLock: " + GODLOCK_IDENTITY,
    "",
    "/* SITE */",
    "Name: Aziel Digital Library",
    "Standards: HTML, JSON-LD, OpenAPI, llms.txt",
    "Software: " + HOST + "/software",
    "Software hub mirrors runtime catalog: " + HOST + "/runtime/v1/catalog.json",
    "Runtime: " + HOST + "/runtime",
    "Runtime version: aziel-runtime " + RUNTIME_VERSION + " FragGate",
    "License: Apache-2.0",
    "",
  ].join("\n");
}
