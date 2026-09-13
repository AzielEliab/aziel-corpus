/**
 * SOFTWARE-SITE-DOSSIER-1.0 — one solid markdown file per software or website.
 * Author: Aziel Eliab only. Apache-2.0. Forks welcome.
 */
export const DOSSIER_SPEC = "SOFTWARE-SITE-DOSSIER-1.0";
export const DOSSIER_VERSION = "1.0";
export const AUTHOR = "Aziel Eliab";
export const LICENSE = "Apache-2.0";
export const PERSON_ID = "https://www.azieleliab.com/#aziel";
export const RUNTIME_ID = "https://www.azieleliab.com/runtime#runtime";
export const GLAMA_RUNTIME = "https://glama.ai/mcp/servers/AzielEliab/aziel-runtime";
export const CATALOG_URL = "https://aziel-runtime.vibelock.workers.dev/v1/software";
export const FRAGGATE_GITHUB = "https://github.com/AzielEliab/fraggate";
export const UA = "Mozilla/5.0 AzielDigitalLibrary";

export const REQUIRED_HEADINGS = [
  "License",
  "Identity",
  "Purpose",
  "Concept",
  "Use cases",
  "Coding / architecture notes",
  "Surfaces",
  "Related ecosystem links",
];

export const SITE_TARGETS = [
  {
    slug: "azieleliab-com",
    name: "Aziel Eliab",
    kind: "website",
    url: "https://www.azieleliab.com/",
    cite: "https://www.azieleliab.com/cite.json",
    github: "https://github.com/AzielEliab/azieleliab",
    domain: "software, research",
    zion_pattern: "not_applicable",
    one_line: "Official public landing for Aziel Eliab. You don’t get to know me. You get to understand the work.",
    purpose: "Person and ecosystem hub. Locked Person @id and Runtime SoftwareApplication @id live on this host. Softwares section refreshes from aziel-runtime GET /v1/software.",
    what_it_is: "The official website of Aziel Eliab. Identity hub, Softwares door, donate strip, and runtime parent page.",
    what_it_is_not: "Not a second FragGate door. Not a login mesh. Not a biography dump. Apex azieleliab.com 301s to www; @id values never use apex and never #aziel-eliab.",
    concept: "Public identity is Aziel Eliab only (Aziel Elroi Eliab is alternateName / aka only). Entity graph: Person #aziel, WebSite #website, Runtime #runtime. hasPart is named tools only — not MCP verbs.",
    use_cases: [
      "Cite the Person @id from any sister product or paper",
      "Open Softwares / donate / runtime from one host",
      "Crawler surfaces: cite.json, llms.txt, ai.txt, sitemap.xml",
    ],
    architecture: "Static / Worker landing. Softwares catalog is fetched live from aziel-runtime. FragGate remains THE single executable door on the runtime origin. This site does not exec catalog slugs.",
  },
  {
    slug: "azielcorpuslibrary-net",
    name: "Aziel Corpus Library",
    kind: "website",
    url: "https://www.azielcorpuslibrary.net/",
    cite: "https://www.azielcorpuslibrary.net/cite.json",
    github: "https://github.com/AzielEliab/aziel-corpus",
    domain: "software, research",
    zion_pattern: "not_applicable",
    one_line: "Public MASTER digital library. Aziel Library is the operator collection; Corpus is the public Lamb Lens shelf.",
    purpose: "Search, map, gazetteer, triad scoring, hosted OCR, Ask Jeeves, and counted software zip on one Worker. Operator docs file here (shelf aziel).",
    what_it_is: "Aziel Digital Library public MASTER (www.azielcorpuslibrary.net). WebSite @id https://www.azielcorpuslibrary.net/#website.",
    what_it_is_not: "Not a 26-card software index. Not Zenodo. Not a mesh. Not godlock.uk’s Softwares catalog. Anonymous GET is read-only.",
    concept: "Immutable originals, append-only ledgers, exact-same-subject succession. Signed-in public writes Corpus; operator writes Aziel Library. Packed library:index:v1 — no KV.list() on the hot path.",
    use_cases: [
      "Search and open AZDOC records",
      "Operator ingest of software/site dossiers (this spec)",
      "Hosted OCR / transcribe / how-it’s-scored",
      "Softwares hub for the runtime catalog",
    ],
    architecture: "Cloudflare Worker aziel-corpus-download-tracker. Jeeves and shelf share ingestRecord. FragGate is not this Worker’s exec door; /runtime/* proxies the runtime.",
  },
  {
    slug: "godlock-uk",
    name: "GodLock.uk",
    kind: "website",
    url: "https://godlock.uk/",
    cite: "https://godlock.uk/cite.json",
    github: "https://github.com/AzielEliab/godlock",
    domain: "software, research",
    zion_pattern: "not_applicable",
    one_line: "GodLock public board. Reasoning spine: Specified Fit, Not Pretty Spirals. Softwares on this host is GodLock’s own catalog.",
    purpose: "Sister engine website for GodLock — verify, donate, Aziel Eliab identity tab, and a GodLock-scoped Softwares list.",
    what_it_is: "The godlock.uk public site and verify surface for the GodLock engine.",
    what_it_is_not: "Not a second FragGate door. Not a claim that GodLock Softwares mirrors Digital Library completeness. Not a VPN or anonymity network. Distinct from the godlock catalog card.",
    concept: "Specified Fit, Not Pretty Spirals. Thin SEO/catalog JSON on /v1/software. Door remains /runtime.",
    use_cases: [
      "Open GodLock verify",
      "Cite GodLock.uk /AzielEliab",
      "Follow donate (AZL-DONATE-1.0) to the official rails",
    ],
    architecture: "Sister hub. Runtime catalog origin stays aziel-runtime. FragGate single door on /runtime. This dossier is the website, not the godlock engine source tree.",
  },
  {
    slug: "hedidntjump-com",
    name: "He Didn't Jump",
    kind: "website",
    url: "https://www.hedidntjump.com/",
    cite: "https://www.hedidntjump.com/llms.txt",
    github: "",
    domain: "research, history",
    zion_pattern: "research_archive",
    one_line: "An Aziel Eliab Project: independent newspaper archive on Marion Zioncheck’s 7 August 1936 death in Seattle. Five research volumes, contemporary plates, and 21 inquiries of the record.",
    purpose: "Publish the contemporary record for re-reading. Challenge the official suicide account without inventing court holdings or FOIA letters.",
    what_it_is: "Historical newspaper and five-volume archive. Broadsheet, official-narrative, Rubye, FOIA, and volume-reader editions.",
    what_it_is_not: "Not a software engine. Not a Softwares-tab product. Not a courtroom verdict. Does not invent quotes beyond the volumes and cited papers.",
    concept: "Independent investigation and archive publication. Official report: suicide from a fifth-floor Arctic Building office. This project keeps plates and inquiries on the record.",
    use_cases: [
      "Read the broadsheet and 21 inquiries",
      "Download research volumes",
      "Cite plates and contemporary papers",
      "Follow FOIA binary acknowledgement notes",
    ],
    architecture: "Standalone research site (not a FragGate engine). Person sameAs to azieleliab.com, godlock.uk, azielcorpuslibrary.net, aziel-runtime. ZionPattern may apply to filed historical volumes — this website card is not a software/hardware/design qualification.",
  },
  {
    slug: "aziel-runtime",
    name: "Aziel Runtime",
    kind: "website",
    url: "https://aziel-runtime.vibelock.workers.dev/",
    cite: "https://aziel-runtime.vibelock.workers.dev/cite.json",
    github: "https://github.com/AzielEliab/aziel-runtime",
    domain: "software, research",
    zion_pattern: "not_applicable",
    one_line: "Node-meshed orchestration suite of MCP-connected software. FragGate is THE single public executable door.",
    purpose: "Coordinate specialized tools through a shared, security-gated runtime while preserving provenance, chain-of-custody, temporal integrity, and auditable execution.",
    what_it_is: "Aziel Runtime 2.0.0-rc1 Worker door: OpenAPI, MCP, GET /v1/software, FragGate list/describe/call. Certification-point freeze under docs/2.0/.",
    what_it_is_not: "Not merely an API orchestrator or software aggregator. Not a login mesh or VPN. GET /v1/mesh never enables. Worker origin is relatedLink / endpoint — identity hub is azieleliab.com/runtime#runtime.",
    concept: "fraggate_list → fraggate_describe → fraggate_call. Softwares catalog Plain → Gate → Lock (Clock ≠ Lock). Dual surface: agents via MCP/OpenAPI; humans via Worker UI + counted /download.",
    use_cases: [
      "Discover catalog slugs (fraggate_list / GET /v1/software)",
      "Describe one card, then fraggate_call",
      "Try on Glama (primary MCP CTA)",
      "Hub Softwares tabs refresh from this origin",
    ],
    architecture: "FragGate single door. Cloudflare Worker isolate is the jail. engine_digest required. Hubs (azieleliab.com, azielcorpuslibrary.net, godlock.uk) fetch GET /v1/software. This dossier is the runtime site/door, not a per-engine source dump.",
  },
];

export const FRAGGATE_KERNEL = {
  slug: "fraggate",
  name: "FragGate",
  kind: "kernel",
  version: "FG-0.1",
  one_line: "One door — discover, route, refuse. Hashed registry kernel over the Aziel Eliab catalog. Separate FragGate app — not nested AZBrowser UI.",
  github: FRAGGATE_GITHUB,
  worker_home: "https://fraggate-download-tracker.vibelock.workers.dev/",
  download_url: "https://fraggate-download-tracker.vibelock.workers.dev/download",
  count: "https://fraggate-download-tracker.vibelock.workers.dev/count",
  mcp: "https://aziel-runtime.vibelock.workers.dev/mcp",
  domain: "software, research",
  zion_pattern: "not_applicable",
  purpose: "THE single public executable door (FG-0.1). Discover, route, refuse. Hosted on Aziel Runtime 2.0.0-rc1.",
  what_it_is: "Kernel + human Worker UI / counted download. Magic FGT1. Paper FG-WP-0.1.",
  what_it_is_not: "Not a Softwares-tab product nested inside another app. Not an extra door beside itself. Not a VPN. Agents must not treat /p/{slug}/{op} as exec.",
  concept: "CallEnvelope → FragGate → Lamb Lens → SweepGate → Sentinel → Provenance → ChainLock-IN → DecisionGATE → AZPIPE → Internal Domain Layer → RoseClock → TemporalLock → ChainLock-OUT → ForgeReceipts → Return.",
  use_cases: [
    "fraggate_list then fraggate_describe then fraggate_call",
    "Human Worker UI + counted /download",
    "Digest proof via fraggate_verify",
  ],
  architecture: "Single door. aziel-runtime hosts the public mesh. This repo is the local FG-0.1 kernel and the human Worker / Flutter scaffold. Dual surface: agent MCP/OpenAPI vs Worker UI.",
};

export function dossierFilename(slug) {
  return String(slug || "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-") + "-aziel-dossier-1.0.md";
}

export function subjectFor(slug) {
  return String(slug || "").toLowerCase().trim() + " aziel dossier";
}

export function firstText(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function asList(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}

export function catalogSoftwareCards(catalog) {
  if (!catalog || typeof catalog !== "object") return [];
  const raw = Array.isArray(catalog.software) && catalog.software.length
    ? catalog.software
    : Array.isArray(catalog.products)
      ? catalog.products
      : [];
  const out = [];
  const seen = new Set();
  for (const p of raw) {
    const slug = String((p && p.slug) || "").toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(p);
  }
  return out;
}

export function collectTargets(catalog) {
  const targets = [];
  const seen = new Set();
  function add(t) {
    const slug = String((t && t.slug) || "").toLowerCase();
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    targets.push(t);
  }
  for (const site of SITE_TARGETS) add({ ...site, kind: site.kind || "website" });
  for (const p of catalogSoftwareCards(catalog)) {
    add({
      slug: String(p.slug).toLowerCase(),
      name: firstText(p.name, p.slug),
      kind: "software",
      version: firstText(p.version),
      one_line: firstText(p.one_line, p.banner, p.description),
      github: firstText(p.github),
      worker_home: firstText(p.worker_home),
      download_url: firstText(p.download_url, p.download),
      count: firstText(p.count),
      mcp: firstText(p.mcp, p.agent && p.agent.mcp),
      agent: p.agent || null,
      status: firstText(p.status),
      bucket: firstText(p.bucket),
      catalog_domain: firstText(p.domain),
      engine_digest: firstText(p.engine_digest),
      url: firstText(p.worker_home, p.github),
      domain: "software, research",
      zion_pattern: "not_applicable",
    });
  }
  const slugs = new Set(catalogSoftwareCards(catalog).map((p) => String(p.slug || "").toLowerCase()));
  if (!slugs.has("fraggate")) add({ ...FRAGGATE_KERNEL });
  return targets;
}

export function parseNotClaims(text) {
  const out = [];
  const blob = String(text || "");
  for (const m of blob.matchAll(/(?:^|[.?!]\s+)([Nn]ot (?:a |an |the )?[^.|;]+)/g)) {
    const bit = String(m[1] || "").replace(/\s+/g, " ").trim();
    if (bit.length >= 8 && bit.length <= 180) out.push(bit.endsWith(".") ? bit : bit + ".");
  }
  return [...new Set(out)].slice(0, 8);
}

function yamlEscape(value) {
  const s = String(value == null ? "" : value);
  if (!s) return '""';
  if (/[:#{}[\],&*?|<>=!%@`'"\\\n]/.test(s) || s !== s.trim()) {
    return JSON.stringify(s);
  }
  return s;
}

/** Public Worker/docs copy: rose-star mark only. Never the retired bloom-sigil phrase. */
export function scrubBannedBrandCopy(text) {
  return String(text || "").replace(/ever-?\s*blooming(?:\s+sigil)?/gi, "rose-star brand mark");
}

export function readmeLead(markdown, maxLines = 40) {
  const lines = String(markdown || "").split(/\r?\n/);
  const keep = [];
  for (const line of lines) {
    if (/^\s*```/.test(line) && keep.length > 8) break;
    keep.push(line);
    if (keep.length >= maxLines) break;
  }
  return scrubBannedBrandCopy(keep.join("\n").trim());
}

function citePurpose(cite) {
  if (!cite || typeof cite !== "object") return "";
  return firstText(
    cite.purpose,
    cite.one_line,
    cite.abstract,
    cite.about && cite.about.what,
    cite.title
  );
}

function surfacesFor(target) {
  const rows = [];
  if (target.url) rows.push({ label: "Home", href: target.url });
  if (target.worker_home) rows.push({ label: "Worker UI", href: target.worker_home });
  if (target.github) rows.push({ label: "GitHub", href: target.github });
  if (target.download_url) rows.push({ label: "Counted /download", href: target.download_url });
  if (target.count) rows.push({ label: "Count", href: target.count });
  if (target.mcp) rows.push({ label: "MCP", href: target.mcp });
  if (target.kind === "website" && /runtime|fraggate|azieleliab|corpus/i.test(target.slug)) {
    rows.push({ label: "Try on Glama", href: GLAMA_RUNTIME });
  }
  if (target.kind === "kernel" || target.slug === "fraggate" || target.slug === "aziel-runtime") {
    if (!rows.some((r) => r.href === GLAMA_RUNTIME)) rows.push({ label: "Try on Glama", href: GLAMA_RUNTIME });
  }
  if (target.agent && target.agent.fraggate_describe) {
    rows.push({ label: "fraggate/describe", href: target.agent.fraggate_describe });
  } else if (target.kind === "software" || target.kind === "kernel") {
    rows.push({
      label: "fraggate/describe",
      href: "https://aziel-runtime.vibelock.workers.dev/v1/fraggate/describe?slug=" + encodeURIComponent(target.slug),
    });
  }
  if (target.cite) rows.push({ label: "cite / llms", href: target.cite });
  const seen = new Set();
  return rows.filter((r) => {
    if (!r.href || seen.has(r.href)) return false;
    seen.add(r.href);
    return true;
  });
}

export function renderDossier(target, extras = {}) {
  const slug = String(target.slug || "").toLowerCase();
  const name = firstText(target.name, slug);
  const date = firstText(extras.date, new Date().toISOString().slice(0, 10));
  const version = firstText(target.version, DOSSIER_VERSION);
  const oneLine = firstText(target.one_line, extras.cite_purpose);
  const citeLong = extras.cite_purpose && String(extras.cite_purpose).trim().length >= 40
    ? String(extras.cite_purpose).trim()
    : "";
  const purpose = firstText(target.purpose, citeLong, oneLine);
  const what = firstText(target.what_it_is, oneLine);
  const notBits = [
    ...asList(target.what_it_is_not),
    ...parseNotClaims(oneLine),
    ...parseNotClaims(target.architecture),
    "Not a ~100-file library unpack of the source tree.",
    "Not a Zenodo DOI mint (deposit_needed is a separate catalog track).",
  ];
  const uniqueNot = [...new Set(notBits.map((s) => String(s).trim()))].filter(Boolean);
  const uses = asList(target.use_cases);
  if (!uses.length) {
    if (target.kind === "software" || target.kind === "kernel") {
      uses.push("Call via FragGate (list → describe → call) when the slug is live");
      uses.push("Download the counted Worker zip when a /download surface exists");
      uses.push("Cite GitHub + Apache-2.0; forks welcome");
    } else {
      uses.push("Visit the public URL and cite.json / llms.txt");
      uses.push("Follow Person and Runtime @id links");
    }
  }
  const arch = firstText(
    target.architecture,
    target.kind === "software" || target.kind === "kernel"
      ? "FragGate is THE single public executable door (fraggate_list → fraggate_describe → fraggate_call). This dossier summarizes identity and surfaces only — it does not paste the repository."
      : "Website / hub. Not an extra FragGate door. Surfaces are HTML + cite.json + llms.txt."
  );
  const domain = firstText(target.domain, "software, research");
  const zion = firstText(target.zion_pattern, "not_applicable");
  const subject = subjectFor(slug);
  const keywords = [
    "aziel-dossier-1.0",
    LICENSE,
    slug,
    target.kind,
    zion === "not_applicable" ? "zion:not_applicable" : "zion:" + zion,
  ].join(", ");
  const surfaces = surfacesFor(target);
  const readme = extras.readme_lead ? readmeLead(extras.readme_lead) : "";
  const citeNote = extras.cite_purpose ? scrubBannedBrandCopy(String(extras.cite_purpose).slice(0, 600)) : "";
  const digest = firstText(target.engine_digest);
  const catalogDomain = firstText(target.catalog_domain);

  const fm = [
    "---",
    "schema: aziel.software-site-dossier.v1",
    "spec: " + DOSSIER_SPEC,
    "slug: " + slug,
    "kind: " + (target.kind || "software"),
    "title: " + yamlEscape(name + " — Aziel dossier"),
    "author: " + AUTHOR,
    "version: " + JSON.stringify(DOSSIER_VERSION),
    "product_version: " + yamlEscape(version),
    "date: " + date,
    "license: " + LICENSE,
    "library: aziel",
    "domain: " + yamlEscape(domain),
    "subjects: " + yamlEscape(subject),
    "keywords: " + yamlEscape(keywords),
    "zion_pattern: " + zion,
    "identity: " + AUTHOR,
    "person_id: " + PERSON_ID,
    "runtime_id: " + RUNTIME_ID,
    "filename: " + dossierFilename(slug),
    "---",
    "",
  ].join("\n");

  const body = [
    "# " + name + " — Aziel dossier",
    "",
    "**Author:** " + AUTHOR,
    "**Version:** " + DOSSIER_VERSION + " (product " + version + ")",
    "**Date:** " + date,
    "**Slug:** `" + slug + "`",
    "",
    "## License",
    "",
    "**" + LICENSE + "**. Forks welcome and always allowed. Public identity is **Aziel Eliab** only (Aziel Elroi Eliab is `alternateName` / aka only).",
    "",
    "## Identity",
    "",
    oneLine,
    "",
    "### What it is",
    "",
    what,
    catalogDomain ? "" : null,
    catalogDomain ? "Catalog domain label: **" + catalogDomain + "**." : null,
    digest ? "engine_digest: `" + digest + "`." : null,
    "",
    "### What it is not",
    "",
    uniqueNot.map((x) => "- " + x).join("\n"),
    "",
    "ZionPattern: **" + zion + "**. Software / hardware / designs do not qualify for Zion cards.",
    "",
    "## Purpose",
    "",
    purpose,
    citeLong && citeLong !== purpose ? "\nCite / abstract: " + citeNote : "",
    "",
    "## Concept",
    "",
    firstText(target.concept, oneLine),
    "",
    "## Use cases",
    "",
    uses.map((x) => "- " + x).join("\n"),
    "",
    "## Coding / architecture notes",
    "",
    arch,
    "",
    "This is a **single** library dossier. Do not unpack the GitHub tree, release tarball, or Worker zip into many shelf files.",
    "",
    readme ? "README lead (truncated, source only):\n\n" + readme.split("\n").map((l) => (l ? "> " + l : ">")).join("\n") : "",
    "",
    "## Surfaces",
    "",
    surfaces.length
      ? surfaces.map((s) => "- **" + s.label + ":** " + s.href).join("\n")
      : "- Public URL or GitHub as listed on the live catalog.",
    "",
    "## Related ecosystem links",
    "",
    "- Person `@id` " + PERSON_ID,
    "- Runtime `@id` " + RUNTIME_ID,
    "- Official site https://www.azieleliab.com/",
    "- Aziel Corpus Library https://www.azielcorpuslibrary.net/",
    "- GodLock.uk https://godlock.uk/",
    "- He Didn't Jump https://www.hedidntjump.com/",
    "- Aziel Runtime https://aziel-runtime.vibelock.workers.dev/",
    "- FragGate kernel " + FRAGGATE_GITHUB,
    "- Try on Glama " + GLAMA_RUNTIME,
    "",
    "Part of the Aziel Eliab ecosystem. " + LICENSE + ".",
    "",
  ].filter((line) => line !== null).join("\n").replace(/\n{3,}/g, "\n\n");

  return fm + body;
}

export function parseFrontMatter(markdown) {
  const text = String(markdown || "");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      try { val = JSON.parse(val.replace(/^'/, '"').replace(/'$/, '"')); } catch { val = val.slice(1, -1); }
    }
    meta[key] = val;
  }
  return { meta, body: m[2] };
}

export function validateDossierMarkdown(markdown, slug) {
  const errors = [];
  const md = String(markdown || "");
  if (!md.trim()) errors.push("empty");
  if (!md.includes(LICENSE)) errors.push("missing Apache-2.0");
  if (!md.includes(AUTHOR)) errors.push("missing author");
  for (const h of REQUIRED_HEADINGS) {
    const re = new RegExp("^## " + h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "m");
    if (!re.test(md)) errors.push("missing section: " + h);
  }
  if (slug && !md.toLowerCase().includes(String(slug).toLowerCase())) errors.push("slug not mentioned");
  if (/application\/x-tar|\.tar\.gz unpacked|extract all source files/i.test(md) && /INTO THE LIBRARY/i.test(md)) {
    errors.push("looks like a multi-file unpack");
  }
  const { meta } = parseFrontMatter(md);
  if (meta.license && meta.license !== LICENSE) errors.push("front matter license");
  if (meta.library && meta.library !== "aziel") errors.push("must file on aziel shelf");
  if (slug && meta.subjects && meta.subjects !== subjectFor(slug)) errors.push("subject must be exact '" + subjectFor(slug) + "'");
  return { ok: errors.length === 0, errors };
}

export function assertOneFilePerSlug(filenames) {
  const map = new Map();
  for (const name of filenames || []) {
    const base = String(name || "").split("/").pop();
    const m = base.match(/^([a-z0-9][a-z0-9._-]*)-aziel-dossier-1\.0\.md$/i);
    if (!m) {
      const err = new Error("unexpected dossier filename: " + base);
      err.code = "DOSSIER_NAME";
      throw err;
    }
    const slug = m[1].toLowerCase();
    if (map.has(slug)) {
      const err = new Error("duplicate dossier for slug " + slug);
      err.code = "DOSSIER_DUP";
      throw err;
    }
    map.set(slug, base);
  }
  return map;
}

export function refuseUnpackArgs(argv = process.argv) {
  const bad = (argv || []).some((a) => /^(--unpack|--tarball|--extract-tree|--explode)$/i.test(a));
  if (bad) {
    const err = new Error("Refuse: one solid file per software or website. Do not unpack tarballs into the library.");
    err.code = "DOSSIER_UNPACK";
    throw err;
  }
}

export async function fetchText(url, { max = 12000, timeoutMs = 4000 } = {}) {
  if (!url) return "";
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/plain, application/json, text/markdown, */*" },
      signal: ctl ? ctl.signal : undefined,
    });
    if (!res || !res.ok) return "";
    const text = await res.text();
    return String(text || "").slice(0, max);
  } catch {
    return "";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function enrichTarget(target, { offline = false } = {}) {
  if (offline) return { readme_lead: "", cite_purpose: "" };
  const extras = { readme_lead: "", cite_purpose: "" };
  const citeUrl = firstText(target.cite, target.worker_home && String(target.worker_home).replace(/\/?$/, "/") + "cite.json");
  if (citeUrl) {
    const raw = await fetchText(citeUrl, { max: 20000 });
    if (raw && raw.trim().startsWith("{")) {
      try {
        extras.cite_purpose = citePurpose(JSON.parse(raw));
      } catch { /* ignore */ }
    } else if (raw && !/^\s*</.test(raw)) {
      extras.cite_purpose = readmeLead(raw, 20).slice(0, 800);
    }
  }
  if (target.github && /github\.com\//i.test(target.github)) {
    const repo = String(target.github).replace(/\/$/, "");
    const rawUrl = repo.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/main/README.md";
    extras.readme_lead = readmeLead(await fetchText(rawUrl, { max: 8000 }), 36);
  }
  return extras;
}
