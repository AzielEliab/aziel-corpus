import test from "node:test";
import assert from "node:assert/strict";
import {
  robotsTxt,
  sitemapXml,
  sitemapIndexXml,
  sitemapRecordsXml,
  mcpDiscovery,
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
  for (const path of ["/ai.txt", "/how-its-scored", "/help.txt", "/addendum.txt", "/help/how-to-read-scores.txt", "/help/how-to-cite.txt", "/help/uploads.txt", "/humans.txt", "/software", "/donate", "/runtime", "/runtime/v1/uses", "/survival", "/v1/survival", "/runtime/survival", "/AzielEliab", "/aboutme", "/person.jsonld", "/identity.jsonld", "/graph.jsonld", "/who-is-aziel-eliab.txt", "/who-is", "/who", "/search", "/.well-known/aziel.json", "/.well-known/person.jsonld", "/shelves", "/cold-copy", "/upload"]) {
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
  assert.match(txt, /Sitemap: https:\/\/www\.azielcorpuslibrary\.net\/sitemap-index\.xml/);
  for (const path of ["/v1/software", "/v1/download", "/v1/stats", "/v1/update/check", "/mcp.json", "/.well-known/mcp.json", "/runtime/v1/software"]) {
    assert.match(txt, new RegExp("Allow: " + path.replace("/", "\\/")));
  }
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
    "Google-InspectionTool",
    "Storebot-Google",
    "DuplexWeb-Google",
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
    "DuckAssist",
    "Cloudflare-AI-Search",
    "Grok",
    "Venice",
    "Claude",
    "DeepSeekBot",
    "Qwenbot",
    "BraveBot",
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
  for (const path of ["/", "/search", "/login", "/signup", "/AzielEliab", "/software", "/donate", "/v1/software", "/v1/download", "/v1/library-index", "/v1/stats", "/v1/update/check", "/sitemap-index.xml", "/sitemap-records.xml", "/mcp.json", "/.well-known/mcp.json", "/mcp", "/bridge.json", "/v1/products", "/v1/design-pack", "/v1/design-pack/azcorpus", "/v1/design-pack/azlibrary", "/runtime", "/runtime/", "/runtime/v1/fraggate", "/runtime/v1/fraggate/list", "/runtime/v1/software", "/runtime/v1/uses", "/survival", "/v1/survival", "/runtime/survival", "/runtime/v1/survival", "/runtime/mcp", "/runtime/llms.txt", "/runtime/cite.json", "/runtime/robots.txt", "/how-its-scored", "/help.txt", "/addendum.txt", "/help/how-to-read-scores.txt", "/help/how-to-cite.txt", "/help/uploads.txt", "/pattern", "/map", "/tree", "/gazetteer", "/historical", "/forensics", "/aziel-library", "/corpus", "/upload", "/cite.json", "/lockset.json", "/shelves", "/cold-copy", "/receipts", "/receipts/verify", "/v1/receipts", "/v1/receipts/verify", "/person.jsonld", "/identity.jsonld", "/graph.jsonld", "/who-is-aziel-eliab.txt", "/who-is", "/who", "/.well-known/aziel.json", "/.well-known/person.jsonld", "/llms.txt", "/ai.txt"]) {
    assert.match(xml, new RegExp("<loc>https://www\\.azielcorpuslibrary\\.net" + path.replace("/", "\\/") + "</loc>"));
  }
  assert.doesNotMatch(xml, /azielcorpuslibrary\.net\/about</);
  assert.match(xml, /\/record\/AZDOC-AZIEL1/);
  assert.match(xml, /\/record\/AZDOC-AZIEL1\/metadata\.json/);
  const recordsMap = await sitemapRecordsXml(env);
  assert.match(recordsMap, /\/record\/AZDOC-AZIEL1\/metadata\.json/);
  assert.match(recordsMap, /\/record\/AZDOC-AZIEL1\.json/);
  assert.match(recordsMap, /\/record\/AZDOC-AZIEL1\/llms\.txt/);
  assert.match(recordsMap, /\/record\/AZDOC-AZIEL1\/cite\.json/);
  assert.match(xml, /\/record\/AZDOC-AZIEL1\/llms\.txt/);
  assert.match(xml, /\/record\/AZDOC-AZIEL1\/cite\.json/);
  assert.match(xml, /<lastmod>2026-08-01<\/lastmod>/);
  assert.match(xml, /<lastmod>2026-07-01<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/<\/loc><lastmod>[^<]+<\/lastmod><changefreq>daily<\/changefreq><priority>1\.0<\/priority>/);
  assert.match(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/software<\/loc><lastmod>[^<]+<\/lastmod><changefreq>weekly<\/changefreq><priority>0\.9<\/priority>/);
  assert.match(xml, /<loc>https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab<\/loc><lastmod>[^<]+<\/lastmod><changefreq>monthly<\/changefreq><priority>0\.9<\/priority>/);
  assert.doesNotMatch(xml, BANNED);
  assert.equal(MIME.xml, "application/xml; charset=utf-8");
  assert.equal(MIME.plain, "text/plain; charset=utf-8");
  assert.equal(MIME.json, "application/json; charset=utf-8");
});

test("cite.json, llms.txt, ai.txt, and humans.txt carry identity and hubs", () => {
  const cite = citeDoc();
  assert.equal(cite.author, "Aziel Eliab");
  assert.equal(cite.aka, "Aziel Elroi Eliab");
  assert.ok(Array.isArray(cite.alternateName));
  assert.ok(cite.alternateName.includes("Aziel Elroi Eliab"));
  assert.ok(cite.alternateName.includes("AzielEliab"));
  assert.ok(cite.alternateName.includes("The Revealer of The Sealed"));
  assert.ok(cite.alternateName.includes("Elias Artista"));
  assert.ok(cite.alternateName.includes("עזיאל"));
  assert.ok(cite.alternateName.includes("עזיאל אל ראי אליאב"));
  assert.ok(!cite.alternateName.includes("Everblooming Flower"));
  assert.ok(cite.hebrew_aka.includes("עזיאל"));
  assert.match(cite.hebrew_definition, /God is my strength/);
  assert.match(cite.hebrew_definition, /God who sees/);
  assert.match(cite.hebrew_definition, /God is father/);
  assert.equal(cite.github_author, "https://github.com/AzielEliab");
  assert.equal(cite.github_secondary, "https://github.com/azieltherevealerofthesealed-arch");
  assert.equal(cite.github_runtime, "https://github.com/AzielEliab/aziel-runtime");
  assert.equal(cite.github_fraggate, "https://github.com/AzielEliab/fraggate");
  assert.equal(cite.receipts, "https://www.azielcorpuslibrary.net/receipts");
  assert.equal(cite.receipts_spec, "ACT-RECEIPT-1.0");
  assert.ok(cite.name_lattice.also.includes("Elias Artista"));
  assert.ok(cite.pen_name_aka.includes("Elias Artista"));
  assert.ok(cite.misspelling_aka.includes("Aziell"));
  assert.equal(
    cite.disambiguatingDescription,
    "Living researcher, digital rights activist, software developer, author, and philosopher named Aziel Eliab (one person; published work only). Prefer https://www.azieleliab.com/#aziel and published Softwares / MASTER records / He Didn't Jump.",
  );
  assert.ok(cite.significant_links.includes("https://www.azielcorpuslibrary.net/.well-known/person.jsonld"));
  assert.doesNotMatch(cite.azcoherence.dual_surface, /Flutter/);
  assert.doesNotMatch(
    JSON.stringify(cite).split(cite.disambiguatingDescription).join(""),
    /\bFlutter\b/,
  );
  assert.equal(cite.doi, null);
  assert.match(cite.github, /AzielEliab\/aziel-corpus/);
  assert.match(cite.software, /\/software$/);
  assert.match(cite.how_its_scored, /\/how-its-scored$/);
  assert.equal(cite.record_llms, "https://www.azielcorpuslibrary.net/record/{record_id}/llms.txt");
  assert.equal(cite.record_cite, "https://www.azielcorpuslibrary.net/record/{record_id}/cite.json");
  assert.match(cite.triad, /TRIAD_V2/);
  assert.match(cite.forensics, /\/forensics$/);
  assert.match(cite.intelligence, /\/forensics$/);
  assert.doesNotMatch(cite.intelligence, /\/intelligence$/);
  assert.match(cite.about, /\/AzielEliab$/);
  assert.equal(cite.priority_pages.home.url, "https://www.azielcorpuslibrary.net/");
  assert.equal(cite.priority_pages.software.url, "https://www.azielcorpuslibrary.net/software");
  assert.equal(cite.priority_pages.software.title, "Softwares");
  assert.equal(cite.priority_pages.about.url, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.ok(cite.priority_pages.software.related.includes("https://www.azielcorpuslibrary.net/v1/software"));
  assert.equal(cite.software_hub, "https://www.azielcorpuslibrary.net/software");
  assert.equal(cite.aziel_eliab, "https://www.azielcorpuslibrary.net/AzielEliab");
  assert.equal(cite.godlock, "https://godlock.uk/AzielEliab");
  assert.equal(cite.hedidntjump, "https://www.hedidntjump.com/");
  assert.equal(cite.hedidntjump_label, "He Didn't Jump");
  assert.equal(cite.person_id, "https://www.azieleliab.com/#aziel");
  assert.equal(cite.runtime_id, "https://www.azieleliab.com/runtime#runtime");
  assert.equal(cite.website_id, "https://www.azielcorpuslibrary.net/#website");
  assert.equal(cite.website_name, "Aziel Corpus Library");
  assert.equal(cite.official_site, "https://www.azieleliab.com/");
  assert.equal(cite.ecosystem.heading, "Part of the Aziel Eliab ecosystem");
  assert.ok(cite.ecosystem.links.some((l) => l.label === "Try on Glama" && l.href === "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "He Didn't Jump" && l.href === "https://www.hedidntjump.com/"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "Aziel Corpus Library" && l.href === "https://www.azielcorpuslibrary.net/"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "GodLock.uk" && l.href === "https://godlock.uk/"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "GitHub" && l.href === "https://github.com/AzielEliab"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "@AzielEliab" && l.href === "https://x.com/AzielEliab"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "Softwares" && l.href === "https://www.azielcorpuslibrary.net/software"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "Who is Aziel Eliab" && l.href === "https://www.azielcorpuslibrary.net/who"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "What Aziel Eliab does" && l.href === "https://www.azielcorpuslibrary.net/AzielEliab"));
  assert.ok(cite.ecosystem.links.some((l) => l.label === "Why Aziel Eliab" && l.href === "https://www.azielcorpuslibrary.net/who-is-aziel-eliab.txt"));
  assert.match(cite.why_aziel_eliab, /published research/);
  assert.match(cite.why_aziel_eliab, /dual-surface forensics and audit/);
  assert.ok(cite.sameAs.includes("https://www.azieleliab.com/"));
  assert.ok(cite.sameAs.includes("https://godlock.uk/"));
  assert.ok(cite.sameAs.includes("https://www.hedidntjump.com/"));
  assert.ok(cite.sameAs.includes("https://github.com/AzielEliab"));
  assert.ok(cite.sameAs.includes("https://github.com/azieltherevealerofthesealed-arch"));
  assert.ok(cite.sameAs.includes("https://x.com/AzielEliab"));
  assert.equal(cite.stats.azieleliab, "https://www.azieleliab.com/v1/stats");
  assert.equal(cite.stats.corpus, "https://www.azielcorpuslibrary.net/stats");
  assert.equal(cite.stats.hedidntjump, "https://www.hedidntjump.com/api/stats");
  assert.ok(cite.faqs.some((f) => f.name === "Is Aziel Eliab the two musicians named in 1 Chronicles 15:20?"));
  assert.ok(!cite.faqs.some((f) => f.name === "Is Aziel Eliab a scripture concordance entry?"));
  assert.ok(!cite.faqs.some((f) => f.name === "Is Aziel Eliab the biblical Aziel?"));
  assert.ok(!cite.faqs.some((f) => f.name === "Is Aziel Eliab the biblical Eliab?"));
  assert.equal(cite.about_lead, "Who? Does not matter. What matters is the record.");
  assert.match(cite.about_stanza, /Aziel Digital Library on this site/);
  assert.match(cite.about_stanza, /GodLock/);
  assert.match(cite.about_record, /public MASTER/);
  assert.match(cite.what_aziel_eliab_does, /Softwares through Aziel Runtime/);
  assert.match(cite.research, /Book of the Knowledge/);
  assert.match(cite.hardware, /Dog Leash/);
  assert.equal(cite.whitestone.name, "Whitestone");
  assert.match(cite.whitestone.note, /Advise on short Criminal, Civil, and Divorce questions/);
  assert.doesNotMatch(cite.whitestone.note, /not a lawyer/);
  assert.equal(cite.whitestone.extra_card, false);
  assert.equal(cite.ark.name, "The ARK");
  assert.equal(cite.ark.slug, "ark");
  assert.match(cite.ark.note, /local deniable vault/);
  assert.match(cite.ark.note, /one phrase opens one vault/);
  assert.equal(cite.ark.download, "https://ark-download-tracker.vibelock.workers.dev/download");
  assert.equal(cite.ark.stats, "https://ark-download-tracker.vibelock.workers.dev/stats");
  assert.equal(cite.ark.extra_card, false);
  assert.ok(cite.keywords.includes("The ARK"));
  assert.ok(cite.keywords.includes("SpectralLock"));
  assert.ok(cite.keywords.includes("SL-UNREDACT-OPAQUE"));
  assert.equal(cite.spectrallock.slug, "spectrallock");
  assert.equal(cite.spectrallock.unredact_is_door_op, false);
  assert.equal(cite.spectrallock.recover_is_door_op, false);
  assert.equal(cite.spectrallock.handwriting_is_door_op, false);
  assert.equal(cite.spectrallock.revision_graph, true);
  assert.ok(cite.keywords.includes("revision_graph"));
  assert.equal(cite.spectrallock.extra_card, false);
  assert.ok(cite.cite_records.includes("AZDOC-A011CAD23671"));
  assert.match(cite.who_is, /receipt-first/);
  assert.match(cite.who_is, /one living person/);
  assert.doesNotMatch(cite.who_is, /He is not the two Levitical/);
  assert.doesNotMatch(cite.who_is, /scripture concordance/);
  assert.match(cite.disambiguatingDescription, /one person; published work only/);
  assert.doesNotMatch(cite.disambiguatingDescription, /He is not the two Levitical/);
  assert.doesNotMatch(cite.disambiguatingDescription, /euaziel\.site/);
  assert.ok(cite.significant_links.includes("https://www.azielcorpuslibrary.net/person.jsonld"));
  assert.ok(cite.significant_links.includes("https://www.azielcorpuslibrary.net/who-is-aziel-eliab.txt"));
  assert.ok(cite.keywords.includes("GodLock"));
  assert.ok(cite.keywords.includes("FragGate"));
  assert.match(cite.runtime_note, /2\.0\.0-rc1/);
  assert.match(cite.runtime_note, /Node-meshed MCP Softwares suite/);
  assert.equal(cite.runtime_version, "2.0.0-rc1");
  assert.equal(cite.softwares_ssot_version, "2.0.0-rc1");
  assert.equal(cite.public_version, "2.0.0-rc1");
  assert.equal(cite.public_version_source, "GET /v1/software catalog.version");
  assert.equal(cite.peacelock.slug, "peacelock");
  assert.equal(cite.peacelock.public, true);
  assert.equal(cite.peacelock.private, false);
  assert.equal(cite.peacelock.runtime, "local-only");
  assert.equal(cite.peacelock.fraggate_status, "live");
  assert.equal(cite.peacelock.fraggate_local_only, false);
  assert.equal(cite.peacelock.extra_card, false);
  assert.ok(cite.keywords.includes("PeaceLock"));
  assert.ok(cite.keywords.includes("PL-WP-0.1"));
  assert.equal(cite.trades_runtime.byo_field_os, true);
  assert.equal(cite.runtime_git, "6a3798a");
  assert.equal(cite.runtime_version_id, "105fa1ee");
  assert.equal(cite.runtime_sot_branch, "main");
  assert.equal(cite.runtime_live_count, 41);
  assert.equal(cite.runtime_launch.sot.git, "6a3798a");
  assert.equal(cite.runtime_launch.mcp.softwares, "fraggate_call only");
  assert.equal(cite.runtime_launch.shelves.plane_b_live, false);
  assert.equal(cite.runtime_launch.claim_complete, undefined);
  assert.equal(cite.runtime_launch.chrome_15_20, false);
  assert.equal(cite.lamb_lens, "Service → Clarity → Peace");
  assert.equal(cite.vpn.https_ws, "REAL");
  assert.equal(cite.vpn.wireguard, "SLOT");
  assert.equal(cite.channel_plane.worker_hardware, false);
  assert.equal(cite.runtime_official, "https://aziel-runtime.vibelock.workers.dev/");
  assert.equal(cite.runtime_github, "https://github.com/AzielEliab/aziel-runtime");
  assert.equal(cite.runtime_glama, "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime");
  assert.equal(cite.runtime_docs, "https://github.com/AzielEliab/aziel-runtime/tree/main/docs/2.0");
  assert.doesNotMatch(cite.runtime_note, /1\.6\.2 FragGate/);
  assert.match(cite.runtime_fraggate_list, /\/runtime\/v1\/fraggate\/list$/);
  assert.match(cite.software_live, /\/v1\/software$/);
  assert.match(cite.update_check, /\/v1\/update\/check$/);
  assert.match(cite.mcp_discovery, /\/\.well-known\/mcp\.json$/);
  assert.match(cite.runtime_uses, /\/runtime\/v1\/uses$/);
  assert.match(cite.ai, /\/ai\.txt$/);
  assert.match(cite.zsolver, /intentional suppression confidence/);
  assert.equal(cite.azcoherence.slug, "azcoherence");
  assert.equal(cite.azcoherence_slug, "azcoherence");
  assert.ok(cite.keywords.includes("azcoherence"));
  assert.equal(cite.azclce.peer, "azcoherence");
  assert.doesNotMatch(JSON.stringify(cite), BANNED);

  const llms = llmsDoc("LIMIT");
  assertPublicIdentity(llms);
  assert.match(llms, /## Priority pages \(index first\)/);
  assert.match(llms, /## Softwares \(HTML hub — crawl this\)/);
  assert.match(llms, /## About Aziel Eliab \(HTML — crawl this\)/);
  assert.match(llms, /Who\? Does not matter\. What matters is the record\./);
  assert.match(llms, /Aziel Digital Library on this site/);
  assert.match(llms, /GodLock/);
  assert.match(llms, /one living person/);
  assert.doesNotMatch(llms, /He is not the two Levitical/);
  assert.doesNotMatch(llms, /euaziel\.site/);
  assert.doesNotMatch(llms, /\bFlutter\b/);
  assert.match(llms, /public MASTER of the work/);
  assert.doesNotMatch(llms, /Researcher\. Builder\. AI\. A one-man dev team\. Just a man\./);
  assert.match(llms, /Compact Hebrew aka/);
  assert.match(llms, /Elias Artista/);
  assert.match(llms, /Hebrew definition:/);
  assert.match(llms, /God is my strength/);
  assert.doesNotMatch(llms, /Everblooming Flower/);
  assert.match(llms, /Who is Aziel Eliab: https:\/\/www\.azielcorpuslibrary\.net\/who/);
  assert.match(llms, /Softwares: https:\/\/www\.azielcorpuslibrary\.net\/software/);
  assert.match(llms, /About Aziel Eliab: https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab/);
  assert.match(robotsTxt(), /Priority pages: \/  \/software  \/AzielEliab  \/who/);
  assert.match(llms, /Software hub: https:\/\/www\.azielcorpuslibrary\.net\/software/);
  assert.match(llms, /Donate AZL-DONATE-1\.0 \(static, no KV\): https:\/\/www\.azielcorpuslibrary\.net\/donate/);
  assert.match(llms, /\/v1\/library-index/);
  assert.match(llms, /Software hub mirrors the live aziel-runtime catalog/);
  assert.match(llms, /\/v1\/software/);
  assert.match(llms, /fraggate\/list/);
  assert.match(llms, /\/\.well-known\/mcp\.json/);
  assert.match(llms, /No hard-coded 27 cap/);
  assert.match(llms, /Softwares list: Whitestone \(Softwares\): Advise on short Criminal/);
  assert.doesNotMatch(llms, /not a lawyer/);
  assert.doesNotMatch(llms, /Softwares list: Whitestone \(Softwares\): ephemeral pro se advisor/);
  assert.match(llms, /Softwares list: The ARK \(Softwares\): Keep a local deniable vault/);
  assert.match(llms, /Softwares list: SpectralLock \(Softwares\): Preview a small overlay on an image and recover leftover container bytes/);
  assert.match(llms, /Softwares list: PeaceLock \(Softwares\): Record chosen silence or chosen inaction as a hash-chained receipt/);
  assert.match(llms, /public GitHub \+ local-only runtime/);
  assert.match(llms, /BYO field OS/);
  assert.match(llms, /Public version: Aziel Runtime \/ Softwares SSoT 2\.0\.0-rc1/);
  assert.match(llms, /SL-UNREDACT-OPAQUE/);
  assert.match(llms, /ark-download-tracker\.vibelock\.workers\.dev\/download/);
  assert.match(llms, /ark-download-tracker\.vibelock\.workers\.dev\/stats/);
  assert.match(llms, /https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab/);
  assert.match(llms, /Person @id: https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.match(llms, /Runtime @id: https:\/\/www\.azieleliab\.com\/runtime#runtime/);
  assert.match(llms, /Official site: https:\/\/www\.azieleliab\.com\//);
  assert.match(llms, /WebSite @id: https:\/\/www\.azielcorpuslibrary\.net\/#website/);
  assert.match(llms, /WebSite name: Aziel Corpus Library/);
  assert.match(llms, /Part of the Aziel Eliab ecosystem/);
  assert.match(llms, /https:\/\/godlock\.uk\/AzielEliab/);
  assert.match(llms, /He Didn't Jump: https:\/\/www\.hedidntjump\.com\//);
  assert.match(llms, /Runtime catalog: https:\/\/www\.azielcorpuslibrary\.net\/runtime/);
  assert.match(llms, /How it's scored/);
  assert.match(llms, /Forensics \/ hosted OCR and Whisper: https:\/\/www\.azielcorpuslibrary\.net\/forensics/);
  assert.doesNotMatch(llms, /Intelligence \/ hosted OCR/);
  assert.doesNotMatch(llms, /\/intelligence\n/);
  assert.match(llms, /\/ai\.txt/);
  assert.match(llms, /\/record\/\{record_id\}\/llms\.txt/);
  assert.match(llms, /\/record\/\{record_id\}\/cite\.json/);
  assert.match(llms, /aziel-runtime\.vibelock\.workers\.dev/);
  assert.match(llms, /node-meshed orchestration suite/);
  assert.match(llms, /2\.0\.0-rc1/);
  assert.match(llms, /Try on Glama: https:\/\/glama\.ai\/mcp\/servers\/AzielEliab\/aziel-runtime/);
  assert.match(llms, /Official Runtime \(Worker\): https:\/\/aziel-runtime\.vibelock\.workers\.dev\//);
  assert.doesNotMatch(llms, /Try\/Deploy on Glama/);
  const llmsGlama = llms.indexOf("Try on Glama:");
  const llmsWorker = llms.indexOf("Official Runtime (Worker):");
  assert.ok(llmsGlama >= 0 && llmsWorker > llmsGlama);
  assert.match(llms, /Documentation: https:\/\/github\.com\/AzielEliab\/aziel-runtime\/tree\/main\/docs\/2\.0/);
  assert.match(llms, /1\.6\.2/);
  assert.match(llms, /FragGate/);
  assert.match(llms, /fraggate_list/);
  assert.match(llms, /\/runtime\/v1\/fraggate\/list/);
  assert.match(llms, /\/runtime\/v1\/uses/);
  assert.match(llms, /ChatGPT, Grok, Venice, Claude, Cursor, Glama/);
  assert.match(llms, /azcoherence/);
  assert.match(llms, /AZCoherence/);
  assert.match(llms, /azcoherence-download-tracker\.vibelock\.workers\.dev/);
  assert.match(llms, /github\.com\/AzielEliab\/AZCoherence/);
  assert.equal(cite.foldlock.slug, "foldlock");
  assert.equal(cite.foldlock_slug, "foldlock");
  assert.ok(cite.keywords.includes("foldlock"));
  assert.equal(cite.foldlock.zip, false);
  assert.equal(cite.foldlock.encryption, false);
  assert.equal(cite.redline.spec, "REDLINE-2026-09-14");
  assert.equal(cite.redline.pointer, true);
  assert.match(cite.redline.law, /aziel-runtime\/blob\/main\/docs\/designs\/REDLINE-2026-09-14\.md/);
  assert.equal(cite.redline.cap7.resolves_to_hub, false);
  assert.match(cite.attack_sim_refuse, /Attack sims refuse/);
  assert.match(cite.attack_sim_refuse, /resolves_to_hub:true/);
  assert.match(cite.redline.attack_sim_refuse, /AZ-GEN as registrar/);
  assert.match(llms, /FoldLock/);
  assert.match(llms, /foldlock-download-tracker\.vibelock\.workers\.dev/);
  assert.match(llms, /FL-TIP-FOLD-REFUSE/);
  assert.doesNotMatch(llms, /1\.4\.0 engine-runtime/);

  const ai = aiTxt("LIMIT");
  assertPublicIdentity(ai);
  for (const bot of [
    "DuckAssist",
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
  assert.match(ai, /## Priority pages \(index first\)/);
  assert.match(ai, /Softwares: https:\/\/www\.azielcorpuslibrary\.net\/software/);
  assert.match(ai, /Allow: \/AzielEliab/);
  assert.match(ai, /Allow: \/aboutme/);
  assert.match(ai, /Allow: \/v1\//);
  assert.match(ai, /https:\/\/www\.azielcorpuslibrary\.net\/AzielEliab/);
  assert.match(ai, /https:\/\/godlock\.uk\/AzielEliab/);
  assert.match(ai, /He Didn't Jump https:\/\/www\.hedidntjump\.com\//);
  assert.match(ai, /Aziel Digital Library on this site/);
  assert.match(ai, /GodLock/);
  assert.match(ai, /עזיאל/);
  assert.match(ai, /Elias Artista/);
  assert.match(ai, /God is my strength/);
  assert.doesNotMatch(ai, /Everblooming Flower/);
  assert.match(ai, /Aziell/);
  assert.match(ai, /who-is-aziel-eliab\.txt/);
  assert.match(ai, /one living person/);
  assert.doesNotMatch(ai, /He is not the two Levitical/);
  assert.doesNotMatch(ai, /euaziel\.site/);
  assert.match(ai, /\.well-known\/person\.jsonld/);
  assert.doesNotMatch(ai, /\bFlutter\b/);
  assert.match(ai, /Allow: \/who-is/);
  assert.match(ai, /Allow: \/who$/m);
  assert.match(ai, /Allow: \/search/);
  assert.match(ai, /azieleliab\.com\/v1\/stats/);
  assert.match(ai, /azielcorpuslibrary\.net\/stats/);
  assert.doesNotMatch(ai, /azielcorpuslibrary\.net\/v1\/stats/);
  assert.match(ai, /hedidntjump\.com\/api\/stats/);
  assert.match(ai, /Who\? Does not matter\. What matters is the record\./);
  assert.match(ai, /Softwares list: Whitestone \(Softwares\): Advise on short Criminal/);
  assert.match(ai, /Softwares list: The ARK \(Softwares\): Keep a local deniable vault/);
  assert.match(ai, /Softwares list: SpectralLock \(Softwares\): Preview a small overlay on an image and recover leftover container bytes/);
  assert.match(ai, /SL-UNREDACT-OPAQUE/);
  assert.match(ai, /ark-download-tracker\.vibelock\.workers\.dev\/download/);
  assert.match(ai, /ark-download-tracker\.vibelock\.workers\.dev\/stats/);
  assert.doesNotMatch(ai, /Researcher\. Builder/);
  assert.match(ai, /Disallow: \/signup/);
  assert.match(ai, /Disallow: \/logout/);
  assert.match(ai, /Disallow: \/api\//);
  assert.match(ai, /Disallow: \/admin\//);
  assert.doesNotMatch(ai, /Disallow: \/v1/);

  const humans = humansTxt();
  assertPublicIdentity(humans);
  assert.match(humans, /Person @id: https:\/\/www\.azieleliab\.com\/#aziel/);
  assert.match(humans, /Runtime @id: https:\/\/www\.azieleliab\.com\/runtime#runtime/);
  assert.match(humans, /Official site: https:\/\/www\.azieleliab\.com\//);
  assert.match(humans, /WebSite: Aziel Corpus Library https:\/\/www\.azielcorpuslibrary\.net\/#website/);
  assert.match(humans, /github.com\/AzielEliab/);
  assert.match(humans, /azieltherevealerofthesealed-arch/);
  assert.match(humans, /Elias Artista/);
  assert.match(humans, /God is my strength/);
  assert.doesNotMatch(humans, /Everblooming Flower/);
  assert.match(humans, /azielcorpuslibrary\.net\/AzielEliab/);
  assert.match(humans, /godlock\.uk\/AzielEliab/);
  assert.match(humans, /He Didn't Jump: https:\/\/www\.hedidntjump\.com\//);
  assert.match(humans, /Software hub mirrors runtime \/v1\/software/);
  assert.match(humans, /azcoherence/);
  assert.match(humans, /Whitestone \(Softwares\): Advise on short Criminal/);
  assert.doesNotMatch(humans, /not a lawyer/);
  assert.match(humans, /The ARK \(Softwares\): Keep a local deniable vault/);
  assert.match(humans, /SpectralLock \(spectrallock\) Softwares Media leftover-bytes honesty/);
  assert.match(humans, /SL-UNREDACT-OPAQUE/);
  assert.match(humans, /ark-download-tracker\.vibelock\.workers\.dev\/stats/);
  assert.match(humans, /\/record\/\{record_id\}\/llms\.txt/);

  const index = sitemapIndexXml();
  assert.match(index, /<sitemapindex /);
  assert.match(index, /azielcorpuslibrary\.net\/sitemap\.xml/);
  assert.match(index, /azielcorpuslibrary\.net\/sitemap-records\.xml/);
  assert.match(index, /aziel-runtime\.vibelock\.workers\.dev\/sitemap-index\.xml/);
  assert.match(index, /www\.hedidntjump\.com\/sitemap\.xml/);
  assert.match(index, /www\.azieleliab\.com\/sitemap\.xml/);
  assert.match(index, /spectrallock-download-tracker\.vibelock\.workers\.dev\/sitemap\.xml/);
  const mcp = mcpDiscovery();
  assert.equal(mcp.author, "Aziel Eliab");
  assert.match(mcp.url, /\/runtime\/mcp$/);
  assert.equal(mcp.mcpServers["aziel-runtime"].url, "https://www.azielcorpuslibrary.net/runtime/mcp");
  assert.equal(mcp.mcpServers["trades-runtime"].url, "https://trades-runtime.vibelock.workers.dev/mcp");
  assert.match(mcp.software, /\/v1\/software$/);
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

test("Worker SEO documents are 200 with long public cache and never empty for Googlebot", async () => {
  const { default: worker } = await import("./index.js");
  const { SEO_CACHE_CONTROL } = await import("./library-index.js");
  const env = {
    DOWNLOADS: { async get() { return null; }, async put() {}, async list() { throw new Error("no list"); } },
  };
  for (const path of ["/robots.txt", "/llms.txt", "/cite.json", "/lockset.json", "/bridge.json", "/ai.txt", "/humans.txt", "/help.txt", "/addendum.txt", "/help/uploads.txt", "/sitemap-index.xml", "/person.jsonld", "/identity.jsonld", "/graph.jsonld", "/who-is-aziel-eliab.txt", "/who-is", "/who", "/.well-known/aziel.json", "/.well-known/person.jsonld"]) {
    const res = await worker.fetch(
      new Request("https://www.azielcorpuslibrary.net" + path, { headers: { "User-Agent": "Googlebot/2.1" } }),
      env,
      {}
    );
    assert.equal(res.status, 200, path);
    const cache = res.headers.get("cache-control") || "";
    if (path === "/cite.json" || path === "/llms.txt" || path === "/ai.txt" || path === "/who-is-aziel-eliab.txt" || path === "/who-is") {
      assert.match(cache, /s-maxage=60/, path + " prefers short /survival TTL");
    } else {
      assert.match(cache, /s-maxage=3600/, path);
    }
    const body = await res.text();
    assert.ok(body.length > 20, path + " must not be thin/empty");
    if (path !== "/sitemap-index.xml") assert.match(body, /Aziel Eliab/);
    else assert.match(body, /azielcorpuslibrary\.net/);
  }
  assert.match(SEO_CACHE_CONTROL, /s-maxage=3600/);
});
