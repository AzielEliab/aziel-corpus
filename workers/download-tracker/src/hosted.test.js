import test from "node:test";
import assert from "node:assert/strict";
import { handleHosted } from "./hosted.js";
import { aboutBody, whoBody } from "./ui.js";
import { DISAMBIGUATING_DESCRIPTION, LOCK_LINE, WHO_IS_AZIEL_ELIAB } from "./identity.js";
import { ABOUT_PATH, ABOUT_NAV_LABEL, FORENSICS_PATH, WHO_PATH } from "./seo.js";

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
  assert.match(html, /class="brandmark-link"/);
  assert.match(html, /src="\/sigil\.png"/);
  assert.match(html, /About Aziel/);
  assert.match(html, /Aziel Eliab/);
  assert.match(html, /Aziel Digital Library/);
  assert.match(html, /GodLock/);
  assert.match(html, /Aziel Runtime/);
  assert.match(html, /He Didn't Jump/);
  assert.match(html, /Is Aziel Eliab the two musicians named in 1 Chronicles 15:20\?/);
  assert.match(html, /Who\? Does not matter/);
  assert.doesNotMatch(html, /Who does not matter/);
  assert.ok(html.includes(LOCK_LINE));
  assert.match(html, /<p>Aziel Eliab is a living researcher and software designer\. Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20\.<\/p>/);
  assert.doesNotMatch(html, /Researcher\. Builder/);
  assert.doesNotMatch(html, /Flutter\/React/);
  assert.ok(html.includes(DISAMBIGUATING_DESCRIPTION));
  assert.doesNotMatch(
    html.split(DISAMBIGUATING_DESCRIPTION).join("").split(LOCK_LINE).join("").split("Not euaziel.site; not Aziel S. (Flutter/portfolio); not other engineers named Aziel.").join(""),
    /Aziel S\./
  );
  assert.match(aboutBody(), new RegExp(LOCK_LINE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(aboutBody().indexOf(LOCK_LINE) < aboutBody().indexOf("Who? Does not matter"));
  assert.match(html, /Aziel Elroi Eliab/);
  assert.match(html, new RegExp('href="' + ABOUT_PATH.replace("/", "\\/") + '"'));
  assert.match(html, new RegExp(">" + ABOUT_NAV_LABEL + "<"));
  assert.match(html, /id="aziel-eliab"/);
  assert.match(html, /https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.doesNotMatch(html, /azielcorpuslibrary\.net\/AzielEliab#aziel-eliab/);
  assert.match(html, /Part of the Aziel Eliab ecosystem/);
  assert.match(html, />Official site</);
  assert.match(html, />Corpus</);
  assert.match(html, />GodLock</);
  assert.match(html, />Runtime GitHub</);
  assert.match(html, />Glama</);
  assert.match(html, /What matters is the record/);
  assert.match(html, /1936 official Zioncheck suicide narrative/);
  assert.match(html, /does not invent court holdings/);
  assert.match(html, /href="https:\/\/godlock\.uk\/AzielEliab"/);
  assert.match(html, /godlock\.uk\/AzielEliab/);
  assert.match(html, /href="https:\/\/www\.hedidntjump\.com\/"/);
  assert.match(html, /He Didn't Jump/);
  assert.doesNotMatch(html, /royal purple/);
  assert.match(html, /class="card about-prose"/);
  assert.match(html, /class="card about-record"/);
  const recordAt = html.indexOf('class="card about-record"');
  const prose = html.slice(html.indexOf('class="card about-prose"'), recordAt);
  const record = html.slice(recordAt, html.indexOf("</aside>", recordAt));
  assert.match(prose, /Who\? Does not matter/);
  assert.match(prose, /— Aziel Elroi Eliab/);
  assert.doesNotMatch(prose, /Aziel Eliab publishes/);
  assert.doesNotMatch(prose, /Canonical Person/);
  assert.doesNotMatch(prose, /about-mission/);
  assert.doesNotMatch(prose, /The software suite is listed/);
  assert.match(record, /Aziel Eliab publishes/);
  assert.match(record, /Canonical Person/);
  assert.match(record, /about-mission/);
  assert.match(record, /The software suite is listed/);
  assert.match(record, /href="\/software"/);
  assert.match(record, /href="\/runtime"/);
  assert.match(record, /href="\/how-its-scored"/);
  assert.doesNotMatch(html, /href="\/about"/);
  assert.doesNotMatch(html, BANNED);
});

test("GET /who is 200 with H1 Who is Aziel Eliab and visible 15:20 lock", async () => {
  const url = new URL(HOST + WHO_PATH);
  const res = await handleHosted(req(WHO_PATH), url, stubEnv(), {}, null, null);
  assert.ok(res, "handleHosted should serve /who");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/html/);
  const html = await res.text();
  assert.match(html, /<h1>Who is Aziel Eliab<\/h1>/);
  assert.match(html, /<title>Who is Aziel Eliab<\/title>/);
  assert.ok(html.includes(LOCK_LINE));
  assert.match(html, /<p>Aziel Eliab is a living researcher and software designer\. Not the two Levitical musicians Aziel and Eliab named together in 1 Chronicles 15:20\.<\/p>/);
  assert.ok(html.includes(WHO_IS_AZIEL_ELIAB));
  assert.ok(whoBody().indexOf(LOCK_LINE) < whoBody().indexOf(WHO_IS_AZIEL_ELIAB));
  assert.match(html, /Is Aziel Eliab the two musicians named in 1 Chronicles 15:20\?/);
  assert.match(html, /https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.doesNotMatch(html, /azielcorpuslibrary\.net\/AzielEliab#aziel-eliab/);
  assert.doesNotMatch(html, BANNED);
  const head = await handleHosted(req(WHO_PATH, "HEAD"), new URL(HOST + WHO_PATH), stubEnv(), {}, null, null);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
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
  assert.match(html, /class="brandmark-link"/);
  assert.match(html, /src="\/sigil\.png"/);
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
  assert.match(html, /class="brandmark-link"/);
  assert.match(html, /src="\/sigil\.png"/);
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
