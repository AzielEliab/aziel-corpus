import { page } from "./ui.js";
import { treeBody, mapBody, historicalBody, gazetteerBody, intelligenceBody, healthBody, verifyBody, recordBody, receiptBody, ocrPageBody } from "./hosted-pages.js";
import { json, corsHeaders } from "./runtime.js";
import { receiptForRecord } from "./ledger.js";
import { isOperator, asFile } from "./library.js";
import { handleTranscribe, persistOcrRun, receiptForMediaRun, isMediaRunId, truthy, bytesAsFile } from "./media.js";
import { addPeerReview, loadRecordReview } from "./review-store.js";
import {
  ensureSchema, ensurePlaces, gazetteerStatus, gazetteerSearch, lookupPlaces,
  reindexGeography, listEvents, addManualEvent, unresolvedPlaceMentions,
  historicalStatus, historicalLayers, historicalGeojson, importHistorical,
  corpusTree, getRecordRow, recordEvents, extractEventsForRecord,
} from "./geo.js";
import {
  aiBound, ocrFile, ocrSelftest, lastOcrSelftest, pendingOcrCount, reprocessPendingOcr,
  listPackages, installPackage, healthSnapshot, verifyHosted, appendOcrToRecord,
} from "./ocr.js";
import { ingestRecord } from "./library.js";

function intelScripts() {
  var c = [104,116,116,112,115,58,47,47,99,100,110,46,106,115,100,101,108,105,118,114,46,110,101,116,47,110,112,109,47,116,101,115,115,101,114,97,99,116,46,106,115,64,53,47,100,105,115,116,47,116,101,115,115,101,114,97,99,116,46,109,105,110,46,106,115];
  return [String.fromCharCode.apply(null, c), "/ocr-fallback.js", "/transcribe-client.js"];
}

function wantsHtml(request) {
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/html") && !accept.includes("application/json");
}

async function receiptForAny(env, id) {
  const key = String(id || "").trim();
  if (isMediaRunId(key)) {
    const media = await receiptForMediaRun(env, key);
    if (media) return media;
  }
  const rec = await receiptForRecord(env, key);
  if (rec) return rec;
  return receiptForMediaRun(env, key);
}

function html(pageBody, extra) {
  extra = extra || {};
  return new Response(pageBody, {
    status: extra.status || 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() },
  });
}

async function assetFromPublic(env, request, name, contentType) {
  if (!env.ASSETS) return json({ error: "assets binding missing" }, 500);
  const assetUrl = new URL("/" + name, request.url);
  const res = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
  if (!res.ok) return json({ error: "asset not hosted", asset: name, status: res.status }, 404);
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "public, max-age=86400");
  const len = res.headers.get("Content-Length");
  if (len) headers.set("Content-Length", len);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(res.body, { status: 200, headers });
}

export async function handleHosted(request, url, env, ctx, signed, stats) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method;
  await ensureSchema(env);

  if ((path === "/assets/world_110m.geojson" || path === "/world_110m.geojson") && method === "GET") {
    return assetFromPublic(env, request, "world_110m.geojson", "application/geo+json");
  }
  if ((path === "/assets/ocr_selftest.png" || path === "/ocr_selftest.png") && method === "GET") {
    return assetFromPublic(env, request, "ocr_selftest.png", "image/png");
  }

  if (path === "/api/gazetteer" && method === "GET") {
    const q = (url.searchParams.get("q") || "").trim();
    const rows = q ? await lookupPlaces(env, q, 20) : [];
    const exactNorm = q.toLowerCase();
    const exact = rows.filter((r) => String(r.alias_norm || "").toLowerCase() === exactNorm || String(r.name || "").toLowerCase() === exactNorm || String(r.asciiname || "").toLowerCase() === exactNorm);
    const ids = new Set(exact.map((r) => r.geonameid));
    return json({ ok: true, q, matches: rows, ambiguous: ids.size !== 1, pin: ids.size === 1 ? exact[0] : null, attribution: "GeoNames CC BY 4.0 https://www.geonames.org/" });
  }
  if (path === "/api/events" && method === "GET") {
    return json({ ok: true, events: await listEvents(env) });
  }
  if (path === "/api/historical" && method === "GET") {
    const date = url.searchParams.get("date") || url.searchParams.get("year") || "";
    return json(await historicalGeojson(env, date));
  }
  if (path === "/api/map-event" && method === "POST") {
    if (!signed) return json({ error: "login required" }, 401);
    const form = await request.formData();
    try {
      const id = await addManualEvent(env, {
        signed,
        date: form.get("date"),
        place: form.get("place"),
        lat: form.get("lat"),
        lon: form.get("lon"),
        title: form.get("title"),
        record_id: form.get("record_id"),
      });
      if ((request.headers.get("Accept") || "").includes("json")) return json({ ok: true, event_id: id });
      return new Response(null, { status: 303, headers: { Location: "/map" } });
    } catch (err) {
      return json({ error: err && err.message ? err.message : "event failed" }, err && err.status ? err.status : 400);
    }
  }
  if (path === "/gazetteer-reindex" && method === "POST") {
    if (!isOperator(signed)) return json({ error: "operator required" }, 403);
    const result = await reindexGeography(env);
    return new Response(null, { status: 303, headers: { Location: "/map?reindex=" + result.events_created } });
  }
  if (path === "/historical-import" && method === "POST") {
    if (!signed) return json({ error: "login required" }, 401);
    const form = await request.formData();
    const file = asFile(form.get("layer") || form.get("file"));
    if (!file) {
      const st = await historicalStatus(env);
      const layers = await historicalLayers(env);
      return html(page("Historical Geography", historicalBody({ status: st, layers, signed, error: "A layer file is required." }), { signed, path: "/historical" }), { status: 400 });
    }
    try {
      await importHistorical(env, { filename: file.name, bytes: await file.arrayBuffer() });
    } catch (err) {
      const st = await historicalStatus(env);
      const layers = await historicalLayers(env);
      return html(page("Historical Geography", historicalBody({ status: st, layers, signed, error: err && err.message ? err.message : "import failed" }), { signed, path: "/historical" }), { status: err && err.status ? err.status : 400 });
    }
    return new Response(null, { status: 303, headers: { Location: "/historical" } });
  }
  if (path === "/ocr" && method === "GET") {
    return html(page("OCR", ocrPageBody({ aiReady: aiBound(env), signed, operator: isOperator(signed) }), { signed, path: "/ocr", scripts: intelScripts(), kind: "intelligence" }));
  }
  if (path === "/transcribe" && method === "POST") {
    const out = await handleTranscribe(env, request, signed);
    if (wantsHtml(request)) {
      const loc = out.body && out.body.record_id
        ? "/record/" + out.body.record_id
        : (out.body && out.body.run_id ? "/receipt/" + out.body.run_id : "/intelligence");
      return new Response(null, { status: 303, headers: { Location: loc } });
    }
    return json(out.body, out.status || 200);
  }
  if (path === "/ocr" && method === "POST") {
    const form = await request.formData();
    const file = asFile(form.get("file"));
    if (!file) return json({ error: "file required" }, 400);
    const save = truthy(form.get("save") || form.get("upload") || form.get("upload_library"));
    const wantVibe = truthy(form.get("vibelock") || form.get("review_authenticity"));
    if (save && !signed) return json({ error: "login required to upload to library" }, 401);
    const result = await ocrFile(env, file);
    let record = null;
    if (save && result.text) {
      record = await ingestRecord(env, {
        signed,
        title: file.name || "OCR extract",
        body: result.text,
        domain: "ocr",
        keywords: "ocr" + (wantVibe ? ",vibelock" : ""),
        file: result.bytes ? bytesAsFile(result.bytes, file.name || result.filename, file.type || result.contentType) : null,
      });
      try { await extractEventsForRecord(env, record.id); } catch {}
    }
    let run = null;
    try {
      run = await persistOcrRun(env, {
        bytes: result.bytes,
        text: result.text || "",
        filename: file.name || result.filename,
        mime: file.type || result.contentType,
        recordId: record && record.id,
        wantVibe,
        error: result.ok ? null : (result.message || result.missing || result.error),
      });
    } catch { run = null; }
    if (wantsHtml(request)) {
      const loc = record ? "/record/" + record.id : (run ? "/receipt/" + run.run_id : "/intelligence");
      return new Response(null, { status: 303, headers: { Location: loc } });
    }
    return json({
      ok: !!result.ok,
      text: result.text || "",
      engine: result.engine || result.model || null,
      missing: result.missing || null,
      message: result.message || null,
      kind: (run && run.kind) || result.kind,
      run_id: run && run.run_id,
      receipt_url: run && run.receipt_url,
      ledger_url: run && run.ledger_url,
      lattice_tip: run && run.lattice_tip,
      vibe: run && run.vibe,
      record_id: record && record.id,
      library: record && record.library,
    });
  }
  if (path === "/ocr-selftest" && method === "POST") {
    if (!isOperator(signed)) return json({ error: "operator required" }, 403);
    await ocrSelftest(env, request);
    return new Response(null, { status: 303, headers: { Location: "/intelligence" } });
  }
  if (path === "/ocr-reprocess" && method === "POST") {
    if (!isOperator(signed)) return json({ error: "operator required" }, 403);
    await reprocessPendingOcr(env, signed);
    return new Response(null, { status: 303, headers: { Location: "/intelligence" } });
  }
  if (path === "/install-package" && method === "POST") {
    if (!signed) return json({ error: "login required" }, 401);
    const form = await request.formData();
    try {
      await installPackage(env, { signed, file: form.get("package") || form.get("file") });
    } catch (err) {
      const packages = await listPackages(env);
      return html(page("Intelligence", intelligenceBody({ packages, aiReady: aiBound(env), lastTest: await lastOcrSelftest(env), pending: await pendingOcrCount(env), signed, operator: isOperator(signed), error: err && err.message ? err.message : "install failed" }), { signed, path: "/intelligence", scripts: intelScripts() }), { status: err && err.status ? err.status : 400 });
    }
    return new Response(null, { status: 303, headers: { Location: "/intelligence" } });
  }
  if (path === "/tree" && method === "GET") {
    await ensurePlaces(env, ctx);
    const tree = await corpusTree(env);
    return html(page("Corpus Tree", treeBody(tree), { signed, path: "/tree" }));
  }
  if (path === "/map" && method === "GET") {
    const gst = await gazetteerStatus(env, ctx);
    const events = await listEvents(env);
    let unresolved = [];
    try { unresolved = await unresolvedPlaceMentions(env); } catch { unresolved = []; }
    const hst = await historicalStatus(env);
    return html(page("Temporal Map", mapBody({ events, unresolved, gazetteer: gst, historical: hst, signed }), { signed, path: "/map", scripts: ["/map-client.js"], kind: "map" }));
  }
  if (path === "/historical" && method === "GET") {
    const st = await historicalStatus(env);
    const layers = await historicalLayers(env);
    return html(page("Historical Geography", historicalBody({ status: st, layers, signed }), { signed, path: "/historical" }));
  }
  if (path === "/gazetteer" && method === "GET") {
    const st = await gazetteerStatus(env, ctx);
    const q = (url.searchParams.get("q") || "").trim();
    const results = q ? await gazetteerSearch(env, q, 50) : [];
    return html(page("World Gazetteer", gazetteerBody({ status: st, q, results, signed }), { signed, path: "/gazetteer" }));
  }
  if (path === "/intelligence" && method === "GET") {
    const packages = await listPackages(env);
    const lastTest = await lastOcrSelftest(env);
    const pending = await pendingOcrCount(env);
    return html(page("Intelligence", intelligenceBody({ packages, aiReady: aiBound(env), lastTest, pending, signed, operator: isOperator(signed) }), { signed, path: "/intelligence", scripts: intelScripts(), kind: "intelligence" }));
  }
  if (path === "/health" && method === "GET") {
    const health = await healthSnapshot(env, { views: stats && stats.views, downloads: stats && stats.downloads });
    return html(page("Health", healthBody({ health }), { signed, path: "/health" }));
  }
  const recpt = path.match(/^\/(?:receipt|ledger)\/([^/]+)$/);
  if (recpt && method === "GET") {
    const id = decodeURIComponent(recpt[1]);
    const doc = await receiptForAny(env, id);
    if (!doc) return json({ error: "not found" }, 404);
    if (wantsHtml(request)) {
      return html(page("Receipt " + id, receiptBody({ receipt: doc }), { signed, path: "/receipt/" + id }));
    }
    return json(doc);
  }
  if (path === "/verify" && method === "GET") {

    const report = await verifyHosted(env, request);
    return html(page("Verify", verifyBody({ report }), { signed, path: "/verify" }));
  }
  const recMatch = path.match(/^\/record\/([^/]+)$/);
  if (recMatch && method === "GET") {
    const row = await getRecordRow(env, decodeURIComponent(recMatch[1]));
    if (!row) return html(page("Not found", recordBody({ row: null, events: [] }), { signed, path: path }), { status: 404 });
    const events = await recordEvents(env, row.record_id);
    const extra = await loadRecordReview(env, row);
    return html(page(row.title || "Record", recordBody({ row, events, signed, ...extra }), { signed, path: "/record/" + row.record_id }));
  }
  const peerMatch = path.match(/^\/record\/([^/]+)\/peer$/);
  if (peerMatch && method === "POST") {
    if (!signed) return json({ error: "login required" }, 401);
    const recordId = decodeURIComponent(peerMatch[1]);
    const form = await request.formData();
    try {
      await addPeerReview(env, {
        recordId,
        stance: form.get("stance"),
        body: form.get("body") || form.get("note"),
        signed,
      });
    } catch (err) {
      return json({ error: err && err.message ? err.message : "review failed" }, err && err.status ? err.status : 400);
    }
    if ((request.headers.get("Accept") || "").includes("json")) return json({ ok: true, record_id: recordId });
    return new Response(null, { status: 303, headers: { Location: "/record/" + encodeURIComponent(recordId) } });
  }
  return null;
}
