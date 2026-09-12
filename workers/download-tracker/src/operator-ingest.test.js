import test from "node:test";
import assert from "node:assert/strict";
import { handleOperatorIngestApi, operatorLibraryIngest } from "./operator-ingest.js";
import { handleRuntimeApi } from "./runtime.js";
import { isFanoutPath } from "./rate-limit.js";
import { operatorSession } from "./library.js";

const HOST = "https://www.azielcorpuslibrary.net";
const TOKEN = "test-operator-token";

function stmtFactory(store) {
  return {
    sql: "",
    binds: [],
    bind(...args) {
      this.binds = args;
      return this;
    },
    async run() {
      if (/INSERT INTO records/i.test(this.sql)) {
        store.records.push({
          record_id: this.binds[0],
          title: this.binds[1],
          library: this.binds[5],
          subjects: this.binds[12],
          content_sha256: this.binds[14],
          object_key: this.binds[8],
        });
      }
      return { success: true };
    },
    async first() {
      if (/content_sha256/i.test(this.sql) && /SELECT/i.test(this.sql)) {
        const want = String(this.binds[0] || "").toLowerCase();
        return store.records.find((r) => String(r.content_sha256 || "").toLowerCase() === want) || null;
      }
      return null;
    },
    async all() {
      return { results: store.records.slice() };
    },
  };
}

function stubEnv(extra = {}) {
  const store = { records: extra.records ? extra.records.slice() : [] };
  const files = new Map();
  return {
    OPERATOR_TOKEN: TOKEN,
    DB: {
      prepare(sql) {
        const s = stmtFactory(store);
        s.sql = sql;
        return s;
      },
      async batch() { return []; },
    },
    FILES: {
      async head(key) { return files.has(key) ? { key } : null; },
      async put(key, bytes) { files.set(key, bytes); },
      async get(key) { return files.has(key) ? { arrayBuffer: async () => files.get(key) } : null; },
    },
    store,
    files,
    ...extra,
  };
}

test("POST /v1/operator/library-ingest is a fanout path and rejects anonymous writes", async () => {
  assert.equal(isFanoutPath("/v1/operator/library-ingest", "POST"), true);
  const url = new URL(HOST + "/v1/operator/library-ingest");
  const res = await handleOperatorIngestApi(
    new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "x", body: "y" }) }),
    url,
    stubEnv({ OPERATOR_TOKEN: "" }),
    null
  );
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.match(body.error, /operator/i);
});

test("wrong operator token cannot write Aziel Library", async () => {
  const url = new URL(HOST + "/v1/operator/library-ingest");
  const res = await handleOperatorIngestApi(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Aziel-Operator-Token": "nope" },
      body: JSON.stringify({ title: "x", markdown: "# hi", filename: "x.md", subjects: "foldlock aziel dossier" }),
    }),
    url,
    stubEnv(),
    { user_id: "public", role: "user", username: "reader" }
  );
  assert.equal(res.status, 403);
});

test("same SHA on aziel shelf is unchanged (idempotent)", async () => {
  const md = "# FoldLock — Aziel dossier\n\nApache-2.0\n";
  const { createHash } = await import("node:crypto");
  const sha = createHash("sha256").update(md, "utf8").digest("hex");
  const env = stubEnv({
    records: [{ record_id: "AZDOC-OLD", library: "aziel", content_sha256: sha, subjects: "foldlock aziel dossier" }],
  });
  const out = await operatorLibraryIngest(env, {
    signed: operatorSession(),
    request: new Request(HOST + "/v1/operator/library-ingest", { method: "POST" }),
    file: new File([md], "foldlock-aziel-dossier-1.0.md", { type: "text/markdown" }),
    title: "FoldLock — Aziel dossier",
    subjects: "foldlock aziel dossier",
    domain: "software, research",
    author: "Aziel Eliab",
  });
  assert.equal(out.ok, true);
  assert.equal(out.unchanged, true);
  assert.equal(out.library, "aziel");
  assert.equal(out.record_id, "AZDOC-OLD");
});

test("operator token ingest writes aziel and OpenAPI lists the route", async () => {
  const url = new URL(HOST + "/v1/operator/library-ingest");
  const env = stubEnv();
  const md = [
    "---",
    "library: aziel",
    "subjects: 4dmap aziel dossier",
    "license: Apache-2.0",
    "---",
    "# 4DMap — Aziel dossier",
    "",
    "**Author:** Aziel Eliab",
    "## License",
    "Apache-2.0. Forks welcome.",
    "## Identity",
    "4DMap",
    "## Purpose",
    "Inspect.",
    "## Concept",
    "T/Δ/Γ/Π",
    "## Use cases",
    "- frame",
    "## Coding / architecture notes",
    "FragGate only.",
    "## Surfaces",
    "- Worker",
    "## Related ecosystem links",
    "- Person",
  ].join("\n");
  const form = new FormData();
  form.set("file", new File([md], "4dmap-aziel-dossier-1.0.md", { type: "text/markdown" }));
  form.set("title", "4DMap — Aziel dossier");
  form.set("author", "Aziel Eliab");
  form.set("domain", "software, research");
  form.set("subjects", "4dmap aziel dossier");
  form.set("keywords", "aziel-dossier-1.0, Apache-2.0, zion:not_applicable");
  const res = await handleOperatorIngestApi(
    new Request(url, { method: "POST", headers: { "X-Aziel-Operator-Token": TOKEN }, body: form }),
    url,
    env,
    null
  );
  assert.equal(res.status, 200, await res.clone().text());
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.library, "aziel");
  assert.ok(body.record_id);
  assert.match(body.record_id, /^AZDOC-/);
  assert.equal(env.store.records.length, 1);
  assert.equal(env.store.records[0].library, "aziel");
  assert.equal(env.store.records[0].subjects, "4dmap aziel dossier");

  const open = await handleRuntimeApi(new Request(HOST + "/openapi.json"), new URL(HOST + "/openapi.json"), stubEnv());
  const spec = await open.json();
  assert.ok(spec.paths["/v1/operator/library-ingest"]);
});
