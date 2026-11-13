import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "./index.js";
import { citeDoc, llmsDoc } from "./crawl.js";
import { handleLatticeBidir } from "./lattice-bidir.js";
import { listFiledReceipts } from "./receipt-aggregate.js";
import { isFanoutPath } from "./rate-limit.js";
import { handleRuntimeApi } from "./runtime.js";
import {
  FURNACE_SCHEMA,
  GENERIC_SCHEMA,
  PORT_SITES,
  handleReceiptPort,
  publicReceipt,
  receiptHash,
  resetPortRate,
  tokenEquals,
  ZERO_HASH,
} from "./receipt-port.js";

const HOST = "https://www.azielcorpuslibrary.net";
const FURNACE_TOKEN = "furnace-port-token-test";
const GODLOCK_TOKEN = "godlock-port-token-test";
const UNSEAL_TOKEN = "unseal-port-token-test";
const OPERATOR = "operator-port-token-test";
const COMMENT = "private-furnace-comment-do-not-leak";
const USERNAME = "private-user-do-not-leak";

function memoryKv() {
  const map = new Map();
  return {
    puts: 0,
    async get(key) { return map.has(key) ? map.get(key) : null; },
    async put(key, value) { this.puts += 1; map.set(key, String(value)); },
  };
}

function memoryDb() {
  const rows = [];
  const sqlLog = [];
  return {
    rows,
    sqlLog,
    prepare(sql) {
      sqlLog.push(sql);
      const stmt = {
        binds: [],
        bind(...args) {
          stmt.binds = args;
          return stmt;
        },
        async run() {
          if (/INTO\s+(ledger|records|document_ledger)\b/i.test(sql)) {
            throw new Error("library write " + sql);
          }
          if (/CREATE /i.test(sql)) return { success: true };
          if (/INSERT INTO lattice_secondary/i.test(sql)) {
            const [entry_hash, document_hash, plane, target, offline, secondary_hash, position, lattice_json, created_utc, submitter_key] = stmt.binds;
            if (rows.some((row) => row.entry_hash === entry_hash)) {
              throw new Error("UNIQUE constraint failed: lattice_secondary.entry_hash");
            }
            rows.push({
              entry_hash,
              document_hash,
              plane,
              target,
              offline,
              secondary_hash,
              position,
              lattice_json,
              created_utc,
              submitter_key,
            });
            return { success: true };
          }
          if (/ALTER /i.test(sql)) throw new Error("column exists");
          throw new Error("unexpected run " + sql);
        },
        async first() {
          if (/lattice-pull/.test(sql)) return rows.find((row) => row.entry_hash === stmt.binds[0]) || null;
          if (/lattice-double/.test(sql)) return null;
          return null;
        },
        async all() {
          return { results: [] };
        },
      };
      return stmt;
    },
  };
}

function envWith(extra = {}) {
  return {
    DOWNLOADS: memoryKv(),
    PORT_TOKEN_FURNACE: FURNACE_TOKEN,
    PORT_TOKEN_GODLOCK: GODLOCK_TOKEN,
    PORT_TOKEN_UNSEAL: UNSEAL_TOKEN,
    ...extra,
  };
}

function furnaceBody(extra = {}) {
  return {
    schema: FURNACE_SCHEMA,
    ingest_as_receipt: {
      id: "tfi_0123456789abcdef0123456789abcdef",
      canonical_url: "https://furnaceisntfree.com/the-numbers/",
      content_sha256: "ab".repeat(32),
      created_at: "2026-10-31T00:00:00.000Z",
    },
    kind: "tool-usefulness",
    tool: "free-meaning",
    useful: true,
    comment: COMMENT,
    snapshot: { note: "kept private" },
    image: { present: false },
    publish_consent: false,
    source: "https://furnaceisntfree.com",
    username: USERNAME,
    ...extra,
  };
}

function genericBody(site, extra = {}) {
  return {
    site,
    schema: GENERIC_SCHEMA,
    id: site + "_example_1",
    created_at: "2026-11-13T00:00:00.000Z",
    content_sha256: "cd".repeat(32),
    kind: "page-receipt",
    body: { comment: COMMENT, username: USERNAME },
    comment: COMMENT,
    username: USERNAME,
    ...extra,
  };
}

function postPort(env, body, token, headers = {}) {
  const url = HOST + "/v1/port/receipts";
  const init = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "the-furnace-isnt-free/1.0",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
  if (token) init.headers.authorization = "Bearer " + token;
  return handleReceiptPort(new Request(url, init), env);
}

test("token compare rejects empty, mismatch, and unequal length", () => {
  assert.equal(tokenEquals("", "secret"), false);
  assert.equal(tokenEquals("secret", ""), false);
  assert.equal(tokenEquals("secret", "secre"), false);
  assert.equal(tokenEquals("secret", "secret"), true);
  assert.equal(tokenEquals("secret", "Secret"), false);
});

test("auth rejects missing, bad, and wrong-site tokens and does not store or echo them", async () => {
  resetPortRate();
  const env = envWith();
  const missing = await postPort(env, furnaceBody(), "");
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).code, "PORT-AUTH");
  const bad = await postPort(env, furnaceBody(), "not-the-token");
  assert.equal(bad.status, 401);
  const badBody = await bad.text();
  assert.equal(JSON.parse(badBody).code, "PORT-AUTH");
  assert.doesNotMatch(badBody, /not-the-token|furnace-port-token/);
  const wrong = await postPort(env, furnaceBody(), GODLOCK_TOKEN);
  assert.equal(wrong.status, 401);
  assert.equal(env.DOWNLOADS.puts, 0);
  const unknown = await postPort(env, genericBody("nope"), GODLOCK_TOKEN);
  assert.equal(unknown.status, 401);
});

test("furnace payload is accepted as sent and the public row hides comment and username", async () => {
  resetPortRate();
  const db = memoryDb();
  const env = envWith({ DB: db, LATTICE_REMOTE: "1" });
  const payload = furnaceBody();
  const res = await postPort(env, payload, FURNACE_TOKEN);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.site, "furnace");
  assert.equal(body.id, payload.ingest_as_receipt.id);
  assert.equal(body.stored_at.length > 10, true);
  assert.equal(body.live, false);
  assert.equal(body.cap7_is_icann, false);
  assert.equal(body.paid_sat, "HELD");
  assert.equal(body.mesh_tracking, false);
  assert.equal(body.library_document, false);
  assert.equal(body.lattice.wrapped, true);
  assert.equal(body.lattice.offline, false);
  assert.equal(body.lattice.chain, "primary");
  const expected = receiptHash({
    site: "furnace",
    id: payload.ingest_as_receipt.id,
    schema: FURNACE_SCHEMA,
    kind: "tool-usefulness",
    content_sha256: payload.ingest_as_receipt.content_sha256,
    created_at: payload.ingest_as_receipt.created_at,
    previous_hash: ZERO_HASH,
  });
  assert.equal(body.receipt_hash, expected);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(COMMENT + "|" + USERNAME));
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].plane, "sites");
  assert.equal(Number(db.rows[0].offline), 0);
  assert.doesNotMatch(db.rows[0].lattice_json, new RegExp(COMMENT + "|" + USERNAME));
  assert.equal(db.sqlLog.some((sql) => /INTO\s+(ledger|records|document_ledger)\b/i.test(sql)), false);

  const filed = await listFiledReceipts(env, "furnace");
  assert.equal(filed.ok, true);
  assert.equal(filed.receipts.length, 1);
  assert.equal(filed.receipts[0].entry_hash, body.receipt_hash);
  assert.equal(filed.receipts[0].comment, undefined);

  const pullUrl = new URL(HOST + "/v1/lattice/pull?entry_hash=" + body.receipt_hash);
  const pulled = await handleLatticeBidir(new Request(pullUrl), pullUrl, env);
  assert.equal(pulled.status, 200);
  assert.equal(pulled.body.lattice.username, undefined);
  assert.equal(pulled.body.lattice.aggregate.site, "furnace");
  assert.doesNotMatch(JSON.stringify(pulled.body), new RegExp(COMMENT + "|" + USERNAME));

  const pub = await handleReceiptPort(
    new Request(HOST + "/v1/port/receipts?site=furnace&id=" + payload.ingest_as_receipt.id),
    env,
  );
  const shown = await pub.json();
  assert.equal(pub.status, 200);
  assert.equal(shown.receipt_hash, body.receipt_hash);
  assert.equal(shown.comment, undefined);
  assert.equal(shown.username, undefined);
  assert.equal(shown.snapshot, undefined);
  assert.equal(publicReceipt({ ...shown, sealed: { comment: COMMENT } }).comment, undefined);
});

test("the same furnace id is idempotent and a changed hash is refused", async () => {
  resetPortRate();
  const db = memoryDb();
  const env = envWith({ DB: db });
  const first = await postPort(env, furnaceBody(), FURNACE_TOKEN);
  const stored = await first.json();
  assert.equal(first.status, 201);
  const again = await postPort(env, furnaceBody(), FURNACE_TOKEN);
  assert.equal(again.status, 200);
  const duplicate = await again.json();
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.receipt_hash, stored.receipt_hash);
  assert.equal(duplicate.stored_at, stored.stored_at);
  assert.equal(db.rows.length, 1);
  const changed = furnaceBody();
  changed.ingest_as_receipt = { ...changed.ingest_as_receipt, content_sha256: "ef".repeat(32) };
  const clash = await postPort(env, changed, FURNACE_TOKEN);
  assert.equal(clash.status, 409);
  assert.equal((await clash.json()).code, "PORT-REWRITE");
  assert.equal(db.rows.length, 1);
});

test("JSON over 64KB is refused and image bytes are refused", async () => {
  resetPortRate();
  const env = envWith();
  const huge = furnaceBody({ comment: "x".repeat(70 * 1024) });
  const sized = await postPort(env, huge, FURNACE_TOKEN);
  assert.equal(sized.status, 413);
  assert.equal((await sized.json()).code, "PORT-TOO-LARGE");
  assert.equal(env.DOWNLOADS.puts, 0);
  const imaged = furnaceBody({
    image: { present: true, sha256: "ab".repeat(32), bytes: 12000, jpeg_base64: "aGVsbG8=" },
  });
  const refused = await postPort(env, imaged, FURNACE_TOKEN);
  assert.equal(refused.status, 422);
  assert.equal((await refused.json()).code, "PORT-IMAGE-HASH-ONLY");
  assert.equal(env.DOWNLOADS.puts, 0);
  const hashed = furnaceBody({
    ingest_as_receipt: {
      id: "tfi_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      canonical_url: "https://www.furnaceisntfree.com/the-numbers/",
      content_sha256: "ab".repeat(32),
      created_at: "2026-10-31T00:00:00.000Z",
    },
    image: { present: true, sha256: "cd".repeat(32), bytes: 18000, width: 800, height: 600 },
  });
  const ok = await postPort(env, hashed, FURNACE_TOKEN);
  assert.equal(ok.status, 201);
});

test("godlock and unseal generic envelopes store under their own tokens", async () => {
  resetPortRate();
  const env = envWith();
  const godlock = await postPort(env, genericBody("godlock"), GODLOCK_TOKEN);
  assert.equal(godlock.status, 201);
  assert.equal((await godlock.json()).site, "godlock");
  const unseal = await postPort(env, genericBody("unseal", { content_sha256: "ef".repeat(32), id: "unseal_example_1" }), UNSEAL_TOKEN);
  assert.equal(unseal.status, 201);
  assert.equal((await unseal.json()).site, "unseal");
  const crossed = await postPort(env, genericBody("unseal", { id: "unseal_example_2" }), GODLOCK_TOKEN);
  assert.equal(crossed.status, 401);
});

test("sites list has registry names and no token values", async () => {
  resetPortRate();
  const env = envWith();
  const res = await handleReceiptPort(new Request(HOST + "/v1/port/sites"), env);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.live, false);
  assert.equal(body.mesh_tracking, false);
  assert.equal(body.paid_sat, "HELD");
  assert.deepEqual(body.sites.map((site) => site.id), ["furnace", "godlock", "unseal"]);
  assert.deepEqual(body.sites.map((site) => site.token_env), PORT_SITES.map((site) => site.token_env));
  const text = JSON.stringify(body);
  assert.doesNotMatch(text, new RegExp(FURNACE_TOKEN + "|" + GODLOCK_TOKEN + "|" + UNSEAL_TOKEN));
});

test("aggregate read is operator-gated and still omits comments", async () => {
  resetPortRate();
  const env = envWith({ OPERATOR_TOKEN: OPERATOR });
  await postPort(env, furnaceBody(), FURNACE_TOKEN);
  const open = await handleReceiptPort(new Request(HOST + "/v1/port/receipts"), env);
  assert.equal(open.status, 401);
  const listed = await handleReceiptPort(new Request(HOST + "/v1/port/receipts", {
    headers: { "X-Aziel-Operator-Token": OPERATOR },
  }), env);
  assert.equal(listed.status, 200);
  const body = await listed.json();
  assert.equal(body.aggregate, true);
  assert.equal(body.count, 1);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(COMMENT + "|" + USERNAME));
});

test("per-site rate limit trips without storing the extra receipt", async () => {
  resetPortRate();
  const env = envWith({ PORT_RATE_PER_MINUTE: "2" });
  const first = await postPort(env, furnaceBody(), FURNACE_TOKEN);
  assert.equal(first.status, 201);
  const secondBody = furnaceBody();
  secondBody.ingest_as_receipt = { ...secondBody.ingest_as_receipt, id: "tfi_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" };
  const second = await postPort(env, secondBody, FURNACE_TOKEN);
  assert.equal(second.status, 201);
  const thirdBody = furnaceBody();
  thirdBody.ingest_as_receipt = { ...thirdBody.ingest_as_receipt, id: "tfi_cccccccccccccccccccccccccccccccc" };
  const third = await postPort(env, thirdBody, FURNACE_TOKEN);
  assert.equal(third.status, 429);
  assert.equal((await third.json()).code, "PORT-RATE");
  const missed = await handleReceiptPort(
    new Request(HOST + "/v1/port/receipts?site=furnace&id=tfi_cccccccccccccccccccccccccccccccc"),
    env,
  );
  assert.equal(missed.status, 404);
});

test("store without D1 still accepts and does not claim a lattice wrap", async () => {
  resetPortRate();
  const env = envWith();
  const res = await postPort(env, genericBody("godlock"), GODLOCK_TOKEN);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.lattice.wrapped, false);
  assert.equal(body.lattice.code, "LATTICE-STORE-UNAVAILABLE");
});

test("worker route, openapi, llms, and cite name the port", async () => {
  resetPortRate();
  assert.equal(isFanoutPath("/v1/port/receipts", "POST"), true);
  const env = envWith();
  const through = await worker.fetch(new Request(HOST + "/v1/port/receipts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + FURNACE_TOKEN,
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify(furnaceBody()),
  }), env, {});
  assert.equal(through.status, 201);
  const stored = await through.json();
  assert.equal(stored.site, "furnace");
  assert.equal(stored.library_document, false);

  const specRes = await handleRuntimeApi(new Request(HOST + "/openapi.json"), new URL(HOST + "/openapi.json"), {});
  const spec = await specRes.json();
  assert.equal(typeof spec.paths["/v1/port/receipts"].post, "object");
  assert.equal(typeof spec.paths["/v1/port/sites"].get, "object");
  assert.match(llmsDoc("LIMIT"), /\/v1\/port\/receipts/);
  assert.match(llmsDoc("LIMIT"), /not LIVE until deployed/);
  const cite = citeDoc();
  assert.equal(cite.receipt_port.post, HOST + "/v1/port/receipts");
  assert.equal(cite.receipt_port.live, false);
  assert.equal(cite.receipt_port.cap7_is_icann, false);
  assert.equal(cite.receipt_port.paid_sat, "HELD");
  assert.equal(cite.ingest, HOST + "/v1/ingest");

  const src = readFileSync(new URL("./receipt-port.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /console\.(log|info|debug|warn|error)/);
  assert.doesNotMatch(src, /from "\.\/library|reviewAndStore|appendLedger|document_ledger/);
});
