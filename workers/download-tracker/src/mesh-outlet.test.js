import test from "node:test";
import assert from "node:assert/strict";
import { handleRuntimeApi } from "./runtime.js";
import { handleMeshApi } from "./mesh.js";
import { citeDoc } from "./crawl.js";
import { helpIndexTxt } from "./help.js";
import { softwareTabCatalog } from "./software-catalog.js";
import { JEEVES_SUITE_HELP, RUNTIME_TAB_COUNT, RUNTIME_LIVE_COUNT, RUNTIME_ISOLATION_COUNT } from "./runtime-copy.js";
import { isReservedCounterKey } from "./stats-shape.js";
import {
  AUTHOR,
  INVENTORY_KV_KEY,
  OUTLET_KV_KEY,
  OUTLET_PATH,
  acceptFanout,
  citeFromSoftwareDoc,
  frozenCite,
  frozenOutletState,
  inventoryRowsFromDoc,
  pullSoftwareSot,
  suiteHelpOk,
  syncSiteInventory,
  unreachableCite,
  writeJsonKey,
} from "./mesh-outlet.js";

const HOST = "https://www.azielcorpuslibrary.net";
const TOKEN = "outlet-operator-token";

function memoryKv() {
  const store = new Map();
  const puts = [];
  return {
    puts,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      puts.push(key);
      store.set(key, value);
    },
  };
}

function envWith(kv, extra = {}) {
  return Object.assign({
    OPERATOR_TOKEN: TOKEN,
    DOWNLOADS: kv,
  }, extra);
}

function fanoutBody(extra = {}) {
  return Object.assign({
    spec: "MESH-OUTLET-1.0",
    author: AUTHOR,
    identity: AUTHOR,
    sot: {
      branch: "main",
      git: "231b02f",
      git_full: "231b02fcbb7b50fbd52762a49329042bc1715fe9",
      version: "2.0.0-rc1",
    },
    softwares: {
      count: 42,
      live_count: 41,
      local_only_count: 1,
      isolation_software_count: 33,
      count_note: "Softwares-tab count includes placements. Do not equate the two.",
    },
    suite_help: {
      name: "Ask Jeeves",
      slug: "jeeves",
      software_tab: false,
      parent_slug: "aziel-corpus",
      fraggate_slug: "aziel-corpus",
      fraggate_op: "jeeves",
      interface_call: "jeeves_help",
    },
  }, extra);
}

test("frozen outlet cite is Aziel Eliab, tab 42, live 41, Ask Jeeves suite help", () => {
  const cite = frozenCite();
  assert.equal(cite.sot.version, "2.0.0-rc1");
  assert.equal(cite.sot.git, "231b02f");
  assert.equal(cite.softwares.count, RUNTIME_TAB_COUNT);
  assert.equal(cite.softwares.live_count, RUNTIME_LIVE_COUNT);
  assert.equal(cite.softwares.isolation_software_count, RUNTIME_ISOLATION_COUNT);
  assert.equal(cite.softwares.count, 42);
  assert.equal(cite.softwares.live_count, 41);
  assert.equal(cite.suite_help.software_tab, false);
  assert.equal(cite.suite_help.fraggate_op, "jeeves");
  assert.equal(cite.suite_help.parent_slug, "aziel-corpus");
  assert.match(cite.suite_help.wording, /FragGate op jeeves on aziel-corpus/);
  assert.match(cite.suite_help.wording, /not a Softwares-tab card/);
  const state = frozenOutletState();
  assert.equal(state.author, AUTHOR);
  assert.equal(state.identity, AUTHOR);
  assert.equal(state.counters_untouched, true);
  assert.equal(state.invented, false);
  assert.equal(state.library_rows, "refused");
});

test("cite.json carries suite help and Softwares count framing", () => {
  const cite = citeDoc();
  assert.equal(cite.author, AUTHOR);
  assert.equal(cite.identity, AUTHOR);
  assert.equal(cite.softwares_tab_count, 42);
  assert.equal(cite.softwares_live_count, 41);
  assert.equal(cite.isolation_software_count, 33);
  assert.equal(cite.runtime_live_count, 41);
  assert.equal(cite.suite_help.software_tab, false);
  assert.equal(cite.suite_help.fraggate_op, "jeeves");
  assert.equal(cite.mesh_outlet, HOST + "/v1/mesh/outlet");
  assert.match(cite.jeeves, /FragGate op jeeves/);
  assert.match(cite.softwares_count_note, /Do not equate the two/);
  const over = citeDoc(null, {
    sot: { git: "abcdef0", git_full: "abcdef0123456789abcdef0123456789abcdef01", version: "2.0.0-rc1", branch: "main", version_id: null },
    softwares: { count: 44, live_count: 43, isolation_software_count: 33, count_note: "fan-out note" },
    suite_help: JEEVES_SUITE_HELP,
  });
  assert.equal(over.runtime_git, "abcdef0");
  assert.equal(over.runtime_version_id, null);
  assert.equal(over.softwares_tab_count, 44);
  assert.equal(over.softwares_count_note, "fan-out note");
});

test("Ask Jeeves is not a Softwares-tab product", () => {
  assert.equal(suiteHelpOk({ software_tab: true, slug: "jeeves", parent_slug: "aziel-corpus", fraggate_op: "jeeves" }), false);
  const tab = softwareTabCatalog({
    software: [
      { slug: "aziel-corpus", name: "Aziel Digital Library" },
      { slug: "jeeves", name: "Ask Jeeves" },
      { slug: "ask-jeeves", name: "Ask Jeeves" },
      { slug: "peacelock", name: "PeaceLock" },
    ],
  });
  const slugs = tab.products.map((p) => p.slug);
  assert.ok(slugs.includes("aziel-corpus"));
  assert.ok(slugs.includes("peacelock"));
  assert.equal(slugs.includes("jeeves"), false);
  assert.equal(slugs.includes("ask-jeeves"), false);
  assert.match(helpIndexTxt(), /FragGate op jeeves on aziel-corpus/);
  assert.match(helpIndexTxt(), /not a Softwares-tab card/);
});

test("fan-out refuses other identities, library rows, and a Softwares Ask Jeeves card", () => {
  const other = acceptFanout(null, fanoutBody({ identity: "Aziel Elroi Eliab" }));
  assert.equal(other.ok, false);
  assert.equal(other.error, "OUTLET-IDENTITY");
  const rows = acceptFanout(null, fanoutBody({ records: [{ record_id: "AZDOC-MADE-UP", title: "Invented" }] }));
  assert.equal(rows.ok, false);
  assert.equal(rows.error, "OUTLET-NO-ROWS");
  assert.equal(rows.invented, false);
  const card = acceptFanout(null, fanoutBody({
    suite_help: { name: "Ask Jeeves", slug: "jeeves", software_tab: true, parent_slug: "aziel-corpus", fraggate_op: "jeeves", interface_call: "jeeves_help" },
  }));
  assert.equal(card.ok, false);
  assert.equal(card.error, "OUTLET-SUITE-HELP");
});

test("fan-out applies cite fields and drops download counters", () => {
  const accepted = acceptFanout(frozenOutletState(), fanoutBody({
    downloads: 999,
    views: 999,
    sot: {
      branch: "main",
      git_full: "abcdef0123456789abcdef0123456789abcdef01",
      version: "2.0.0-rc1",
    },
    softwares: { count: 43, live_count: 41, isolation_software_count: 33 },
  }));
  assert.equal(accepted.ok, true);
  assert.equal(accepted.counters_untouched, true);
  assert.ok(accepted.dropped_counter_fields.includes("downloads"));
  assert.equal(accepted.state.cite.sot.git, "abcdef0");
  assert.equal(accepted.state.cite.softwares.count, 43);
  assert.equal(accepted.state.cite.softwares.live_count, 41);
  assert.equal(accepted.state.downloads, undefined);
  assert.equal(accepted.state.cite.suite_help.software_tab, false);
  const kept = acceptFanout(accepted.state, {
    author: AUTHOR,
    identity: AUTHOR,
    softwares: { count: 42 },
  });
  assert.equal(kept.state.cite.sot.git, "abcdef0");
  assert.equal(kept.state.cite.softwares.count, 42);
});

test("outlet KV writes are not download counter keys", async () => {
  assert.equal(isReservedCounterKey(OUTLET_KV_KEY, "aziel-corpus"), false);
  assert.equal(isReservedCounterKey(INVENTORY_KV_KEY, "aziel-corpus"), false);
  const kv = memoryKv();
  await writeJsonKey(envWith(kv), OUTLET_KV_KEY, frozenOutletState());
  assert.deepEqual(kv.puts, [OUTLET_KV_KEY]);
  const stored = JSON.parse(await kv.get(OUTLET_KV_KEY));
  assert.equal(stored.downloads, undefined);
  assert.equal(stored.views, undefined);
  assert.equal(stored.records, undefined);
  await assert.rejects(() => writeJsonKey(envWith(kv), "aziel-corpus|__views__", { author: AUTHOR }));
  await assert.rejects(() => writeJsonKey(envWith(kv), "aziel-corpus|__total__", { author: AUTHOR }));
});

test("GET /v1/mesh/outlet is the corpus consumer and does not proxy the runtime mesh", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("runtime proxy must not run");
  };
  try {
    const res = await handleMeshApi(
      new Request(HOST + OUTLET_PATH),
      new URL(HOST + OUTLET_PATH),
      {}
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.spec, "MESH-OUTLET-1.0");
    assert.equal(body.author, AUTHOR);
    assert.equal(body.cite.softwares.count, 42);
    assert.equal(body.cite.suite_help.fraggate_op, "jeeves");
    assert.equal(body.counters_untouched, true);
    assert.equal(body.invented, false);
  } finally {
    globalThis.fetch = orig;
  }
});

test("POST /v1/mesh/outlet requires the operator token and stores the cite only", async () => {
  const kv = memoryKv();
  const env = envWith(kv);
  const anon = await handleRuntimeApi(
    new Request(HOST + OUTLET_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fanoutBody()),
    }),
    new URL(HOST + OUTLET_PATH),
    env
  );
  assert.equal(anon.status, 401);
  assert.equal((await anon.json()).error, "OUTLET-AUTH");
  assert.equal(kv.puts.length, 0);

  const res = await handleRuntimeApi(
    new Request(HOST + OUTLET_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Aziel-Operator-Token": TOKEN },
      body: JSON.stringify(fanoutBody({ downloads: 5, views: 8 })),
    }),
    new URL(HOST + OUTLET_PATH),
    env
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.source, "fanout");
  assert.equal(body.cite.softwares.count, 42);
  assert.deepEqual(kv.puts, [OUTLET_KV_KEY]);
  const stored = JSON.parse(await kv.get(OUTLET_KV_KEY));
  assert.equal(stored.downloads, undefined);
  assert.equal(stored.views, undefined);
  assert.equal(stored.cite.suite_help.software_tab, false);
});

test("SoT pull keeps last-known cite when the origin is unreachable", async () => {
  const previous = frozenOutletState();
  const down = await pullSoftwareSot(previous, async () => {
    throw new Error("down");
  });
  assert.equal(down.reachable, false);
  assert.equal(down.status, "unreachable");
  assert.equal(down.source, "last-known");
  assert.equal(down.invented, false);
  assert.equal(down.cite.sot.git, "231b02f");
  assert.equal(down.cite.softwares.count, 42);
  assert.match(down.note, /No library rows invented/);

  const refused = await pullSoftwareSot(previous, async () => new Response(JSON.stringify({
    author: "Someone Else",
    version: "9.9.9",
    count: 1,
    software: [],
  }), { status: 200 }));
  assert.equal(refused.reachable, false);
  assert.equal(refused.error, "OUTLET-IDENTITY");
  assert.equal(refused.cite.sot.version, "2.0.0-rc1");
  assert.equal(refused.applied, false);

  const live = citeFromSoftwareDoc({
    author: AUTHOR,
    identity: AUTHOR,
    version: "2.0.0-rc1",
    git_sha: "231b02fcbb7b50fbd52762a49329042bc1715fe9",
    count: 42,
    live_count: 41,
    isolation_software_count: 33,
    count_note: "Softwares-tab count includes placements. Do not equate the two.",
    software: [
      { slug: "aziel-corpus", name: "Aziel Digital Library" },
      { slug: "jeeves", name: "Ask Jeeves" },
    ],
  });
  assert.equal(live.ok, true);
  assert.equal(live.dropped_software_card, true);
  assert.equal(live.state.cite.suite_help.software_tab, false);
  assert.equal(live.state.cite.softwares.count, 42);
  assert.equal(unreachableCite(previous, "http").cite.sot.git, previous.cite.sot.git);
});

test("peer inventory sync keeps last-known rows and invents none", async () => {
  const parsed = inventoryRowsFromDoc({
    records: [
      { record_id: "AZDOC-REAL", title: "Kept", author: AUTHOR },
      { title: "No id" },
      { record_id: "not-a-doc", title: "Bad" },
      null,
    ],
  });
  assert.equal(parsed.present, true);
  assert.deepEqual(parsed.rows, [{ record_id: "AZDOC-REAL", invented: false, title: "Kept", author: AUTHOR }]);

  const lastKnown = {
    peers: {
      "godlock-uk": {
        rows: [{ record_id: "AZDOC-OLD", title: "Last known", invented: false }],
        fetched_at: "2026-09-01T00:00:00.000Z",
      },
      "hedidntjump-com": { rows: [] },
    },
  };
  const doc = await syncSiteInventory({}, {
    lastKnown,
    fetchImpl: async (url) => {
      if (String(url).includes("azieleliab")) {
        return new Response(JSON.stringify({
          records: [
            { record_id: "AZDOC-HUB", title: "From hub" },
            { title: "Invented blank" },
          ],
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (String(url).includes("godlock")) throw new Error("down");
      return new Response("no", { status: 503 });
    },
  });
  const byId = Object.fromEntries(doc.peers.map((peer) => [peer.id, peer]));
  assert.equal(byId["azielcorpuslibrary-net"].status, "local");
  assert.deepEqual(byId["azielcorpuslibrary-net"].rows, []);
  assert.equal(byId["azieleliab-com"].reachable, true);
  assert.deepEqual(byId["azieleliab-com"].rows.map((row) => row.record_id), ["AZDOC-HUB"]);
  assert.equal(byId["godlock-uk"].reachable, false);
  assert.equal(byId["godlock-uk"].status, "unreachable");
  assert.deepEqual(byId["godlock-uk"].rows.map((row) => row.record_id), ["AZDOC-OLD"]);
  assert.match(byId["godlock-uk"].note, /None invented/);
  assert.equal(byId["hedidntjump-com"].reachable, false);
  assert.deepEqual(byId["hedidntjump-com"].rows, []);
  assert.match(byId["hedidntjump-com"].note, /None invented/);
  assert.equal(doc.counters_untouched, true);
  assert.equal(doc.invented, false);
  const ids = doc.peers.flatMap((peer) => peer.rows.map((row) => row.record_id));
  assert.ok(!ids.includes("AZDOC-MADE-UP"));
});

test("GET /v1/inventory sync stores last-known peers and skips counter keys", async () => {
  const kv = memoryKv();
  const env = envWith(kv, {
    outletFetch: async () => {
      throw new Error("peer down");
    },
  });
  await kv.put(INVENTORY_KV_KEY, JSON.stringify({
    author: AUTHOR,
    identity: AUTHOR,
    peers: {
      "godlock-uk": { rows: [{ record_id: "AZDOC-KEEP", title: "Kept", invented: false }] },
    },
  }));
  kv.puts.length = 0;
  const res = await handleRuntimeApi(
    new Request(HOST + "/v1/inventory?sync=1", { headers: { "X-Aziel-Operator-Token": TOKEN } }),
    new URL(HOST + "/v1/inventory?sync=1"),
    env
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  const godlock = body.peers.find((peer) => peer.id === "godlock-uk");
  assert.equal(godlock.status, "unreachable");
  assert.equal(godlock.rows[0].record_id, "AZDOC-KEEP");
  assert.equal(body.downloads_untouched, true);
  assert.deepEqual(kv.puts, [INVENTORY_KV_KEY]);
});
