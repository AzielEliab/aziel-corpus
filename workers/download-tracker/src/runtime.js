/**
 * Aziel Digital Library hosted runtime. /v1 does not increment download counters.
 * Packed library:index:v1 may be read (one get, never list) for health / failover.
 * Author: Aziel Eliab.
 */
import { serveFileByHash, normalizeContentHash } from "./library.js";
import { receiptForRecord, documentChain, isJsonDocumentId } from "./ledger.js";
import { loadRecordReview, runReviewBundle, backfillReviews, continueFullBackfill, fullBackfillStatus, syncShelfScores, refreshPackedShelf, SHELF_REBUILD_MS } from "./review-store.js";
import { latticeAnchorTip, LATTICE_NOTE } from "./lattice.js";
import { handleJeevesApi, JEEVES_LIMITATION } from "./jeeves.js";
import { handleOperatorIngestApi } from "./operator-ingest.js";
import { handleLibraryIngestApi, handleLibraryMcp } from "./library-mcp.js";
import { handleDesignPackApi } from "./design-pack.js";
import { DUAL_SURFACE, MCP_TOOLS, AI_PATH_NOTE } from "./ai-surface.js";
import { continueMetadataBackfill, metadataBackfillStatus, receiptForJsonMetadata } from "./record-metadata.js";
import { receiptForMediaRun, isMediaRunId } from "./media.js";
import { continueVerifyGeo, geoVerifyStatus, GEO_PIN_NOTE } from "./geo.js";
import {
  HASHCHAIN_LEARN_LAW,
  LEARN_LIMITATION,
  POSSIBILITY_NOTE,
  MAP4D_CITE,
  recollectLattice,
  possibilityScore,
  compactPossibility,
  loadPoisonLearnMemory,
  loadLearnStamps,
} from "./lattice-learn.js";
import { RUNTIME_VERSION, RUNTIME_NOTE, runtimeHowTo, AI_CLIENTS, LIBRARY_DOWNLOAD, LIBRARY_V1_DOWNLOAD } from "./runtime-copy.js";
import { checkLibraryUpdate, LIBRARY_SLUG, LIBRARY_VERSION } from "./update-check.js";
import { fetchLiveSoftwareCatalog, softwareTabCatalog } from "./software-catalog.js";
import { handleV1Download, serveSoftwareAsset, LIBRARY_INSTALL } from "./software-download.js";
import { handleMeshApi, MESH_NOTE, QNS_CD_SPEC } from "./mesh.js";
import {
  LIBRARY_INDEX_KEY,
  PUBLIC_CACHE_CONTROL,
  SEARCH_CACHE_CONTROL,
  collectStats,
  libraryHealthFields,
  publicSearchCard,
  readPackedIndex,
  refreshPackedIndex,
  searchPackedRecords,
} from "./library-index.js";
const PRODUCT = "aziel-corpus";
const VERSION = "2.7.0";
const SPEC = "aziel-digital-library-v2.7.0";
const HOST = "https://www.azielcorpuslibrary.net";
const FALLBACK_HOST = "https://aziel-corpus-download-tracker.vibelock.workers.dev";
const CATALOG = "https://aziel-runtime.vibelock.workers.dev";
const PROTOCOL = "2025-03-26";

export const LIMITATION =
  "THIS IS: Aziel Digital Library v2.7.0 — a self-contained immutable local digital library and intelligence runtime with poison immunity, PhysLing Review (required third verifier), triad composite score, ZionPattern Solver secondary score (public, separate from triad; 75 = intentional suppression confidence, lower is more natural; 75 ceiling / 25 floor; provisional), exact-same-subject paper succession cites, document-bound hash chains, hosted Whisper transcription with mandatory VibeLock determination and hard A/V blocks (porn, nudity, child-sexual content never stored or playable), hash-chained media lattice for every OCR and transcript run, downloadable records, Ask Jeeves (research assistant), unranked Bayesian peer scores, and full-structure verify on upload/download. The public site is the MASTER (writable for signed-in accounts; anonymous GET is read-only). Operator writes go to Aziel Library only; public/anonymous writes go to Corpus only (Lamb Lens). The live HTTPS site is NOT a mesh. THIS IS NOT: a 26-card software index; Zenodo; Horton; OpenAI; a Tor/VPN; a guilt verdict; courtroom proof of media authenticity. Author Aziel Eliab only (also known as Aziel Elroi Eliab).";

export const SKILL = `---
name: Aziel Digital Library
description: Use when an assistant should search the Aziel Digital Library master corpus, check health, review scores, or fetch the counted software zip via hosted /v1 or aziel-runtime.
---

# Aziel Digital Library v2.7.0

Self-contained immutable local digital library and intelligence runtime. Public site is MASTER. Anonymous GET is read-only. Signed-in accounts may ingest. Author: **Aziel Eliab** (also known as Aziel Elroi Eliab; primary credit Aziel Eliab).

**THIS IS:** Aziel Digital Library v2.7.0 (search, records, map, gazetteer, counted zip, poison immunity, PhysLing Review, triad composite, exact-same-subject succession cites, document hash-chains, hosted Whisper transcription with mandatory VibeLock determination and hard A/V blocks, media lattice receipts, Ask Jeeves, unranked Bayesian scores).

**THIS IS NOT:** a 26-card software index. Not Zenodo. Not Horton. Not a mesh. Not a guilt engine.

Always send \`User-Agent: Mozilla/5.0\`.

## Call these URLs

- Library: ${HOST}/
- Aziel Eliab: ${HOST}/AzielEliab
- GodLock identity: https://godlock.uk/AzielEliab
- Software hub: ${HOST}/software
- How it's scored: ${HOST}/how-its-scored
- Fallback Worker: ${FALLBACK_HOST}/
- Worker OpenAPI: ${HOST}/openapi.json
- llms.txt: ${HOST}/llms.txt
- ai.txt: ${HOST}/ai.txt
- Cold multi-shelf (COLD-MULTI-SHELF-1.0): \`GET ${HOST}/shelves\` · \`GET ${HOST}/cold-copy\`
- Runtime root: ${HOST}/runtime (aziel-runtime ${RUNTIME_VERSION} FragGate door; prefer /runtime/*)
- Runtime FragGate list: \`GET ${HOST}/runtime/v1/fraggate/list\`
- Runtime FragGate call: \`POST ${HOST}/runtime/v1/fraggate/call\`
- Catalog OpenAPI: ${HOST}/runtime/openapi.json (alternate ${CATALOG}/openapi.json)
- MCP: \`POST ${HOST}/runtime/mcp\` (alternate \`POST ${CATALOG}/mcp\`)
- Runtime skill: \`GET ${HOST}/runtime/v1/skill\`
- Runtime manifest: \`GET ${HOST}/runtime/v1/runtime.json\` or \`GET ${HOST}/v1/runtime.json\`
- Runtime health: \`GET ${HOST}/runtime/v1/health\`
- Runtime uses (this door): \`GET ${HOST}/runtime/v1/uses\`
- Pull: \`GET ${HOST}/runtime/v1/pull/{slug}\`
- Session (advanced/internal): \`POST ${HOST}/runtime/v1/session/open\` then \`POST ${HOST}/runtime/v1/session/{id}/exec\`. Prefer fraggate_call. HTTP /p/{slug}/{op} is a proxy and is not exec.
- Compatible AI clients: ${AI_CLIENTS}
- Dual surface: ${DUAL_SURFACE}
- Library MCP (upload+download): \`POST ${HOST}/mcp\` tools: ${MCP_TOOLS.join(", ")}
- Cap-7 bridge cite (design_of hubs; resolves_to_hub: false): \`GET ${HOST}/bridge.json\`
- Plane A UI on this Worker: azcorpus (Corpus / Lamb Lens, ${HOST}/corpus) and azlibrary (royal-purple Aziel Library, ${HOST}/aziel-library). Anyone may download both. Cap-7 names do not resolve to hub hostnames.
- Products index: \`GET ${HOST}/v1/products\`
- Design packs (inherit design_of; resolves_to_hub: false; tip/pack hashes): \`GET ${HOST}/v1/design-pack\` · counted \`GET ${HOST}/download?product=azcorpus|azlibrary\`
- Mesh pull: cite /bridge.json → describe pack → counted pull → hash-verify pack_sha256 fail-closed → land local cold shelf. qnm: https://github.com/AzielEliab/qnm-node
- Library skill: \`GET ${HOST}/v1/skill\`
- Live software catalog: \`GET ${HOST}/v1/software\` (origin ${CATALOG}/v1/software; fallback fraggate/list)
- Installer update check: \`GET ${HOST}/v1/update/check?slug=aziel-corpus&version=\` (origin ${CATALOG}/v1/update/check)
- Suite mesh (read-only QNM ON): \`GET ${HOST}/v1/mesh\` · \`GET ${HOST}/runtime/v1/mesh\` (origin ${CATALOG}/v1/mesh). Live Nodes cite **QNS-CD-1.0** (photon QNS1 packet transfer) as a hub / Worker mesh cross-map. Public rollup is counts/status — not the cell. **CROSS-NETWORK-SURVIVAL-1.0** umbrella: if the network dies, the chain survives on cold copies (bytes↔hash); crawlers are extra shelves, not resurrection. Covers split-wires + cold-copy + die-with-pull + MESH-REEXPAND-1.0 (operator verify-from-archive) + MESH-REHEAL-1.0 (self tip + trusted pull or phoenix-WAIT — not neighbor majority). **COLD-MULTI-SHELF-1.0** executable registry: \`GET ${HOST}/shelves\`. **NO-LIE-NO-REWRITE-1.0**: network never lies to stay alive; no rewrite key; cites live lockset \`AZLOCK-INGEST-REEXPAND-1.0\`. Local \`qnsd\` is coded in https://github.com/AzielEliab/qnm-node. Runtime cites + catalog field live in https://github.com/AzielEliab/aziel-runtime. AZInterface has pair custody. Not a Softwares-tab product. No public \`qnsd\` proxy. No Node Gate. Disable is refused. GET /v1/mesh never enables radios.

Ops (do **not** increment downloads):

- \`GET /v1/health\`
- \`GET /v1/stats\` (packed views + counted downloads; does not increment)
- \`GET /v1/search?q=\`
- \`GET /v1/example\`
- \`GET /v1/skill\`
- \`GET /v1/review?record_id=\` (triad + ZionPattern Solver secondary score + succession cites + Bayesian + possibility)
- \`GET /v1/lattice?record_id=\`
- \`GET /v1/possibility?record_id=\` (HEURISTIC possibility over lattice time×geo pins; not Bayesian)
- \`GET /v1/recollect?record_id=\` (tip + depth / prev-hash verify; fail closed)
- \`GET /v1/poison-learn\` (feature receipts only; no poison bodies)
- \`POST /v1/pin\` (operator/record pin-from-upload receipt; fail closed on structure/poison)
- \`GET /v1/mesh\` · \`GET /v1/mesh/status\` · \`GET /v1/mesh/nodes\` (suite mesh; read-only QNM ON; counts/status rollup, not the cell; QNS-CD-1.0 + CROSS-NETWORK-SURVIVAL-1.0 + MESH-SPLIT-WIRES-1.0 + MESH-COLD-COPY-1.0 + MESH-REEXPAND-1.0 + MESH-REHEAL-1.0 + NO-LIE-NO-REWRITE-1.0 on the payload)
- \`GET /runtime/v1/mesh\` (same-origin proxy of runtime mesh; not a public qnsd proxy)
- \`POST /v1/score\` (document review preview)
- \`GET /v1/verify-backfill?all=1\` (walk every stored Aziel Library + Corpus record)
- \`GET /v1/verify-backfill?rebuild=1\` (chunked tip reconcile; JSON returns promptly with next_cursor / done; packed shelf refresh is deferred. Repeat with cursor or all=1 until done:true)
- \`GET /v1/verify-geo?force=1\` / \`?status=1\` (chunked map pins: paper date × event × geolocation)
- \`GET /v1/document-chain?record_id=\`
- \`POST /v1/ingest\` (AI/JSON upload. Session → Corpus; operator token → live hub azlibrary only. Anonymous JSON refused. Mesh Cap-7 names are not write targets.)
- \`POST /v1/jeeves/upload\` (signed-in public → Corpus; operator token/session → Aziel Library)
- \`POST /v1/operator/library-ingest\` (header X-Aziel-Operator-Token or operator session; env OPERATOR_TOKEN / GATE_TOKEN / LIBRARY_OPERATOR_TOKEN — names only, never the value; live hub azlibrary only)
- \`POST /transcribe\` (Whisper + mandatory VibeLock determination; hard A/V blocks HTTP 451; lattice receipt even without library upload)
- \`GET /media/{sha256}\` (inline playback of allowed A/V only)
- \`POST /ocr\` (hosted OCR; lattice receipt on every run)
- \`GET /receipt/{id}\` and \`GET /ledger/{id}\` (AZDOC- or AZRUN-)
- \`GET /v1/media-run?run_id=\`
- \`GET /file/{record_id}\` and \`GET /download?record=\` — every record is downloadable (HTTP 200)
- \`GET /download?hash=\` and \`GET /v1/docs/{hash}/download\` — download by content SHA-256 when a kept record matches

Catalog aliases: \`GET /p/aziel-corpus/health\`, \`GET /p/aziel-corpus/search\`, \`GET /p/aziel-corpus/skill\`.

Library MCP tools: \`${MCP_TOOLS.join("`, `")}\`. ${AI_PATH_NOTE}

Runtime MCP (prefer for Softwares): \`runtime_skill\`, \`fraggate_list\`, \`fraggate_describe\`, \`fraggate_verify\`, \`fraggate_call\`, \`decisiongate_check\`, \`library_lookup\`.

${runtimeHowTo(HOST)}

## Example

\`\`\`bash
curl -s -A 'Mozilla/5.0' ${HOST}/v1/health
curl -s -A 'Mozilla/5.0' '${HOST}/v1/search?q=Florence'
curl -s -A 'Mozilla/5.0' ${HOST}/v1/skill
\`\`\`

## Local

\`\`\`bash
curl -fsSL ${HOST}/install.sh | bash
python3 aziel_launcher.py
\`\`\`

Local MASTER is writable on http://127.0.0.1:8765. Apache-2.0. Forks welcome.
`;

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, Authorization, X-Aziel-Operator-Token",
  };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function openapi() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Aziel Digital Library",
      version: VERSION,
      summary: "Public MASTER digital library by Aziel Eliab (also known as Aziel Elroi Eliab).",
      description: LIMITATION + " Author Aziel Eliab (aka Aziel Elroi Eliab; primary credit Aziel Eliab). Identity " + HOST + "/AzielEliab. GodLock identity https://godlock.uk/AzielEliab. Software hub " + HOST + "/software. Runtime catalog " + HOST + "/runtime. Origin catalog " + CATALOG + "/. GitHub https://github.com/AzielEliab and https://github.com/AzielEliab/aziel-corpus. How records are scored: " + HOST + "/how-its-scored. No invented DOIs.",
      contact: { name: "Aziel Eliab", url: HOST + "/AzielEliab" },
      license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    },
    servers: [{ url: HOST }, { url: FALLBACK_HOST }],
    paths: {
      "/v1/health": { get: { summary: "Liveness + TUN-WP-0.1 standby/failover fields. Does not increment downloads. Does not KV.list().", operationId: "health" } },
      "/v1/stats": { get: { summary: "Alias of /stats. Packed views and counted downloads. Does not increment. Does not KV.list(). Author Aziel Eliab.", operationId: "stats" } },
      "/stats": { get: { summary: "Packed views and counted downloads. Does not increment. Does not KV.list(). Author Aziel Eliab.", operationId: "libraryStats" } },
      "/v1/library-index": { get: { summary: "Packed library:index:v1 shelf cards (no PDF bodies). One KV get. Author Aziel Eliab.", operationId: "libraryIndex" } },
      "/donate": { get: { summary: "AZL-DONATE-1.0 static Donate door. Exodus rails. Does not touch KV. Not a catalog item.", operationId: "donate" } },
      "/v1/search": { get: { summary: "Filter packed library:index:v1 in memory (one KV get). AZDOC cards only — no PDF bodies. ChainLock library-sync client. Author Aziel Eliab.", operationId: "search", parameters: [{ name: "q", in: "query", schema: { type: "string" } }, { name: "lib", in: "query", schema: { type: "string", enum: ["all", "aziel", "corpus"] } }, { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "oldest", "alpha", "title", "author", "domain"] } }, { name: "author", in: "query", schema: { type: "string" } }, { name: "domain", in: "query", schema: { type: "string" } }, { name: "subject", in: "query", schema: { type: "string" } }, { name: "keyword", in: "query", schema: { type: "string" } }] } },
      "/v1/example": { get: { summary: "Sample search payload.", operationId: "example" } },
      "/v1/skill": { get: { summary: "Skill markdown.", operationId: "skill" } },
      "/v1/review": { get: { summary: "Triad composite (SPRE × CLCE × PhysLing geometric mean) plus component scores, Bayesian (unranked), HEURISTIC possibility (separate), quarantine, document chain tip, and exact-same-subject succession cites when present. Does not increment downloads.", operationId: "review", parameters: [{ name: "record_id", in: "query", required: true, schema: { type: "string" } }] } },
      "/v1/lattice": { get: { summary: "AzielTether lattice anchor tip for a verified record. Public site is not a mesh. Adaptive learning via hashchain lattice for recollection and reasoning.", operationId: "lattice", parameters: [{ name: "record_id", in: "query", required: true, schema: { type: "string" } }] } },
      "/v1/possibility": { get: { summary: "HEURISTIC possibility score derived from lattice time×geo pin receipts. possibility ≠ probability ≠ triad ≠ ZionPattern. Not courtroom truth.", operationId: "possibility", parameters: [{ name: "record_id", in: "query", required: true, schema: { type: "string" } }] } },
      "/v1/recollect": { get: { summary: "Recollection = walk document hashchain from tip + depth. Prev-hash verify. Fail closed on break. Not LLM memory.", operationId: "recollect", parameters: [{ name: "record_id", in: "query", required: true, schema: { type: "string" } }, { name: "depth", in: "query", schema: { type: "integer", default: 32 } }, { name: "tip", in: "query", schema: { type: "string" } }] } },
      "/v1/poison-learn": { get: { summary: "Poison-learn feature lattice (AZDOC-POISONLEARN). Hash + markers + token hashes only. No poison bodies.", operationId: "poisonLearn" } },
      "/v1/pin": { get: { summary: "Pin receipt for a record (time×geo anchors + possibility). Same lattice as upload→pin.", operationId: "pinGet", parameters: [{ name: "record_id", in: "query", required: true, schema: { type: "string" } }] } },
      "/v1/mesh": { get: { summary: "Suite decentralized node mesh status. Read-only QNM ON. Counts/status rollup — not the cell. Proxies /v1/mesh. Cites QNS-CD-1.0, CROSS-NETWORK-SURVIVAL-1.0, MESH-SPLIT-WIRES-1.0, MESH-COLD-COPY-1.0, MESH-REEXPAND-1.0, MESH-REHEAL-1.0, NO-LIE-NO-REWRITE-1.0. Author Aziel Eliab.", operationId: "mesh" } },
      "/v1/mesh/status": { get: { summary: "Suite mesh status alias. Read-only QNM ON. Counts/status — not the cell. QNS-CD-1.0 + CROSS-NETWORK-SURVIVAL-1.0 + split-wires + cold-copy + re-expand + reheal. Author Aziel Eliab.", operationId: "meshStatus" } },
      "/v1/mesh/nodes": { get: { summary: "Live Nodes list for the suite mesh. Live Nodes · N while mesh on. Rollup counts only — not the cell. Author Aziel Eliab.", operationId: "meshNodes" } },
      "/runtime/v1/mesh": { get: { summary: "Same-origin proxy of aziel-runtime /v1/mesh. Read-only QNM ON.", operationId: "runtimeProxyMesh" } },
      "/runtime/v1/mesh/status": { get: { summary: "Same-origin proxy of aziel-runtime /v1/mesh/status. Read-only QNM ON.", operationId: "runtimeProxyMeshStatus" } },
      "/runtime/v1/mesh/nodes": { get: { summary: "Same-origin proxy of aziel-runtime /v1/mesh/nodes. Live Nodes · N while mesh on.", operationId: "runtimeProxyMeshNodes" } },
      "/v1/score": { post: { summary: "Preview document review (SPRE, CLCE port, PhysLing, poison, triad, Bayesian). Advisory. Does not write.", operationId: "score" } },
      "/v1/verify-backfill": { get: { summary: "Walk stored records: triad, ZionPattern Solver secondary score, and exact-same-subject succession. all=1 walks every remaining doc (chunked). rebuild=1 copies already-scored zsolver onto packed shelf + tip without live API, one cursor page per request. Reports total/processed/tips/done/next_cursor. Does not increment downloads.", operationId: "verifyBackfill", parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 25 } }, { name: "force", in: "query", schema: { type: "string", enum: ["0", "1"] } }, { name: "all", in: "query", schema: { type: "string", enum: ["0", "1"] } }, { name: "rebuild", in: "query", schema: { type: "string", enum: ["0", "1"] } }, { name: "cursor", in: "query", schema: { type: "string" } }, { name: "record_id", in: "query", schema: { type: "string" } }] } },
      "/v1/verify-geo": { get: { summary: "Chunked geography reindex: date × event × geolocation pins for docs with geospatial anchors (paper time, never upload time). force=1 restarts. status=1 progress. Does not increment downloads.", operationId: "verifyGeo", parameters: [{ name: "force", in: "query", schema: { type: "string", enum: ["0", "1"] } }, { name: "status", in: "query", schema: { type: "string", enum: ["0", "1"] } }] } },
      "/v1/document-chain": { get: { summary: "Per-document hash-chain bound to record_id. No orphan chains.", operationId: "documentChain", parameters: [{ name: "record_id", in: "query", required: true, schema: { type: "string" } }] } },
      "/v1/jeeves/chat": { post: { summary: "Ask Jeeves research assistant over public records. Lamb Lens. Cannot change scores.", operationId: "jeevesChat" } },
      "/v1/ingest": { post: { summary: "AI/OpenAPI upload (ingest/receipt). Session cookie writes Corpus / azcorpus (Lamb Lens). X-Aziel-Operator-Token writes live hub azlibrary only. Anonymous JSON refused. Plane A UI on this Worker. Cap-7 names inherit design_of hubs; resolves_to_hub: false. CROSS-NETWORK-SURVIVAL on the receipt. Compatible AI clients: " + AI_CLIENTS + ".", operationId: "ingestRecord" } },
      "/v1/jeeves/upload": { post: { summary: "Ask Jeeves Add — same ingest as the shelf (structure, SPRE × CLCE × PhysLing, Bayesian). Signed-in public writes Corpus / azcorpus; operator writes live hub Aziel Library / azlibrary.", operationId: "jeevesUpload" } },
      "/v1/operator/library-ingest": { post: { summary: "Operator Aziel Library ingest (SOFTWARE-SITE-DOSSIER-1.0). Same ingestRecord pipeline as Jeeves/shelf. Requires X-Aziel-Operator-Token or operator session. Writes live hub azlibrary only. Idempotent same-SHA; exact-same-subject supersedes. Writes discovery metadata sidecar in the same ingest. No public write hole.", operationId: "operatorLibraryIngest" } },
      "/v1/products": { get: { summary: "Plane A UI products on this Worker: azcorpus (Corpus / Lamb Lens) and azlibrary (royal-purple Aziel Library). Cap-7 names inherit design_of this hub; resolves_to_hub: false. Anyone may download both. azlibrary upload uses X-Aziel-Operator-Token on the live hub only.", operationId: "websiteProducts" } },
      "/v1/design-pack": { get: { summary: "Index of Cap-7 design+content packs. Each entry has design_of, resolves_to_hub: false, tip + pack hashes. Plane A UI for azcorpus/azlibrary stays on this Worker. Sister hubs remain azieleliab.com, godlock.uk, hedidntjump.com.", operationId: "designPackIndex" } },
      "/v1/design-pack/{slug}": { get: { summary: "One Cap-7 website design+content pack (azcorpus, azlibrary, …). design_of a hub. resolves_to_hub: false. Includes mesh_pull hash-verify steps. Pull-only cold copy. Not live public DNS. CROSS-NETWORK-SURVIVAL.", operationId: "designPack", parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }] } },
      "/v1/design-pack/{slug}/download": { get: { summary: "Attachment of one design+content pack. Does not increment. Counted twin: GET /download?product=azcorpus|azlibrary. Anyone may download. resolves_to_hub: false.", operationId: "designPackDownload", parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }] } },
      "/bridge.json": { get: { summary: "Cap-7 sites inherit design_of the four hubs. resolves_to_hub: false. name_may_change: true. public_icann: false. No fifth product. Plane A UI: azcorpus + azlibrary on this Worker. No AZ-GEN publish cadence. Future MirageGrid /bridge.json is cited, not claimed live.", operationId: "bridgeJson" } },
      "/mcp": { post: { summary: "Library MCP JSON-RPC (aziel-corpus_health, search, skill, download, ingest, design_pack, receipt). Dual surface. Upload requires session/operator token. Public, no OAuth.", operationId: "libraryMcp" }, get: { summary: "Library MCP discovery (tool names). Runtime FragGate door stays POST /runtime/mcp.", operationId: "libraryMcpDiscover" } },
      "/v1/metadata-backfill": { get: { summary: "Idempotent discovery-metadata backfill. Writes {library}/{AZDOC}/JSONAZDOC-….json beside the paper and mirrors under .Json/. JSON-prefixed document_ledger receipts copy the paper lattice and never rewrite paper chain_tip. all=1 walks remaining; force=1 restarts; status=1 progress. Cron and request walks also continue. Does not increment downloads.", operationId: "metadataBackfill", parameters: [{ name: "all", in: "query", schema: { type: "string", enum: ["0", "1"] } }, { name: "force", in: "query", schema: { type: "string", enum: ["0", "1"] } }, { name: "status", in: "query", schema: { type: "string", enum: ["0", "1"] } }, { name: "record_id", in: "query", schema: { type: "string" } }] } },
      "/record/{record_id}/metadata.json": { get: { summary: "Public Schema.org discovery metadata for one AZDOC record (no auth). Co-located with the paper package and mirrored under .Json/. Alias: /record/{record_id}.json.", operationId: "recordMetadata", parameters: [{ name: "record_id", in: "path", required: true, schema: { type: "string" } }] } },
      "/record/{record_id}.json": { get: { summary: "Alias of /record/{record_id}/metadata.json.", operationId: "recordMetadataAlias", parameters: [{ name: "record_id", in: "path", required: true, schema: { type: "string" } }] } },
      "/sitemap-records.xml": { get: { summary: "Record HTML + metadata.json + .json alias URLs for crawlers. Linked from sitemap-index.xml.", operationId: "sitemapRecords" } },
      "/v1/media-run": { get: { summary: "Hash-chained media lattice receipt for an OCR or transcript run (AZRUN-).", operationId: "mediaRun", parameters: [{ name: "run_id", in: "query", required: true, schema: { type: "string" } }] } },
      "/transcribe": { post: { summary: "Hosted Whisper transcription with mandatory VibeLock determination. Hard-blocks porn, nudity, and child-sexual content (HTTP 451; never stored or playable). Allowed media at /media/{sha256}. Optional library upload (signed-in: Corpus; operator: Aziel Library).", operationId: "transcribe" } },
      "/ocr": { post: { summary: "Hosted image/PDF OCR. Always writes a media lattice receipt. Optional library upload.", operationId: "ocr" } },
      "/media/{sha256}": { get: { summary: "Inline playback of allowed A/V stored at av/{sha256}. Blocked media is never stored.", operationId: "media", parameters: [{ name: "sha256", in: "path", required: true, schema: { type: "string" } }] } },
      "/receipt/{id}": { get: { summary: "Receipt for an AZDOC- paper, JSONAZDOC- discovery sidecar, or AZRUN- media lattice entry.", operationId: "receipt", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] } },
      "/ledger/{id}": { get: { summary: "Alias of /receipt/{id} for media lattice and document receipts.", operationId: "ledger", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] } },
      "/file/{record_id}": { get: { summary: "Download any stored record (text or file). HTTP 200. Quarantined poison docs stay downloadable with X-Aziel-Quarantine. Ledger-linked. A 64-hex SHA-256 also resolves the kept matching file. AI clients: aziel-corpus_download.", operationId: "file" } },
      "/download": { get: { summary: "Counted Softwares zip (asset=), counted record (record=), counted hash (hash=), or counted first-class website design pack (product=azcorpus|azlibrary). Anyone may download azcorpus and azlibrary packs. HTTP 200, no silent 302. AI clients: aziel-corpus_download / aziel-corpus_design_pack.", operationId: "download", parameters: [{ name: "asset", in: "query", schema: { type: "string" } }, { name: "record", in: "query", schema: { type: "string" } }, { name: "hash", in: "query", schema: { type: "string" } }, { name: "sha256", in: "query", schema: { type: "string" } }, { name: "product", in: "query", schema: { type: "string", enum: ["azcorpus", "azlibrary", "azeliab", "godlock", "hedidntjump"] } }, { name: "pack", in: "query", schema: { type: "string" } }] } },
      "/v1/download": { get: { summary: "Softwares download descriptor (2xx). Aligns catalog download_url with GET /download. Does not increment. Author Aziel Eliab.", operationId: "softwareDownload" } },
      "/v1/docs/{hash}/download": { get: { summary: "Download the stored file for a kept record whose content_sha256 matches. Does not increment downloads. Duplicates are not deleted. AI/MCP: aziel-corpus_download.", operationId: "downloadByHash", parameters: [{ name: "hash", in: "path", required: true, schema: { type: "string" } }] } },
      "/v1/runtime": { get: { summary: "Digital Library package discovery (NOT the Aziel Runtime engine manifest). Use /v1/runtime.json or /runtime/v1/runtime.json for Aziel Runtime " + RUNTIME_VERSION + ".", operationId: "runtime" } },
      "/v1/runtime.json": { get: { summary: "Aziel Runtime " + RUNTIME_VERSION + " manifest (proxied). Distinct from /v1/runtime library package discovery.", operationId: "runtimeRoot" } },
      "/AzielEliab": { get: { summary: "Aziel Eliab — author profile page (HTML). Corresponds with https://godlock.uk/AzielEliab. Legacy /about and /aboutme permanently redirect here.", operationId: "azielEliab" } },
      "/who": { get: { summary: "Who is Aziel Eliab (HTML). Person @id https://www.azieleliab.com/#aziel.", operationId: "whoHtml" } },
      "/person.jsonld": { get: { summary: "AZindex Person JSON-LD. @id is always https://www.azieleliab.com/#aziel. identity.jsonld is the same document.", operationId: "personJsonLd" } },
      "/identity.jsonld": { get: { summary: "AZindex identity JSON-LD. Same Person document as /person.jsonld.", operationId: "identityJsonLd" } },
      "/graph.jsonld": { get: { summary: "AZindex graph: Person, Who-is + 15:20 FAQ, WebSite publisher, library role, stats tether.", operationId: "graphJsonLd" } },
      "/who-is-aziel-eliab.txt": { get: { summary: "Verbatim Who is Aziel Eliab answer from the identity lock.", operationId: "whoIsAzielEliab" } },
      "/who-is": { get: { summary: "Plain-text alias of /who-is-aziel-eliab.txt.", operationId: "whoIs" } },
      "/search": { get: { summary: "Corpus Search HTML (HTTP 200). Same shelf as /; does not increment homepage views.", operationId: "searchPage" } },
      "/.well-known/aziel.json": { get: { summary: "Shared azieleliab-pack mission object. Not a biography. doi null.", operationId: "wellKnownAziel" } },
      "/.well-known/person.jsonld": { get: { summary: "Alias of /person.jsonld. Same Person @id https://www.azieleliab.com/#aziel.", operationId: "wellKnownPersonJsonLd" } },
      "/runtime": { get: { summary: "Aziel Runtime " + RUNTIME_VERSION + " on this domain. Prefer /runtime/*. " + RUNTIME_NOTE, operationId: "runtimePage" } },
      "/runtime/v1/health": { get: { summary: "Aziel Runtime " + RUNTIME_VERSION + " health via same-origin proxy.", operationId: "runtimeProxyHealth" } },
      "/runtime/v1/uses": { get: { summary: "Local API use log for this /runtime door. Does not increment.", operationId: "runtimeUses" } },
      "/runtime/v1/fraggate": { get: { summary: "FragGate door summary (registry digest, live/stub/local_only counts).", operationId: "runtimeFraggate" } },
      "/runtime/v1/fraggate/list": { get: { summary: "Hashed FragGate registry. Discover names. Do not invent tools.", operationId: "runtimeFraggateList" } },
      "/runtime/v1/fraggate/call": { post: { summary: "CallEnvelope → DecisionGATE → handler or refuse.", operationId: "runtimeFraggateCall" } },
      "/runtime/v1/runtime.json": { get: { summary: "Aziel Runtime " + RUNTIME_VERSION + " manifest via same-origin proxy.", operationId: "runtimeProxyManifest" } },
      "/runtime/v1/skill": { get: { summary: "aziel-runtime skill markdown via same-origin proxy.", operationId: "runtimeProxySkill" } },
      "/runtime/v1/session/open": { post: { summary: "Advanced/internal. Open an aziel-runtime session (same-origin proxy). Prefer fraggate_call.", operationId: "runtimeProxySessionOpen" } },
      "/runtime/v1/session/{id}/exec": { post: { summary: "Advanced/internal session exec via same-origin proxy. Prefer fraggate_call. HTTP /p is not exec.", operationId: "runtimeProxySessionExec" } },
      "/runtime/v1/pull/{slug}": { get: { summary: "Pull descriptor for one product slug via same-origin proxy.", operationId: "runtimeProxyPull" } },
      "/v1/software": { get: { summary: "Live aziel-runtime software catalog (GET /v1/software, fallback fraggate/list). Per request. Author Aziel Eliab.", operationId: "liveSoftwareCatalog" } },
      "/v1/update/check": { get: { summary: "Installer update check. Prefers runtime /v1/update/check. Does not increment downloads.", operationId: "updateCheck", parameters: [{ name: "slug", in: "query", schema: { type: "string", default: "aziel-corpus" } }, { name: "version", in: "query", schema: { type: "string" } }] } },
      "/runtime/v1/software": { get: { summary: "Live aziel-runtime /v1/software via same-origin proxy.", operationId: "runtimeProxySoftware" } },
      "/runtime/v1/catalog.json": { get: { summary: "Live aziel-runtime catalog via same-origin proxy.", operationId: "runtimeProxyCatalog" } },
      "/runtime/openapi.json": { get: { summary: "Combined aziel-runtime OpenAPI via same-origin proxy.", operationId: "runtimeProxyOpenapi" } },
      "/runtime/mcp": { post: { summary: "aziel-runtime MCP JSON-RPC (thin FragGate door) via same-origin proxy.", operationId: "runtimeProxyMcp" } },
      "/.well-known/mcp.json": { get: { summary: "MCP server discovery (public, no OAuth).", operationId: "wellKnownMcp" } },
      "/mcp.json": { get: { summary: "MCP server discovery alias.", operationId: "mcpDiscovery" } },
      "/runtime/llms.txt": { get: { summary: "Runtime llms.txt via same-origin proxy.", operationId: "runtimeLlms" } },
      "/runtime/cite.json": { get: { summary: "Runtime cite.json via same-origin proxy.", operationId: "runtimeCite" } },
      "/runtime/robots.txt": { get: { summary: "Runtime robots.txt via same-origin proxy.", operationId: "runtimeRobots" } },
      "/shelves": { get: { summary: "COLD-MULTI-SHELF-1.0 honest registry. Plane B=alt forge/archive SLOT (LIVE only Codeberg+archive.org+GitFlic). Extra D/E/F/G SLOTs url-null. Zenodo tip-pack refused CNS-ZENODO-IP-BAN. doi null. RESTORE-DRILL schema. 5 surfaces / 2 family radii, 1 independent live. No invented CIDs. Not AZ-GEN live ICANN publish.", operationId: "coldShelves" } },
      "/cold-copy": { get: { summary: "Alias of /shelves (COLD-MULTI-SHELF-1.0).", operationId: "coldCopy" } },
      "/v1/shelves": { get: { summary: "Alias of /shelves (COLD-MULTI-SHELF-1.0).", operationId: "v1Shelves" } },
      "/v1/cold-copy": { get: { summary: "Alias of /shelves (COLD-MULTI-SHELF-1.0).", operationId: "v1ColdCopy" } },
    },
  };
}

export async function handleRuntimeApi(request, url, env, ctx) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (path === "/openapi.json" && (request.method === "GET" || request.method === "HEAD")) {
    const res = json(openapi());
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  const libraryMcp = await handleLibraryMcp(request, url, env);
  if (libraryMcp) return libraryMcp;
  const ingest = await handleLibraryIngestApi(request, url, env, null);
  if (ingest) return ingest;
  const packs = await handleDesignPackApi(request, url, env);
  if (packs) return packs;
  const mesh = await handleMeshApi(request, url, env);
  if (mesh) return mesh;
  if (path === "/v1/download" && (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS")) {
    const described = handleV1Download(request, url);
    if (described) return described;
    return serveSoftwareAsset(request, env, url.searchParams.get("asset"));
  }
  if (path === "/v1/software" && (request.method === "GET" || request.method === "HEAD")) {
    const live = await fetchLiveSoftwareCatalog(env, { preferCache: true, timeoutMs: 2500 });
    const tab = softwareTabCatalog(live.catalog);
    const corpus = tab.products.find((p) => p.slug === "aziel-corpus");
    const res = json({
      ok: true,
      source: live.source,
      origin: CATALOG + "/v1/software",
      fallback: CATALOG + "/v1/fraggate/list",
      version: tab.version || (live.catalog && live.catalog.version) || RUNTIME_VERSION,
      author: "Aziel Eliab",
      identity: "Aziel Eliab",
      count: tab.products.length,
      live_count: tab.live_count || tab.products.length,
      framing: tab.framing || "",
      sort_law: tab.sort_law || "",
      products: tab.products,
      extras: tab.extras,
      software: tab.products,
      download_url: (corpus && (corpus.download_url || corpus.download)) || LIBRARY_DOWNLOAD,
      v1_download: LIBRARY_V1_DOWNLOAD,
      install: LIBRARY_INSTALL,
      engines: tab.engines,
      engine_slugs: tab.engine_slugs,
      true_engine_slugs: tab.true_engine_slugs,
    });
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=3600");
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  if (path === "/v1/update/check" && (request.method === "GET" || request.method === "HEAD" || request.method === "POST")) {
    let slug = url.searchParams.get("slug") || url.searchParams.get("product") || LIBRARY_SLUG;
    let version = url.searchParams.get("version") || url.searchParams.get("current") || LIBRARY_VERSION;
    if (request.method === "POST") {
      try {
        const body = await request.json();
        slug = (body && (body.slug || body.product)) || slug;
        version = (body && (body.version || body.current)) || version;
      } catch {
        /* query params stand */
      }
    }
    const doc = await checkLibraryUpdate(env, { slug, version });
    const res = json(doc);
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  if (path === "/v1/runtime" && request.method === "GET") {
    return json({
      ok: true,
      product: PRODUCT,
      name: "Aziel Digital Library",
      version: VERSION,
      package: VERSION,
      spec: SPEC,
      mode: "master",
      author: "Aziel Eliab",
      host: HOST,
      catalog: CATALOG,
      runtime_root: HOST + "/runtime",
      protocol: PROTOCOL,
      limitation: LIMITATION,
      // Disambiguation: this is NOT aziel-runtime's machine manifest.
      is_aziel_runtime_manifest: false,
      role: "digital-library-package",
      note: "Digital Library package discovery only. Engine manifest is GET /v1/runtime.json or GET /runtime/v1/runtime.json (Aziel Runtime " + RUNTIME_VERSION + ").",
      aziel_runtime_manifest: HOST + "/v1/runtime.json",
      aziel_runtime_manifest_alias: HOST + "/runtime/v1/runtime.json",
      aziel_runtime_origin: "https://aziel-runtime.vibelock.workers.dev/v1/runtime.json",
      mesh: HOST + "/v1/mesh",
      runtime_mesh: HOST + "/runtime/v1/mesh",
      mesh_note: MESH_NOTE,
      qns_cd_spec: QNS_CD_SPEC,
    });
  }
  const docsDl = path.match(/^\/v1\/docs\/([^/]+)\/download$/);
  if (docsDl && request.method === "GET") {
    const hash = normalizeContentHash(decodeURIComponent(docsDl[1]));
    if (!hash) return json({ error: "content hash required" }, 400);
    return serveFileByHash(env, hash);
  }
  if (path === "/v1/stats" && (request.method === "GET" || request.method === "HEAD")) {
    const stats = await collectStats(env);
    const res = json({
      ok: true,
      author: "Aziel Eliab",
      identity: "Aziel Eliab",
      ...stats,
    });
    res.headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  if (path === "/v1/library-index" && (request.method === "GET" || request.method === "HEAD")) {
    const packed = await readPackedIndex(env);
    const body = {
      ok: true,
      key: LIBRARY_INDEX_KEY,
      ...packed,
      limitation: LIMITATION,
    };
    const res = json(body);
    res.headers.set("Cache-Control", PUBLIC_CACHE_CONTROL);
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  if (path === "/v1" || path === "/v1/health") {
    if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "GET only" }, 405);
    let packed = null;
    try { packed = await readPackedIndex(env); } catch { packed = null; }
    const tun = libraryHealthFields(packed, env);
    const res = json({
      ok: true,
      product: PRODUCT,
      name: "Aziel Digital Library",
      version: VERSION,
      package: VERSION,
      spec: SPEC,
      mode: "master",
      limitation: LIMITATION,
      author: "Aziel Eliab",
      host: HOST,
      catalog: CATALOG,
      runtime_root: HOST + "/runtime",
      protocol: PROTOCOL,
      ...tun,
      review: {
        spre: "Source Provenance Reliability Engine (no guilt verdict)",
        clce: "AZ-CLCE Jaccard port + optional live /v1/score",
        plr: "PhysLing Review",
        poison: "hash-chained quarantine, never silent delete",
        bayesian: "unranked peer score, never default shelf sort. Posterior ≠ truth.",
        possibility: "HEURISTIC possibility ∈ [0,1] or refuse, derived from lattice time×geo pins. possibility ≠ probability ≠ triad ≠ ZionPattern. GET /v1/possibility?record_id=",
        learn: HASHCHAIN_LEARN_LAW + ". LEARN / POISON_LEARN / MAP_PIN / POSSIBILITY_SCORE append to document_ledger. Recollection is tip + prev-hash. " + LEARN_LIMITATION,
        poison_learn: "GET /v1/poison-learn — feature receipts only (hash + markers). No poison bodies. Repeats refuse faster.",
        pin: "Upload→pin on successful ingest. GET /v1/pin?record_id= · GET /v1/verify-geo. Fail closed on structure/poison. 4DMap cite 4DM-WP-1.0 (not a live ICANN mesh DNS).",
        triad: "TRIAD_V1 geometric mean of SPRE PC, CLCE consistency, PhysLing coherence — primary visible score",
        backfill: "GET /v1/verify-backfill scores older unscored records",
        document_chain: "hash-chain bound to AZDOC- id; uploads/downloads/rescores/quarantine/peer notes append",
        succession: "Exact-same-subject paper cites (Supersedes / Superseded by). Uncertain matches are not chained.",
        zsolver: "ZionPattern Solver secondary public score. Separate from triad. Qualifies for historical, research, investigation, and crime documents; philosophy, software, hardware, and designs omit ZionPattern (never 0). Zioncheck Visual Archive vols 1–5 seed baseline display 75. 75 means intentional suppression confidence; lower is more natural. Hard 75 ceiling / 25 uncertainty floor. Provisional. If the live API is down, the score is queued and retried. When a superseding document proves a ZionPattern break with first-hand / primary materials only, every document in that succession chain is force-rescored. Narrative, news, and second-source materials never trigger chain rescore. See " + HOST + "/how-its-scored",
        backfill_all: "GET /v1/verify-backfill?all=1 walks every stored Aziel Library and Corpus record",
        backfill_rebuild: "GET /v1/verify-backfill?rebuild=1 writes already-scored zsolver onto lattice tips in cursor chunks (default 25, ~4s). Returns JSON immediately. Packed library:index:v1 + homepage HTML cache refresh runs after the response. Repeat with cursor= or all=1 until done:true. force=1 restarts.",
        verify_geo: "GET /v1/verify-geo?force=1 / ?status=1 — chunked paper-date × event × geolocation pins. Never upload time.",
        jeeves: JEEVES_LIMITATION,
        lattice: "aziel.lattice.anchor.v1 for AzielTether; site is not a mesh",
        mesh: "GET /v1/mesh and /runtime/v1/mesh — suite node mesh; read-only QNM ON. Counts/status rollup — not the cell. Disable refused. QNS-CD-1.0 + CROSS-NETWORK-SURVIVAL-1.0 + MESH-SPLIT-WIRES-1.0 + MESH-COLD-COPY-1.0 + MESH-REEXPAND-1.0 + MESH-REHEAL-1.0 + NO-LIE-NO-REWRITE-1.0. Survival is bytes↔hash. Live body sync refused. Re-expand is archive restore. Reheal is never neighbor majority. Network never lies to stay alive. No rewrite key. Author Aziel Eliab.",
        transcription: "POST /transcribe — Workers AI Whisper; video has no FFmpeg demux; VibeLock determination is mandatory",
        vibelock: "Mandatory determination on every /transcribe run. Hard blocks porn, nudity, child-sexual content. Not courtroom proof.",
        media_lattice: "Every OCR and transcript run appends a lattice receipt. Transcript success is LATTICE_TRANSCRIPT_VIBELOCK; blocked A/V is LATTICE_AV_BLOCKED (HTTP 451).",
      },
    });
    res.headers.set("Cache-Control", "public, max-age=15");
    if (request.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  }
  if (path === "/v1/skill" && request.method === "GET") {
    return new Response(SKILL, {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8", ...corsHeaders() },
    });
  }
  if (path === "/v1/example" && request.method === "GET") {
    return json({ q: "Florence" });
  }
  if (path === "/v1/search" && request.method === "GET") {
    const q = (url.searchParams.get("q") || "").trim();
    const lib = (url.searchParams.get("lib") || "all").trim() || "all";
    const sort = (url.searchParams.get("sort") || "newest").trim() || "newest";
    const author = (url.searchParams.get("author") || "").trim();
    const domain = (url.searchParams.get("domain") || "").trim();
    const subject = (url.searchParams.get("subject") || "").trim();
    const keyword = (url.searchParams.get("keyword") || "").trim();
    let packed = await readPackedIndex(env);
    if (!Array.isArray(packed.records) || packed.records.length === 0) {
      try {
        packed = await refreshPackedIndex(env);
      } catch {
        /* stay empty; still no KV.list() */
      }
    }
    const rows = searchPackedRecords(packed, { q, library: lib, sort, author, domain, subject, keyword, limit: 50 }).map(publicSearchCard).filter(Boolean);
    const res = json({
      ok: true,
      q,
      lib,
      sort,
      author,
      domain,
      subject,
      keyword,
      results: rows,
      source: "packed",
      index_key: LIBRARY_INDEX_KEY,
      kv_list_hot_path: false,
      bayesian_unranked: true,
      limitation: LIMITATION,
    });
    res.headers.set("Cache-Control", SEARCH_CACHE_CONTROL);
    return res;
  }
  if (path === "/v1/review" && request.method === "GET") {
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim();
    if (!recordId) return json({ error: "record_id required" }, 400);
    const receipt = await receiptForRecord(env, recordId);
    if (!receipt) return json({ error: "not found" }, 404);
    const extra = await loadRecordReview(env, { record_id: recordId, review_json: receipt.review ? JSON.stringify(receipt.review) : null, lattice_tip_json: receipt.lattice_tip ? JSON.stringify(receipt.lattice_tip) : null, quarantine_status: receipt.quarantine_status });
    const triad = (extra.review && extra.review.triad) || null;
    return json({
      ok: true,
      record_id: recordId,
      triad,
      triad_combined: (triad && triad.combined) != null ? triad.combined : receipt.triad_combined,
      primary_score: "triad",
      zsolver: extra.zsolver || null,
      succession: extra.succession || null,
      bayesian_unranked: true,
      possibility: (extra.review && extra.review.possibility) || null,
      possibility_note: POSSIBILITY_NOTE,
      law: HASHCHAIN_LEARN_LAW,
      document_chain: receipt.document_chain || null,
      ...extra,
      limitation: LIMITATION,
    });
  }
  if (path === "/v1/metadata-backfill" && request.method === "GET") {
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
    const all = url.searchParams.get("all") === "1" || url.searchParams.get("all") === "true";
    const statusOnly = url.searchParams.get("status") === "1" || url.searchParams.get("status") === "true";
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim() || null;
    if (statusOnly) return json({ ...(await metadataBackfillStatus(env)), limitation: LIMITATION });
    const report = await continueMetadataBackfill(env, { ms: all ? 25000 : 12000, force, all, recordId });
    return json({ ...report, limitation: LIMITATION });
  }
  if (path === "/v1/lattice" && request.method === "GET") {
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || url.searchParams.get("run_id") || "").trim();
    if (!recordId) return json({ error: "record_id required", note: LATTICE_NOTE }, 400);
    if (isJsonDocumentId(recordId)) {
      const rec = await receiptForJsonMetadata(env, recordId);
      if (!rec) return json({ error: "not found", note: LATTICE_NOTE }, 404);
      return json({ ok: true, tip: rec.lattice_tip, record_id: rec.record_id, paper_record_id: rec.paper_record_id, kind: rec.kind, note: LATTICE_NOTE, limitation: LIMITATION });
    }
    if (isMediaRunId(recordId)) {
      const rec = await receiptForMediaRun(env, recordId);
      if (!rec) return json({ error: "not found", note: LATTICE_NOTE }, 404);
      return json({ ok: true, tip: rec.lattice_tip, run_id: rec.run_id, kind: rec.kind, note: LATTICE_NOTE, limitation: LIMITATION });
    }
    const extra = await loadRecordReview(env, { record_id: recordId });
    const tip = extra.tip || latticeAnchorTip({ record_id: recordId, event: "lookup" });
    return json({ ok: true, tip, note: LATTICE_NOTE, limitation: LIMITATION });
  }
  if (path === "/v1/score" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "JSON body required" }, 400); }
    const bundle = await runReviewBundle({
      title: body.title || body.r || "",
      body: body.body || body.d || "",
      filename: body.filename || "",
      sha256: body.sha256 || "",
      author: body.author || "",
      library: body.library || "corpus",
      liveClce: false,
    });
    return json({
      ok: true,
      triad: bundle.review && bundle.review.triad,
      ...bundle,
      bayesian_unranked: true,
      possibility: bundle.review && bundle.review.possibility,
      possibility_note: POSSIBILITY_NOTE,
      law: HASHCHAIN_LEARN_LAW,
      limitation: LIMITATION,
    });
  }
  if (path === "/v1/verify-geo" && request.method === "GET") {
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
    const statusOnly = url.searchParams.get("status") === "1" || url.searchParams.get("status") === "true";
    if (statusOnly) return json({ ...(await geoVerifyStatus(env)), limitation: LIMITATION });
    const report = await continueVerifyGeo(env, { ms: 18000, force });
    const live = await geoVerifyStatus(env);
    if (report.done) {
      return json({
        ok: true,
        done: true,
        done_utc: live.done_utc,
        cursor: live.cursor || "",
        stats: report,
        events_live: live.events,
        note: GEO_PIN_NOTE,
        map4d: MAP4D_CITE,
        law: HASHCHAIN_LEARN_LAW,
        possibility_note: POSSIBILITY_NOTE,
        limitation: LIMITATION,
      });
    }
    return json({ ...report, events_live: live.events, note: GEO_PIN_NOTE, map4d: MAP4D_CITE, law: HASHCHAIN_LEARN_LAW, possibility_note: POSSIBILITY_NOTE, limitation: LIMITATION });
  }
  if (path === "/v1/verify-backfill" && request.method === "GET") {
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";
    const all = url.searchParams.get("all") === "1" || url.searchParams.get("all") === "true";
    const rebuild = url.searchParams.get("rebuild") === "1" || url.searchParams.get("rebuild") === "true" || url.searchParams.get("shelf") === "1";
    const statusOnly = url.searchParams.get("status") === "1";
    const limit = url.searchParams.get("limit");
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim() || null;
    if (statusOnly) return json({ ...(await fullBackfillStatus(env)), limitation: LIMITATION });
    if (rebuild) {
      const cursor = (url.searchParams.get("cursor") || "").trim();
      const shelf = await syncShelfScores(env, {
        reconcile: true,
        cursor: cursor || undefined,
        limit,
        all,
        force,
        resume: !cursor && !force,
        refreshPacked: false,
        ms: SHELF_REBUILD_MS,
      });
      const deferPacked = ctx && typeof ctx.waitUntil === "function";
      if (deferPacked) {
        ctx.waitUntil(refreshPackedShelf(env).catch(() => null));
      } else {
        try {
          const packed = await refreshPackedShelf(env);
          shelf.packed = packed.packed;
          shelf.index_sha256 = packed.index_sha256;
          shelf.html_cache = packed.html_cache;
        } catch { /* packed optional */ }
      }
      const next = shelf.done ? "" : (shelf.next_cursor || "");
      const note = shelf.done
        ? "Tip reconcile finished. Packed shelf refresh " + (deferPacked ? "deferred" : "inline") + "."
        : "Chunked rebuild. Repeat GET /v1/verify-backfill?rebuild=1&cursor=" + encodeURIComponent(next) + " or ?rebuild=1&all=1 until done:true.";
      return json({
        ok: true,
        rebuild: true,
        done: !!shelf.done,
        cursor: shelf.cursor || "",
        next_cursor: next,
        packed_refresh: deferPacked ? "deferred" : "inline",
        shelf,
        note,
        limitation: LIMITATION,
      });
    }
    if (all || !recordId) {
      const report = await continueFullBackfill(env, { ms: all ? 25000 : 18000, force, all });
      return json({ ...report, limitation: LIMITATION });
    }
    const report = await backfillReviews(env, { limit, force, recordId });
    return json({ ...report, limitation: LIMITATION });
  }
  if (path === "/v1/recollect" && request.method === "GET") {
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim();
    if (!recordId) return json({ error: "record_id required", law: HASHCHAIN_LEARN_LAW }, 400);
    const depth = Number(url.searchParams.get("depth") || 32);
    const tip = (url.searchParams.get("tip") || "").trim() || null;
    const rec = await recollectLattice(env, { record_id: recordId, depth, tip });
    return json({ ...rec, limitation: LIMITATION }, rec.ok ? 200 : 409);
  }
  if (path === "/v1/possibility" && request.method === "GET") {
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim();
    if (!recordId) return json({ error: "record_id required", note: POSSIBILITY_NOTE }, 400);
    const extra = await loadRecordReview(env, { record_id: recordId });
    const rec = await recollectLattice(env, { record_id: recordId, depth: 64 });
    let events = [];
    try {
      const { recordEvents } = await import("./geo.js");
      events = await recordEvents(env, recordId);
    } catch { events = []; }
    const stored = extra.review && extra.review.possibility;
    const prior = rec.ok ? await loadLearnStamps(env, { excludeRecordId: recordId }) : [];
    const local = (rec.stamps || [])
      .filter((s) => s.action === "LEARN")
      .map((s) => ({ kind: (s.payload && s.payload.kind) || "accept", anchors: (s.payload && s.payload.anchors) || [] }));
    const derived = rec.ok
      ? possibilityScore({
          anchors: (events || []).map((e) => ({ date: e.event_date, lat: e.lat, lon: e.lon, place: e.place_name })),
          learnStamps: prior.concat(local),
          latticeOk: rec.ok,
          poison: String(extra.quarantine_status || "") === "POISON_SUSPECT",
        })
      : possibilityScore({ latticeOk: false });
    return json({
      ok: rec.ok,
      record_id: recordId,
      possibility: derived,
      stored: compactPossibility(stored),
      bayesian: extra.review && extra.review.bayesian
        ? { posterior: extra.review.bayesian.posterior, unranked: true, schema: "aziel.bayesian.v1" }
        : null,
      tip: rec.tip,
      map4d: MAP4D_CITE,
      law: HASHCHAIN_LEARN_LAW,
      note: POSSIBILITY_NOTE,
      limitation: LIMITATION,
    }, rec.ok ? 200 : 409);
  }
  if (path === "/v1/poison-learn" && request.method === "GET") {
    const mem = await loadPoisonLearnMemory(env);
    return json({
      ok: !!mem.ok,
      features: mem.features || [],
      tip: mem.tip || null,
      body_retained: false,
      law: HASHCHAIN_LEARN_LAW,
      note: "Poison-learn is a feature receipt lattice. Repeats refuse faster. No poison payloads.",
      limitation: LIMITATION,
    }, mem.ok === false ? 409 : 200);
  }
  if (path === "/v1/pin" && request.method === "GET") {
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim();
    if (!recordId) return json({ error: "record_id required", map4d: MAP4D_CITE }, 400);
    const rec = await recollectLattice(env, { record_id: recordId, depth: 64 });
    let events = [];
    try {
      const { recordEvents } = await import("./geo.js");
      events = await recordEvents(env, recordId);
    } catch { events = []; }
    const pins = (rec.stamps || []).filter((s) => s.action === "MAP_PIN" || s.action === "MAP_PIN_REFUSED");
    return json({
      ok: rec.ok,
      record_id: recordId,
      events,
      pin_stamps: pins,
      tip: rec.tip,
      map4d: MAP4D_CITE,
      law: HASHCHAIN_LEARN_LAW,
      note: GEO_PIN_NOTE,
      limitation: LIMITATION,
    }, rec.ok ? 200 : 409);
  }
  if (path === "/v1/document-chain" && request.method === "GET") {
    const recordId = (url.searchParams.get("record_id") || url.searchParams.get("id") || "").trim();
    if (!recordId) return json({ error: "record_id required" }, 400);
    const chain = await documentChain(env, recordId);
    return json({ ok: true, ...chain, limitation: LIMITATION });
  }
  if (path === "/v1/media-run" && request.method === "GET") {
    const runId = (url.searchParams.get("run_id") || url.searchParams.get("id") || "").trim();
    if (!runId) return json({ error: "run_id required" }, 400);
    const rec = await receiptForMediaRun(env, runId);
    if (!rec) return json({ error: "not found" }, 404);
    return json({ ok: true, ...rec, limitation: LIMITATION });
  }
  if (path.startsWith("/v1/operator/")) {
    const op = await handleOperatorIngestApi(request, url, env, null);
    if (op) return op;
  }
  if (path.startsWith("/v1/jeeves/")) {
    const jeeves = await handleJeevesApi(request, url, env, null);
    if (jeeves) return jeeves;
  }
  if (path.startsWith("/v1/")) return json({ error: "not found" }, 404);
  return null;
}
