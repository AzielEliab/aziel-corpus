/** Crawl documents for Aziel Digital Library. Author: Aziel Eliab. */
const HOST = "https://www.azielcorpuslibrary.net";
const FALLBACK_HOST = "https://aziel-corpus-download-tracker.vibelock.workers.dev";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev";
const GITHUB_REPO = "https://github.com/AzielEliab/aziel-corpus";
const DEFAULT_ASSET = "aziel-digital-library-2.7.0.zip";
const VERSION = "2.7.0";

export function robotsTxt() {
  return [
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
    "Allow: /about",
    "Allow: /runtime",
    "Allow: /v1",
    "Allow: /v1/",
    "Allow: /cite.json",
    "Allow: /llms.txt",
    "Allow: /openapi.json",
    "Allow: /assets",
    "Allow: /assets/",
    "Allow: /login",
    "Disallow: /logout",
    "Disallow: /signup",
    "Sitemap: " + HOST + "/sitemap.xml",
    "",
  ].join("\n");
}

export async function sitemapXml(env) {
  const locs = [
    HOST + "/", HOST + "/aziel-library", HOST + "/corpus", HOST + "/pattern", HOST + "/software",
    HOST + "/about", HOST + "/runtime", HOST + "/map", HOST + "/gazetteer", HOST + "/tree",
    HOST + "/health", HOST + "/intelligence", HOST + "/ocr", HOST + "/historical", HOST + "/verify",
    HOST + "/download", HOST + "/install.sh", HOST + "/v1/health", HOST + "/v1/search",
    HOST + "/v1/skill", HOST + "/v1/example", HOST + "/v1/review", HOST + "/v1/lattice", HOST + "/v1/verify-backfill", HOST + "/v1/verify-geo", HOST + "/v1/media-run", HOST + "/openapi.json", HOST + "/llms.txt",
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
    license: "Apache-2.0",
    catalog: CATALOG + "/",
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
    triad: "TRIAD_V1 geometric mean of SPRE, CLCE, and PhysLing — primary visible score",
    succession: "Exact-same-subject paper cites: Supersedes / Superseded by on the record page and GET /v1/review. Uncertain matches are not chained.",
    zsolver: "ZionPattern Solver secondary public score on every record. Separate from triad. Hard 75% cap / 25% floor. Provisional. Does not solve cases. A superseding document that proves a pattern break with first-hand / primary materials force-rescores the succession chain; narrative and second-source materials never trigger that rescore.",
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
    + "Hosted tools run on this Worker. Visitors do not download Python, Tesseract, Poppler, or Whisper to use Map, Gazetteer, Tree, Health, Intelligence, Historical Geography, Verify, OCR, or transcription.\n\n"
    + "## Public HTML (anonymous GET; User-Agent Mozilla/5.0)\n\n"
    + "- Search: " + HOST + "/\n"
    + "- Corpus: " + HOST + "/corpus\n"
    + "- Software: " + HOST + "/software\n"
    + "- Runtime root: " + HOST + "/runtime\n"
    + "- About Aziel: " + HOST + "/about\n"
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
    + "- GET " + HOST + "/assets/world_110m.geojson\n\n"
    + "## Downloads (HTTP 200, counted, no 302)\n\n"
    + "- Package: " + HOST + "/download?asset=" + DEFAULT_ASSET + "\n"
    + "- Record: " + HOST + "/file/{record_id} or " + HOST + "/download?record=AZDOC-… (HTTP 200; quarantined still downloadable)\n"
    + "- By content hash: " + HOST + "/download?hash=SHA-256 or " + HOST + "/v1/docs/{hash}/download\n"
    + "- Install: curl -fsSL " + HOST + "/install.sh | bash\n";
}
