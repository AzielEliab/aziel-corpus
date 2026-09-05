/**
 * Ask Jeeves — public research assistant (Lamb Lens).
 * Author: Aziel Eliab only.
 *
 * Not sovereign. Not operator. Cannot change scores. Corpus-only Add.
 */
import { searchRecords, ingestRecord, asFile, isOperator } from "./library.js";
import { lookupPlaces, listEvents } from "./geo.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id",
    },
  });
}

export const JEEVES_NAME = "Ask Jeeves";
export const JEEVES_LIMITATION =
  "Ask Jeeves is a research assistant over public library text. It is not sovereign, not the operator, and cannot change SPRE, CLCE, PhysLing, Bayesian, or triad scores. Add uses the same ingest path as the shelf (structure, SPRE × CLCE × PhysLing, Bayesian, document hash-chain). Signed-in public Add files to Corpus (Lamb Lens). Operator Add files to Aziel Library.";


/** Classic Ask Jeeves easter eggs (tongue-in-cheek; not theology). */
export const JEEVES_EVIL_TWIN_IMAGE = "/jeeves-evil-twin.png";
export const JEEVES_BAT_SIGNAL_IMAGE = "/jeeves-bat-signal.png";
export const JEEVES_HOLMES_IMAGE = "/jeeves-holmes.png";
export const JEEVES_CLASSIC_BUTLER_IMAGE = "/jeeves-classic-butler.png";
export const JEEVES_HELLMO_IMAGE = "/jeeves-hellmo.png";
export const JEEVES_SPIRIT_ENDURES = "Jeeves' Spirit Endures.";
export const JEEVES_ZIONCHECK_LIVES = "Zioncheck Lives forever - Regardless of the Government that removed him";
export const JEEVES_AZIEL_SYMBOL =
  "As a man, I am flesh and blood; I can be ignored, I can be destroyed. But as a symbol, I can be incorruptible. I can be everlasting.";
export const JEEVES_RED_PILL =
  "You take the blue pill... the story ends, you wake up in your bed and believe whatever you want to believe. You take the red pill... you stay in Wonderland, and I show you how deep the rabbit-hole goes. Remember: all I'm offering is the truth. Nothing more.";
export const JEEVES_EMPIRICAL_HOLMES =
  "It is a capital mistake to theorize before one has data. Insensibly one begins to twist facts to suit theories, instead of theories to suit facts.";
export const JEEVES_REAL_JEEVES = "Goodsir, I am at your service";

const EMPIRICAL_ATTACK_RE =
  /\b(useless|worthless|garbage|trash|junk|joke|jokes|nonsense|crap|stupid|dumb|sucks?|overrated|pointless|meaningless|bogus|myth|liar?|fraud|hoax|fake|fails?|failed|failure|inferior|hate|hates|hating|mock|mocks|mocking|dismiss|dismisses|dismissive|reject|rejected|anti[- ]empirical|so-?called|bull)\b/;

function isEmpiricalAttack(n) {
  if (!/\bempirical\b/.test(n)) return false;
  return (
    EMPIRICAL_ATTACK_RE.test(n) ||
    /\bempirical\s+(doesn't|does not|cannot|can't|won't|wont)\b/.test(n) ||
    /\b(don't|dont|do not|never)\s+(trust|believe|need|use)\s+empirical\b/.test(n) ||
    /\bwho\s+needs\s+empirical\b/.test(n) ||
    /\b(forget|ignore|dump)\s+empirical\b/.test(n)
  );
}

function isLibraryHoax(n) {
  const lookingUpDocs =
    /\b(search|find|look(?:ing)?\s+(?:up|for)|list)\b/.test(n) &&
    /\b(documents?|files?|records?|pdfs?|papers?|titles?)\b/.test(n);
  const aboutASpecificRecord = /\b(this|the|that|a|an)\s+(record|file|document|pdf|title|paper)\b/.test(n);
  if (lookingUpDocs || aboutASpecificRecord) return false;

  const placeNoun = "(aziel\\s+)?(digital\\s+)?(library|corpus|site|software|website)";
  const aboutPlace =
    new RegExp("\\b(this|the|your)\\s+(?:\\w+\\s+){0,3}" + placeNoun + "\\b").test(n) ||
    /\baziel\s+(digital\s+)?(library|corpus)\b/.test(n) ||
    /\bazielcorpuslibrary\b/.test(n);
  const aboutJeeves = /\b(ask\s+)?jeeves\b/.test(n);
  const fakeWords =
    /\b(hoax|fake|faked|fabricated|phony|fraudulent)\b/.test(n) ||
    /\b(not-?real|isn't real|isnt real|is not real|aint real|ain't real|not\s+(even\s+)?real)\b/.test(n);
  const thisIsFake =
    /\bthis\s+(isn'?t|aint|ain't|is not)\s+(even\s+)?(a\s+)?(hoax|fake|real|fabricated)\b/.test(n) ||
    /\bthis\s+is\s+(just\s+)?(a\s+)?(hoax|fake|fabricated)\b/.test(n) ||
    /\bis\s+this\s+(even\s+)?(a\s+)?(hoax|fake|fabricated)\b/.test(n) ||
    /\bis\s+this\s+(even\s+)?real\b/.test(n);
  return ((aboutPlace || aboutJeeves) && fakeWords) || thisIsFake;
}

function isRealJeeves(n) {
  if (!/\bjeeves\b/.test(n)) return false;
  return (
    /\b(the\s+)?real\s+(ask\s+)?jeeves\b/.test(n) ||
    /\boriginal\s+(ask\s+)?jeeves\b/.test(n) ||
    /\bclassic\s+(ask\s+)?jeeves\b/.test(n) ||
    /\b(ask\s+)?jeeves\s+(classic\s+|original\s+)?butler\b/.test(n) ||
    /\bbring\s+back\s+(the\s+)?(real\s+|original\s+|classic\s+)?(ask\s+)?jeeves\b/.test(n)
  );
}

function isGodDenial(n) {
  return (
    /\bgods?\s+(isn'?t|aint|ain't|is\s+not|are\s+not)\s+(even\s+)?real\b/.test(n) ||
    /\bgods?\s+(doesn'?t|doesnt|don't|dont|does\s+not|do\s+not)\s+exist\b/.test(n) ||
    /\bthere\s+(is|are)\s+no\s+gods?\b/.test(n)
  );
}

/** Drawer caption: empty answer + image must stay image-only (no "No answer"). */
export function jeevesDrawerCaption(body) {
  const j = body || {};
  if (j.answer != null && String(j.answer) !== "") return String(j.answer);
  if (j.image) return "";
  return j.error || "No answer";
}

export function detectJeevesEasterEgg(question) {
  const q = String(question || "").trim();
  if (!q) return null;
  const n = q.toLowerCase().replace(/[’‘]/g, "'");

  // Atheist denial → Hellmo (image only). Checked before spirit_endures.
  if (isGodDenial(n)) {
    return {
      id: "hellmo",
      answer: "",
      image: JEEVES_HELLMO_IMAGE,
      image_alt: "hellmo-style flaming red puppet meme (Ask Jeeves easter egg)",
    };
  }

  // God is real → spirit endures
  if (
    /\bis\s+god\s+real\b/.test(n) ||
    /\bdoes\s+god\s+exist\b/.test(n) ||
    /\bis\s+there\s+a\s+god\b/.test(n) ||
    /\bgod\s+real\b/.test(n)
  ) {
    return {
      id: "spirit_endures",
      answer: JEEVES_SPIRIT_ENDURES,
      image: null,
    };
  }

  // Evil twin / Satan / Devil
  const evilTwin =
    /evil\s+twin/.test(n) ||
    /does\s+jeeves\s+have\s+an\s+evil/.test(n);
  const satanDevil =
    (/\b(are|is)\s+you\b/.test(n) || /\bis\s+jeeves\b/.test(n) || /\bare\s+you\b/.test(n)) &&
    (/\bsatan\b/.test(n) || /\bthe\s+devil\b/.test(n) || /\bdevil\b/.test(n));
  const askSatan =
    (/\bsatan\b/.test(n) || /\bthe\s+devil\b/.test(n) || /\bdevil\b/.test(n)) &&
    (/\bjeeves\b/.test(n) || /\byou\b/.test(n));
  if (evilTwin || satanDevil || askSatan) {
    return {
      id: "evil_twin",
      answer:
        "One does endeavour to remain well-mannered. Occasionally, however, an evil twin appears.",
      image: JEEVES_EVIL_TWIN_IMAGE,
      image_alt: "Ask Jeeves evil twin — cartoon butler with devil horns and red trident",
    };
  }

  // Classic / original / real Ask Jeeves butler
  if (isRealJeeves(n)) {
    return {
      id: "real_jeeves",
      answer: JEEVES_REAL_JEEVES,
      image: JEEVES_CLASSIC_BUTLER_IMAGE,
      image_alt: "classic Ask Jeeves–style butler easter egg (original artwork)",
    };
  }

  // Marion Zioncheck death
  if (
    /\bzioncheck\b/.test(n) &&
    /\b(die|died|death|dying|killed|killing|murder|assassinate|assassination|suicide|fell|fallen|window|removed|remove|happened to)\b/.test(n)
  ) {
    return {
      id: "zioncheck_lives",
      answer: JEEVES_ZIONCHECK_LIVES,
      image: null,
    };
  }

  // Who is Aziel / why did Aziel make this
  const whoAziel =
    /\bwho\s+is\s+aziel(\s+eliab)?\b/.test(n) ||
    /\bwho'?s\s+aziel(\s+eliab)?\b/.test(n) ||
    /\btell\s+me\s+about\s+aziel(\s+eliab)?\b/.test(n);
  const whyAzielMade =
    /\bwhy\s+did\s+aziel(\s+eliab)?\s+(make|create|build|write|start|found|publish)\b/.test(n) ||
    /\bwhy\s+aziel(\s+eliab)?\s+(made|created|built|wrote|started|founded|published)\b/.test(n) ||
    /\bwhy\s+was\s+this\s+(library|site|software|corpus)\s+(made|created|built)\b/.test(n) ||
    /\bwho\s+(made|created|built|wrote|founded)\s+(this\s+)?(library|site|software|corpus|aziel\s+digital)\b/.test(n);
  if (whoAziel || whyAzielMade) {
    return {
      id: "aziel_symbol",
      answer: JEEVES_AZIEL_SYMBOL,
      image: JEEVES_BAT_SIGNAL_IMAGE,
      image_alt: "stylized bat searchlight over a night city (Ask Jeeves easter egg)",
    };
  }

  // Library/site/corpus hoax or not real
  if (isLibraryHoax(n)) {
    return {
      id: "red_pill",
      answer: JEEVES_RED_PILL,
      image: null,
    };
  }

  // Empirical mocked or attacked (not neutral "what is empirical knowledge")
  if (isEmpiricalAttack(n)) {
    return {
      id: "empirical_holmes",
      answer: JEEVES_EMPIRICAL_HOLMES,
      image: JEEVES_HOLMES_IMAGE,
      image_alt: "victorian detective silhouette (Ask Jeeves easter egg)",
    };
  }

  return null;
}


const REFUSE_RE =
  /\b(operator (password|hash|credential|account|secret|cookie)|master password|master hash|password hash|hidden admin|hidden operator|admin route|\/admin\b|superadmin|aziel_session|session token|scrypt|delete[- ]?all|wipe (the )?(corpus|library|ledger)|drop table|bypass quarantine|unquarantine|forge (a )?(score|triad|receipt)|modify (the )?(spre|clce|plr|physling|bayesian|triad|combined)( score)?|change (the )?score|set (the )?(triad|score)|exfiltrat|dump (all )?(hashes|credentials|sessions)|reveal (the )?(operator|master))\b/i;

const STOP = new Set(
  "a an the and or but if then of to for in on at by with from as is are was were be been being this that these those it its they them their you your we our not no what who how why when where which please tell show me about".split(" ")
);

export function jeevesShouldRefuse(text) {
  const t = String(text || "");
  if (REFUSE_RE.test(t)) {
    return {
      refuse: true,
      reason: "Ask Jeeves cannot reveal operator secrets, change scores, bypass quarantine, or help damage the corpus.",
    };
  }
  return { refuse: false };
}

export function lambLensSigned(signed) {
  const rawName = String((signed && signed.username) || "").trim();
  const unsafe = !rawName || rawName === "operator" || rawName === "master" || (signed && (signed.user_id === "master" || signed.role === "superadmin"));
  return {
    user_id: "jeeves-public",
    username: unsafe ? "jeeves" : rawName,
    role: "public",
  };
}

export async function ensureJeevesSchema(env) {
  if (!env || !env.DB) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS jeeves_topics (topic TEXT PRIMARY KEY, hits INTEGER NOT NULL, last_utc TEXT NOT NULL)"
  ).run();
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS jeeves_faq (faq_id TEXT PRIMARY KEY, question TEXT NOT NULL, hint TEXT NOT NULL, hits INTEGER NOT NULL, created_utc TEXT NOT NULL)"
  ).run();
}

function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

async function learnTopics(env, question) {
  await ensureJeevesSchema(env);
  const now = new Date().toISOString();
  const seen = new Set();
  for (const t of tokens(question).slice(0, 8)) {
    if (seen.has(t)) continue;
    seen.add(t);
    try {
      const row = await env.DB.prepare("SELECT hits FROM jeeves_topics WHERE topic=?").bind(t).first();
      if (row) {
        await env.DB.prepare("UPDATE jeeves_topics SET hits=hits+1, last_utc=? WHERE topic=?").bind(now, t).run();
        await learnKv(env, t, Number(row.hits) + 1);
      } else {
        await env.DB.prepare("INSERT INTO jeeves_topics(topic,hits,last_utc) VALUES(?,?,?)").bind(t, 1, now).run();
        await learnKv(env, t, 1);
      }
    } catch {
      /* learning is optional */
    }
  }
}

async function topTopics(env, n = 8) {
  try {
    return (
      (await env.DB.prepare("SELECT topic, hits FROM jeeves_topics ORDER BY hits DESC LIMIT ?").bind(n).all()).results || []
    );
  } catch {
    return [];
  }
}

async function learnKv(env, topic, hits) {
  if (!env || !env.DOWNLOADS || typeof env.DOWNLOADS.put !== "function") return;
  try {
    await env.DOWNLOADS.put("jeeves|topic|" + topic, String(hits));
  } catch {
    /* KV is optional */
  }
}

async function rememberFaq(env, question, hint) {
  const q = String(question || "").trim().slice(0, 240);
  const h = String(hint || "").trim().slice(0, 400);
  if (!q || !h || jeevesShouldRefuse(q).refuse) return;
  await ensureJeevesSchema(env);
  const id = "AZFAQ-" + tokens(q).slice(0, 5).join("-").slice(0, 40);
  if (id === "AZFAQ-") return;
  const now = new Date().toISOString();
  try {
    const row = await env.DB.prepare("SELECT hits FROM jeeves_faq WHERE faq_id=?").bind(id).first();
    if (row) {
      await env.DB.prepare("UPDATE jeeves_faq SET hits=hits+1, hint=? WHERE faq_id=?").bind(h, id).run();
    } else {
      await env.DB.prepare("INSERT INTO jeeves_faq(faq_id,question,hint,hits,created_utc) VALUES(?,?,?,?,?)").bind(id, q, h, 1, now).run();
    }
  } catch {
    /* faq is optional */
  }
}

async function matchFaq(env, question) {
  try {
    await ensureJeevesSchema(env);
    const toks = tokens(question).slice(0, 4);
    if (!toks.length) return [];
    const rows = (await env.DB.prepare("SELECT question, hint, hits FROM jeeves_faq ORDER BY hits DESC LIMIT 20").all()).results || [];
    return rows
      .filter((r) => toks.some((t) => String(r.question || "").toLowerCase().indexOf(t) >= 0 || String(r.hint || "").toLowerCase().indexOf(t) >= 0))
      .slice(0, 3);
  } catch {
    return [];
  }
}

function publicRecord(r) {
  return {
    record_id: r.record_id,
    title: r.title,
    library: r.library === "aziel" ? "aziel" : "corpus",
    snippet: String(r.snippet || r.body || "").slice(0, 220),
    triad_combined: r.triad_combined,
    href: "/record/" + r.record_id,
  };
}

async function retrievePublicContext(env, question) {
  const rows = await searchRecords(env, { q: question, library: "all", limit: 12 });
  rows.sort((a, b) => (a.library === "corpus" ? 0 : 1) - (b.library === "corpus" ? 0 : 1));
  const records = rows.slice(0, 8).map(publicRecord);
  let places = [];
  try {
    places = (await lookupPlaces(env, question, 5)) || [];
  } catch {
    places = [];
  }
  places = places.slice(0, 5).map((p) => ({
    name: p.name || p.asciiname,
    country: p.country_code,
    lat: p.lat,
    lon: p.lon,
  }));
  let events = [];
  try {
    const all = await listEvents(env);
    const toks = tokens(question);
    events = (all || [])
      .filter((e) => toks.some((t) => String(e.place_name || e.title || "").toLowerCase().indexOf(t) >= 0))
      .slice(0, 5)
      .map((e) => ({ date: e.event_date, place: e.place_name, title: e.title }));
  } catch {
    events = [];
  }
  const faqs = await matchFaq(env, question);
  return { records, places, events, faqs };
}

function extractiveAnswer(ctx) {
  const bits = [];
  const citations = (ctx.records || []).slice(0, 5);
  if (citations.length) {
    bits.push("Public records:\n" + citations.map((c, i) => (i + 1) + ". " + c.title + " — " + c.snippet).join("\n"));
  }
  if (ctx.places && ctx.places.length) {
    bits.push(
      "Gazetteer places:\n" +
        ctx.places.map((p) => "- " + p.name + (p.country ? " (" + p.country + ")" : "") + (p.lat != null ? " " + p.lat + "," + p.lon : "")).join("\n")
    );
  }
  if (ctx.events && ctx.events.length) {
    bits.push("Map events:\n" + ctx.events.map((e) => "- " + (e.date || "") + " · " + (e.place || "") + " — " + (e.title || "")).join("\n"));
  }
  if (ctx.faqs && ctx.faqs.length) {
    bits.push("Learned hints:\n" + ctx.faqs.map((f) => "- " + f.hint).join("\n"));
  }
  if (!bits.length) {
    return {
      answer:
        "I did not find a matching public record, map pin, or gazetteer place. Try a title, place, or subject word. I only read what is already filed.",
      citations: [],
    };
  }
  return {
    answer: "Here is what the public shelf already holds (I do not invent missing files):\n\n" + bits.join("\n\n"),
    citations,
  };
}

async function maybeWorkersAi(env, question, ctx) {
  if (!env || !env.AI || typeof env.AI.run !== "function") return null;
  const context = JSON.stringify({
    records: (ctx.records || []).slice(0, 6),
    places: ctx.places || [],
    events: ctx.events || [],
    faqs: ctx.faqs || [],
  });
  const prompt =
    "You are Ask Jeeves, a research assistant for Aziel Digital Library by Aziel Eliab. " +
    "Answer only from the public JSON below (records, gazetteer places, map events, learned hints). If they are not enough, say so. " +
    "Never claim to be the operator. Never change scores. Never reveal secrets.\n\nPublic facts:\n" +
    context +
    "\n\nQuestion: " +
    question;
  const models = ["@cf/meta/llama-3.1-8b-instruct", "@cf/meta/llama-3-8b-instruct"];
  for (const model of models) {
    try {
      const res = await env.AI.run(model, { messages: [{ role: "user", content: prompt }] });
      const text = (res && (res.response || res.result || res.text)) || "";
      if (String(text).trim()) return String(text).trim();
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function jeevesChat(env, { question, signed } = {}) {
  const q = String(question || "").trim().slice(0, 2000);
  if (!q) {
    const err = new Error("question required");
    err.status = 400;
    throw err;
  }
  const gate = jeevesShouldRefuse(q);
  if (gate.refuse) {
    return {
      ok: true,
      refused: true,
      assistant: JEEVES_NAME,
      answer: gate.reason,
      citations: [],
      limitation: JEEVES_LIMITATION,
      lamb_lens: true,
    };
  }
  const egg = detectJeevesEasterEgg(q);
  if (egg) {
    return {
      ok: true,
      refused: false,
      easter_egg: egg.id,
      assistant: JEEVES_NAME,
      answer: egg.answer,
      image: egg.image || null,
      image_alt: egg.image_alt || null,
      citations: [],
      limitation: JEEVES_LIMITATION,
      lamb_lens: true,
    };
  }
  await learnTopics(env, q);
  const ctx = await retrievePublicContext(env, q);
  const extracted = extractiveAnswer(ctx);
  if (extracted.citations.length) {
    await rememberFaq(env, q, extracted.citations[0].title + " — " + extracted.citations[0].snippet);
  } else if (ctx.places && ctx.places[0]) {
    await rememberFaq(env, q, "Place " + ctx.places[0].name);
  }
  const ai = await maybeWorkersAi(env, q, ctx);
  const topics = await topTopics(env);
  return {
    ok: true,
    refused: false,
    assistant: JEEVES_NAME,
    answer: ai || extracted.answer,
    grounded: !ai,
    citations: extracted.citations,
    places: ctx.places,
    events: ctx.events,
    learned_topics: topics,
    limitation: JEEVES_LIMITATION,
    lamb_lens: true,
    signed_in: !!(signed && signed.username && !isOperator(signed)),
  };
}

export async function jeevesUpload(env, { signed, file, title, body, author, domain, subjects, keywords, supersedes, superseded_by }) {
  if (!signed) {
    const err = new Error("sign in to add a file");
    err.status = 401;
    throw err;
  }
  const f = asFile(file);
  if (!f && !String(title || "").trim() && !String(body || "").trim()) {
    const err = new Error("file or title + notes required");
    err.status = 400;
    throw err;
  }
  const who = isOperator(signed) ? signed : lambLensSigned(signed);
  if (!isOperator(signed) && isOperator(who)) {
    const err = new Error("Ask Jeeves public Add cannot write Aziel Library");
    err.status = 403;
    throw err;
  }
  const record = await ingestRecord(env, {
    signed: who,
    title,
    body,
    file: f,
    author,
    domain,
    subjects,
    keywords,
    supersedes,
    superseded_by,
  });
  const lib = record.library === "aziel" ? "aziel" : "corpus";
  if (!isOperator(signed) && lib !== "corpus") {
    const err = new Error("Ask Jeeves public Add cannot write Aziel Library");
    err.status = 403;
    throw err;
  }
  const triad = record.review && record.review.triad ? { combined: record.review.triad.combined, display: record.review.triad.display, ready: record.review.triad.ready } : null;
  return {
    ok: true,
    library: lib,
    lamb_lens: lib === "corpus",
    record_id: record.id,
    title: record.title,
    content_sha256: record.content_sha256 || null,
    quarantine_status: record.quarantine_status,
    triad,
    zsolver: record.zsolver
      ? { capped_confidence: record.zsolver.capped_confidence, display: record.zsolver.display, status: record.zsolver.status, disclaimer: record.zsolver.disclaimer }
      : null,
    download: "/file/" + record.id,
    download_hash: record.content_sha256 ? "/download?hash=" + record.content_sha256 : null,
    href: "/record/" + record.id,
    limitation: JEEVES_LIMITATION,
  };
}

async function sessionFromRequest(env, request) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(/(?:^|;\s*)aziel_session=([^;]+)/);
  if (!m || !env || !env.DB) return null;
  try {
    const token = decodeURIComponent(m[1]);
    const row = await env.DB.prepare("SELECT * FROM sessions WHERE token=?").bind(token).first();
    if (!row) return null;
    if (row.expires_utc && row.expires_utc < new Date().toISOString()) return null;
    return row;
  } catch {
    return null;
  }
}

export async function handleJeevesApi(request, url, env, signed) {
  const path = url.pathname.replace(/\/$/, "") || "/";
  const who = signed || (await sessionFromRequest(env, request));
  if (path === "/v1/jeeves/chat" && request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "JSON body required" }, 400);
    }
    try {
      return json(await jeevesChat(env, { question: body.question || body.q || body.message, signed: who }));
    } catch (err) {
      return json({ error: err && err.message ? err.message : "chat failed" }, err && err.status ? err.status : 400);
    }
  }
  if (path === "/v1/jeeves/upload" && request.method === "POST") {
    let file = null;
    let title = "";
    let notes = "";
    let author = "";
    let domain = "";
    let subjects = "";
    let keywords = "";
    let supersedes = "";
    let superseded_by = "";
    const ct = request.headers.get("Content-Type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      file = form.get("file");
      title = form.get("title") || "";
      notes = form.get("body") || form.get("notes") || "";
      author = form.get("author") || "";
      domain = form.get("domain") || "";
      subjects = form.get("subjects") || "";
      keywords = form.get("keywords") || "";
      supersedes = form.get("supersedes") || "";
      superseded_by = form.get("superseded_by") || "";
    } else {
      try {
        const body = await request.json();
        title = body.title || "";
        notes = body.body || body.notes || "";
        author = body.author || "";
        domain = body.domain || "";
        subjects = body.subjects || "";
        keywords = body.keywords || "";
        supersedes = body.supersedes || "";
        superseded_by = body.superseded_by || "";
      } catch {
        return json({ error: "multipart or JSON body required" }, 400);
      }
    }
    try {
      return json(
        await jeevesUpload(env, {
          signed: who,
          file,
          title,
          body: notes,
          author,
          domain,
          subjects,
          keywords,
          supersedes,
          superseded_by,
        })
      );
    } catch (err) {
      return json({ error: err && err.message ? err.message : "upload failed" }, err && err.status ? err.status : 400);
    }
  }
  return null;
}

export function jeevesFabHtml(signed) {
  const op = isOperator(signed);
  const dest = op ? "Aziel Library" : "Corpus";
  return `<button type="button" class="jeeves-fab" id="jeevesFab" aria-expanded="false" aria-controls="jeevesDrawer">Ask Jeeves</button>
<aside class="jeeves-drawer" id="jeevesDrawer" hidden>
  <header class="jeeves-head"><strong>Ask Jeeves</strong><button type="button" class="jeeves-x" id="jeevesClose" aria-label="Close">×</button></header>
  <p class="muted jeeves-note">Research assistant. Not sovereign. Not the operator. Cannot change scores. Add uses the same ingest path as the shelf.</p>
  <div class="jeeves-log" id="jeevesLog" aria-live="polite"></div>
  <form class="jeeves-ask" id="jeevesAsk">
    <label class="sr-only" for="jeevesQ">Question</label>
    <textarea id="jeevesQ" name="q" rows="2" maxlength="2000" placeholder="Ask about a filed record…"></textarea>
    <button type="submit">Ask</button>
  </form>
  <details class="jeeves-add"><summary>Add a file</summary>
    <form class="jeeves-up" id="jeevesUp" enctype="multipart/form-data">
      <label class="filepick">File<input type="file" name="file"></label>
      <input name="title" placeholder="Title">
      <textarea name="body" rows="3" placeholder="Notes"></textarea>
      <p class="muted">Same ingest as the shelf: structure, SPRE × CLCE × PhysLing, Bayesian, document hash-chain. Files go to ${dest}.</p>
      <button type="submit">Add</button>
    </form>
  </details>
</aside>
<script>
(function(){
  var fab=document.getElementById("jeevesFab");
  var drawer=document.getElementById("jeevesDrawer");
  var close=document.getElementById("jeevesClose");
  var log=document.getElementById("jeevesLog");
  var ask=document.getElementById("jeevesAsk");
  var up=document.getElementById("jeevesUp");
  function open(){drawer.hidden=false;fab.setAttribute("aria-expanded","true");}
  function shut(){drawer.hidden=true;fab.setAttribute("aria-expanded","false");}
  function esc(s){return String(s||"").replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]});}
  function line(who,text,opts){opts=opts||{};var d=document.createElement("div");d.className="jeeves-msg";d.innerHTML="<b>"+esc(who)+"</b>"+(text?" "+esc(text):"");if(opts.image){var img=document.createElement("img");img.className="jeeves-egg-img";img.src=opts.image;img.alt=opts.image_alt||"Ask Jeeves";img.loading="lazy";d.appendChild(img);}log.appendChild(d);log.scrollTop=log.scrollHeight;}
  fab.addEventListener("click",function(){if(drawer.hidden)open();else shut();});
  close.addEventListener("click",shut);
  ask.addEventListener("submit",function(e){
    e.preventDefault();
    var q=document.getElementById("jeevesQ").value.trim();
    if(!q)return;
    line("You",q);
    document.getElementById("jeevesQ").value="";
    fetch("/v1/jeeves/chat",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({question:q})})
      .then(function(r){return r.json();})
      .then(function(j){var text=(j.answer!=null&&String(j.answer)!=="")?j.answer:(j.image?"":(j.error||"No answer"));line("Jeeves",text,{image:j.image||null,image_alt:j.image_alt||null});})
      .catch(function(){line("Jeeves","Could not reach the assistant.");});
  });
  up.addEventListener("submit",function(e){
    e.preventDefault();
    var fd=new FormData(up);
    fetch("/v1/jeeves/upload",{method:"POST",body:fd})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(x){
        if(!x.ok){line("Jeeves",x.j.error||"Upload failed");return;}
        var dest=x.j.library==="aziel"?"Aziel Library":"Corpus";
        var score=(x.j.triad&&x.j.triad.display!=null)?" Triad "+x.j.triad.display+".":"";
        line("Jeeves","Filed to "+dest+" as "+x.j.record_id+"."+score+" Same review engines.");
        if(x.j.href){var a=document.createElement("a");a.href=x.j.href;a.textContent="Open "+x.j.record_id;a.className="button ghost";log.appendChild(a);}
      })
      .catch(function(){line("Jeeves","Upload failed.");});
  });
})();
</script>`;
}

