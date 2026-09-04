/**
 * Domain / subject / micro classification for Aziel Digital Library Tree.
 * Main → sub → optional micro; multi-domain paths allowed.
 * Author: Aziel Eliab.
 */

/** Preferred main-domain vocabulary (expand carefully; reuse Tree labels). */
export const MAIN_DOMAINS = [
  "energy",
  "research",
  "hardware",
  "history",
  "philosophy",
  "software",
  "investigation",
  "crime",
  "design",
  "engineering",
  "ocr",
  "transcript",
];

const EMPTY_SUBJECT = new Set(["", "no subject", "(no subject)", "n/a", "none", "null", "undefined"]);
const EMPTY_DOMAIN = new Set(["", "no domain", "(no domain)", "n/a", "none", "null", "undefined"]);

function normToken(s) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function splitCsv(s) {
  return String(s || "")
    .split(/[,;]+/)
    .map(normToken)
    .filter(Boolean);
}

function isEmptySubject(s) {
  return EMPTY_SUBJECT.has(String(s || "").trim().toLowerCase());
}

function isEmptyDomain(s) {
  return EMPTY_DOMAIN.has(String(s || "").trim().toLowerCase());
}

/** Title + subjects + keywords + readable body bits — same spirit as geo bag (no upload time). */
export function classificationBag(row = {}, extraText = "") {
  const bits = [
    row.title,
    row.subjects,
    row.keywords,
    row.domain,
    row.author,
    row.filename,
    String(row.body || "").slice(0, 12000),
    extraText,
  ]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  return bits.join("\n");
}

function pathKey(p) {
  return [p.main, p.sub || "", p.micro || ""].join("\0").toLowerCase();
}

function addPath(out, main, sub, micro) {
  const m = normToken(main);
  const s = normToken(sub);
  const u = normToken(micro);
  if (!m) return;
  const rec = { main: m };
  if (s) rec.sub = s;
  if (u) rec.micro = u;
  const k = pathKey(rec);
  if (!out._seen) out._seen = new Set();
  if (out._seen.has(k)) return;
  out._seen.add(k);
  out.push(rec);
}

/**
 * Rule-based classifier. Returns { paths, domain, subjects, unclassifiable }.
 * paths: [{main, sub?, micro?}] for Tree multi-placement.
 */
export function classifyDomains(row = {}, extraText = "") {
  const title = String(row.title || "");
  const bag = classificationBag(row, extraText).toLowerCase();
  // Prefer title + keywords for short-token decisions (body may contain binary noise).
  const head = [row.title, row.keywords, row.filename, row.domain, row.subjects]
    .map((x) => String(x || "").toLowerCase())
    .join("\n");
  const paths = [];
  paths._seen = new Set();

  const hasIn = (text, ...needles) =>
    needles.some((n) => {
      const needle = String(n).toLowerCase();
      if (needle.length <= 3) {
        return new RegExp("(?:^|[^a-z0-9])" + needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:[^a-z0-9]|$)", "i").test(text);
      }
      return text.includes(needle);
    });
  const has = (...needles) => hasIn(bag, ...needles);
  const hasHead = (...needles) => hasIn(head, ...needles);

  // Explicit empty smoke / test notes with no content signal
  if (/smoke|anonymous corpus smoke/i.test(title) && !has("whitepaper", "prototype", "engineering", "research")) {
    return { paths: [], domain: "", subjects: "", unclassifiable: true, reason: "smoke/test note without classifiable body" };
  }

  // AEEM / HVAC / Home Node → energy + engineering (branch on title/keywords; avoid binary body noise)
  if (hasHead("aeem", "hvac energy valve", "home node") || hasHead("hvac")) {
    if (hasHead("home node")) {
      addPath(paths, "energy", "Home Node", "consumer optimization");
      addPath(paths, "engineering", "Home Node", "AEEM");
    } else if (hasHead("surge", "spd", "surge protection")) {
      addPath(paths, "energy", "HVAC", "surge protection");
      addPath(paths, "engineering", "HVAC", "prototype design");
    } else if (hasHead("build guide", "measurement-first")) {
      addPath(paths, "energy", "HVAC", "build guide");
      addPath(paths, "engineering", "HVAC", "build guide");
    } else if (hasHead("master", "build package", "diagnostics")) {
      addPath(paths, "energy", "HVAC", "build package");
      addPath(paths, "engineering", "HVAC", "diagnostics");
    } else if (hasHead("retrofit") || (hasHead("whitepaper") && hasHead("consumer"))) {
      addPath(paths, "energy", "HVAC", "retrofit");
      addPath(paths, "engineering", "HVAC", "whitepaper");
    } else if (hasHead("prototype design", "prototype")) {
      addPath(paths, "energy", "HVAC", "prototype design");
      addPath(paths, "engineering", "HVAC", "prototype design");
    } else {
      addPath(paths, "energy", "HVAC", "AEEM");
      addPath(paths, "engineering", "HVAC", "AEEM");
    }
  }

  // TAA-1 access lock
  if (has("taa-1", "taa1", "temporary access lock", "electromagnetic temporary")) {
    addPath(paths, "hardware", "TAA-1", "access control");
    addPath(paths, "engineering", "TAA-1", has("firmware", "wiring", "parts") ? "engineering package" : "whitepaper");
    if (has("local-first", "shared infrastructure")) {
      addPath(paths, "software", "local-first", "TAA-1");
    }
  }

  // PLA recycler
  if (has("pla recycler", "filament reprocessing", "1.75")) {
    addPath(paths, "hardware", "recycling", "PLA filament");
    addPath(paths, "engineering", "materials", "prototype");
    addPath(paths, "design", "prototype", "bench");
  }

  // Adaptive AI dog leash
  if (has("dog leash", "adaptive ai dog")) {
    addPath(paths, "hardware", "wearable", "dog leash");
    addPath(paths, "engineering", "prototype", "sensor tether");
    addPath(paths, "design", "product", "Adaptive AI Dog Leash");
  }

  // ForgeReceipts
  if (has("forgereceipts", "pro se fathers", "family court")) {
    addPath(paths, "software", "ForgeReceipts", "evidence integrity");
    addPath(paths, "investigation", "family court", "receipts");
    addPath(paths, "crime", "evidence", "hash-chain");
  }

  // AHE / A/E transformation models
  if (
    hasHead("ahe", "a/e structural", "transformation cycle", "dual emergence") ||
    (hasHead("anchor") && hasHead("hierarchy") && hasHead("emergence"))
  ) {
    const dual = hasHead("dual emergence") || hasHead("e1 / e2") || hasHead("e1", "e2");
    addPath(paths, "research", "AHE", dual ? "dual emergence" : "transformation model");
    addPath(paths, "philosophy", "systems", "emergence");
    if (hasHead("nostradamus", "revelation")) {
      addPath(paths, "history", "prophecy", "AHE");
      addPath(paths, "research", "history", "prophecy");
    }
  }

  // Cockroach Doctrine
  if (has("cockroach doctrine")) {
    addPath(paths, "research", "resilience", "Cockroach Doctrine");
    addPath(paths, "philosophy", "doctrine", "asymmetric disruption");
  }

  // Coherence Under Constraint
  if (has("coherence under constraint", "high-density cognitive", "social pathologizing")) {
    addPath(paths, "research", "cognition", "coherence");
    addPath(paths, "philosophy", "epistemology", "social pathologizing");
  }

  // Lenses / artificial systems
  if (has("viewpoint constraints", "lamb lens", "lenses as viewpoint")) {
    addPath(paths, "research", "AI", "lenses");
    addPath(paths, "software", "artificial systems", "viewpoint constraints");
    addPath(paths, "philosophy", "epistemology", "lenses");
  }

  // Preserve useful existing main domain when rules matched partially / as supplement
  const existingDomain = splitCsv(row.domain).filter((d) => !isEmptyDomain(d));
  const existingSubjects = splitCsv(row.subjects).filter((s) => !isEmptySubject(s));

  // If nothing matched, derive from existing domain + keywords/title heuristics
  if (!paths.length) {
    for (const d of existingDomain) {
      const main = canonicalizeMain(d) || d;
      const sub = existingSubjects[0] || guessSubFromBag(bag, title) || "general";
      addPath(paths, main, sub, existingSubjects[1] || "");
    }
  }

  if (!paths.length) {
    const guessed = guessMainsFromBag(bag, title);
    if (guessed.length) {
      const sub = guessSubFromBag(bag, title) || "general";
      for (const m of guessed) addPath(paths, m, sub, "");
    }
  }

  if (!paths.length && existingSubjects.length) {
    addPath(paths, "research", existingSubjects[0], existingSubjects[1] || "");
  }

  delete paths._seen;

  if (!paths.length) {
    return { paths: [], domain: "", subjects: "", unclassifiable: true, reason: "insufficient content signal" };
  }

  const serialized = serializePaths(paths);
  return {
    paths,
    domain: serialized.domain,
    subjects: serialized.subjects,
    unclassifiable: false,
  };
}

function canonicalizeMain(d) {
  const x = String(d || "").trim().toLowerCase();
  if (!x) return "";
  if (x === "philosophy/theology" || x.startsWith("philosophy/")) return "philosophy";
  if (MAIN_DOMAINS.includes(x)) return x;
  // map common near-mains
  const map = {
    engineering: "engineering",
    energy: "energy",
    research: "research",
    hardware: "hardware",
    history: "history",
    philosophy: "philosophy",
    software: "software",
    investigation: "investigation",
    crime: "crime",
    design: "design",
    preprint: "research",
    "manuscript studies": "history",
  };
  return map[x] || "";
}

function guessMainsFromBag(bag, title) {
  const out = [];
  const add = (m) => {
    if (!out.includes(m)) out.push(m);
  };
  if (/\b(energy|hvac|aeem|watt|grid|retrofit)\b/.test(bag)) add("energy");
  if (/\b(firmware|pcb|wiring|prototype|hardware|sensor|lock)\b/.test(bag)) add("hardware");
  if (/\b(software|app|platform|hash-chain|api|code)\b/.test(bag)) add("software");
  if (/\b(history|achaemenid|cyrus|zioncheck|biblical|scroll)\b/.test(bag)) add("history");
  if (/\b(philosophy|epistemology|theology|doctrine)\b/.test(bag)) add("philosophy");
  if (/\b(investigation|forensic|evidence|court)\b/.test(bag)) add("investigation");
  if (/\b(design|ux|product)\b/.test(bag)) add("design");
  if (/\b(engineering|build|whitepaper)\b/.test(bag)) add("engineering");
  if (/\b(research|model|analysis|whitepaper)\b/.test(bag) || /whitepaper/i.test(title)) add("research");
  return out;
}

function guessSubFromBag(bag, title) {
  const t = String(title || "");
  if (/hvac/i.test(t + bag)) return "HVAC";
  if (/taa-1/i.test(t + bag)) return "TAA-1";
  if (/forgereceipts/i.test(t + bag)) return "ForgeReceipts";
  if (/ahe/i.test(t + bag)) return "AHE";
  if (/dog leash/i.test(t + bag)) return "wearable";
  if (/pla recycler/i.test(t + bag)) return "recycling";
  if (/lens/i.test(t + bag)) return "AI";
  if (/cockroach/i.test(t + bag)) return "resilience";
  if (/coherence/i.test(t + bag)) return "cognition";
  const m = t.match(/^(.{3,48}?)(?:\s+[—\-:]|\s+\()/);
  if (m) return normToken(m[1]).slice(0, 48);
  return "";
}

/** Serialize paths → domain CSV + subjects CSV (sub or sub/micro; multi-main encoded as main/sub[/micro] when needed). */
export function serializePaths(paths) {
  const mains = [];
  const subjectTokens = [];
  const multiMain = new Set((paths || []).map((p) => p.main)).size > 1;
  for (const p of paths || []) {
    if (!p || !p.main) continue;
    if (!mains.find((m) => m.toLowerCase() === p.main.toLowerCase())) mains.push(p.main);
    if (multiMain) {
      // Explicit path token so Tree can place under the correct main (not cartesian).
      const bit = [p.main, p.sub || "general"].concat(p.micro ? [p.micro] : []).join("/");
      if (!subjectTokens.includes(bit)) subjectTokens.push(bit);
    } else {
      const bit = p.micro ? `${p.sub || "general"}/${p.micro}` : p.sub || "general";
      if (!subjectTokens.includes(bit)) subjectTokens.push(bit);
    }
  }
  return {
    domain: mains.join(", "),
    subjects: subjectTokens.join(", "),
  };
}

/**
 * Expand a stored record into Tree paths.
 * Supports:
 * - domain CSV + plain subjects (place under each domain × each subject) when subjects lack main/
 * - subjects with main/sub[/micro] explicit paths (preferred for multi-domain)
 */
export function expandTreePaths(row = {}) {
  const domains = splitCsv(row.domain).filter((d) => !isEmptyDomain(d));
  const subjects = splitCsv(row.subjects).filter((s) => !isEmptySubject(s));
  const paths = [];
  paths._seen = new Set();

  const explicit = [];
  const plain = [];
  for (const s of subjects) {
    if (s.includes("/")) {
      const parts = s.split("/").map(normToken).filter(Boolean);
      if (parts.length >= 2) {
        // If first segment is a known/existing main, treat as main/sub/micro
        const maybeMain = parts[0];
        const mainCanon = canonicalizeMain(maybeMain) || (domains.some((d) => d.toLowerCase() === maybeMain.toLowerCase()) ? maybeMain : "");
        if (mainCanon || MAIN_DOMAINS.includes(maybeMain.toLowerCase()) || domains.length > 1) {
          explicit.push({
            main: mainCanon || maybeMain,
            sub: parts[1] || "general",
            micro: parts[2] || "",
          });
          continue;
        }
        // Else subject/micro under domains
        plain.push({ sub: parts[0], micro: parts.slice(1).join("/") });
        continue;
      }
    }
    plain.push({ sub: s, micro: "" });
  }

  for (const e of explicit) addPath(paths, e.main, e.sub, e.micro);

  if (plain.length && domains.length) {
    for (const d of domains) {
      for (const p of plain) addPath(paths, d, p.sub, p.micro);
    }
  } else if (plain.length && !domains.length && !explicit.length) {
    for (const p of plain) addPath(paths, "(no domain)", p.sub, p.micro);
  } else if (!plain.length && !explicit.length && domains.length) {
    for (const d of domains) addPath(paths, d, "(no subject)", "");
  }

  delete paths._seen;
  return paths;
}

/** True when record needs classification backfill. */
export function needsDomainClassification(row = {}) {
  const domains = splitCsv(row.domain).filter((d) => !isEmptyDomain(d));
  const subjects = splitCsv(row.subjects).filter((s) => !isEmptySubject(s));
  if (!domains.length && !subjects.length) return true;
  if (domains.length && !subjects.length) return true;
  if (!domains.length && subjects.length) return true;
  return false;
}

/**
 * Apply classification when domain/subjects missing or weak.
 * If caller supplied both domain and subjects, leave them (still normalize empties).
 */
export function applyAutoClassification(fields = {}, rowHint = {}) {
  const domainIn = normToken(fields.domain);
  const subjectsIn = normToken(fields.subjects);
  const row = {
    title: fields.title || rowHint.title,
    body: fields.body || rowHint.body,
    keywords: fields.keywords || rowHint.keywords,
    filename: fields.filename || rowHint.filename,
    author: fields.author || rowHint.author,
    domain: domainIn,
    subjects: subjectsIn,
  };
  if (!needsDomainClassification(row)) {
    return {
      domain: isEmptyDomain(domainIn) ? "" : domainIn,
      subjects: isEmptySubject(subjectsIn) ? "" : subjectsIn,
      auto: false,
      paths: expandTreePaths(row),
    };
  }
  const classified = classifyDomains(row);
  if (classified.unclassifiable) {
    return {
      domain: isEmptyDomain(domainIn) ? "" : domainIn,
      subjects: isEmptySubject(subjectsIn) ? "" : subjectsIn,
      auto: false,
      unclassifiable: true,
      reason: classified.reason,
      paths: [],
    };
  }
  return {
    domain: classified.domain,
    subjects: classified.subjects,
    auto: true,
    paths: classified.paths,
    unclassifiable: false,
  };
}

export function isBlankSubjectLabel(s) {
  return isEmptySubject(s);
}
