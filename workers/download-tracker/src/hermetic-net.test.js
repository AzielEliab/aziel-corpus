import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dualNodesCounts } from "./mesh.js";
import { installObservedOrigin, installUnavailableOrigin, runtimeBinding } from "./fixtures/hermetic-observe.js";

const here = dirname(fileURLToPath(import.meta.url));
const probe = join(here, "../test/probes/unmocked-external.test.js");
const guard = join(here, "../test/hermetic-net.mjs");

function runProbe() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, ["--import", guard, "--test", "--test-reporter", "tap", probe], {
      cwd: join(here, ".."),
      env,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (buf) => { out += buf; });
    child.stderr.on("data", (buf) => { err += buf; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, out, err }));
  });
}

test("the default runner is installed", () => {
  assert.equal(globalThis.__AZIEL_HERMETIC_NET__, true);
});

test("a loopback test server still answers", async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("loop-" + req.url);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const port = server.address().port;
    const res = await fetch("http://127.0.0.1:" + port + "/ping");
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "loop-/ping");
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("an unavailable fixture is local and is not a mesh pair", async () => {
  const restore = installUnavailableOrigin();
  try {
    const res = await fetch("https://aziel-runtime.vibelock.workers.dev/v1/mesh", { method: "GET" });
    assert.equal(res.status, 503);
    assert.equal(res.headers.get("X-Aziel-Fixture"), "unavailable");
    const body = await res.text();
    assert.equal(body, "unavailable");
    assert.throws(() => JSON.parse(body));
  } finally {
    restore();
  }
});

test("an observed fixture returns the handler document and not a public read", async () => {
  const doc = {
    human_mesh_users: 4,
    human_uses: 2,
    nodes: 6,
    live_nodes: 5,
    includes_site_viewers: true,
    site_live_viewers: 1,
    live_nodes_plane: "human-mesh-users-site-viewers",
    software_nodes: 41,
  };
  const pair = dualNodesCounts(doc);
  const restore = installObservedOrigin(async (_input, _init, url) => {
    assert.match(url, /\/v1\/mesh$/);
    return new Response(JSON.stringify(doc), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Aziel-Fixture": "observed" },
    });
  });
  try {
    const res = await fetch("https://aziel-runtime.vibelock.workers.dev/v1/mesh");
    assert.equal(res.headers.get("X-Aziel-Fixture"), "observed");
    const got = dualNodesCounts(await res.json());
    assert.deepEqual(got, pair);
    assert.notEqual(got.liveNodes, 41);
  } finally {
    restore();
  }
});

test("a runtime binding is the observation and does not use global fetch", async () => {
  let fetches = 0;
  const prev = globalThis.fetch;
  globalThis.fetch = async () => {
    fetches += 1;
    throw new Error("binding test must not call global fetch");
  };
  try {
    const binding = runtimeBinding(async () => new Response(JSON.stringify({ ok: true, fixture: "observed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const res = await binding.fetch(new Request("https://aziel-runtime.vibelock.workers.dev/v1/health"));
    assert.equal(res.status, 200);
    assert.equal(fetches, 0);
    assert.equal((await res.json()).fixture, "observed");
  } finally {
    globalThis.fetch = prev;
  }
});

test("an unmocked public attempt fails that test and does not open a socket", async () => {
  const result = await runProbe();
  const report = result.out + "\n" + result.err;
  assert.notEqual(result.code, 0, report);
  assert.match(report, /not ok \d+ - probe reaches the guard on purpose/);
  assert.match(report, /unmocked external network attempt/);
  assert.match(report, /203\.0\.113\.5/);
  assert.match(report, /HERMETIC_ORIGINAL_SOCKETS 0/);
  assert.match(report, /HERMETIC_ORIGINAL_DNS 0/);
  assert.match(report, /HERMETIC_EXTERNAL_ATTEMPTS [1-9]/);
});
