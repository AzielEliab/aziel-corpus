import test from "node:test";
import assert from "node:assert/strict";
import {
  AZIEL_HANDLES,
  AZIEL_HANDLES_PATH,
  ABOUT_PATH,
  CAP7_PUBLIC,
  DECRYPTION_PUBLIC,
  LIVE_HOLD_PUBLIC,
  PAID_SAT_PUBLIC,
  TAB_PATHS,
  UNSEAL_AZIEL,
  aboutRedirectFrom,
  azielHandlesDoc,
  defaultDescription,
  fleetSeoPlainBlock,
  handlesRedirectFrom,
  siteFooterHtml,
} from "./seo.js";
import { azielHandlesBody, page } from "./ui.js";
import { filmTheaterHtml } from "./film.js";
import { aiTxt, citeDoc, llmsDoc, robotsTxt, sitemapXml } from "./crawl.js";
import { handleHosted } from "./hosted.js";

function visible(html) {
  return String(html)
    .replace(/^[\s\S]*<body>/i, "")
    .replace(/<\/body>[\s\S]*$/i, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
}

test("/aziel is the handles path and does not fold into /AzielEliab", () => {
  assert.equal(AZIEL_HANDLES_PATH, "/aziel");
  assert.equal(aboutRedirectFrom("/aziel"), null);
  assert.equal(aboutRedirectFrom("/Aziel"), null);
  assert.equal(aboutRedirectFrom("/aziel/"), null);
  assert.equal(handlesRedirectFrom("/aziel"), null);
  assert.equal(handlesRedirectFrom("/Aziel"), "/aziel");
  assert.equal(handlesRedirectFrom("/AZIEL/"), "/aziel");
  assert.notEqual(ABOUT_PATH, AZIEL_HANDLES_PATH);
});

test("handles page lists public doors and keeps 15:20 off the visible page", () => {
  const html = page("Aziel", azielHandlesBody(), { path: "/aziel", kind: "handles" });
  const body = visible(html);
  assert.match(html, /<title>Aziel handles — Aziel Digital Library<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/www\.azielcorpuslibrary\.net\/aziel"/);
  assert.match(body, /<h1>Aziel<\/h1>/);
  assert.match(body, /<h2>Handles<\/h2>/);
  assert.match(body, /href="https:\/\/www\.azieleliab\.com\/">azieleliab\.com<\/a>/);
  assert.match(body, /href="https:\/\/timetounsealthebook\.net\/aziel">TimeToUnsealTheBook<\/a>/);
  assert.match(body, /href="https:\/\/x\.com\/AzielEliab">X @AzielEliab<\/a>/);
  assert.match(body, /He Didn't Jump is a handle, not a Live Node/);
  assert.match(body, /TimeToUnsealTheBook is a handle, not a Live Node/);
  assert.match(body, /id="corpus-site-footer"/);
  assert.match(body, /Part of the Aziel Eliab ecosystem/);
  assert.match(body, /href="\/llms\.txt"/);
  assert.match(body, /href="\/person\.jsonld">person</);
  assert.match(body, /Growth-ON\. Allow/);
  assert.match(body, /decryption_complete stays false/);
  assert.doesNotMatch(body, /1 Chronicles 15:20/);
  assert.doesNotMatch(body, /identity-lock/);
  assert.doesNotMatch(defaultDescription("handles"), /1 Chronicles 15:20/);
  const json = azielHandlesDoc();
  assert.equal(json.path, "/aziel");
  assert.equal(json.cap7_is_icann, false);
  assert.equal(json.paid_satellite, "HELD");
  assert.equal(json.decryption_complete, false);
  assert.equal(json.live, false);
  assert.equal(json.he_didnt_jump_is_live_node, false);
  assert.equal(json.unseal_is_live_node, false);
  assert.ok(json.handles.some((row) => row.href === UNSEAL_AZIEL && row.label === "TimeToUnsealTheBook"));
  assert.equal(AZIEL_HANDLES.length, json.handles.length);
});

test("film and search hub carry the same footer", () => {
  const film = filmTheaterHtml();
  assert.match(film, /id="corpus-site-footer"/);
  assert.match(film, /Part of the Aziel Eliab ecosystem/);
  assert.match(film, /href="\/aziel"/);
  assert.doesNotMatch(visible(film), /1 Chronicles 15:20/);
  assert.doesNotMatch(film, /class="brandrow"/);
  const search = page("Corpus Search", "<h1>Search the libraries</h1>", { path: "/search", kind: "search" });
  assert.match(search, /id="corpus-site-footer"/);
  assert.match(search, /Part of the Aziel Eliab ecosystem/);
  assert.match(visible(search), /href="\/aziel"/);
  assert.doesNotMatch(visible(search), /1 Chronicles 15:20/);
});

test("each tab path is unique and the footer lists it", () => {
  const hrefs = TAB_PATHS.map((tab) => tab.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.ok(hrefs.includes("/"));
  assert.ok(hrefs.includes("/search"));
  assert.ok(hrefs.includes("/aziel"));
  assert.ok(hrefs.includes("/corpus"));
  assert.ok(hrefs.includes("/receipts"));
  assert.ok(hrefs.includes("/runtime"));
  const footer = siteFooterHtml();
  for (const href of hrefs) {
    assert.match(footer, new RegExp('href="' + href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"'));
  }
  assert.match(footer, new RegExp(CAP7_PUBLIC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(footer, new RegExp(PAID_SAT_PUBLIC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(footer, new RegExp(DECRYPTION_PUBLIC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(footer, new RegExp(LIVE_HOLD_PUBLIC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("crawler surfaces list pretty paths, Allow, and the Unseal handle", async () => {
  const block = fleetSeoPlainBlock();
  assert.match(block, /Paths \(not hash-only\)/);
  assert.match(block, /https:\/\/www\.azielcorpuslibrary\.net\/aziel/);
  assert.match(block, /https:\/\/timetounsealthebook\.net\/aziel/);
  assert.match(block, /He Didn't Jump is a handle\. It is not a Live Node/);
  assert.match(block, /Growth-ON\. Allow: \//);
  assert.match(block, /Person: https:\/\/www\.azieleliab\.com\/#aziel/);
  const llms = llmsDoc("limit");
  const ai = aiTxt("limit");
  assert.match(llms, /Paths \(not hash-only\)/);
  assert.match(ai, /Paths \(not hash-only\)/);
  assert.match(llms, /https:\/\/timetounsealthebook\.net\/aziel/);
  const robots = robotsTxt();
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Allow: \/aziel/);
  assert.match(robots, /Growth-ON/);
  assert.match(robots, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);
  assert.doesNotMatch(robots, /Disallow:[^\n]*GPTBot/);
  assert.doesNotMatch(robots, /User-agent: GPTBot\nDisallow/);
  assert.match(ai, /Allow: \/aziel/);
  assert.doesNotMatch(ai, /Disallow:[^\n]*GPTBot/);
  const xml = await sitemapXml({});
  assert.match(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/aziel<\/loc>/);
  assert.match(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab<\/loc>/);
  const cite = citeDoc();
  assert.equal(cite.cap7_is_icann, false);
  assert.equal(cite.paid_satellite, "HELD");
  assert.equal(cite.decryption_complete, false);
  assert.equal(cite.live, false);
  assert.equal(cite.growth, "ON");
  assert.equal(cite.crawl, "Allow");
  assert.equal(cite.paths_not_hash_only, true);
  assert.equal(cite.person_id, "https://www.azieleliab.com/#aziel");
  assert.ok(cite.tab_paths.includes("https://www.azielcorpuslibrary.net/aziel"));
  assert.equal(cite.unseal.aziel, UNSEAL_AZIEL);
  assert.equal(cite.unseal.live, false);
  assert.equal(cite.unseal.live_node, false);
  assert.equal(cite.unseal.decryption_complete, false);
});

test("GET /aziel answers HTML and JSON without redirecting to /AzielEliab", async () => {
  const env = {};
  const htmlRes = await handleHosted(
    new Request("https://www.azielcorpuslibrary.net/aziel", { headers: { Accept: "text/html" } }),
    new URL("https://www.azielcorpuslibrary.net/aziel"),
    env,
    {},
    null,
  );
  assert.equal(htmlRes.status, 200);
  const html = await htmlRes.text();
  assert.match(html, /id="corpus-site-footer"/);
  assert.match(html, /timetounsealthebook\.net\/aziel/);
  assert.doesNotMatch(visible(html), /1 Chronicles 15:20/);
  const folded = await handleHosted(
    new Request("https://www.azielcorpuslibrary.net/Aziel"),
    new URL("https://www.azielcorpuslibrary.net/Aziel"),
    env,
    {},
    null,
  );
  assert.equal(folded.status, 301);
  assert.equal(folded.headers.get("location"), "/aziel");
  const jsonRes = await handleHosted(
    new Request("https://www.azielcorpuslibrary.net/aziel?format=json"),
    new URL("https://www.azielcorpuslibrary.net/aziel?format=json"),
    env,
    {},
    null,
  );
  assert.equal(jsonRes.status, 200);
  const doc = await jsonRes.json();
  assert.equal(doc.path, "/aziel");
  assert.equal(doc.decryption_complete, false);
  assert.equal(doc.cap7_is_icann, false);
});
