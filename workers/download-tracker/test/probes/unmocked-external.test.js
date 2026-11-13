import test from "node:test";
import net from "node:net";
import assert from "node:assert/strict";

test("probe reaches the guard on purpose", async () => {
  assert.equal(globalThis.__AZIEL_HERMETIC_NET__, true);
  try {
    await fetch("https://203.0.113.5/v1/mesh");
  } catch {
    /* the runner must still fail this test from the recorded attempt */
  }
  try {
    net.connect({ host: "203.0.113.5", port: 81 });
  } catch {
    /* same */
  }
});
