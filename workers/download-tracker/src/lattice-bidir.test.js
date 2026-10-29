import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hashPayload } from "./ledger.js";
import { isFanoutPath } from "./rate-limit.js";
import { handleRuntimeApi } from "./runtime.js";
import { llmsDoc } from "./crawl.js";
import {
  LATTICE_PLANES,
  LATTICE_SECONDARY_LIVE,
  LATTICE_SPEC,
  SECONDARY_TARGET,
  handleLatticeBidir,
} from "./lattice-bidir.js";

const OPERATOR = "secret-operator-token";

function memoryDb() {
  const rows = [];
  const sqlLog = [];
  const sessions = new Map();
  return {
    rows,
    sqlLog,
    sessions,
    prepare(sql) {
      sqlLog.push(sql);
      const stmt = {
        binds: [],
        bind(...args) {
          stmt.binds = args;
          return stmt;
        },
        async run() {
          if (/CREATE /i.test(sql)) return { success: true };
          if (/INSERT INTO lattice_secondary/i.test(sql)) {
            const [entry_hash, document_hash, plane, target, offline, secondary_hash, position, lattice_json, created_utc] = stmt.binds;
            if (rows.some((r) => r.entry_hash === entry_hash)) {
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
            });
            return { success: true };
          }
          throw new Error("unexpected run " + sql);
        },
        async first() {
          if (/lattice-auth/.test(sql)) return sessions.get(stmt.binds[0]) || null;
          if (/lattice-double/.test(sql)) {
            const [hash, entry] = stmt.binds;
            return rows.find((r) => r.secondary_hash === hash && Number(r.offline) === 1 && r.entry_hash !== entry) || null;
          }
          if (/lattice-pull/.test(sql)) {
            return rows.find((r) => r.entry_hash === stmt.binds[0]) || null;
          }
          return null;
        },
        async all() {
          if (!/lattice-aggregate/.test(sql)) throw new Error("unexpected all " + sql);
          const counts = new Map();
          for (const row of rows) counts.set(row.plane, (counts.get(row.plane) || 0) + 1);
          return { results: [...counts].map(([plane, n]) => ({ plane, n })) };
        },
      };
      return stmt;
    },
  };
}

function envWith(db = memoryDb()) {
  return { DB: db, db };
}

function operatorEnv(db) {
  const env = envWith(db);
  env.OPERATOR_TOKEN = OPERATOR;
  return env;
}

function operatorHeaders(extra = {}) {
  return { "X-Aziel-Operator-Token": OPERATOR, ...extra };
}

function blockFor(documentHash, { offline = true, username = "godlock", primaryPrev = "0".repeat(64), secondaryPrev = "0".repeat(64) } = {}) {
  const primary = hashPayload({ document: documentHash, prev: primaryPrev });
  const secondary = offline
    ? hashPayload({ primary: documentHash, username })
    : hashPayload({ offline: false, prev: secondaryPrev, primary });
  return {
    spec: LATTICE_SPEC,
    document_hash: documentHash,
    primary,
    primary_prev: primaryPrev,
    secondary,
    secondary_prev: secondaryPrev,
    offline,
    username: offline ? username : null,
    lattices: ["primary", "secondary"],
  };
}

function wrapBody(documentHash, extra = {}, blockExtra = {}) {
  const lattice = blockFor(documentHash, blockExtra);
  return {
    body: {
      entry_hash: documentHash,
      lattice,
      position: 1,
      target: SECONDARY_TARGET,
      spec: LATTICE_SPEC,
      ...extra,
    },
    lattice,
  };
}

async function postWrap(env, body, headers = {}) {
  const url = new URL("https://www.azielcorpuslibrary.net/v1/lattice/wrap");
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "User-Agent": "Mozilla/5.0", ...headers },
    body: JSON.stringify(body),
  });
  return handleLatticeBidir(request, url, env);
}

async function getPull(env, entryHash, headers = {}) {
  const url = new URL("https://www.azielcorpuslibrary.net/v1/lattice/pull?entry_hash=" + encodeURIComponent(entryHash));
  const request = new Request(url, { method: "GET", headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", ...headers } });
  return handleLatticeBidir(request, url, env);
}

test("wrap stores a godlock hash block and pull reads it back by entry_hash", async () => {
  assert.equal(LATTICE_SECONDARY_LIVE, false);
  const env = envWith();
  const documentHash = hashPayload({ doc: "offline-1" });
  const { body, lattice } = wrapBody(documentHash, { position: 4 });
  const wrapped = await postWrap(env, body);
  assert.equal(wrapped.status, 201);
  assert.equal(wrapped.body.ok, true);
  assert.equal(wrapped.body.live, false);
  assert.equal(wrapped.body.written, true);
  assert.equal(wrapped.body.code, "LATTICE-WRAP-PULL");
  assert.equal(wrapped.body.entry_hash, documentHash);
  assert.equal(wrapped.body.position, 4);
  assert.equal(wrapped.body.plane, "users");
  assert.equal(wrapped.body.target, SECONDARY_TARGET);
  assert.equal(wrapped.body.rebuilt_from_zero, false);
  assert.equal(wrapped.body.fan_out, false);
  assert.equal(wrapped.body.lattice.position, undefined);
  assert.equal(wrapped.body.lattice.username, undefined);
  assert.equal(wrapped.body.aggregate, undefined);
  assert.equal(wrapped.body.lattice.secondary, lattice.secondary);
  assert.doesNotMatch(JSON.stringify(wrapped.body), /godlock/);
  assert.equal(wrapped.body.policy.live, false);
  assert.equal(wrapped.body.policy.cap7_is_icann, false);
  assert.equal(wrapped.body.policy.public_icann, false);
  assert.equal(wrapped.body.policy.resolves_to_hub, false);
  assert.equal(wrapped.body.policy.auto_update, false);
  assert.equal(wrapped.body.policy.rf, false);
  assert.equal(wrapped.body.policy.sat, false);
  assert.equal(env.db.rows.length, 1);
  assert.equal(env.db.rows[0].lattice_json.includes("godlock"), true);

  const denied = await getPull(env, documentHash);
  assert.equal(denied.status, 401);
  assert.equal(denied.body.ok, false);
  assert.equal(denied.body.live, false);
  assert.equal(denied.body.code, "LATTICE-AUTH");
  assert.equal(denied.body.aggregate, undefined);
  assert.equal(denied.body.lattice, undefined);
  assert.doesNotMatch(JSON.stringify(denied.body), /godlock|username/);
  assert.equal(denied.body.policy.cap7_is_icann, false);
  assert.equal(env.db.sqlLog.some((sql) => sql.includes("lattice-aggregate")), false);

  env.OPERATOR_TOKEN = OPERATOR;
  const pulled = await getPull(env, documentHash, operatorHeaders());
  assert.equal(pulled.status, 200);
  assert.equal(pulled.body.entry_hash, documentHash);
  assert.equal(pulled.body.live, false);
  assert.equal(pulled.body.rebuilt_from_zero, false);
  assert.equal(pulled.body.code, "LATTICE-PULL-OK");
  assert.equal(pulled.body.lattice.primary, lattice.primary);
  assert.equal(pulled.body.lattice.username, "godlock");
  assert.deepEqual(pulled.body.aggregate.planes, LATTICE_PLANES.slice());
  assert.equal(pulled.body.aggregate.counts.users, 1);
  assert.equal(pulled.body.aggregate.counts.sites, 0);
  assert.equal(pulled.body.aggregate.counts.uses, 0);
  assert.equal(pulled.body.aggregate.counts.host_sites, 0);
  assert.equal(pulled.body.aggregate.counts.access_points, 0);
  assert.equal(pulled.body.aggregate.counts.nodes, 0);
  assert.equal(pulled.body.aggregate.counts.node_mesh, 0);
  assert.deepEqual(pulled.body.aggregate.found_in, ["users"]);
  assert.equal(pulled.body.usernames, undefined);
  assert.ok(env.db.sqlLog.some((sql) => sql.includes("lattice-pull")));
  assert.ok(env.db.sqlLog.some((sql) => sql.includes("lattice-aggregate")));
  const joined = env.db.sqlLog.join("\n");
  assert.doesNotMatch(joined, /FROM\s+(ledger|document_ledger|users|sessions|records|intake_seen|intake_refusals)\b/i);
  assert.doesNotMatch(joined, /ORDER BY sequence/i);
});

test("pull aggregates every plane without a plane filter", async () => {
  const env = operatorEnv();
  const meshHash = hashPayload({ doc: "mesh" });
  const accessHash = hashPayload({ doc: "access", user: "reader" });
  const mesh = wrapBody(meshHash, { plane: "node_mesh", position: 2 });
  const access = wrapBody(accessHash, { plane: "access_points", position: 3 }, { username: "reader" });
  assert.equal((await postWrap(env, mesh.body, operatorHeaders())).status, 201);
  assert.equal((await postWrap(env, access.body, operatorHeaders())).status, 201);
  const closed = await getPull(env, accessHash);
  assert.equal(closed.status, 401);
  assert.equal(closed.body.code, "LATTICE-AUTH");
  assert.doesNotMatch(JSON.stringify(closed.body), /reader|godlock/);
  const pulled = await getPull(env, accessHash, operatorHeaders());
  assert.equal(pulled.status, 200);
  assert.equal(pulled.body.entry_hash, accessHash);
  assert.equal(pulled.body.plane, "access_points");
  assert.equal(pulled.body.aggregate.counts.node_mesh, 1);
  assert.equal(pulled.body.aggregate.counts.access_points, 1);
  assert.equal(pulled.body.aggregate.counts.users, 0);
  assert.equal(pulled.body.aggregate.fan_out, false);
  assert.equal(Object.keys(pulled.body.aggregate.counts).length, LATTICE_PLANES.length);
});

test("a bad hash, a live claim, a Cap-7 ICANN claim, and a flag write store nothing", async () => {
  const env = envWith();
  const documentHash = hashPayload({ doc: "bad" });
  const { body, lattice } = wrapBody(documentHash);
  lattice.secondary = "ab".repeat(32);
  body.lattice = lattice;
  const bad = await postWrap(env, body);
  assert.equal(bad.status, 422);
  assert.equal(bad.body.code, "LATTICE-SECONDARY-MISS");
  assert.equal(bad.body.ok, false);
  assert.equal(bad.body.live, false);
  assert.equal(env.db.rows.length, 0);

  const live = wrapBody(hashPayload({ doc: "live" }));
  live.body.live = true;
  const liveRes = await postWrap(env, live.body);
  assert.equal(liveRes.status, 422);
  assert.equal(liveRes.body.code, "LATTICE-NOT-LIVE");

  const icann = wrapBody(hashPayload({ doc: "icann" }));
  icann.body.cap7_is_icann = true;
  const icannRes = await postWrap(env, icann.body);
  assert.equal(icannRes.status, 422);
  assert.equal(icannRes.body.code, "CAP7-NOT-ICANN");

  const flag = wrapBody(hashPayload({ doc: "flag" }));
  flag.body.intake_live = true;
  const flagRes = await postWrap(env, flag.body);
  assert.equal(flagRes.status, 422);
  assert.equal(flagRes.body.code, "LATTICE-FLAG");
  assert.equal(env.db.rows.length, 0);
});

test("replay is idempotent and a different block for the same entry_hash is refused", async () => {
  const env = envWith();
  const documentHash = hashPayload({ doc: "once" });
  const { body } = wrapBody(documentHash, { position: 7 });
  assert.equal((await postWrap(env, body)).status, 201);
  const again = await postWrap(env, body);
  assert.equal(again.status, 200);
  assert.equal(again.body.code, "LATTICE-ALREADY");
  assert.equal(again.body.written, false);
  assert.equal(again.body.entry_hash, documentHash);
  assert.equal(env.db.rows.length, 1);

  const changed = wrapBody(documentHash, { position: 8 });
  const refused = await postWrap(env, changed.body);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, "LATTICE-DOUBLE");
  assert.equal(env.db.rows.length, 1);
  assert.equal(env.db.rows[0].position, 7);
});

test("position inside the lattice block is refused and the primary target is refused", async () => {
  const env = envWith();
  const inside = wrapBody(hashPayload({ doc: "pos" }));
  inside.body.lattice.position = 1;
  const pos = await postWrap(env, inside.body);
  assert.equal(pos.status, 422);
  assert.equal(pos.body.code, "LATTICE-POSITION-INSIDE");

  const primary = wrapBody(hashPayload({ doc: "primary" }));
  primary.body.target = "aziel-runtime";
  const target = await postWrap(env, primary.body);
  assert.equal(target.status, 422);
  assert.equal(target.body.code, "LATTICE-TARGET");
  assert.equal(env.db.rows.length, 0);
});

test("an offline secondary already stored under another entry_hash is not written twice", async () => {
  const env = envWith();
  const documentHash = hashPayload({ doc: "double" });
  const { body, lattice } = wrapBody(documentHash);
  env.db.rows.push({
    entry_hash: "e".repeat(64),
    document_hash: "e".repeat(64),
    plane: "nodes",
    target: SECONDARY_TARGET,
    offline: 1,
    secondary_hash: lattice.secondary,
    position: 1,
    lattice_json: JSON.stringify(lattice),
    created_utc: "2026-10-29T00:00:00.000Z",
  });
  const refused = await postWrap(env, body);
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, "LATTICE-DOUBLE");
  assert.equal(env.db.rows.length, 1);
});

test("pull misses stay fail-closed and still report every plane", async () => {
  const env = operatorEnv();
  const closed = await getPull(env, hashPayload({ doc: "closed" }));
  assert.equal(closed.status, 401);
  assert.equal(closed.body.aggregate, undefined);
  const missing = await getPull(env, hashPayload({ doc: "missing" }), operatorHeaders());
  assert.equal(missing.status, 404);
  assert.equal(missing.body.ok, false);
  assert.equal(missing.body.live, false);
  assert.equal(missing.body.code, "LATTICE-PULL-MISS");
  assert.equal(missing.body.rebuilt_from_zero, false);
  assert.deepEqual(missing.body.aggregate.found_in, []);
  assert.equal(missing.body.aggregate.counts.host_sites, 0);
  assert.equal(missing.body.aggregate.counts.node_mesh, 0);

  const bad = await getPull(env, "not-a-hash", operatorHeaders());
  assert.equal(bad.status, 400);
  assert.equal(bad.body.code, "LATTICE-DOCUMENT");

  const url = new URL("https://www.azielcorpuslibrary.net/v1/lattice/wrap");
  const getWrap = await handleLatticeBidir(new Request(url, { method: "GET" }), url, env);
  assert.equal(getWrap.status, 405);
  assert.equal(getWrap.body.live, false);

  const pullUrl = new URL("https://www.azielcorpuslibrary.net/v1/lattice/pull?entry_hash=" + "ab".repeat(32));
  const postPull = await handleLatticeBidir(new Request(pullUrl, { method: "POST" }), pullUrl, env);
  assert.equal(postPull.status, 405);
});

test("a missing store fails closed and does not claim the row was written", async () => {
  const documentHash = hashPayload({ doc: "nostore" });
  const { body } = wrapBody(documentHash);
  const down = await postWrap({}, body);
  assert.equal(down.status, 503);
  assert.equal(down.body.ok, false);
  assert.equal(down.body.live, false);
  assert.equal(down.body.code, "LATTICE-STORE-UNAVAILABLE");
  assert.equal(down.body.written, false);
  const closed = await getPull({}, documentHash);
  assert.equal(closed.status, 401);
  assert.equal(closed.body.code, "LATTICE-AUTH");

  const throwing = envWith({
    prepare() {
      throw new Error("d1 down");
    },
  });
  const blew = await postWrap(throwing, body);
  assert.equal(blew.status, 503);
  assert.equal(blew.body.live, false);
});

test("an operator session may aggregate and a member session may not", async () => {
  const env = envWith();
  const documentHash = hashPayload({ doc: "session" });
  const { body } = wrapBody(documentHash);
  assert.equal((await postWrap(env, body)).status, 201);
  const future = new Date(Date.now() + 3600_000).toISOString();
  env.db.sessions.set("op", { user_id: "master", role: "superadmin", expires_utc: future });
  env.db.sessions.set("member", { user_id: "u1", role: "user", expires_utc: future });
  const member = await getPull(env, documentHash, { Cookie: "aziel_session=member" });
  assert.equal(member.status, 401);
  assert.doesNotMatch(JSON.stringify(member.body), /godlock/);
  const operator = await getPull(env, documentHash, { Cookie: "aziel_session=op" });
  assert.equal(operator.status, 200);
  assert.equal(operator.body.lattice.username, "godlock");
  assert.equal(operator.body.aggregate.counts.users, 1);
  assert.equal(operator.body.live, false);
  assert.equal(operator.body.policy.cap7_is_icann, false);
});

test("the worker routes wrap and pull and leaves the record lattice and intake lock alone", async () => {
  const env = operatorEnv();
  const documentHash = hashPayload({ doc: "route" });
  const { body } = wrapBody(documentHash, { plane: "host_sites", position: 9 });
  const url = new URL("https://www.azielcorpuslibrary.net/v1/lattice/wrap");
  const request = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await handleRuntimeApi(request, url, env);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  const wrapped = await res.json();
  assert.equal(wrapped.entry_hash, documentHash);
  assert.equal(wrapped.live, false);
  assert.equal(wrapped.plane, "host_sites");
  assert.equal(wrapped.lattice.username, undefined);
  assert.equal(wrapped.aggregate, undefined);
  assert.doesNotMatch(JSON.stringify(wrapped), /godlock/);
  assert.equal(wrapped.policy.cap7_is_icann, false);

  const pullUrl = new URL("https://www.azielcorpuslibrary.net/v1/lattice/pull?entry_hash=" + documentHash);
  const deniedRes = await handleRuntimeApi(new Request(pullUrl), pullUrl, env);
  assert.equal(deniedRes.status, 401);
  const denied = await deniedRes.json();
  assert.equal(denied.code, "LATTICE-AUTH");
  assert.equal(denied.aggregate, undefined);
  const pullRes = await handleRuntimeApi(new Request(pullUrl, { headers: operatorHeaders() }), pullUrl, env);
  assert.equal(pullRes.status, 200);
  const pulled = await pullRes.json();
  assert.equal(pulled.entry_hash, documentHash);
  assert.equal(pulled.aggregate.counts.host_sites, 1);
  assert.equal(pulled.aggregate.counts.uses, 0);

  const spec = await handleRuntimeApi(
    new Request("https://www.azielcorpuslibrary.net/openapi.json"),
    new URL("https://www.azielcorpuslibrary.net/openapi.json"),
    {},
  );
  const openapi = await spec.json();
  assert.equal(typeof openapi.paths["/v1/lattice"].get, "object");
  assert.equal(typeof openapi.paths["/v1/lattice/wrap"].post, "object");
  assert.equal(typeof openapi.paths["/v1/lattice/pull"].get, "object");

  const llms = llmsDoc("LIMIT");
  assert.match(llms, /\/v1\/lattice\/wrap/);
  assert.match(llms, /\/v1\/lattice\/pull\?entry_hash=/);

  assert.equal(isFanoutPath("/v1/lattice/wrap", "POST"), false);
  assert.equal(isFanoutPath("/v1/lattice/pull", "GET"), false);

  const src = readFileSync(new URL("./lattice-bidir.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /intake_live\s*=/);
  assert.doesNotMatch(src, /MEDIA_SCAN_GATE_VERIFIED/);
  assert.doesNotMatch(src, /from "\.\/intake/);
  assert.doesNotMatch(src, /from "\.\/mesh/);
  const intake = readFileSync(new URL("./intake-scan-gate.js", import.meta.url), "utf8");
  assert.match(intake, /export const MEDIA_SCAN_GATE_VERIFIED = false/);
  const runtime = readFileSync(new URL("./runtime.js", import.meta.url), "utf8");
  assert.match(runtime, /path === "\/v1\/lattice" && request\.method === "GET"/);
});
