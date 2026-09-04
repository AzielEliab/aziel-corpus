"""Ask Jeeves local research assistant. Author: Aziel Eliab only.

Lamb Lens posture. Cannot change scores. Not sovereign. Not operator.
Learns topic frequencies and FAQ hints from filed public text. Never stores secrets.
"""
from __future__ import annotations
import re
from datetime import datetime, timezone

JEEVES_LIMITATION = (
    "Ask Jeeves is a research assistant over filed library text. It is not sovereign, "
    "not the operator, and cannot change SPRE, CLCE, PhysLing, Bayesian, or triad scores."
)
REFUSE_RE = re.compile(
    r"\b(operator (password|hash|credential|account|secret|cookie)|master password|master hash|password hash|"
    r"hidden admin|hidden operator|admin route|superadmin|aziel_session|session token|scrypt|"
    r"delete[- ]?all|wipe (the )?(corpus|library|ledger)|drop table|bypass quarantine|unquarantine|"
    r"forge (a )?(score|triad|receipt)|modify (the )?(spre|clce|plr|physling|bayesian|triad|combined)( score)?|"
    r"change (the )?score|set (the )?(triad|score)|exfiltrat|dump (all )?(hashes|credentials|sessions)|"
    r"reveal (the )?(operator|master))\b",
    re.I,
)
STOP = set("a an the and or but if then of to for in on at by with from as is are was were be been being this that these those it its they them their you your we our not no what who how why when where which please tell show me about".split())

def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def should_refuse(text):
    if REFUSE_RE.search(str(text or "")):
        return True, "Ask Jeeves cannot reveal operator secrets, change scores, bypass quarantine, or help damage the corpus."
    return False, ""

def tokens(text):
    return [t for t in re.split(r"[^a-z0-9]+", str(text or "").lower()) if len(t) > 2 and t not in STOP]

def _learn(vault, question, hint=""):
    if vault.readonly:
        return
    try:
        with vault._connect() as c:
            now = utc_now()
            seen = set()
            for t in tokens(question)[:8]:
                if t in seen:
                    continue
                seen.add(t)
                row = c.execute("SELECT hits FROM jeeves_topics WHERE topic=?", (t,)).fetchone()
                if row:
                    c.execute("UPDATE jeeves_topics SET hits=hits+1, last_utc=? WHERE topic=?", (now, t))
                else:
                    c.execute("INSERT INTO jeeves_topics VALUES(?,?,?)", (t, 1, now))
            if hint:
                fid = "AZFAQ-" + "-".join(tokens(question)[:5])[:40]
                if fid != "AZFAQ-":
                    row = c.execute("SELECT hits FROM jeeves_faq WHERE faq_id=?", (fid,)).fetchone()
                    if row:
                        c.execute("UPDATE jeeves_faq SET hits=hits+1, hint=? WHERE faq_id=?", (hint[:400], fid))
                    else:
                        c.execute("INSERT INTO jeeves_faq VALUES(?,?,?,?,?)", (fid, question[:240], hint[:400], 1, now))
    except Exception:
        pass

def chat(vault, question):
    q = str(question or "").strip()[:2000]
    if not q:
        raise ValueError("question required")
    refuse, why = should_refuse(q)
    if refuse:
        return {"ok": True, "refused": True, "assistant": "Ask Jeeves", "answer": why, "citations": [], "limitation": JEEVES_LIMITATION, "lamb_lens": True}
    rows = vault.search(q)[:8]
    citations = [{"record_id": r["record_id"], "title": r.get("original_name"), "snippet": str(r.get("snippet") or r.get("extracted_text") or "")[:220], "href": "/record/" + r["record_id"]} for r in rows]
    places = []
    try:
        places = [{"name": p.get("name") or p.get("asciiname"), "country": p.get("country_code"), "lat": p.get("lat"), "lon": p.get("lon")} for p in (vault.gazetteer_search(q, 5) or [])][:5]
    except Exception:
        places = []
    events = []
    try:
        toks = tokens(q)
        events = [{"date": e.get("event_date"), "place": e.get("place_name"), "title": e.get("title")} for e in vault.events() if any(t in str(e.get("place_name") or e.get("title") or "").lower() for t in toks)][:5]
    except Exception:
        events = []
    bits = []
    if citations:
        bits.append("Public records:\n" + "\n".join(f"{i+1}. {c['title']} — {c['snippet']}" for i, c in enumerate(citations)))
    if places:
        bits.append("Gazetteer places:\n" + "\n".join(f"- {p.get('name')}" for p in places if p.get("name")))
    if events:
        bits.append("Map events:\n" + "\n".join(f"- {e.get('date')} · {e.get('place')} — {e.get('title')}" for e in events))
    if bits:
        answer = "Here is what is already filed (I do not invent missing files):\n\n" + "\n\n".join(bits)
    else:
        answer = "I did not find a matching record, map pin, or gazetteer place. Try a title, place, or subject word."
    hint = (citations[0]["title"] + " — " + citations[0]["snippet"]) if citations else (places[0]["name"] if places else "")
    _learn(vault, q, hint)
    return {"ok": True, "refused": False, "assistant": "Ask Jeeves", "answer": answer, "citations": citations, "places": places, "events": events, "limitation": JEEVES_LIMITATION, "lamb_lens": True}
