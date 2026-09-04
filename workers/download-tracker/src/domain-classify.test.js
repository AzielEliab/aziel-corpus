import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyDomains,
  expandTreePaths,
  needsDomainClassification,
  applyAutoClassification,
  serializePaths,
} from "./domain-classify.js";

test("AEEM HVAC retrofit gets energy + engineering multi-paths", () => {
  const r = classifyDomains({
    title: "AEEM HVAC Energy Valve — Consumer Retrofit Whitepaper (v1.0)",
    domain: "engineering",
    keywords: "AEEM, HVAC Energy Valve, Aziel Eliab",
    body: "Disconnect-side adaptive HVAC energy optimization.",
  });
  assert.equal(r.unclassifiable, false);
  assert.match(r.domain, /energy/i);
  assert.match(r.domain, /engineering/i);
  const mains = new Set(r.paths.map((p) => p.main));
  assert.ok(mains.has("energy"));
  assert.ok(mains.has("engineering"));
  assert.ok(r.paths.some((p) => p.sub === "HVAC"));
});

test("ForgeReceipts multi-domain software + investigation + crime", () => {
  const r = classifyDomains({
    title: "ForgeReceipts: A Local-First Evidence Integrity Platform for Pro Se Fathers in Family Court",
    domain: "software",
    keywords: "ForgeReceipts, receipts, hash-chain",
  });
  const mains = new Set(r.paths.map((p) => p.main));
  assert.ok(mains.has("software"));
  assert.ok(mains.has("investigation"));
  assert.ok(mains.has("crime"));
});

test("smoke note is unclassifiable", () => {
  const r = classifyDomains({ title: "AZBot anonymous Corpus smoke", body: "Peace → Clarity → Service." });
  assert.equal(r.unclassifiable, true);
});

test("expandTreePaths respects explicit main/sub/micro", () => {
  const paths = expandTreePaths({
    domain: "energy, engineering",
    subjects: "energy/HVAC/retrofit, engineering/HVAC/whitepaper",
  });
  assert.ok(paths.some((p) => p.main === "energy" && p.sub === "HVAC" && p.micro === "retrofit"));
  assert.ok(paths.some((p) => p.main === "engineering" && p.sub === "HVAC" && p.micro === "whitepaper"));
});

test("needsDomainClassification for empty subjects", () => {
  assert.equal(needsDomainClassification({ domain: "research", subjects: "" }), true);
  assert.equal(needsDomainClassification({ domain: "research", subjects: "AHE" }), false);
});

test("applyAutoClassification fills empty subjects at ingest", () => {
  const out = applyAutoClassification({
    title: "PLA Recycler V1 — Compact Non-Solvent Filament Reprocessing System",
    domain: "engineering",
    subjects: "",
    keywords: "PLA Recycler",
  });
  assert.equal(out.auto, true);
  assert.ok(out.subjects);
  assert.match(out.domain, /hardware|engineering|design/i);
});

test("serializePaths encodes multi-main as path subjects", () => {
  const ser = serializePaths([
    { main: "energy", sub: "HVAC", micro: "retrofit" },
    { main: "engineering", sub: "HVAC", micro: "whitepaper" },
  ]);
  assert.match(ser.subjects, /energy\/HVAC\/retrofit/);
  assert.match(ser.subjects, /engineering\/HVAC\/whitepaper/);
});
