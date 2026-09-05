import { page, patternBody, softwareBody, aboutBody, howItsScoredBody } from "./ui.js";
import { recordDescription, ABOUT_PATH, ABOUT_NAV_LABEL, aboutRedirectFrom } from "./seo.js";
import { treeBody, mapBody, historicalBody, gazetteerBody, intelligenceBody, healthBody, verifyBody, recordBody, receiptBody, ocrPageBody, blockedAvBody } from "./hosted-pages.js";
import { json, corsHeaders } from "./runtime.js";
import { receiptForRecord, sha256hex } from "./ledger.js";
import { isOperator, asFile, getObject, putObject, objectExists, ingestRecord, safeFilename, serveDerived, patternClusters } from "./library.js";
import {
  persistOcrRun, persistMediaRun, receiptForMediaRun, isMediaRunId, truthy, bytesAsFile,
  libraryNotes, publicRunPayload, linkRunToRecord, MEDIA_MAX_BYTES, guessMediaMime,
  isAudioOrVideo, isVideoMedia,
} from "./media.js";
import {
  whisperBound, transcribeFile, vibeDetermination, safetyScanText, safetyFromVibe,
  combineSafety, blockedPublicPayload, LATTICE_AV_BLOCKED, LATTICE_TRANSCRIPT_VIBELOCK, AV_BLOCK_STATUS,
} from "./transcript.js";
import { addPeerReview, loadRecordReview } from "./review-store.js";
import {
  ensureSchema, ensurePlaces, gazetteerStatus, gazetteerSearch, lookupPlaces,
  reindexGeography, listEvents, addManualEvent, unresolvedPlaceMentions,
  historicalStatus, historicalLayers, historicalGeojson, importHistorical,
  corpusTree, getRecordRow, recordEvents, extractEventsForRecord,
} from "./geo.js";
import {
  aiBound, ocrFile, ocrSelftest, lastOcrSelftest, pendingOcrCount, reprocessPendingOcr,
  listPackages, installPackage, healthSnapshot, verifyHosted,
  recordOcrTextArtifact, recordSpectralOverlayArtifact, listDerivedArtifacts,
} from "./ocr.js";
import { normalizeLenses } from "./spectral.js";
import { RUNTIME_VERSION, RUNTIME_CHIP, RUNTIME_NOTE } from "./runtime-copy.js";

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
  const headers = { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() };
  const status = extra.status || 200;
  if (extra.head) return new Response(null, { status, headers });
  return new Response(pageBody, { status, headers });
}

async function serveAvMedia(env, sha) {
  const hex = String(sha || "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) return json({ error: "not found" }, 404);
  const obj = await getObject(env, "av/" + hex);
  if (!obj) return json({ error: "not found" }, 404);
  const headers = new Headers();
  const ct = (obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream";
  headers.set("Content-Type", ct);
  headers.set("Content-Disposition", "inline");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(obj.body, { status: 200, headers });
}

function formHasFields(form) {
  if (!form) return false;
  try {
    const first = form.keys().next();
    return first && first.done === false;
  } catch {
    return true;
  }
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
  const head = method === "HEAD";
  const read = method === "GET" || head;
  const pageHtml = (pageBody, extra) => html(pageBody, Object.assign({}, extra, { head }));
  await ensureSchema(env);

  if ((path === "/assets/world_110m.geojson" || path === "/world_110m.geojson") && read) {
    return assetFromPublic(env, request, "world_110m.geojson", "application/geo+json");
  }
  if ((path === "/assets/ocr_selftest.png" || path === "/ocr_selftest.png") && read) {
    return assetFromPublic(env, request, "ocr_selftest.png", "image/png");
  }
  if ((path === "/sigil.png" || path === "/assets/sigil.png") && read) {
    return assetFromPublic(env, request, "sigil.png", "image/png");
  }
  if ((path === "/jeeves-kat-williams.gif" || path === "/assets/jeeves-kat-williams.gif") && read) {
    return assetFromPublic(env, request, "jeeves-kat-williams.gif", "image/gif");
  }
  const spectralSample = path.match(/^\/(?:assets\/)?spectral-samples\/([a-z0-9-]+)\.png$/);
  if (spectralSample && read) {
    return assetFromPublic(env, request, "spectral-samples/" + spectralSample[1] + ".png", "image/png");
  }
  const avMatch = path.match(/^\/media\/([0-9a-fA-F]{64})$/);
  if (avMatch && read) {
    return serveAvMedia(env, avMatch[1]);
  }

  if (path === "/api/gazetteer" && read) {
    const q = (url.searchParams.get("q") || "").trim();
    const rows = q ? await lookupPlaces(env, q, 20) : [];
    const exactNorm = q.toLowerCase();
    const exact = rows.filter((r) => String(r.alias_norm || "").toLowerCase() === exactNorm || String(r.name || "").toLowerCase() === exactNorm || String(r.asciiname || "").toLowerCase() === exactNorm);
    const ids = new Set(exact.map((r) => r.geonameid));
    return json({ ok: true, q, matches: rows, ambiguous: ids.size !== 1, pin: ids.size === 1 ? exact[0] : null, attribution: "GeoNames CC BY 4.0 https://www.geonames.org/" });
  }
  if (path === "/api/events" && read) {
    return json({ ok: true, events: await listEvents(env) });
  }
  if (path === "/api/historical" && read) {
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
      return pageHtml(page("Historical Geography", historicalBody({ status: st, layers, signed, error: "A layer file is required." }), { signed, path: "/historical" }), { status: 400 });
    }
    try {
      await importHistorical(env, { filename: file.name, bytes: await file.arrayBuffer() });
    } catch (err) {
      const st = await historicalStatus(env);
      const layers = await historicalLayers(env);
      return pageHtml(page("Historical Geography", historicalBody({ status: st, layers, signed, error: err && err.message ? err.message : "import failed" }), { signed, path: "/historical" }), { status: err && err.status ? err.status : 400 });
    }
    return new Response(null, { status: 303, headers: { Location: "/historical" } });
  }
  if (path === "/ocr" && read) {
    return pageHtml(page("OCR", ocrPageBody({ aiReady: aiBound(env), signed, operator: isOperator(signed) }), { signed, path: "/ocr", scripts: intelScripts(), kind: "ocr" }));
  }
  if (path === "/transcribe" && method === "POST") {
    let form;
    try { form = await request.formData(); } catch {
      return json({ error: "multipart form required" }, 400);
    }
    if (!formHasFields(form)) return json({ error: "empty form" }, 400);
    if (!whisperBound(env)) return json({ error: "Workers AI not bound — Whisper is not available on this Worker." }, 503);
    const file = asFile(form.get("file") || form.get("media") || form.get("audio") || form.get("video"));
    if (!file) return json({ error: "audio or video file required" }, 400);
    if (file.size > MEDIA_MAX_BYTES) return json({ error: "file too large for hosted Whisper", max_bytes: MEDIA_MAX_BYTES }, 413);
    const name = safeFilename(file.name);
    const mime = guessMediaMime(name, file.type);
    if (!isAudioOrVideo(mime, name)) {
      return json({ error: "unsupported type — send audio/* or video/* (wav, mp3, flac, ogg, m4a, webm, mp4)", accept: "audio/*,video/*" }, 415);
    }
    const raw = await file.arrayBuffer();
    const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
    const sha = sha256hex(bytes);
    const whisper = await transcribeFile(env, bytes, mime, name);
    const vibe = await vibeDetermination(bytes, mime, name);
    const safety = combineSafety(
      safetyScanText([whisper.text || "", name].join("\n"), { filename: name, mime }),
      safetyFromVibe(vibe)
    );
    const wantUpload = truthy(form.get("upload") || form.get("upload_library") || form.get("save"));
    let mediaUrl = null;
    let storageError = null;
    if (!safety.blocked) {
      try {
        const key = "av/" + sha;
        if (!(await objectExists(env, key))) {
          await putObject(env, key, bytes, mime || "application/octet-stream");
        }
        mediaUrl = "/media/" + sha;
      } catch (err) {
        if (err && err.status === 409) mediaUrl = "/media/" + sha;
        else storageError = err && err.message ? err.message : String(err);
      }
    }
    const run = await persistMediaRun(env, {
      kind: "transcript+vibelock",
      action: safety.blocked ? LATTICE_AV_BLOCKED : LATTICE_TRANSCRIPT_VIBELOCK,
      filename: name,
      mime,
      bytes,
      text: safety.blocked ? "" : (whisper.text || ""),
      vibe: { ...vibe, safety, determination: "mandatory" },
      blocked: safety.blocked,
      stored: !safety.blocked && !!mediaUrl,
      error: safety.blocked ? "AV_BLOCKED" : (whisper.ok ? null : (whisper.error || whisper.missing)),
    });
    if (safety.blocked) {
      const blocked = blockedPublicPayload({
        reasons: safety.reasons,
        policy: safety.policy,
        run_id: run.run_id,
        receipt_url: run.receipt_url,
        ledger_url: run.ledger_url,
        vibe,
      });
      if (wantsHtml(request)) {
        return pageHtml(page("Blocked", blockedAvBody({ blocked }), { signed, path: "/transcribe" }), { status: AV_BLOCK_STATUS });
      }
      return json(blocked, AV_BLOCK_STATUS);
    }
    let ingest = null;
    let ingest_error = null;
    if (wantUpload) {
      if (!signed) {
        ingest_error = "Sign in to upload to the library. Signed-in non-operators write Corpus (Lamb Lens). Operator writes Aziel Library. Anonymous visitors cannot write.";
      } else if (!whisper.text) {
        ingest_error = "No transcript text to store. Library upload skipped.";
      } else {
        try {
          ingest = await ingestRecord(env, {
            signed,
            title: name || "Transcript",
            body: libraryNotes(whisper.text, run, vibe),
            domain: "transcript",
            keywords: "transcript,whisper,vibelock",
            file: bytesAsFile(bytes, name, mime),
          });
          await linkRunToRecord(env, run.run_id, ingest.id, LATTICE_TRANSCRIPT_VIBELOCK, {
            content_sha256: run.content_sha256,
            transcript_sha256: run.transcript_sha256,
          });
          run.record_id = ingest.id;
        } catch (err) {
          ingest_error = err && err.message ? err.message : String(err);
        }
      }
    }
    const body = publicRunPayload(run, {
      ok: whisper.ok,
      whisper: { model: whisper.model || null, video: !!whisper.video },
      vibe,
      ingest,
      ingest_error,
      message: whisper.message || storageError || null,
    });
    body.blocked = false;
    body.playable = !!mediaUrl;
    body.media_url = mediaUrl;
    body.media_sha256 = sha;
    body.ledger_action = LATTICE_TRANSCRIPT_VIBELOCK;
    body.vibe_determination = "mandatory";
    body.player = isVideoMedia(mime, name) ? "video" : "audio";
    if (wantsHtml(request)) {
      const loc = ingest ? "/record/" + ingest.id : "/receipt/" + run.run_id;
      return new Response(null, { status: 303, headers: { Location: loc } });
    }
    return json(body, whisper.ok ? 200 : 422);
  }
  if (path === "/ocr" && method === "POST") {
    const form = await request.formData();
    const file = asFile(form.get("file"));
    const lenses = normalizeLenses(form.getAll("lens"));
    const saveWanted = truthy(form.get("save") || form.get("upload") || form.get("upload_library"));
    const operator = isOperator(signed);
    const ocrPayload = { aiReady: aiBound(env), signed, operator };
    if (!file) {
      if (wantsHtml(request)) {
        return pageHtml(page("OCR", ocrPageBody({ ...ocrPayload, error: "A file is required." }), { signed, path: "/ocr", scripts: intelScripts(), kind: "ocr" }), { status: 400 });
      }
      return json({ error: "file required" }, 400);
    }
    if (saveWanted && !signed && !wantsHtml(request)) {
      return json({ error: "login required to upload to library" }, 401);
    }
    const result = await ocrFile(env, file, { lenses });
    let record = null;
    if (saveWanted && signed && result.text) {
      const original = result.originalBytes || result.bytes;
      const upload = original
        ? bytesAsFile(original, file.name || result.filename || "ocr-scan.png", file.type || result.contentType)
        : file;
      try {
        record = await ingestRecord(env, {
          signed,
          title: file.name || "OCR extract",
          body: result.text,
          domain: "ocr",
          subjects: lenses.join(", "),
          keywords: lenses.length ? "ocr, spectral" : "ocr",
          file: upload,
          skipOcrHint: true,
        });
      } catch {
        record = await ingestRecord(env, {
          signed,
          title: file.name || "OCR extract",
          body: result.text,
          domain: "ocr",
          subjects: lenses.join(", "),
          keywords: lenses.length ? "ocr, spectral" : "ocr",
          file: null,
          skipOcrHint: true,
        });
      }
      try { await recordOcrTextArtifact(env, record.id, result.text, { lenses }); } catch { /* derived */ }
      if (result.enhancedBytes) {
        try { await recordSpectralOverlayArtifact(env, record.id, result.enhancedBytes, { lenses, plan: result.overlay && result.overlay.plan }); } catch { /* overlay */ }
      }
      try { await extractEventsForRecord(env, record.id); } catch { /* events */ }
    }
    let run = null;
    try {
      run = await persistOcrRun(env, {
        bytes: result.originalBytes || result.bytes,
        text: result.text || "",
        filename: file.name || result.filename,
        mime: file.type || result.contentType,
        recordId: record && record.id,
        error: result.ok ? null : (result.message || result.missing || result.error),
      });
    } catch { run = null; }
    const saveNote = saveWanted && !signed ? "Sign in to save extracted text into the library." : null;
    if (wantsHtml(request)) {
      if (record) return new Response(null, { status: 303, headers: { Location: "/record/" + record.id } });
      return pageHtml(page("OCR", ocrPageBody({
        ...ocrPayload,
        error: saveNote,
        result: { ...result, record_id: null, lenses, run_id: run && run.run_id, receipt_url: run && run.receipt_url },
      }), { signed, path: "/ocr", scripts: intelScripts(), kind: "ocr" }));
    }
    const triad = record && record.review && record.review.triad
      ? { combined: record.review.triad.combined, display: record.review.triad.display, ready: record.review.triad.ready }
      : null;
    return json({
      ok: !!result.ok,
      text: result.text || "",
      engine: result.engine || result.model || null,
      missing: result.missing || null,
      message: result.message || saveNote || null,
      kind: (run && run.kind) || result.kind,
      run_id: run && run.run_id,
      receipt_url: run && run.receipt_url,
      ledger_url: run && run.ledger_url,
      lattice_tip: run && run.lattice_tip,
      lenses,
      overlay: result.overlay ? { ok: !!result.overlay.ok, plan: result.overlay.plan, advisory: result.overlay.advisory, note: result.overlay.note } : null,
      record_id: record && record.id,
      library: record && record.library,
      triad,
      content_sha256: record && record.content_sha256,
      download: record ? "/file/" + record.id : null,
      download_hash: record && record.content_sha256 ? "/download?hash=" + record.content_sha256 : null,
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
      return pageHtml(page("Intelligence", intelligenceBody({ packages, aiReady: aiBound(env), lastTest: await lastOcrSelftest(env), pending: await pendingOcrCount(env), signed, operator: isOperator(signed), error: err && err.message ? err.message : "install failed" }), { signed, path: "/intelligence", scripts: intelScripts() }), { status: err && err.status ? err.status : 400 });
    }
    return new Response(null, { status: 303, headers: { Location: "/intelligence" } });
  }
  if (path === "/tree" && read) {
    await ensurePlaces(env, ctx);
    const tree = await corpusTree(env);
    return pageHtml(page("Corpus Tree", treeBody(tree), { signed, path: "/tree", kind: "tree" }));
  }
  if (path === "/map" && read) {
    const gst = await gazetteerStatus(env, ctx);
    const events = await listEvents(env);
    let unresolved = [];
    try { unresolved = await unresolvedPlaceMentions(env); } catch { unresolved = []; }
    const hst = await historicalStatus(env);
    return pageHtml(page("Temporal Map", mapBody({ events, unresolved, gazetteer: gst, historical: hst, signed }), { signed, path: "/map", scripts: ["/map-client.js"], kind: "map" }));
  }
  if (path === "/historical" && read) {
    const st = await historicalStatus(env);
    const layers = await historicalLayers(env);
    return pageHtml(page("Historical Geography", historicalBody({ status: st, layers, signed }), { signed, path: "/historical", kind: "historical" }));
  }
  if (path === "/gazetteer" && read) {
    const st = await gazetteerStatus(env, ctx);
    const q = (url.searchParams.get("q") || "").trim();
    const results = q ? await gazetteerSearch(env, q, 50) : [];
    return pageHtml(page("World Gazetteer", gazetteerBody({ status: st, q, results, signed }), { signed, path: "/gazetteer", kind: "gazetteer" }));
  }
  if (path === "/intelligence" && read) {
    const packages = await listPackages(env);
    const lastTest = await lastOcrSelftest(env);
    const pending = await pendingOcrCount(env);
    return pageHtml(page("Intelligence", intelligenceBody({ packages, aiReady: aiBound(env), lastTest, pending, signed, operator: isOperator(signed) }), { signed, path: "/intelligence", scripts: intelScripts(), kind: "intelligence" }));
  }
  if (path === "/health" && read) {
    const health = await healthSnapshot(env, { views: stats && stats.views, downloads: stats && stats.downloads });
    return pageHtml(page("Health", healthBody({ health }), { signed, path: "/health", kind: "health" }));
  }
  const recpt = path.match(/^\/(?:receipt|ledger)\/([^/]+)$/);
  if (recpt && read) {
    const id = decodeURIComponent(recpt[1]);
    const doc = await receiptForAny(env, id);
    if (!doc) return json({ error: "not found" }, 404);
    if (wantsHtml(request)) {
      return pageHtml(page("Receipt " + id, receiptBody({ receipt: doc }), { signed, path: "/receipt/" + id }));
    }
    return json(doc);
  }
  if (path === "/verify" && read) {

    const report = await verifyHosted(env, request);
    return pageHtml(page("Verify", verifyBody({ report }), { signed, path: "/verify", kind: "verify" }));
  }
  const recMatch = path.match(/^\/record\/([^/]+)$/);
  if (recMatch && read) {
    const row = await getRecordRow(env, decodeURIComponent(recMatch[1]));
    if (!row) return pageHtml(page("Not found", recordBody({ row: null, events: [] }), { signed, path: path, kind: "record" }), { status: 404 });
    const events = await recordEvents(env, row.record_id);
    const extra = await loadRecordReview(env, row);
    let derived = [];
    try { derived = await listDerivedArtifacts(env, row.record_id); } catch { derived = []; }
    return pageHtml(page(row.title || "Record", recordBody({ row, events, signed, derived, ...extra }), {
      signed,
      path: "/record/" + row.record_id,
      kind: "record",
      description: recordDescription(row),
      work: {
        title: row.title,
        author: row.author,
        library: row.library,
        record_id: row.record_id,
        datePublished: row.created_utc,
      },
    }));
  }
  const derMatch = path.match(/^\/derived\/([^/]+)$/);
  if (derMatch && read) {
    return serveDerived(env, decodeURIComponent(derMatch[1]));
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
  if (path === "/pattern" && read) {
    const clusters = await patternClusters(env);
    return pageHtml(page("Pattern", patternBody(clusters), { signed, path: "/pattern", kind: "pattern" }));
  }
  if (path === "/software" && read) {
    const catalog = await loadSoftwareCatalog();
    return pageHtml(page("Software", softwareBody(catalog), { signed, path: "/software", kind: "software" }));
  }
  if (path === "/how-its-scored" && read) {
    return pageHtml(page("How it's scored", howItsScoredBody(), { signed, path: "/how-its-scored", kind: "scored" }));
  }
  if (read) {
    const aboutDest = aboutRedirectFrom(path);
    if (aboutDest) {
      return new Response(null, { status: 308, headers: { Location: aboutDest + (url.search || ""), ...corsHeaders() } });
    }
  }
  if (path === ABOUT_PATH && read) {
    return pageHtml(page(ABOUT_NAV_LABEL, aboutBody(), { signed, path: ABOUT_PATH, kind: "about" }));
  }
  return null;
}

const CATALOG_URL = "https://aziel-runtime.vibelock.workers.dev/v1/catalog.json";
const FEATURED = new Set(["azieltether", "foldlock"]);

async function fetchCount(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 AzielDigitalLibrary" } });
    if (!res.ok) return null;
    const j = await res.json();
    const n = j && (j.downloads != null ? j.downloads : j.total != null ? j.total : j.count);
    const num = Number(n);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

async function loadSoftwareCatalog() {
  let products = [];
  try {
    const res = await fetch(CATALOG_URL, { headers: { "User-Agent": "Mozilla/5.0 AzielDigitalLibrary" } });
    if (res.ok) {
      const j = await res.json();
      products = Array.isArray(j.products) ? j.products : [];
    }
  } catch {
    products = [];
  }
  const counts = await Promise.all(products.map((p) => fetchCount(p.count)));
  let fetched = 0;
  const cards = [];
  cards.push({
    name: "aziel-runtime",
    version: RUNTIME_VERSION,
    root: true,
    countLabel: (counts.filter((n) => n != null).reduce((a, b) => a + b, 0) || null) != null
      ? String(counts.filter((n) => n != null).reduce((a, b) => a + b, 0)) + " downloads"
      : null,
    blurb: RUNTIME_NOTE + " Software tab stays the download catalog. Author Aziel Eliab.",
    links: [
      { href: "/runtime", label: RUNTIME_CHIP, primary: true },
      { href: "/runtime/v1/fraggate/list", label: "fraggate/list" },
      { href: "/runtime/mcp", label: "MCP" },
      { href: "/runtime/openapi.json", label: "OpenAPI" },
      { href: "/runtime/v1/runtime.json", label: "runtime.json" },
      { href: "https://github.com/AzielEliab/aziel-runtime", label: "GitHub" },
      { href: "https://aziel-runtime.vibelock.workers.dev/", label: "Alternate origin" },
    ],
  });
  const ordered = [...products].sort((a, b) => {
    const fa = FEATURED.has(String(a.slug || "").toLowerCase()) ? 0 : 1;
    const fb = FEATURED.has(String(b.slug || "").toLowerCase()) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    if (String(a.slug).toLowerCase() === "azieltether") return -1;
    if (String(b.slug).toLowerCase() === "azieltether") return 1;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  ordered.forEach((p, i) => {
    const slug = String(p.slug || "").toLowerCase();
    const n = counts[products.indexOf(p)];
    if (n != null) fetched += 1;
    const countLabel = n != null ? String(n) + " downloads" : (p.count ? "downloads live on Worker" : "");
    const workerHome = p.download ? String(p.download).replace(/\/download\/?$/, "/") : "";
    const links = [];
    if (p.download) links.push({ href: p.download, label: "Download", primary: true });
    if (p.github) links.push({ href: p.github, label: "GitHub" });
    if (slug) links.push({ href: "/runtime/v1/pull/" + encodeURIComponent(slug), label: "Runtime pull" });
    if (slug === "azieltether") {
      links.push({ href: "/v1/lattice", label: "Lattice API" });
      if (workerHome) links.push({ href: workerHome, label: "Worker" });
      links.push({ href: "https://aziel-runtime.vibelock.workers.dev/p/azieltether", label: "Catalog card" });
    }
    cards.push({
      name: p.name || p.slug,
      version: p.version || "",
      featured: FEATURED.has(slug),
      countLabel,
      blurb: p.one_line || p.banner || "",
      links,
    });
  });
  return { products: cards, fetched, downloadable: products.length };
}
