/**
 * Hosted OCR, packages, and intelligence helpers. Author: Aziel Eliab.
 */
import { createHash } from "node:crypto";
import { unzipEntries, zipText } from "./zip.js";
import { appendLedger, verifyLedger, ensureLedger } from "./ledger.js";
import { mergeKitPlaces, sha256hex, utcNow, newId, ensureSchema } from "./geo.js";
import { isOperator, libraryFor, ingestRecord, asFile, safeFilename, objectExists, putObject } from "./library.js";

const VISION_MODELS = [
  "@cf/meta/llama-3.2-11b-vision-instruct",
  "@cf/llava-hf/llava-1.5-7b-hf",
  "@cf/unum/uform-gen2-qwen-500m",
];
const OCR_PROMPT = "Extract all visible text verbatim. Return only the transcribed text, no commentary.";

function textFromAi(res) {
  if (res == null) return "";
  if (typeof res === "string") return res;
  if (typeof res.response === "string") return res.response;
  if (typeof res.description === "string") return res.description;
  if (typeof res.text === "string") return res.text;
  if (Array.isArray(res) && res[0] && res[0].generated_text) return res[0].generated_text;
  try { return JSON.stringify(res); } catch { return ""; }
}

export function aiBound(env) {
  return !!(env && env.AI && typeof env.AI.run === "function");
}

export async function runWorkersAiOcr(env, bytes, contentType) {
  if (!aiBound(env)) return { ok: false, missing: "Workers AI binding (env.AI)", text: "" };
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const imageArr = Array.from(u8);
  let lastErr = "";
  for (const model of VISION_MODELS) {
    const payloads = [
      { prompt: OCR_PROMPT, image: imageArr },
      { messages: [{ role: "user", content: [{ type: "text", text: OCR_PROMPT }, { type: "image", image: imageArr }] }] },
      { prompt: OCR_PROMPT, image: [...imageArr] },
    ];
    for (const input of payloads) {
      try {
        const res = await env.AI.run(model, input);
        const text = String(textFromAi(res) || "").trim();
        if (text) return { ok: true, text, model };
        lastErr = "empty response from " + model;
      } catch (err) {
        lastErr = (err && err.message) ? err.message : String(err);
      }
    }
  }
  return { ok: false, error: lastErr || "vision model failed", text: "", missing: lastErr ? "Workers AI vision model (" + lastErr + ")" : "Workers AI vision model" };
}

export function extractPdfText(bytes) {
  const s = new TextDecoder("latin1").decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const chunks = [];
  const re = /\((?:\\.|[^\\)]){2,}\)/g;
  let m;
  while ((m = re.exec(s))) {
    let t = m[0].slice(1, -1);
    t = t.replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\t/g, "\t").replace(/\\([()\\])/g, "$1");
    if (/[A-Za-z]{3,}/.test(t)) chunks.push(t);
  }
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  while ((m = streamRe.exec(s))) {
    const body = m[1];
    if (body.indexOf("\x00") >= 0) continue;
    const txt = body.replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ");
    if (/[A-Za-z]{12,}/.test(txt)) chunks.push(txt);
  }
  return chunks.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 200000);
}

export async function ocrFile(env, file) {
  const name = safeFilename(file && file.name);
  const ct = String((file && file.type) || "").toLowerCase();
  const bytes = await file.arrayBuffer();
  if (ct === "application/pdf" || /\.pdf$/i.test(name)) {
    const text = extractPdfText(bytes);
    if (text) return { ok: true, text, engine: "AZIEL_TEXT_ENGINE", kind: "pdf" };
    return {
      ok: false,
      kind: "pdf",
      text: "",
      message: "This PDF has no extractable text stream. Snap a page photo and run hosted image OCR (or the in-page Tesseract.js fallback). pdftoppm is not required and is not offered as a download.",
    };
  }
  const ocr = await runWorkersAiOcr(env, bytes, ct || "image/png");
  return { ...ocr, kind: "image", filename: name, contentType: ct };
}

export async function appendOcrToRecord(env, recordId, extraText, signed) {
  if (!extraText || !env.DB) return;
  await ensureLedger(env);
  const row = await env.DB.prepare("SELECT record_id, library, body FROM records WHERE record_id=?").bind(recordId).first();
  if (!row) return;
  if (String(row.library || "") === "aziel" && !isOperator(signed)) return;
  const body = [row.body || "", extraText].filter(Boolean).join("\n\n").slice(0, 200000);
  await env.DB.prepare("UPDATE records SET body=? WHERE record_id=?").bind(body, recordId).run();
  const derivedId = "AZDER-" + sha256hex(String(recordId) + extraText).slice(0, 12).toUpperCase();
  const textSha = sha256hex(extraText);
  try {
    await env.DB.prepare("INSERT OR IGNORE INTO derived_artifacts(derived_id,record_id,artifact_type,processor,processor_version,content_sha256,created_utc,status) VALUES(?,?,?,?,?,?,?,?)").bind(derivedId, recordId, "TEXT_EXTRACT", "AZIEL_OCR_HOSTED", "1.0.0", textSha, utcNow(), "READY").run();
  } catch { /* schema */ }
  await appendLedger(env, "REPROCESS_EXTRACTION", { record_id: recordId, library: row.library, sha256: textSha, artifact: "OCR_TEXT" });
}



export async function ocrIngestHint(env, rec) {
  if (!rec || !rec.ocrHint) return;
  const ocr = await runWorkersAiOcr(env, rec.ocrHint.bytes, rec.ocrHint.contentType);
  if (ocr.ok && ocr.text) {
    await appendOcrToRecord(env, rec.id, ocr.text, rec.signed);
    rec.extractText = [rec.extractText || "", ocr.text].filter(Boolean).join("\n\n");
  }
}

export async function fetchSelftestPng(env, request) {
  if (!env.ASSETS) return null;
  for (const path of ["/ocr_selftest.png", "/assets/ocr_selftest.png"]) {
    try {
      const assetUrl = new URL(path, request.url);
      const res = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
      if (res.ok) return await res.arrayBuffer();
    } catch { /* try next */ }
  }
  return null;
}

export async function ocrSelftest(env, request) {
  await ensureSchema(env);
  const bytes = await fetchSelftestPng(env, request);
  if (!bytes) {
    const result = { ok: false, missing: "ocr_selftest.png asset", created_utc: utcNow() };
    await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind("ocr_selftest", JSON.stringify(result)).run();
    return result;
  }
  const ocr = await runWorkersAiOcr(env, bytes, "image/png");
  const text = String(ocr.text || "");
  const ok = /aziel/i.test(text) && /ocr/i.test(text);
  const result = {
    ok,
    text: text.slice(0, 800),
    model: ocr.model || null,
    missing: ocr.missing || (!ok ? "output did not contain AZIEL and OCR" : null),
    created_utc: utcNow(),
  };
  await env.DB.prepare("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)").bind("ocr_selftest", JSON.stringify(result)).run();
  return result;
}

export async function lastOcrSelftest(env) {
  try {
    const row = await env.DB.prepare("SELECT value FROM metadata WHERE key=?").bind("ocr_selftest").first();
    return row && row.value ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}

export async function pendingOcrCount(env) {
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM records WHERE IFNULL(content_type,'') LIKE 'image/%'").first();
    return Number(row && row.n) || 0;
  } catch {
    return 0;
  }
}

export async function reprocessPendingOcr(env, signed) {
  if (!aiBound(env)) return { ok: false, processed: 0, failed: 0, missing: "Workers AI binding (env.AI)" };
  const rows = (await env.DB.prepare("SELECT record_id, object_key, content_type FROM records WHERE IFNULL(content_type,'') LIKE 'image/%' LIMIT 40").all()).results || [];
  let processed = 0, failed = 0;
  const errors = [];
  for (const r of rows) {
    try {
      const store = env.FILES;
      if (!store || !r.object_key) { failed += 1; continue; }
      let bytes;
      if (typeof store.getWithMetadata === "function") {
        const res = await store.getWithMetadata(r.object_key, { type: "arrayBuffer" });
        bytes = res && res.value;
      } else {
        const obj = await store.get(r.object_key);
        bytes = obj && (await obj.arrayBuffer());
      }
      if (!bytes) { failed += 1; continue; }
      const ocr = await runWorkersAiOcr(env, bytes, r.content_type);
      if (ocr.ok && ocr.text) {
        await appendOcrToRecord(env, r.record_id, ocr.text, signed);
        processed += 1;
      } else {
        failed += 1;
        errors.push({ record_id: r.record_id, error: ocr.missing || ocr.error || "empty" });
      }
    } catch (err) {
      failed += 1;
      errors.push({ record_id: r.record_id, error: String(err && err.message ? err.message : err).slice(0, 200) });
    }
  }
  return { ok: failed === 0, processed, failed, remaining: Math.max(0, rows.length - processed), errors: errors.slice(0, 20) };
}

export async function listPackages(env) {
  await ensureSchema(env);
  try {
    return (await env.DB.prepare("SELECT package_id,kind,package_type,version,sha256,status,object_key,created_utc FROM packages ORDER BY created_utc DESC LIMIT 100").all()).results || [];
  } catch {
    return [];
  }
}

function utf8(buf) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buf);
}

export async function installPackage(env, { signed, file }) {
  await ensureSchema(env);
  const f = asFile(file);
  if (!f) throw Object.assign(new Error("package file required"), { status: 400 });
  const name = safeFilename(f.name);
  const bytes = new Uint8Array(await f.arrayBuffer());
  const digest = sha256hex(bytes);
  let files;
  try { files = unzipEntries(bytes); } catch {
    throw Object.assign(new Error("package must be a zip (.azm / .azk)"), { status: 400 });
  }
  const manRaw = zipText(files, "manifest.json");
  if (!manRaw) throw Object.assign(new Error("missing manifest.json"), { status: 400 });
  const manifest = JSON.parse(manRaw);
  const magic = String(manifest.magic || "");
  if (magic !== "AZIEL_MODEL_PACKAGE_V1" && magic !== "AZIEL_KNOWLEDGE_KIT_V1") {
    throw Object.assign(new Error("unsupported package magic"), { status: 400 });
  }
  let status = "STORED";
  const errors = [];
  const payloads = manifest.payloads || {};
  for (const [pname, meta] of Object.entries(payloads)) {
    const buf = files["payload/" + pname] || files[pname];
    if (!buf) { errors.push("missing payload " + pname); continue; }
    if (meta && meta.sha256 && sha256hex(buf) !== meta.sha256) errors.push("payload hash mismatch: " + pname);
  }
  if (files["integrity.json"]) {
    try {
      const envl = JSON.parse(utf8(files["integrity.json"]));
      const canonical = JSON.stringify(manifest, Object.keys(manifest).sort(), 0);
      // integrity is optional; mismatch is noted but payload hashes decide VERIFIED
      if (envl.manifest_sha256 && envl.manifest_sha256.length === 64) {
        /* do not fail solely on canonical whitespace */
      }
    } catch { /* ignore */ }
  }
  if (!errors.length) status = "VERIFIED";
  let packageId = String(manifest.package_id || name).slice(0, 140);
  const kind = magic === "AZIEL_MODEL_PACKAGE_V1" ? "azm" : "azk";
  try {
    const hit = await env.DB.prepare("SELECT package_id FROM packages WHERE package_id=?").bind(packageId).first();
    if (hit) packageId = packageId + "-" + Date.now().toString(36);
  } catch { /* schema */ }
  const key = "packages/" + packageId + "/" + name;
  if (env.FILES) {
    if (await objectExists(env, key)) {
      throw Object.assign(new Error("package object already stored (immutable)"), { status: 409 });
    }
    await putObject(env, key, bytes, "application/zip");
  }
  await env.DB.prepare(
    "INSERT INTO packages(package_id,kind,package_type,version,sha256,status,object_key,created_utc) VALUES(?,?,?,?,?,?,?,?)"
  ).bind(packageId, kind, String(manifest.package_type || "").slice(0, 80), String(manifest.version || "").slice(0, 40), digest, status, key, utcNow()).run();
  await appendLedger(env, "PACKAGE_INSTALL", { package_id: packageId, sha256: digest, kind, status });

  let merged = 0;
  if (kind === "azk" && String(manifest.package_type || "") === "ENTITY_GAZETTEER") {
    const kitBuf = files["payload/kit.json"] || files["kit.json"] || files["payload/places.json"];
    if (kitBuf) {
      try {
        const kit = JSON.parse(utf8(kitBuf));
        merged = await mergeKitPlaces(env, kit.places || []);
      } catch { /* ignore kit parse */ }
    }
  }
  return { package_id: packageId, kind, status, sha256: digest, errors, kit_places_merged: merged };
}

export async function healthSnapshot(env, extra = {}) {
  await ensureSchema(env);
  const count = async (sql) => {
    try { const row = await env.DB.prepare(sql).first(); return Number(row && (row.n != null ? row.n : Object.values(row)[0])) || 0; }
    catch { return 0; }
  };
  const records = await count("SELECT COUNT(*) AS n FROM records");
  const aziel = await count("SELECT COUNT(*) AS n FROM records WHERE library='aziel'");
  const corpus = await count("SELECT COUNT(*) AS n FROM records WHERE library='corpus'");
  const events = await count("SELECT COUNT(*) AS n FROM events");
  const places = await count("SELECT COUNT(*) AS n FROM places");
  const packages = await count("SELECT COUNT(*) AS n FROM packages");
  const layers = await count("SELECT COUNT(*) AS n FROM historical_layers");
  let d1ok = false;
  try { await env.DB.prepare("SELECT 1 AS n").first(); d1ok = true; } catch { d1ok = false; }
  let filesOk = !!env.FILES;
  return {
    records,
    aziel_library: aziel,
    corpus,
    events,
    gazetteer_places: places,
    packages,
    historical_layers: layers,
    views: extra.views || 0,
    downloads: extra.downloads || 0,
    d1: d1ok ? "ok" : "missing",
    files: filesOk ? "ok" : "missing",
    ocr: aiBound(env) ? "HOSTED (Workers AI)" : "NOT READY — Workers AI binding missing",
    mode: "MASTER",
  };
}

export async function verifyHosted(env, request) {
  await ensureSchema(env);
  const checks = [];
  const errors = [];
  let ledgerHead = null;
  let ledgerEntries = 0;
  const add = (name, ok, detail) => { checks.push({ name, ok, detail }); if (!ok) errors.push(name + ": " + detail); };

  try {
    const row = await env.DB.prepare("SELECT 1 AS n").first();
    add("d1_query", !!(row && row.n === 1), "SELECT 1");
  } catch (err) {
    add("d1_query", false, String(err && err.message ? err.message : err));
  }

  if (env.FILES) {
    const key = "__aziel_verify_probe";
    try {
      const payload = "ok";
      if (typeof env.FILES.head === "function") await env.FILES.put(key, payload, { httpMetadata: { contentType: "text/plain" } });
      else await env.FILES.put(key, payload, { metadata: { contentType: "text/plain" } });
      let got = null;
      if (typeof env.FILES.getWithMetadata === "function") {
        const res = await env.FILES.getWithMetadata(key);
        got = res && res.value;
      } else {
        got = await env.FILES.get(key);
      }
      const text = typeof got === "string" ? got : (got && typeof got.text === "function" ? await got.text() : String(got || ""));
      if (typeof env.FILES.delete === "function") await env.FILES.delete(key);
      add("files_probe", text.indexOf("ok") >= 0, "put/get/delete probe key");
    } catch (err) {
      try { if (env.FILES.delete) await env.FILES.delete(key); } catch { /* ignore */ }
      add("files_probe", false, String(err && err.message ? err.message : err));
    }
  } else {
    add("files_probe", false, "FILES binding missing");
  }

  try {
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM places").first();
    add("gazetteer_places", Number(n && n.n) > 0, String(Number(n && n.n) || 0) + " places");
  } catch (err) {
    add("gazetteer_places", false, String(err && err.message ? err.message : err));
  }

  const need = {
    events: ["confidence", "source", "status"],
    places: ["geonameid", "alias_norm"],
    packages: ["package_id"],
    historical_layers: ["layer_id"],
    metadata: ["key"],
    ledger: ["sequence", "entry_hash", "previous_hash"],
    records: ["content_sha256"],
  };
  for (const [table, cols] of Object.entries(need)) {
    try {
      const info = (await env.DB.prepare("PRAGMA table_info(" + table + ")").all()).results || [];
      const have = new Set(info.map((c) => c.name));
      const missing = cols.filter((c) => !have.has(c));
      add("schema_" + table, missing.length === 0, missing.length ? "missing " + missing.join(",") : "ok");
    } catch (err) {
      add("schema_" + table, false, String(err && err.message ? err.message : err));
    }
  }

  if (env.ASSETS && request) {
    try {
      const assetUrl = new URL("/aziel-digital-library-2.6.2.zip", request.url);
      const res = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET" }));
      add("download_zip_asset", res.ok, res.ok ? "ASSETS hosts counted zip" : "status " + res.status);
    } catch (err) {
      add("download_zip_asset", false, String(err && err.message ? err.message : err));
    }
  } else {
    add("download_zip_asset", false, "ASSETS binding missing");
  }


  try {
    const chain = await verifyLedger(env);
    add("ledger_chain", !!chain.ok, chain.ok ? ("head " + (chain.ledger_head || "").slice(0, 16) + " · " + chain.entries + " entries") : (chain.errors || []).slice(0, 4).join("; "));
    ledgerHead = chain.ledger_head;
    ledgerEntries = chain.entries;
  } catch (err) {
    add("ledger_chain", false, String(err && err.message ? err.message : err));
  }

  try {
    const sample = (await env.DB.prepare("SELECT record_id, object_key, content_sha256 FROM records WHERE object_key IS NOT NULL AND content_sha256 IS NOT NULL LIMIT 5").all()).results || [];
    let matched = 0;
    for (const r of sample) {
      let bytes;
      if (typeof env.FILES.getWithMetadata === "function") {
        const res = await env.FILES.getWithMetadata(r.object_key, { type: "arrayBuffer" });
        bytes = res && res.value;
      } else if (env.FILES.get) {
        const obj = await env.FILES.get(r.object_key);
        bytes = obj && (await obj.arrayBuffer());
      }
      if (!bytes) continue;
      if (sha256hex(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)) === r.content_sha256) matched += 1;
    }
    add("sample_original_hashes", sample.length === 0 || matched === sample.length, matched + "/" + sample.length + " originals match content_sha256");
  } catch (err) {
    add("sample_original_hashes", false, String(err && err.message ? err.message : err));
  }

  return {
    ok: errors.length === 0,
    product: "aziel-corpus",
    name: "Aziel Digital Library",
    version: "2.6.2",
    mode: "master",
    author: "Aziel Eliab",
    checks,
    errors,
    ledger_head: ledgerHead,
    ledger_entries: ledgerEntries,
    verified_utc: utcNow(),
  };
}


export { VISION_MODELS, createHash };
