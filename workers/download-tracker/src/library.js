import { randomBytes } from "node:crypto";

const MAX_BYTES = 25 * 1024 * 1024;
const TEXT_CAP = 200000;

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
  };
}

export function isOperator(signed) {
  if (!signed) return false;
  return signed.user_id === "master" || signed.role === "superadmin";
}

export function libraryFor(signed) {
  return isOperator(signed) ? "aziel" : "corpus";
}

export function safeFilename(name) {
  const base = String(name || "file").split("/").pop().split("\\").pop();
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, "_").replace(/^\.+/, "").slice(0, 180);
  return cleaned || "file";
}

export function asFile(value) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.arrayBuffer !== "function") return null;
  const size = Number(value.size) || 0;
  const name = String(value.name || "");
  if (size <= 0 && !name) return null;
  if (size <= 0) return null;
  return value;
}

export async function searchRecords(env, { q, library, limit } = {}) {
  if (!env || !env.DB) return [];
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const query = String(q || "").trim();
  const lib = String(library || "all").toLowerCase();
  const like = "%" + query + "%";
  let sql =
    "SELECT record_id, title, substr(body,1,280) AS snippet, created_by, created_utc, library, filename, content_type, object_key, byte_size FROM records";
  const where = [];
  const binds = [];
  if (query) {
    where.push("(title LIKE ? OR body LIKE ? OR IFNULL(filename,'') LIKE ?)");
    binds.push(like, like, like);
  }
  if (lib === "aziel" || lib === "corpus") {
    where.push("library = ?");
    binds.push(lib);
  }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY created_utc DESC LIMIT ?";
  binds.push(lim);
  return (await env.DB.prepare(sql).bind(...binds).all()).results || [];
}

function isR2(store) {
  return !!(store && typeof store.head === "function");
}

async function putObject(env, key, bytes, contentType) {
  const store = env && env.FILES;
  if (!store) {
    const err = new Error("file storage is not available");
    err.status = 503;
    throw err;
  }
  if (isR2(store)) {
    await store.put(key, bytes, { httpMetadata: { contentType } });
    return;
  }
  await store.put(key, bytes, { metadata: { contentType } });
}

async function getObject(env, key) {
  const store = env && env.FILES;
  if (!store) return null;
  if (isR2(store)) return store.get(key);
  const res = await store.getWithMetadata(key, { type: "stream" });
  if (!res || res.value == null) return null;
  return {
    body: res.value,
    httpMetadata: { contentType: (res.metadata && res.metadata.contentType) || "application/octet-stream" },
  };
}

function looksText(filename, contentType) {
  const ct = String(contentType || "").toLowerCase();
  const name = String(filename || "").toLowerCase();
  if (ct.startsWith("text/")) return true;
  if (ct.includes("json") || ct.includes("xml") || ct.includes("javascript") || ct.includes("markdown")) return true;
  return /\.(txt|md|markdown|json|csv|tsv|html|htm|xml|yml|yaml|log)$/i.test(name);
}

export async function ingestRecord(env, { signed, title, body, file }) {
  if (!signed) {
    const err = new Error("login required");
    err.status = 401;
    throw err;
  }
  const library = libraryFor(signed);
  const id = "AZDOC-" + randomBytes(6).toString("hex").toUpperCase();
  const who = isOperator(signed) ? "operator" : signed.username;
  const notes = String(body || "").trim();
  let filename = null;
  let contentType = null;
  let objectKey = null;
  let byteSize = null;
  let searchBody = notes;
  const f = asFile(file);

  if (f) {
    if (f.size > MAX_BYTES) {
      const err = new Error("file too large (25MB max)");
      err.status = 400;
      throw err;
    }
    filename = safeFilename(f.name);
    contentType = f.type || "application/octet-stream";
    byteSize = f.size;
    objectKey = `${library}/${id}/${filename}`;
    const bytes = await f.arrayBuffer();
    await putObject(env, objectKey, bytes, contentType);
    if (looksText(filename, contentType)) {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes).slice(0, TEXT_CAP);
      searchBody = [notes, text].filter(Boolean).join("\n\n");
    } else {
      searchBody = [notes, filename].filter(Boolean).join("\n");
    }
  }

  let finalTitle = String(title || "").trim();
  if (!finalTitle) finalTitle = filename || id;
  if (!finalTitle) {
    const err = new Error("title or file required");
    err.status = 400;
    throw err;
  }

  await env.DB.prepare(
    "INSERT INTO records(record_id,title,body,created_by,created_utc,library,filename,content_type,object_key,byte_size) VALUES(?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    id,
    finalTitle,
    searchBody || "",
    who,
    new Date().toISOString(),
    library,
    filename,
    contentType,
    objectKey,
    byteSize
  ).run();

  return { id, library, title: finalTitle, object_key: objectKey };
}

export async function serveFile(env, recordId) {
  const id = String(recordId || "").trim();
  if (!id || !env || !env.DB) {
    return jsonErr("not found", 404);
  }
  const row = await env.DB.prepare(
    "SELECT record_id, filename, content_type, object_key, byte_size FROM records WHERE record_id=?"
  ).bind(id).first();
  if (!row || !row.object_key) return jsonErr("not found", 404);
  if (!env.FILES) return jsonErr("files binding missing", 500);
  const obj = await getObject(env, row.object_key);
  if (!obj) return jsonErr("not found", 404);
  const ct = row.content_type || (obj.httpMetadata && obj.httpMetadata.contentType) || "application/octet-stream";
  const name = safeFilename(row.filename || "file");
  const inline = /^image\//i.test(ct) || ct === "application/pdf" || /\.(pdf|png|jpe?g|gif|webp|svg)$/i.test(name);
  const headers = new Headers();
  headers.set("Content-Type", ct);
  headers.set("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${name.replaceAll('"', "")}"`);
  headers.set("Cache-Control", "public, max-age=3600");
  if (obj.size) headers.set("Content-Length", String(obj.size));
  else if (row.byte_size) headers.set("Content-Length", String(row.byte_size));
  for (const [k, v] of Object.entries(cors())) headers.set(k, v);
  return new Response(obj.body, { status: 200, headers });
}

function jsonErr(error, status) {
  return new Response(JSON.stringify({ error }, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors() },
  });
}
