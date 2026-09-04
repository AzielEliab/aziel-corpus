/** Crawl documents for Aziel Digital Library. Author: Aziel Eliab. */
const HOST = "https://www.azielcorpuslibrary.net";
const FALLBACK_HOST = "https://aziel-corpus-download-tracker.vibelock.workers.dev";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev";
const GITHUB_REPO = "https://github.com/AzielEliab/aziel-corpus";
const DEFAULT_ASSET = "aziel-digital-library-2.6.2.zip";
const VERSION = "2.7.0";

export function robotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "Allow: /map",
    "Allow: /gazetteer",
    "Allow: /tree",
    "Allow: /health",
    "Allow: /intelligence",
    "Allow: /historical",
    "Allow: /verify",
    "Allow: /corpus",
    "Allow: /v1",
    "Allow: /v1/",
    "Allow: /cite.json",
    "Allow: /llms.txt",
    "Allow: /openapi.json",
    "Allow: /assets",
    "Allow: /assets/",
    "Allow: /receipt",
    "Allow: /login",
    "Disallow: /logout",
    "Disallow: /signup",
    "Sitemap: " + HOST + "/sitemap.xml",
    "",
  ].join("\n");
}

export async function sitemapXml(env) {
  const locs = [
    HOST + "/", HOST + "/corpus", HOST + "/map", HOST + "/gazetteer", HOST + "/tree",
    HOST + "/health", HOST + "/intelligence", HOST + "/historical", HOST + "/verify",
    HOST + "/download", HOST + "/install.sh", HOST + "/v1/health", HOST + "/v1/search",
    HOST + "/v1/skill", HOST + "/v1/example", HOST + "/v1/review", HOST + "/v1/lattice", HOST + "/v1/verify-backfill", HOST + "/openapi.json", HOST + "/llms.txt",
    HOST + "/cite.json", HOST + "/assets/world_110m.geojson", GITHUB_REPO,
  ];
  try {
    const rows = (await env.DB.prepare("SELECT record_id FROM records ORDER BY created_utc DESC LIMIT 200").all()).results || [];
    for (const r of rows) locs.push(HOST + "/record/" + encodeURIComponent(r.record_id));
  } catch (e) {}
  const lastmod = new Date().toISOString().slice(0, 10);
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
    + locs.map((u) => "  <url><loc>" + u + "</loc><lastmod>" + lastmod + "</lastmod></url>").join("\n")
    + "\n</urlset>\n";
}

export function citeDoc() {
  return {
    author: "Aziel Eliab",
    title: "Aziel Digital Library",
    version: VERSION,
    github: GITHUB_REPO,
    library: HOST + "/",
    download: HOST + "/download",
    map: HOST + "/map",
    gazetteer: HOST + "/gazetteer",
    intelligence: HOST + "/intelligence",
    health: HOST + "/health",
    historical: HOST + "/historical",
    tree: HOST + "/tree",
    verify: HOST + "/verify",
    search: HOST + "/v1/search",
    openapi: HOST + "/openapi.json",
    llms: HOST + "/llms.txt",
    license: "Apache-2.0",
    catalog: CATALOG + "/",
    review: HOST + "/v1/review",
    lattice: HOST + "/v1/lattice",
    verify_backfill: HOST + "/v1/verify-backfill",
    document_chain: HOST + "/v1/document-chain",
    jeeves_chat: HOST + "/v1/jeeves/chat",
    file: HOST + "/file/{record_id}",
    download_record: HOST + "/download?record=",
    triad: "TRIAD_V1 geometric mean of SPRE, CLCE, and PhysLing — primary visible score",
    how_to_cite: "Eliab, Aziel. (2026). Aziel Digital Library v2.7.0 [Software]. Apache-2.0. " + HOST + "/",
  };
}

export function llmsDoc(limitation) {
  return "# Aziel Digital Library v2.7.0\n\n"
    + "Author: Aziel Eliab\n"
    + "Library: " + HOST + "/\n"
    + "GitHub: " + GITHUB_REPO + "\n"
    + "OpenAPI: " + HOST + "/openapi.json\n"
    + "Catalog: " + CATALOG + "/\n"
    + "License: Apache-2.0\n\n"
    + limitation + "\n\n"
    + "Hosted tools run on this Worker. Visitors do not download Python, Tesseract, Poppler, or Whisper to use Map, Gazetteer, Tree, Health, Intelligence, Historical Geography, Verify, or OCR.\n\n"
    + "## Public HTML (anonymous GET; User-Agent Mozilla/5.0)\n\n"
    + "- Search: " + HOST + "/\n"
    + "- Corpus: " + HOST + "/corpus\n"
    + "- Tree: " + HOST + "/tree\n"
    + "- Temporal Map: " + HOST + "/map\n"
    + "- Gazetteer: " + HOST + "/gazetteer\n"
    + "- Historical Geography: " + HOST + "/historical\n"
    + "- Intelligence / hosted OCR: " + HOST + "/intelligence\n"
    + "- Health: " + HOST + "/health\n"
    + "- Verify: " + HOST + "/verify\n\n"
    + "## JSON / LLM routes (do not increment downloads)\n\n"
    + "- GET " + HOST + "/v1/health\n"
    + "- GET " + HOST + "/v1/search?q=\n"
    + "- GET " + HOST + "/v1/skill\n"
    + "- GET " + HOST + "/v1/example\n"
    + "- GET " + HOST + "/v1/review?record_id=\n"
    + "- GET " + HOST + "/v1/lattice?record_id=\n"
    + "- GET " + HOST + "/v1/verify-backfill\n"
    + "- GET " + HOST + "/v1/document-chain?record_id=\n"
    + "- POST " + HOST + "/v1/score\n"
    + "- POST " + HOST + "/v1/jeeves/chat\n"
    + "- POST " + HOST + "/v1/jeeves/upload  (Corpus only)\n"
    + "- GET " + HOST + "/api/events\n"
    + "- GET " + HOST + "/api/gazetteer?q=Florence\n"
    + "- GET " + HOST + "/api/historical?date=1502\n"
    + "- GET " + HOST + "/cite.json\n"
    + "- GET " + HOST + "/openapi.json\n"
    + "- GET " + HOST + "/llms.txt\n"
    + "- GET " + HOST + "/assets/world_110m.geojson\n\n"
    + "## Downloads (HTTP 200, counted, no 302)\n\n"
    + "- Package: " + HOST + "/download?asset=" + DEFAULT_ASSET + "\n"
    + "- Record: " + HOST + "/file/{record_id} or " + HOST + "/download?record=AZDOC-… (HTTP 200; quarantined still downloadable)\n"
    + "- Install: curl -fsSL " + HOST + "/install.sh | bash\n";
}
