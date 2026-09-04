import { isOperator } from "./library.js";

function esc(s) {
  const q = String.fromCharCode(34);
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
  map[q] = "&quot;";
  return String(s || "").replace(/[&<>"]/g, (c) => map[c] || c);
}
function libTag(library) {
  const lib = String(library || "corpus").toLowerCase() === "aziel" ? "aziel" : "corpus";
  const label = lib === "aziel" ? "Aziel Library" : "Corpus";
  return "<span class=\"lib-tag " + lib + "\">" + label + "</span>";
}
function metricCard(label, value, cls) {
  cls = cls || "";
  return "<div class=\"card\"><div class=\"metric " + cls + "\">" + esc(value) + "</div><div class=\"muted\">" + esc(label) + "</div></div>";
}

export function treeBody(payload) {
  const libraries = payload.libraries;
  const standalone = payload.standalone || [];
  function docs(list) {
    return "<ul>" + (list || []).map((r) => {
      return "<li><a href=\"/record/" + esc(r.record_id) + "\">" + esc(r.title || r.record_id) + "</a>" +
        (r.author ? " <span class=\"muted\">· " + esc(r.author) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  const libHtml = [];
  const libMap = libraries instanceof Map ? libraries : new Map(Object.entries(libraries || {}));
  for (const [lib, domains] of libMap) {
    const libLabel = lib === "aziel" ? "Aziel Library" : "Corpus";
    const domainHtml = [];
    const domainMap = domains instanceof Map ? domains : new Map(Object.entries(domains || {}));
    for (const [domain, subjects] of domainMap) {
      const subHtml = [];
      const subMap = subjects instanceof Map ? subjects : new Map(Object.entries(subjects || {}));
      for (const [subject, rows] of subMap) {
        subHtml.push("<details><summary>" + esc(subject) + " <span class=\"muted\">(" + rows.length + ")</span></summary>" + docs(rows) + "</details>");
      }
      domainHtml.push("<details open><summary>" + esc(domain) + "</summary>" + subHtml.join("") + "</details>");
    }
    libHtml.push("<details open><summary>" + esc(libLabel) + "</summary>" + domainHtml.join("") + "</details>");
  }
  const stand = standalone.length
    ? "<details open><summary>Standalone / unclassified</summary>" + docs(standalone) + "</details>"
    : "<p class=\"muted\">No unclassified records.</p>";
  return "<section class=\"hero\"><h1>Evidence-based corpus tree</h1><p class=\"muted\">Grouped by library → domain → subject → document. Unclassified objects stay standalone. Links are never invented.</p></section><div class=\"card tree\">" + (libHtml.join("") || "<p class=\"muted\">No classified records yet.</p>") + stand + "</div>";
}

function light(status, label, kid) {
  const st = String(status || "REVIEW").toUpperCase();
  const cls = st === "PASS" || st === "CLEAR" ? "go" : st === "FLAG" || st === "QUARANTINE" ? "stop" : "slow";
  const word = st === "PASS" || st === "CLEAR" ? "Green" : st === "FLAG" || st === "QUARANTINE" ? "Red" : "Yellow";
  return "<div class=\"light " + cls + "\"><span class=\"lamp\" aria-hidden=\"true\"></span><div><b>" + esc(label) + "</b> — " + word + "<div class=\"muted\">" + esc(kid || st) + "</div></div></div>";
}

export function recordBody(payload) {
  const row = payload.row;
  const events = payload.events || [];
  const signed = payload.signed;
  const review = payload.review || (row && row.review_json ? (() => { try { return JSON.parse(row.review_json); } catch { return null; } })() : null);
  const peers = payload.peers || [];
  const tip = payload.tip;
  if (!row) return "<div class=\"card\"><h2>Not found</h2><p>That record is not in the hosted corpus.</p></div>";
  const q = String(payload.quarantine_status || row.quarantine_status || (review && review.quarantine_status) || "CLEAR").toUpperCase();
  const qBadge = q === "POISON_SUSPECT" || q === "QUARANTINE"
    ? "<span class=\"q-badge stop\">Quarantine — poison suspect (kept, not deleted)</span>"
    : q === "OPERATOR_FLAG" || q === "FLAGGED"
      ? "<span class=\"q-badge slow\">Operator flag — evidence still filed</span>"
      : "<span class=\"q-badge go\">Clear</span>";
  const sha = String(row.content_sha256 || "").trim();
  const shaHtml = sha ? "<p class=\"meta\">SHA-256 " + esc(sha.slice(0,12)) + "… · chain <a href=\"/v1/document-chain?record_id=" + esc(row.record_id) + "\">tip</a> · <a href=\"/receipt/" + esc(row.record_id) + "\">receipt</a></p>" : "<p class=\"meta\"><a href=\"/receipt/" + esc(row.record_id) + "\">receipt</a></p>";
  const open = "<p><a class=\"button\" href=\"/file/" + esc(row.record_id) + "\">Download</a> <a class=\"button ghost\" href=\"/download?record=" + esc(row.record_id) + "\">Counted download</a></p>";
  const qBanner = (q === "POISON_SUSPECT" || q === "QUARANTINE")
    ? "<div class=\"q-banner\">Quarantine — poison suspect. The file is still downloadable for auditors. It was not deleted.</div>"
    : "";
  const triad = (review && review.triad) || null;
  const combined = triad && triad.combined != null ? triad.combined : row.triad_combined;
  const triadHtml = combined != null
    ? "<div class=\"triad-card\"><h2>Triad score</h2><div class=\"triad\"><div class=\"metric\">" + (triad && triad.display != null ? triad.display : Math.round(Number(combined) * 100)) + "</div><div><p>One combined report card after SPRE, CLCE, and PhysLing all ran.</p><p class=\"muted\">" + esc((triad && triad.formula) || "TRIAD_V1 geometric mean of the three verifiers.") + "</p></div></div></div>"
    : "<div class=\"triad-card\"><h2>Triad score</h2><p class=\"muted\">Not scored yet. A backfill walk will write the combined score.</p></div>";
  const ev = events.length
    ? events.map((e) => "<div class=\"pill\">" + esc(e.event_date) + " · " + esc(e.place_name) + " · " + Number(e.confidence || 0).toFixed(2) + "</div>").join(" ")
    : "<p class=\"muted\">No mapped events extracted from this record.</p>";
  const lights = (review && review.lights) || {};
  const spre = review && review.spre;
  const clce = review && review.clce;
  const plr = review && review.plr;
  const bayes = review && review.bayesian;
  const posterior = bayes && bayes.posterior != null ? bayes.posterior : row.bayesian_posterior;
  const lightsHtml = review
    ? "<div class=\"lights\">" +
      light(lights.structure, "Structure", review.structure && review.structure.ok ? "Every file was hashed and checked." : "A file failed the structure check.") +
      light(lights.spre, "SPRE", spre && spre.kid_plain) +
      light(lights.clce, "CLCE", clce && clce.kid_plain) +
      light(lights.plr, "PhysLing Review", plr && plr.kid_plain) +
      light(lights.poison, "Poison", review.poison && review.poison.kid_plain) +
      "</div>"
    : "<p class=\"muted\">Review scores are not on this record yet.</p>";
  const spreHtml = spre
    ? "<p><b>SPRE PC</b> " + Number(spre.pc).toFixed(2) + " · " + esc(spre.band) + "</p><p class=\"muted\">" + esc(spre.limitation) + "</p>"
    : "";
  const clceHtml = clce
    ? "<p><b>CLCE</b> triple " + Number(clce.triple).toFixed(2) + " · pairwise " + Number(clce.pairwise_avg).toFixed(2) + " · " + esc(clce.band || "") + "</p><p class=\"muted\">" + esc(clce.limitation || "") + "</p>"
    : "";
  const plrHtml = plr
    ? "<p><b>PhysLing Review (PLR)</b> " + esc(plr.status) + "</p><div class=\"mini-chips\">" +
      Object.entries(plr.lights || {}).map(([k, v]) => "<span class=\"mini-chip " + (v === "PASS" ? "on" : "") + "\">" + esc(k) + ": " + esc(v) + "</span>").join("") +
      "</div><p class=\"muted\">" + esc(plr.limitation) + "</p>"
    : "";
  const bayesHtml = posterior != null
    ? "<div class=\"card\"><h3>Bayesian peer score</h3><div class=\"metric\">" + Number(posterior).toFixed(3) + "</div><p class=\"muted\">Unranked metadata. This number is for manual peer-to-peer review. It does not sort the shelf.</p>" +
      (bayes && bayes.priors ? "<p class=\"muted\">Priors: evidence " + bayes.priors.evidence_completeness + " · physics " + bayes.priors.physics_coherence + " · language " + bayes.priors.linguistic_neutrality + " · SPRE " + bayes.priors.spre_pc + " · CLCE " + bayes.priors.clce_consistency + "</p>" : "") +
      "</div>"
    : "";
  const peerRows = peers.length
    ? peers.map((p) => "<div class=\"event-row\"><b>" + esc(p.stance) + "</b> · " + esc(p.created_by || "peer") + " · " + esc(String(p.created_utc || "").replace("T", " ").slice(0, 16)) + "<br>" + esc(p.body) + "<br><span class=\"muted\">ledger " + esc(String(p.entry_hash || "").slice(0, 16)) + "…</span></div>").join("")
    : "<p class=\"muted\">No peer notes yet. Endorse or challenge without rewriting history.</p>";
  const peerForm = signed
    ? "<form method=\"post\" action=\"/record/" + esc(row.record_id) + "/peer\"><label>Stance<select name=\"stance\"><option value=\"note\">Note</option><option value=\"endorse\">Endorse</option><option value=\"challenge\">Challenge</option></select></label><textarea name=\"body\" rows=\"4\" placeholder=\"Peer note — appends to the hash-chain\" required></textarea><p><button>Append peer review</button></p></form>"
    : "<p class=\"muted\">Sign in to append a peer endorse or challenge. History stays append-only if the operator is gone one day.</p>";
  const tipHtml = tip
    ? "<details><summary>AzielTether lattice tip</summary><pre class=\"verify\">" + esc(JSON.stringify(tip, null, 2)) + "</pre><p class=\"muted\">The live site is not a mesh. Tether software can carry this tip.</p></details>"
    : "";
  return "<section class=\"hero\">" + libTag(row.library) + " " + qBadge + "<h1>" + esc(row.title) + "</h1><p class=\"muted\">" + esc(row.author || "") + (row.domain ? " · " + esc(row.domain) : "") + (row.subjects ? " · " + esc(row.subjects) : "") + "</p></section>" +
    qBanner + triadHtml +
    "<div class=\"card\"><h2>Status lights</h2><p class=\"muted\">Green means go. Yellow means read again. Red means stop and check. Easy enough for a 6th grader; kept for government use.</p>" + lightsHtml + "</div>" +
    "<div class=\"card\"><p class=\"meta\">" + esc(row.filename || "text record") + (row.created_utc ? " · " + esc(String(row.created_utc).replace("T", " ").slice(0, 16)) : "") + "</p>" + shaHtml + open +
    "<h3>SPRE + CLCE + PhysLing</h3>" + spreHtml + clceHtml + plrHtml +
    "<h3>Snippet</h3><p>" + esc(String(row.body || row.snippet || "").slice(0, 2000)) + "</p><h3>Temporal-geospatial events</h3>" + ev + tipHtml + "</div>" +
    bayesHtml +
    "<div class=\"card\"><h3>Peer-to-peer review</h3><p class=\"muted\">Notes append to the hash-chain. Peers endorse or challenge; nobody rewrites the past.</p>" + peerRows + peerForm + "</div>";
}

export function mapBody(payload) {
  const events = payload.events || [];
  const unresolved = payload.unresolved || [];
  const gst = payload.gazetteer || {};
  const hst = payload.historical || {};
  const signed = payload.signed;
  const years = [];
  for (const e of events) {
    const y = parseInt(String(e.event_date || "").slice(0, 4), 10);
    if (Number.isFinite(y)) years.push(y);
  }
  for (const x of [hst.min_year, hst.max_year]) {
    const y = parseInt(x, 10);
    if (Number.isFinite(y)) years.push(y);
  }
  const ymin = years.length ? Math.min.apply(null, years) : 0;
  const ymax = years.length ? Math.max.apply(null, years) : 0;
  const ycontext = ymin || 0;
  const ready = gst.state === "READY" && gst.places > 0;
  const unresolvedHtml = unresolved.length
    ? unresolved.slice(0, 100).map((x) => "<li>" + esc(x.name) + " — " + esc(x.documents) + " document(s)</li>").join("")
    : "<li>None.</li>";
  const manual = signed
    ? "<details><summary><b>Note a geographic event manually</b></summary><form method=\"post\" action=\"/api/map-event\" class=\"map-tools\" style=\"margin-top:10px\"><label>Date<input name=\"date\" placeholder=\"YYYY, YYYY-MM-DD, or September 10 2025\" required></label><label>Place<input name=\"place\" placeholder=\"Place name\" required></label><label>Latitude<input name=\"lat\" type=\"number\" step=\"any\" min=\"-90\" max=\"90\" required></label><label>Longitude<input name=\"lon\" type=\"number\" step=\"any\" min=\"-180\" max=\"180\" required></label><label>Title<input name=\"title\" placeholder=\"Event title\"></label><label>Record ID<input name=\"record_id\" placeholder=\"Optional AZDOC source ID\"></label><button>Add immutable event record</button></form></details>"
    : "<p class=\"muted\">Sign in to note a manual map event. Anonymous visitors can view pins. This form posts to /api/map-event, not the download counter.</p>";
  const evjson = JSON.stringify(events).replace(/</g, "\\u003c");
  const eventListHtml = events.slice(0, 300).map((e) => "<div class=\"event-row\"><b>" + esc(e.event_date) + " — " + esc(e.place_name) + "</b><br>" + esc(e.title || "") + "<br><span class=\"muted\">" + esc(e.source || "") + " · " + Number(e.confidence || 0).toFixed(2) + (e.record_id ? " · <a href=\"/record/" + encodeURIComponent(e.record_id) + "\">source document</a>" : "") + "</span></div>").join("") || "<p>No events in this temporal window.</p>";
  return "<div class=\"card\"><h2>Temporal-Geospatial Corpus Map</h2><p class=\"muted\">The event layer and historical-state layer are independent. Event pins come from corpus evidence; historical polygons come from preserved source layers. Competing historical sources can overlap instead of being silently merged.</p><p class=\"" + (ready ? "ok" : "bad") + "\"><b>Geographic resolver:</b> " + esc(gst.state || "EMPTY") + " · profile " + esc(gst.profile || "lite") + " · " + Number(gst.places || 0).toLocaleString() + " places. " + (ready ? "Document place names can resolve to coordinates." : "Gazetteer is seeding or empty; pins still show stored events.") + "</p><div class=\"map-tools\"><label>Events from <input id=\"yearFrom\" type=\"number\" value=\"" + ymin + "\"></label><label>Events to <input id=\"yearTo\" type=\"number\" value=\"" + ymax + "\"></label><label>Min confidence <select id=\"conf\"><option value=\"0\">All</option><option value=\".7\">≥ 0.70</option><option value=\".9\">≥ 0.90</option></select></label><button type=\"button\" id=\"applyMap\">Apply events</button><button type=\"button\" id=\"resetMap\">Reset view</button></div><div style=\"margin-top:14px\"><label for=\"contextYear\"><b>Historical context year: <span id=\"contextLabel\">" + ycontext + "</span></b></label><input id=\"contextYear\" type=\"range\" min=\"" + ymin + "\" max=\"" + Math.max(ymax, ymin + 1) + "\" value=\"" + ycontext + "\" step=\"1\"><p class=\"muted\">Move the slider to redraw only the historical boundaries/names valid at that date. Source attribution appears when a region is selected.</p></div><p><span class=\"pill\">AUTO_SENTENCE = high-confidence textual co-occurrence</span> <span class=\"pill\">AUTO_CONTEXT = nearby OCR/layout pair · review</span> <span class=\"pill\">REVIEW = weaker document association</span> <span class=\"pill\">MANUAL = user-noted event</span> <span class=\"pill\">HISTORICAL = source-layer context</span></p>" + manual + "</div><div class=\"card\"><svg id=\"worldMap\" viewBox=\"0 0 1200 600\" role=\"img\" aria-label=\"World map with historical geographic layers and corpus event pins\"><g id=\"viewport\"><rect x=\"0\" y=\"0\" width=\"1200\" height=\"600\" fill=\"#eef3f4\"/><g id=\"land\"></g><g id=\"grid\"></g><g id=\"history\"></g><g id=\"pins\"></g></g></svg><div id=\"mapStatus\" class=\"muted\"></div><div id=\"historyStatus\" class=\"muted\"></div></div><div class=\"grid\"><div class=\"card\"><h3>Visible events</h3><div id=\"eventList\">" + eventListHtml + "</div></div><div class=\"card\"><h3>Selected historical context</h3><div id=\"historyDetail\"><p class=\"muted\">Select a historical region on the map.</p></div></div><div class=\"card\"><h3>Unresolved place mentions</h3><p class=\"muted\">These stay unpinned until a coordinate-bearing kit/gazetteer or manual resolution is supplied.</p><ul>" + unresolvedHtml + "</ul></div></div><textarea id=\"map-events\" hidden>" + evjson + "</textarea>";
}

export function historicalBody(payload) {
  const st = payload.status || {};
  const layers = payload.layers || [];
  const signed = payload.signed;
  const error = payload.error;
  const rows = layers.map((x) => "<tr><td>" + esc(x.name) + "<br><span class=\"muted\">" + esc(x.layer_id) + "</span></td><td>" + esc(x.valid_from || "open") + " → " + esc(x.valid_to || "open") + "</td><td>" + Number(x.feature_count || 0).toLocaleString() + "</td><td>" + Number(x.confidence || 0).toFixed(2) + "</td><td>" + esc(x.source_name || "") + "<br>" + esc(x.license || "") + "</td><td class=\"muted\">" + esc(String(x.source_sha256 || "").slice(0, 16)) + "…</td></tr>").join("") || "<tr><td colspan=\"6\">No historical boundary layers installed yet.</td></tr>";
  const err = error ? "<p class=\"bad\">" + esc(error) + "</p>" : "";
  const install = signed
    ? "<div class=\"card\"><h3>Install a historical layer</h3>" + err + "<form method=\"post\" action=\"/historical-import\" enctype=\"multipart/form-data\"><label class=\"filepick\">Layer file (.azh, .geojson, .json)<input type=\"file\" name=\"layer\" accept=\".azh,.geojson,.json\" required></label><button>Preserve + index historical layer</button></form><p class=\"muted\">Use <b>.azh</b> for a fully described Aziel Historical Geography Kit. Raw GeoJSON also works when Polygon/MultiPolygon features carry temporal fields. Stored per layer, about 1MB cap.</p></div>"
    : "<div class=\"card\"><p class=\"muted\">Anyone can view historical layers. Sign in to import a kit.</p></div>";
  return "<div class=\"card\"><h2>Historical Geographic State</h2><div class=\"grid\">" + metricCard("Status", st.state || "EMPTY") + metricCard("Layers", st.layers || 0) + metricCard("Features", st.features || 0) + metricCard("Coverage", (st.min_year || "—") + "–" + (st.max_year || "—")) + "</div><p class=\"muted\">Temporal polygons are preserved as source-specific interpretations. Overlapping or contradictory source layers coexist instead of being merged into a false single history.</p></div>" + install + "<div class=\"card\"><table class=\"plain\"><tr><th>Layer</th><th>Validity</th><th>Features</th><th>Confidence</th><th>Source / license</th><th>Source SHA-256</th></tr>" + rows + "</table></div>";
}

export function gazetteerBody(payload) {
  const st = payload.status || {};
  const q = payload.q || "";
  const results = payload.results || [];
  const signed = payload.signed;
  const error = payload.error;
  const rows = results.map((x) => "<tr><td>" + esc(x.name) + "<br><span class=\"muted\">matched: " + esc(x.matched_name || x.name) + "</span></td><td>" + esc(x.country_code || "") + "<br>" + esc(x.admin1 || "") + "</td><td>" + Number(x.lat).toFixed(5) + ", " + Number(x.lon).toFixed(5) + "</td><td>" + esc(x.feature_code || "") + "</td><td>" + Number(x.population || 0).toLocaleString() + "</td></tr>").join("");
  const err = error ? "<p class=\"bad\">" + esc(error) + "</p>" : "";
  const op = isOperator(signed);
  const reindex = op
    ? "<form method=\"post\" action=\"/gazetteer-reindex\"><button>Re-index existing corpus geography</button></form><p class=\"muted\">Operator-only. Scans titles and bodies for dates plus resolved places. Ambiguous names stay unpinned.</p>"
    : "<p class=\"muted\">Operator sign-in is required to rebuild automatic events. Lookup is public.</p>";
  return "<div class=\"card\"><h2>Aziel World Gazetteer</h2><div class=\"grid\">" + metricCard("Status", st.state || "EMPTY") + metricCard("Places", Number(st.places || 0).toLocaleString()) + metricCard("Profile", st.profile || "lite") + metricCard("Historic aliases", st.historical_aliases || 0) + "</div><p class=\"muted\">Hosted lite cities profile. Runtime lookup does not require a visitor download. Attribution: GeoNames CC BY 4.0 · <a href=\"https://www.geonames.org/\">https://www.geonames.org/</a></p>" + err + "</div><div class=\"card\"><form class=\"hero-search\" method=\"get\" action=\"/gazetteer\"><input class=\"search\" name=\"q\" value=\"" + esc(q) + "\" placeholder=\"Search place name\"><button>Search</button></form><div class=\"scroll\"><table class=\"plain\"><tr><th>Place</th><th>Region</th><th>Coordinates</th><th>Type</th><th>Population</th></tr>" + (rows || "<tr><td colspan=\"5\" class=\"muted\">Search a place name. Coordinates are never guessed; ambiguous matches are listed as candidates.</td></tr>") + "</table></div></div><div class=\"card\"><h3>Source receipts</h3><ul><li>GeoNames cities15000 lite extract — CC BY 4.0 — https://www.geonames.org/</li></ul>" + reindex + "</div>";
}

export function intelligenceBody(payload) {
  const packages = payload.packages || [];
  const aiReady = payload.aiReady;
  const lastTest = payload.lastTest;
  const pending = payload.pending;
  const signed = payload.signed;
  const operator = payload.operator;
  const error = payload.error;
  const rows = packages.map((x) => "<tr><td>" + esc(x.package_id) + "</td><td>" + esc(x.kind) + "</td><td>" + esc(x.package_type) + "</td><td>" + esc(x.version) + "</td><td class=\"muted\">" + esc(String(x.sha256 || "").slice(0, 16)) + "…</td><td>" + esc(x.status) + "</td></tr>").join("") || "<tr><td colspan=\"6\" class=\"muted\">No .azm/.azk packages installed yet.</td></tr>";
  const err = error ? "<p class=\"bad\">" + esc(error) + "</p>" : "";
  const ocrCls = aiReady ? "ok" : "bad";
  const ocrTxt = aiReady ? "HOSTED (Workers AI)" : "NOT READY — Workers AI binding or vision model missing";
  const pkgForm = signed
    ? "<form method=\"post\" action=\"/install-package\" enctype=\"multipart/form-data\"><label class=\"filepick\">Package (.azm / .azk)<input type=\"file\" name=\"package\" accept=\".azm,.azk,application/zip\" required></label><button>Install package</button></form>"
    : "<p class=\"muted\">Sign in to install a verified .azm / .azk package. Nothing is downloaded to your phone.</p>";
  const verified = !!(lastTest && lastTest.ok);
  const recovery = operator
    ? "<div class=\"card\"><h3>OCR verification + recovery</h3><div class=\"grid\"><div><b>End-to-end OCR</b><div class=\"" + (verified ? "ok" : "bad") + "\">" + (verified ? "VERIFIED" : "NOT YET VERIFIED") + "</div><p class=\"muted\">Last test: " + esc((lastTest && lastTest.created_utc) || "never") + (lastTest && lastTest.missing ? " · " + esc(lastTest.missing) : "") + "</p></div><div><b>Image records</b><div class=\"metric\">" + Number(pending || 0).toLocaleString() + "</div><p class=\"muted\">Preserved originals that can be re-read by hosted OCR.</p></div></div><div class=\"map-tools\"><form method=\"post\" action=\"/ocr-selftest\"><button>Run OCR self-test</button></form><form method=\"post\" action=\"/ocr-reprocess\"><button>Reprocess pending scans</button></form></div><p class=\"muted\">Self-test succeeds only if hosted OCR reads AZIEL and OCR from the fixture. Processors stay on this Worker — there is no Tesseract/Poppler/Whisper download.</p></div>"
    : "";
  const ocrUpload = signed
    ? "<div class=\"card\"><h3>Hosted image / PDF OCR</h3>" + err + "<form method=\"post\" action=\"/ocr\" enctype=\"multipart/form-data\"><label class=\"filepick\">Image or scanned PDF<input type=\"file\" name=\"file\" accept=\"image/*,application/pdf\" required></label><label class=\"showpw\"><input type=\"checkbox\" name=\"save\" value=\"1\"> Save extracted text into " + (operator ? "Aziel Library" : "the corpus") + "</label><button>Extract text</button></form><p class=\"muted\">Images use Workers AI when bound. PDFs try an uncompressed text scan; if empty, snap a page photo instead of installing pdftoppm.</p></div>"
    : "<div class=\"card\"><h3>Hosted image / PDF OCR</h3><p class=\"muted\">Sign in to upload an image for hosted OCR. The in-page fallback below works without an account.</p></div>";
  return "<div class=\"card\"><h2>Aziel Intelligence Runtime</h2><p>Packages are <b>.azm</b> models and <b>.azk</b> knowledge kits. Manifests and payloads are hashed. All processors below run hosted — this page never asks you to install Tesseract, Poppler, or Whisper on your computer.</p>" + pkgForm + "</div><div class=\"card\"><h3>Hosted processors</h3><div class=\"grid\"><div class=\"card\"><b>Image OCR</b><div class=\"" + ocrCls + "\">" + ocrTxt + "</div><p class=\"muted\">" + (aiReady ? "Workers AI vision model extracts visible text." : "Workers AI is not bound or the vision model failed. Use the in-page Tesseract.js fallback.") + "</p></div><div class=\"card\"><b>Scanned PDF</b><div class=\"ok\">HOSTED (text-stream scan)</div><p class=\"muted\">Uncompressed PDF strings are read here. If a scan has no text layer, photograph a page for image OCR. pdftoppm is not offered as a download.</p></div><div class=\"card\"><b>Audio / video transcription</b><div class=\"bad\">NOT HOSTED YET</div><p class=\"muted\">Whisper is not bound on this Worker. There is no installer button.</p></div></div></div>" + ocrUpload + "<div class=\"card\"><h3>In-page OCR fallback</h3><p class=\"muted\">Runs Tesseract.js from a CDN in this browser so a phone camera photo can still be read when Workers AI is not ready. Nothing is installed on your device.</p><label class=\"filepick\">Photo<input id=\"ocrFile\" type=\"file\" accept=\"image/*\" capture=\"environment\"></label><pre id=\"ocrOut\" class=\"verify muted\">Choose a photo to read here.</pre></div>" + recovery + "<div class=\"card\"><table class=\"plain\"><tr><th>ID</th><th>Kind</th><th>Type</th><th>Version</th><th>SHA-256</th><th>Status</th></tr>" + rows + "</table></div><div class=\"card\"><h3>Native engines</h3><div class=\"grid\"><div><b>AZIEL_TEXT_ENGINE</b><p class=\"muted\">HOSTED — text, CSV-ish, and conservative PDF string extraction.</p></div><div><b>AZIEL_HASH_VECTOR_V1</b><p class=\"muted\">Skipped on this Worker (local similarity vectors stay with the Python vault).</p></div><div><b>AZIEL_ENTITY_ENGINE</b><p class=\"muted\">HOSTED — gazetteer place resolution.</p></div><div><b>AZIEL_MODEL_RUNTIME</b><p class=\"muted\">HOSTED for archived .azm packages (HASHED_NAIVE_BAYES_TEXT stored and verified; neural tensors are not executed here).</p></div></div></div>";
}

export function healthBody(payload) {
  const h = payload.health || {};
  const items = [["Records", h.records], ["Aziel Library", h.aziel_library], ["Corpus", h.corpus], ["Quarantined", h.quarantined], ["Events", h.events], ["Gazetteer places", h.gazetteer_places], ["Packages", h.packages], ["Historical layers", h.historical_layers], ["Views", h.views], ["Downloads", h.downloads], ["D1", h.d1], ["FILES", h.files], ["OCR", h.ocr], ["Mode", h.mode]];
  const cards = items.map(([k, v]) => metricCard(k, v == null ? "—" : v, /missing|NOT READY/i.test(String(v)) ? "bad" : /ok|HOSTED|MASTER/i.test(String(v)) ? "ok" : "")).join("");
  return "<section class=\"hero\"><h1>Health</h1><p class=\"muted\">Live hosted MASTER dashboard. JSON lives at <a href=\"/v1/health\">/v1/health</a>.</p></section><div class=\"grid\">" + cards + "</div>";
}

export function verifyBody(payload) {
  const v = payload.report || { ok: false };
  const cls = v.ok ? "ok" : "bad";
  const title = v.ok ? "VERIFIED" : "VERIFICATION FAILED";
  const safe = { ok: !!v.ok, product: v.product, name: v.name, version: v.version, mode: v.mode, author: v.author, checks: v.checks, errors: v.errors, ledger_head: v.ledger_head, ledger_entries: v.ledger_entries, verified_utc: v.verified_utc };
  return "<div class=\"card\"><h2 class=\"" + cls + "\">" + title + "</h2><pre class=\"verify\">" + esc(JSON.stringify(safe, null, 2)) + "</pre></div>";
}
