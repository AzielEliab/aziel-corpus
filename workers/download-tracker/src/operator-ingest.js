/**
 * Operator-only Aziel Library ingest (SOFTWARE-SITE-DOSSIER-1.0 and other operator docs).
 * Same ingestRecord pipeline as Jeeves / shelf. No public anonymous write hole.
 * Author: Aziel Eliab only.
 */
import { createHash } from "node:crypto";
import { isOperatorRequest } from "./rate-limit.js";
import {
  asFile,
  findLatestSameSubject,
  findRecordByHash,
  ingestRecord,
  isOperator,
  operatorSession,
} from "./library.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Aziel-Operator-Token",
    },
  });
}

function operatorWho(signed, request, env) {
  if (isOperator(signed)) return signed;
  if (isOperatorRequest(request, env, signed)) return operatorSession();
  return null;
}

async function parseIngestBody(request) {
  const ct = request.headers.get("Content-Type") || "";
  const out = {
    file: null,
    title: "",
    body: "",
    author: "",
    domain: "",
    subjects: "",
    keywords: "",
    supersedes: "",
    superseded_by: "",
  };
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    out.file = form.get("file");
    out.title = form.get("title") || "";
    out.body = form.get("body") || form.get("notes") || "";
    out.author = form.get("author") || "";
    out.domain = form.get("domain") || "";
    out.subjects = form.get("subjects") || "";
    out.keywords = form.get("keywords") || "";
    out.supersedes = form.get("supersedes") || "";
    out.superseded_by = form.get("superseded_by") || "";
    return out;
  }
  const body = await request.json();
  out.title = body.title || "";
  out.body = body.body || body.notes || "";
  out.author = body.author || "";
  out.domain = body.domain || "";
  out.subjects = body.subjects || "";
  out.keywords = body.keywords || "";
  out.supersedes = body.supersedes || "";
  out.superseded_by = body.superseded_by || "";
  if (body.markdown || body.text) {
    const md = String(body.markdown || body.text);
    const name = String(body.filename || "dossier.md");
    out.file = new File([md], name, { type: "text/markdown" });
    if (!out.body) out.body = "";
  }
  return out;
}

export async function operatorLibraryIngest(env, { signed, request, file, title, body, author, domain, subjects, keywords, supersedes, superseded_by }) {
  const who = operatorWho(signed, request, env);
  if (!who) {
    const err = new Error("operator token or operator session required");
    err.status = signed ? 403 : 401;
    throw err;
  }
  const f = asFile(file);
  if (!f && !String(title || "").trim() && !String(body || "").trim()) {
    const err = new Error("file or title + notes required");
    err.status = 400;
    throw err;
  }
  if (f) {
    const bytes = await f.arrayBuffer();
    const sha = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
    const existing = await findRecordByHash(env, sha);
    if (existing && String(existing.library || "").toLowerCase() === "aziel") {
      return {
        ok: true,
        unchanged: true,
        library: "aziel",
        record_id: existing.record_id,
        content_sha256: existing.content_sha256 || sha,
        href: "/record/" + existing.record_id,
        download: "/file/" + existing.record_id,
      };
    }
    file = new File([bytes], f.name || "dossier.md", { type: f.type || "text/markdown" });
  }
  let pred = String(supersedes || "").trim();
  if (!pred && subjects) {
    const row = await findLatestSameSubject(env, { subject: subjects, library: "aziel" });
    if (row && row.record_id) pred = row.record_id;
  }
  const record = await ingestRecord(env, {
    signed: who,
    title,
    body,
    file,
    author: author || "Aziel Eliab",
    domain,
    subjects,
    keywords,
    supersedes: pred,
    superseded_by,
  });
  if (record.library !== "aziel") {
    const err = new Error("operator ingest must write Aziel Library");
    err.status = 500;
    throw err;
  }
  const triad = record.review && record.review.triad
    ? { combined: record.review.triad.combined, display: record.review.triad.display, ready: record.review.triad.ready }
    : null;
  return {
    ok: true,
    unchanged: false,
    library: "aziel",
    record_id: record.id,
    title: record.title,
    content_sha256: record.content_sha256 || null,
    supersedes: pred || null,
    succession: record.succession || null,
    quarantine_status: record.quarantine_status,
    triad,
    href: "/record/" + record.id,
    download: "/file/" + record.id,
  };
}

export async function handleOperatorIngestApi(request, url, env, signed) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (path !== "/v1/operator/library-ingest") return null;
  if (request.method === "OPTIONS") return json({ ok: true }, 200);
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  let fields;
  try {
    fields = await parseIngestBody(request);
  } catch {
    return json({ error: "multipart or JSON body required" }, 400);
  }
  try {
    return json(await operatorLibraryIngest(env, { signed, request, ...fields }));
  } catch (err) {
    return json({ error: err && err.message ? err.message : "ingest failed" }, err && err.status ? err.status : 400);
  }
}
