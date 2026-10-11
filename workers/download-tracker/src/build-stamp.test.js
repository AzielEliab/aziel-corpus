import test from "node:test";
import assert from "node:assert/strict";
import { buildStamp } from "./build-stamp.js";
import { readFileSync } from "node:fs";

test("stamped deploy exposes git_sha and version_id", () => {
  const s = buildStamp({ GIT_SHA: "71139520ABCDEF", CF_VERSION_METADATA: { id: "v-123", tag: "" } });
  assert.equal(s.git_sha, "71139520abcdef");
  assert.equal(s.git_sha_source, "env.GIT_SHA");
  assert.equal(s.version_id, "v-123");
});

test("unstamped deploy reports null, never a guess", () => {
  for (const env of [{}, null, { GIT_SHA: "main" }, { GIT_SHA: "zzzzzzz" }, { CF_VERSION_METADATA: {} }]) {
    const s = buildStamp(env);
    assert.equal(s.git_sha, null);
    assert.equal(s.version_id, null);
    assert.equal(s.git_sha_source, "unstamped");
    assert.equal(s.version_id_source, "unbound");
  }
});

test("/v1/health spreads buildStamp and wrangler binds version metadata", () => {
  const src = readFileSync(new URL("./runtime.js", import.meta.url), "utf8");
  const i = src.indexOf('path === "/v1/health"');
  assert.ok(i > 0);
  assert.match(src.slice(i, i + 900), /\.\.\.buildStamp\(env\)/);
  const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  assert.match(toml, /\[version_metadata\][^\[]*binding\s*=\s*"CF_VERSION_METADATA"/);
});
