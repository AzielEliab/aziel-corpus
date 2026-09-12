import test from "node:test";
import assert from "node:assert/strict";
import { handleHosted } from "./hosted.js";
import { ABOUT_PATH, ABOUT_NAV_LABEL, FORENSICS_PATH } from "./seo.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;
const HOST = "https://www.azielcorpuslibrary.net";

function stubEnv() {
  const stmt = {
    bind() { return this; },
    async run() { return { success: true }; },
    async first() { return null; },
    async all() { return { results: [] }; },
  };
  return {
    DB: {
      prepare() { return stmt; },
      async batch() { return []; },
    },
  };
}

function req(path, method = "GET") {
  return new Request(HOST + path, { method, headers: { Accept: "text/html" } });
}

test("GET /AzielEliab serves the About HTML at the canonical path", async () => {
  const url = new URL(HOST + ABOUT_PATH);
  const res = await handleHosted(req(ABOUT_PATH), url, stubEnv(), {}, null, null);
  assert.ok(res, "handleHosted should serve /AzielEliab");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/html/);
  const html = await res.text();
  assert.match(html, /About Aziel/);
  assert.match(html, /Aziel Eliab/);
  assert.match(html, /Who\? Does not matter/);
  assert.doesNotMatch(html, /Who does not matter/);
  assert.match(html, /Aziel Elroi Eliab/);
  assert.match(html, new RegExp('href="' + ABOUT_PATH.replace("/", "\\/") + '"'));
  assert.match(html, new RegExp(">" + ABOUT_NAV_LABEL + "<"));
  assert.match(html, /id="aziel-eliab"/);
  assert.match(html, /https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.doesNotMatch(html, /azielcorpuslibrary\.net\/AzielEliab#aziel-eliab/);
  assert.match(html, /Part of the Aziel Eliab ecosystem/);
  assert.match(html, />Official site</);
  assert.match(html, />Try on Glama</);
  assert.match(html, /href="https:\/\/godlock\.uk\/AzielEliab"/);
  assert.match(html, /godlock\.uk\/AzielEliab/);
  assert.doesNotMatch(html, /href="\/about"/);
  assert.doesNotMatch(html, BANNED);
});

test("GET /about permanently redirects to /AzielEliab", async () => {
  const url = new URL(HOST + "/about");
  const res = await handleHosted(req("/about"), url, stubEnv(), {}, null, null);
  assert.ok(res, "handleHosted should redirect /about");
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), ABOUT_PATH);
  assert.equal(await res.text(), "");
});

test("GET /aboutme and case-folded /azieleliab redirect to /AzielEliab", async () => {
  for (const path of ["/aboutme", "/azieleliab", "/AZIELELIAB", "/azieLeLiab"]) {
    const url = new URL(HOST + path);
    const res = await handleHosted(req(path), url, stubEnv(), {}, null, null);
    assert.ok(res, "handleHosted should redirect " + path);
    assert.equal(res.status, 301, path);
    assert.equal(res.headers.get("location"), ABOUT_PATH, path);
  }
});

test("GET /forensics serves Forensics HTML and public nav hides Gazetteer", async () => {
  const url = new URL(HOST + FORENSICS_PATH);
  const res = await handleHosted(req(FORENSICS_PATH), url, stubEnv(), {}, null, null);
  assert.ok(res, "handleHosted should serve /forensics");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/html/);
  const html = await res.text();
  assert.match(html, /<title>Forensics/);
  assert.match(html, /<h1>Forensics<\/h1>/);
  assert.match(html, /href="\/forensics"/);
  assert.match(html, />Forensics</);
  assert.doesNotMatch(html, />Intelligence</);
  assert.doesNotMatch(html, /href="\/intelligence"/);
  assert.doesNotMatch(html, />Gazetteer</);
  assert.doesNotMatch(html, /href="\/gazetteer"/);
  assert.match(html, new RegExp(">" + ABOUT_NAV_LABEL + "<"));
  assert.doesNotMatch(html, BANNED);
});

test("GET /intelligence permanently redirects to /forensics", async () => {
  for (const path of ["/intelligence", "/intelligence/", "/Intelligence"]) {
    const url = new URL(HOST + path);
    const res = await handleHosted(req(path), url, stubEnv(), {}, null, null);
    assert.ok(res, "handleHosted should redirect " + path);
    assert.equal(res.status, 301, path);
    assert.equal(res.headers.get("location"), FORENSICS_PATH, path);
    assert.equal(await res.text(), "");
  }
  const qs = await handleHosted(req("/intelligence?setup=verified"), new URL(HOST + "/intelligence?setup=verified"), stubEnv(), {}, null, null);
  assert.equal(qs.status, 301);
  assert.equal(qs.headers.get("location"), FORENSICS_PATH + "?setup=verified");
});

test("GET /gazetteer stays hosted without a public nav tab", async () => {
  const url = new URL(HOST + "/gazetteer");
  const ctx = { waitUntil() {} };
  const res = await handleHosted(req("/gazetteer"), url, stubEnv(), ctx, null, null);
  assert.ok(res, "handleHosted should still serve /gazetteer");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Aziel World Gazetteer/);
  assert.doesNotMatch(html, />Gazetteer</);
  assert.match(html, /href="\/forensics"/);
  assert.match(html, />Forensics</);
});

test("HEAD /about is a permanent redirect and HEAD /AzielEliab is HTML without a body", async () => {
  const about = await handleHosted(req("/about", "HEAD"), new URL(HOST + "/about"), stubEnv(), {}, null, null);
  assert.equal(about.status, 301);
  assert.equal(about.headers.get("location"), ABOUT_PATH);

  const page = await handleHosted(req(ABOUT_PATH, "HEAD"), new URL(HOST + ABOUT_PATH), stubEnv(), {}, null, null);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type") || "", /text\/html/);
  assert.equal(await page.text(), "");
});
