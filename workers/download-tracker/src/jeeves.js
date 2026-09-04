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
  "Ask Jeeves is a research assistant over public library text. It is not sovereign, not the operator, and cannot change SPRE, CLCE, PhysLing, Bayesian, or triad scores. Add always files to Corpus (Lamb Lens), never Aziel Library.";

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

export async function jeevesUpload(env, { signed, file, title, body, author, domain, subjects, keywords }) {
  if (!signed) {
    const err = new Error("sign in to add a file to Corpus");
    err.status = 401;
    throw err;
  }
  const f = asFile(file);
  if (!f && !String(title || "").trim() && !String(body || "").trim()) {
    const err = new Error("file or title + notes required");
    err.status = 400;
    throw err;
  }
  if (isOperator(signed)) {
    /* still allowed to Add, but only as Lamb Lens public — never Aziel Library */
  }
  const lamb = lambLensSigned(signed);
  if (isOperator(lamb)) {
    const err = new Error("Ask Jeeves cannot write Aziel Library");
    err.status = 403;
    throw err;
  }
  const record = await ingestRecord(env, {
    signed: lamb,
    title,
    body,
    file: f,
    author,
    domain,
    subjects,
    keywords,
  });
  if (record.library !== "corpus") {
    const err = new Error("Ask Jeeves cannot write Aziel Library");
    err.status = 403;
    throw err;
  }
  return {
    ok: true,
    library: "corpus",
    lamb_lens: true,
    record_id: record.id,
    title: record.title,
    quarantine_status: record.quarantine_status,
    triad: record.review && record.review.triad,
    download: "/file/" + record.id,
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
    } else {
      try {
        const body = await request.json();
        title = body.title || "";
        notes = body.body || body.notes || "";
        author = body.author || "";
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
        })
      );
    } catch (err) {
      return json({ error: err && err.message ? err.message : "upload failed" }, err && err.status ? err.status : 400);
    }
  }
  return null;
}

export function jeevesFabHtml() {
  return `<button type="button" class="jeeves-fab" id="jeevesFab" aria-expanded="false" aria-controls="jeevesDrawer">Ask Jeeves</button>
<aside class="jeeves-drawer" id="jeevesDrawer" hidden>
  <header class="jeeves-head"><strong>Ask Jeeves</strong><button type="button" class="jeeves-x" id="jeevesClose" aria-label="Close">×</button></header>
  <p class="muted jeeves-note">Research assistant. Not sovereign. Not the operator. Cannot change scores. Add files only to Corpus.</p>
  <div class="jeeves-log" id="jeevesLog" aria-live="polite"></div>
  <form class="jeeves-ask" id="jeevesAsk">
    <label class="sr-only" for="jeevesQ">Question</label>
    <textarea id="jeevesQ" name="q" rows="2" maxlength="2000" placeholder="Ask about a filed record…"></textarea>
    <button type="submit">Ask</button>
  </form>
  <details class="jeeves-add"><summary>Add to Corpus</summary>
    <form class="jeeves-up" id="jeevesUp" enctype="multipart/form-data">
      <label class="filepick">File<input type="file" name="file"></label>
      <input name="title" placeholder="Title">
      <textarea name="body" rows="3" placeholder="Notes"></textarea>
      <p class="muted">Same ingest as the shelf: structure, SPRE × CLCE × PhysLing, Bayesian, document hash-chain. Never Aziel Library.</p>
      <button type="submit">Add to Corpus</button>
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
  function line(who,text){var d=document.createElement("div");d.className="jeeves-msg";d.innerHTML="<b>"+who+"</b> "+String(text||"").replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]});log.appendChild(d);log.scrollTop=log.scrollHeight;}
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
      .then(function(j){line("Jeeves",j.answer||j.error||"No answer");})
      .catch(function(){line("Jeeves","Could not reach the assistant.");});
  });
  up.addEventListener("submit",function(e){
    e.preventDefault();
    var fd=new FormData(up);
    fetch("/v1/jeeves/upload",{method:"POST",body:fd})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(x){
        if(!x.ok){line("Jeeves",x.j.error||"Upload failed");return;}
        line("Jeeves","Filed to Corpus as "+x.j.record_id+". Same review engines. Download stays on the record.");
        if(x.j.href){var a=document.createElement("a");a.href=x.j.href;a.textContent="Open "+x.j.record_id;a.className="button ghost";log.appendChild(a);}
      })
      .catch(function(){line("Jeeves","Upload failed.");});
  });
})();
</script>`;
}

