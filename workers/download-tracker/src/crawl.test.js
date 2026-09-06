import test from "node:test";
import assert from "node:assert/strict";
import {
  robotsTxt,
  sitemapXml,
  citeDoc,
  llmsDoc,
  aiTxt,
  humansTxt,
  isReadMethod,
  crawlResponse,
  MIME,
  AI_BOTS,
} from "./crawl.js";

const BANNED = /Collin Horton|GodLock\.AZ|\+25|quiet (Aziel|triad|boost)|10\.5281\/zenodo/i;

function assertPublicIdentity(text) {
  assert.match(text, /Aziel Eliab/);
  assert.match(text, /Aziel Elroi Eliab/);
  assert.doesNotMatch(text, BANNED);
}

test("robots.txt allows research surfaces and major AI bots", () => {
  const txt = robotsTxt();
  assertPublicIdentity(txt);
  for (const path of ["/ai.txt", "/how-its-scored", "/humans.txt", "/software", "/runtime", "/runtime/v1/uses", "/AzielEliab"]) {
    assert.match(txt, new RegExp("Allow: " + path.replace("/", "\\/")));
  }
  assert.match(txt, /Content-Signal: search=yes, ai-input=yes, ai-train=yes/);
  assert.match(txt, /Disallow: \/signup/);
  assert.match(txt, /Disallow: \/logout/);
  assert.match(txt, /Disallow: \/api\//);
  assert.match(txt, /Disallow: \/admin\//);
  assert.match(txt, /Allow: \/v1\//);
  assert.doesNotMatch(txt, /Disallow: \/v1/);
  assert.match(txt, /Sitemap: https:\/\/www\.azielcorpuslibrary\.net\/sitemap\.xml/);
  for (const bot of [
    "Claude-SearchBot",
    "bingbot",
    "Meta-ExternalAgent",
    "CCBot",
    "MistralAI-User",
    "DuckDuckBot",
    "Googlebot",
    "Google-Extended",
    "GoogleOther",
    "Google-CloudVertexBot",
    "OAI-SearchBot",
    "xAI-SearchBot",
    "cohere-ai",
    "Diffbot",
    "AI2Bot",
    "Timpibot",
    "Petalbot",
    "Omgilibot",
    "FirecrawlAgent",
    "ImagesiftBot",
    "FacebookBot",
    "facebookexternalhit",
    "Meta-ExternalAds",
    "TikTokSpider",
    "Baiduspider",
    "Baiduspider-render",
    "Baiduspider-ai",
    "YandexBot",
    "PanguBot",
    "Kangaroo Bot",
    "Cotoyogi",
    "aiHitBot",
    "webzio-extended",
    "ICC-Crawler",
    "DataForSeoBot",
    "AwarioBot",
    "AwarioSmartBot",
    "AwarioRssBot",
    "Sentibot",
    "peer39_crawler",
    "Seekr",
    "Meltwater",
    "TurnitinBot",
    "Factset_spyderbot",
    "NeevaBot",
  ]) {
    assert.match(txt, new RegExp("User-agent: " + bot));
  }
  assert.equal(new Set(AI_BOTS).size, AI_BOTS.length);
  for (const bot of AI_BOTS) {
    const escaped = bot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(txt, new RegExp("User-agent: " + escaped + "\\nAllow: /"));
    assert.equal((txt.match(new RegExp("User-agent: " + escaped + "\\n", "g")) || []).length, 1);
  }
});

test("sitemap.xml lists key routes and uses XML mime helper", async () => {
  const env = {
    DB: {
      prepare() {
        return {
          bind() { return this; },
          async all() {
            return {
              results: [
                { record_id: "AZDOC-AZIEL1", created_utc: "2026-08-01T00:00:00Z", library: "aziel" },
                { record_id: "AZDOC-CORPUS1", created_utc: "2026-07-01", library: "corpus" },
              ],
            };
          },
        };
      },
    },
  };
  const xml = await sitemapXml(env);
  assert.match(xml, /<\?xml version="1.0"/);
  for (const path of ["/", "/AzielEliab", "/software", "/runtime", "/runtime/", "/runtime/v1/fraggate", "/runtime/v1/fraggate/list", "/runtime/v1/uses", "/runtime/mcp", "/runtime/llms.txt", "/runtime/cite.json", "/runtime/robots.txt", "/how-its-scored", "/pattern", "/map", "/tree", "/gazetteer", "/historical", "/intelligence", "/aziel-library", "/corpus", "/cite.json", "/llms.txt", "/ai.txt"]) {
    assert.match(xml, new RegExp("<loc>https://www\\.azielcorpuslibrary\\.net" + path.replace("/", "\\/") + "</loc>"));
  }
  assert.doesNotMatch(xml, /azielcorpuslibrary\.net\/about</);
  assert.match(xml, /\/record\/AZDOC-AZIEL1/);
  assert.match(xml, /<lastmod>2026-08-01<\/lastmod>/);
  assert.match(xml, /<lastmod>2026-07-01<\/lastmod>/);
  assert.doesNotMatch(xml, BANNED);
  assert.equal(MIME.xml, "application/xml; charset=utf-8");
  assert.equal(MIME.plain, "text/plain; charset=utf-8");
  assert.equal(MIME.json, "application/json; charset=utf-8");
});

test("cite.json, llms.txt, ai.txt, and humans.txt carry identity and hubs", () => {
  const cite = citeDoc();
  assert.equal(cite.author, "Aziel Eliab");
  assert.equal(cite.aka, "Aziel Elroi Eliab");
  assert.equal(cite.alternateName, "Aziel Elroi Eliab");
  assert.equal(cite.doi, null);
  assert.match(cite.github, /AzielEliab\/aziel-corpus/);
  assert.match(cite.software, /\/software$/);
  assert.match(cite.how_its_scored, /\/how-its-scored$/);
  assert.match(cite.about, /\/AzielEliab$/);
  assert.equal(cite.godlock, "https://godlock.uk/AzielEliab");
  assert.ok(cite.sameAs.includes("https://godlock.uk/AzielEliab"));
  assert.ok(cite.sameAs.includes("https://github.com/AzielEliab"));
  assert.ok(cite.sameAs.includes("https://github.com/AzielEliab/aziel-corpus"));
  assert.ok(cite.keywords.includes("GodLock"));
  assert.ok(cite.keywords.includes("FragGate"));
  assert.match(cite.runtime_note, /1\.6\.2/);
  assert.match(cite.runtime_fraggate_list, /\/runtime\/v1\/fraggate\/list$/);
  assert.match(cite.runtime_uses, /\/runtime\/v1\/uses$/);
  assert.match(cite.ai, /\/ai\.txt$/);
  assert.match(cite.zsolver, /intentional suppression confidence/);
  assert.doesNotMatch(JSON.stringify(cite), BANNED);

  const llms = llmsDoc("LIMIT");
  assertPublicIdentity(llms);
  assert.match(llms, /Software hub: https:\/\/www\.azielcorpuslibrary\.net\/software/);
  assert.match(llms, /https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab/);
  assert.match(llms, /https:\/\/godlock\.uk\/AzielEliab/);
  assert.match(llms, /Runtime catalog: https:\/\/www\.azielcorpuslibrary\.net\/runtime/);
  assert.match(llms, /How it's scored/);
  assert.match(llms, /\/ai\.txt/);
  assert.match(llms, /aziel-runtime\.vibelock\.workers\.dev/);
  assert.match(llms, /1\.6\.2/);
  assert.match(llms, /FragGate/);
  assert.match(llms, /fraggate_list/);
  assert.match(llms, /\/runtime\/v1\/fraggate\/list/);
  assert.match(llms, /\/runtime\/v1\/uses/);
  assert.match(llms, /ChatGPT, Grok, Venice, Claude, Cursor, Glama/);
  assert.doesNotMatch(llms, /1\.4\.0 engine-runtime/);

  const ai = aiTxt("LIMIT");
  assertPublicIdentity(ai);
  for (const bot of [
    "GPTBot",
    "Google-Extended",
    "ClaudeBot",
    "Claude-SearchBot",
    "anthropic-ai",
    "PerplexityBot",
    "Bytespider",
    "bingbot",
    "Meta-ExternalAgent",
    "CCBot",
    "MistralAI-User",
    "DuckDuckBot",
    "OAI-SearchBot",
    "xAI-SearchBot",
    "GoogleOther",
    "Google-CloudVertexBot",
    "cohere-ai",
    "cohere-training-data-crawler",
    "Diffbot",
    "AI2Bot",
    "AI2Bot-Dolma",
    "Timpibot",
    "Petalbot",
    "Omgili",
    "Omgilibot",
    "FirecrawlAgent",
    "ImagesiftBot",
    "FacebookBot",
    "facebookexternalhit",
    "Meta-ExternalAds",
    "TikTokSpider",
    "Baiduspider",
    "Baiduspider-render",
    "Baiduspider-ai",
    "YandexBot",
    "PanguBot",
    "Kangaroo Bot",
    "Cotoyogi",
    "aiHitBot",
    "webzio-extended",
    "ICC-Crawler",
    "DataForSeoBot",
    "AwarioBot",
    "AwarioSmartBot",
    "AwarioRssBot",
    "Sentibot",
    "peer39_crawler",
    "Seekr",
    "Meltwater",
    "TurnitinBot",
    "Factset_spyderbot",
    "NeevaBot",
  ]) {
    assert.match(ai, new RegExp("User-agent: " + bot));
  }
  for (const bot of AI_BOTS) {
    const escaped = bot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(ai, new RegExp("User-agent: " + escaped + "\\nAllow: /"));
    assert.equal((ai.match(new RegExp("User-agent: " + escaped + "\\n", "g")) || []).length, 1);
  }
  assert.match(ai, /Allow: \/how-its-scored/);
  assert.match(ai, /Allow: \/AzielEliab/);
  assert.match(ai, /Allow: \/v1\//);
  assert.match(ai, /https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab/);
  assert.match(ai, /https:\/\/godlock\.uk\/AzielEliab/);
  assert.match(ai, /Disallow: \/signup/);
  assert.match(ai, /Disallow: \/logout/);
  assert.match(ai, /Disallow: \/api\//);
  assert.match(ai, /Disallow: \/admin\//);
  assert.doesNotMatch(ai, /Disallow: \/v1/);

  const humans = humansTxt();
  assertPublicIdentity(humans);
  assert.match(humans, /github.com\/AzielEliab/);
  assert.match(humans, /azielcorpuslibrary\.net\/AzielEliab/);
  assert.match(humans, /godlock\.uk\/AzielEliab/);
});

test("crawlResponse serves GET body and HEAD without body", async () => {
  assert.equal(isReadMethod("GET"), true);
  assert.equal(isReadMethod("HEAD"), true);
  assert.equal(isReadMethod("POST"), false);
  const get = crawlResponse({ method: "GET" }, "hello", MIME.plain);
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("content-type"), MIME.plain);
  assert.equal(await get.text(), "hello");
  const head = crawlResponse({ method: "HEAD" }, "hello", MIME.xml);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-type"), MIME.xml);
  assert.equal(await head.text(), "");
});
