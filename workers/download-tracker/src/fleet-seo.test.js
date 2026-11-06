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
  assert.match(body, /href="https:\/\/www\.timetounsealthebook\.net">TimeToUnsealTheBook<\/a>/);
  assert.match(body, /href="https:\/\/timetounsealthebook\.net\/aziel">TimeToUnsealTheBook<\/a>/);
  assert.match(body, /href="https:\/\/www\.furnaceisntfree\.com\/">The Furnace Isn't Free<\/a>/);
  assert.match(body, /href="https:\/\/furnaceisntfree\.com\/aziel\/">Furnace · Aziel<\/a>/);
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
  assert.ok(json.handles.some((row) => row.href === "https://www.timetounsealthebook.net" && row.official === true));
  assert.ok(json.handles.some((row) => row.href === "https://www.furnaceisntfree.com/" && row.official === true));
  assert.ok(json.handles.some((row) => row.href === "https://furnaceisntfree.com/aziel/" && row.official === true));
  assert.equal(json.furnace_is_live_node, false);
  assert.equal(json.decryption_complete, false);
  assert.equal(json.paid_satellite, "HELD");
  assert.equal(json.cap7_is_icann, false);
  assert.equal(AZIEL_HANDLES.length, json.handles.length);
});

test("film and search hub carry the same footer", () => {
  const film = filmTheaterHtml();
  assert.match(film, /id="corpus-site-footer"/);
  assert.match(film, /Part of the Aziel Eliab ecosystem/);
  assert.match(film, /href="\/aziel"/);
  assert.match(film, /href="https:\/\/www\.furnaceisntfree\.com\/"/);
  assert.match(film, /href="https:\/\/furnaceisntfree\.com\/aziel\/"/);
  assert.match(film, /href="https:\/\/www\.timetounsealthebook\.net"/);
  assert.match(film, /href="https:\/\/aziel-runtime\.vibelock\.workers\.dev\/"/);
  assert.doesNotMatch(visible(film), /1 Chronicles 15:20/);
  assert.doesNotMatch(film, /class="brandrow"/);
  const search = page("Corpus Search", "<h1>Search the libraries</h1>", { path: "/search", kind: "search" });
  assert.match(search, /id="corpus-site-footer"/);
  assert.match(search, /Part of the Aziel Eliab ecosystem/);
  assert.match(visible(search), /href="\/aziel"/);
  assert.match(search, /aria-label="Sister sites"/);
  assert.match(search, /href="https:\/\/www\.furnaceisntfree\.com\/"/);
  assert.match(search, /href="https:\/\/furnaceisntfree\.com\/aziel\/"/);
  assert.match(search, /href="https:\/\/www\.timetounsealthebook\.net"/);
  assert.match(search, /href="https:\/\/godlock\.uk\/"/);
  assert.match(search, /href="https:\/\/www\.hedidntjump\.com\/"/);
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
  assert.match(block, /https:\/\/www\.timetounsealthebook\.net/);
  assert.match(block, /https:\/\/www\.furnaceisntfree\.com\//);
  assert.match(block, /https:\/\/furnaceisntfree\.com\/aziel\//);
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
  assert.equal(cite.unseal.official, "https://www.timetounsealthebook.net");
  assert.equal(cite.unseal.cap7_public_icann, false);
  assert.equal(cite.unseal.paid_satellite, "HELD");
  assert.equal(cite.furnace_cite.home, "https://www.furnaceisntfree.com/");
  assert.equal(cite.furnace_cite.aziel, "https://furnaceisntfree.com/aziel/");
  assert.equal(cite.furnace_cite.live, false);
  assert.equal(cite.furnace_cite.decryption_complete, false);
  assert.equal(cite.furnace_cite.cap7_public_icann, false);
  assert.equal(cite.furnace_cite.paid_satellite, "HELD");
  assert.equal(cite.furnace, "https://www.furnaceisntfree.com/");
  assert.equal(cite.unseal_official, "https://www.timetounsealthebook.net");
  assert.equal(cite.remain_off, true);
  assert.equal(cite.search_association.person_id, "https://www.azieleliab.com/#aziel");
  assert.equal(cite.search_association.cap7_is_icann, false);
  assert.equal(cite.search_association.paid_satellite, "HELD");
  assert.equal(cite.search_association.decryption_complete, false);
  assert.equal(cite.search_association.remain_off, true);
  assert.equal(cite.search_association.mesh_get_enables, false);
  assert.equal(cite.search_association.live, false);
  assert.equal(cite.person_id, "https://www.azieleliab.com/#aziel");
  assert.equal(cite.corpus_git_sha, null);
  assert.equal(cite.corpus_version_id, null);
  assert.equal(cite.corpus_tip_source, "GET /v1/health");
  assert.equal(cite.search_association.runtime_preferred, "https://www.azieleliab.com/runtime/");
  assert.equal(cite.search_association.runtime_worker, "https://aziel-runtime.vibelock.workers.dev/");
  assert.ok(cite.sameAs.indexOf("https://www.azieleliab.com/runtime/") < cite.sameAs.indexOf("https://aziel-runtime.vibelock.workers.dev/"));
  assert.equal(cite.search_association.version_url, "https://www.azielcorpuslibrary.net/v1/version");
  assert.equal(cite.search_association.health_url, "https://www.azielcorpuslibrary.net/v1/health");
  assert.ok(cite.search_association.alternateName.includes("Aziel Elroi Eliab"));
  assert.ok(cite.search_association.alternateName.includes("Elias Artista"));
  assert.ok(cite.search_association.official_sites.some((row) => row.url === "https://www.azieleliab.com/"));
  assert.ok(cite.search_association.official_sites.some((row) => row.url === "https://godlock.uk/"));
  assert.ok(cite.search_association.official_sites.some((row) => row.url === "https://www.furnaceisntfree.com/"));
  assert.ok(cite.search_association.official_sites.some((row) => row.url === "https://furnaceisntfree.com/aziel/"));
  assert.ok(cite.search_association.official_sites.some((row) => row.url === "https://www.timetounsealthebook.net"));
  assert.match(llms, /Search association:/);
  assert.match(llms, /\/v1\/version/);
  assert.match(llms, /Person sameAs prefers https:\/\/www\.azieleliab\.com\/runtime\/ alongside/);
  assert.match(llms, /Unstamped reads stay null/);
  assert.match(ai, /Allow: \/v1\/version/);
  assert.match(robots, /Allow: \/v1\/version/);
  assert.match(robots, /Person: https:\/\/www\.azieleliab\.com\/#aziel/);
  for (const loc of [
    "https://www.azieleliab.com/",
    "https://godlock.uk/",
    "https://www.hedidntjump.com/",
    "https://www.azieleliab.com/runtime/",
    "https://aziel-runtime.vibelock.workers.dev/",
    "https://www.furnaceisntfree.com/",
    "https://furnaceisntfree.com/aziel/",
    "https://www.timetounsealthebook.net",
  ]) {
    assert.match(xml, new RegExp("<loc>" + loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "</loc>"));
  }
  assert.match(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/v1\/version<\/loc>/);
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

test("GET /v1/version matches GET /v1/health tip and does not invent one", async () => {
  const { handleRuntimeApi } = await import("./runtime.js");
  const { citeDoc, llmsDoc } = await import("./crawl.js");
  const live = {
    GIT_SHA: "aed265455026ea30a5271d30187ad2e45084dc28",
    CF_VERSION_METADATA: { id: "d7ffa986-303f-4ea3-b87c-210c2f04efa7" },
  };
  const bare = {};
  async function read(path, env) {
    const res = await handleRuntimeApi(
      new Request("https://www.azielcorpuslibrary.net" + path),
      new URL("https://www.azielcorpuslibrary.net" + path),
      env,
      {},
    );
    assert.equal(res.status, 200, path);
    return res.json();
  }
  const unstamped = await read("/v1/version", bare);
  assert.equal(unstamped.person_id, "https://www.azieleliab.com/#aziel");
  assert.equal(unstamped.git_sha, null);
  assert.equal(unstamped.version_id, null);
  assert.equal(unstamped.tip_source, "GET /v1/health");
  assert.equal(unstamped.cap7_is_icann, false);
  assert.equal(unstamped.paid_satellite, "HELD");
  assert.equal(unstamped.decryption_complete, false);
  assert.equal(unstamped.remain_off, true);
  assert.equal(unstamped.mesh_get_enables, false);
  const version = await read("/v1/version", live);
  const health = await read("/v1/health", live);
  assert.equal(version.git_sha, health.git_sha);
  assert.equal(version.version_id, health.version_id);
  assert.equal(version.git_sha, live.GIT_SHA);
  assert.equal(version.version_id, live.CF_VERSION_METADATA.id);
  assert.equal(version.git_sha.slice(0, 8), "aed26545");
  assert.equal(version.version_id.slice(0, 8), "d7ffa986");
  const cite = citeDoc(null, null, null, { git_sha: version.git_sha, version_id: version.version_id });
  assert.equal(cite.corpus_git_sha, version.git_sha);
  assert.equal(cite.corpus_version_id, version.version_id);
  assert.equal(cite.person_id, "https://www.azieleliab.com/#aziel");
  const llms = llmsDoc("limit", null, null, null, { git_sha: version.git_sha, version_id: version.version_id });
  assert.match(llms, /aed265455026ea30a5271d30187ad2e45084dc28/);
  assert.match(llms, /d7ffa986-303f-4ea3-b87c-210c2f04efa7/);
  assert.match(llms, /Do not invent a second tip/);
});
