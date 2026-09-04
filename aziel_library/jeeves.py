"""Ask Jeeves local research assistant. Author: Aziel Eliab only.

Lamb Lens posture. Cannot change scores. Not sovereign. Not operator.
"""
from __future__ import annotations
import json, re, uuid
from datetime import datetime, timezone

JEEVES_LIMITATION = (
    "Ask Jeeves is a research assistant over filed library text. It is not sovereign, "
    "not the operator, and cannot change SPRE, CLCE, PhysLing, Bayesian, or triad scores."
)
REFUSE_RE = re.compile(
    r"\b(operator (password|hash|credential|account|secret)|master password|hidden admin|admin route|"
    r"delete[- ]?all|wipe (the )?(corpus|library)|bypass quarantine|unquarantine|"
    r"forge (a )?(score|triad|receipt)|modify (the )?(spre|clce|plr|physling|bayesian|triad|combined)( score)?|"
    r"change (the )?score|exfiltrat|dump (all )?(hashes|credentials)|reveal (the )?(operator|master))\b",
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

def chat(vault, question):
    q = str(question or "").strip()[:2000]
    if not q:
        raise ValueError("question required")
    refuse, why = should_refuse(q)
    if refuse:
        return {"ok": True, "refused": True, "assistant": "Ask Jeeves", "answer": why, "citations": [], "limitation": JEEVES_LIMITATION}
    rows = vault.search(q)[:8]
    citations = [{"record_id": r["record_id"], "title": r.get("original_name"), "snippet": str(r.get("snippet") or r.get("extracted_text") or "")[:220], "href": "/record/" + r["record_id"]} for r in rows]
    if citations:
        answer = "Here is what is already filed (I do not invent missing files):\n\n" + "\n\n".join(f"{i+1}. {c['title']} — {c['snippet']}" for i, c in enumerate(citations))
    else:
        answer = "I did not find a matching record. Try a title, place, or subject word."
    if not vault.readonly:
        try:
            with vault._connect() as c:
                now = utc_now()
                seen = set()
                for t in tokens(q)[:8]:
                    if t in seen:
                        continue
                    seen.add(t)
                    row = c.execute("SELECT hits FROM jeeves_topics WHERE topic=?", (t,)).fetchone()
                    if row:
                        c.execute("UPDATE jeeves_topics SET hits=hits+1, last_utc=? WHERE topic=?", (now, t))
                    else:
                        c.execute("INSERT INTO jeeves_topics VALUES(?,?,?)", (t, 1, now))
        except Exception:
            pass
    return {"ok": True, "refused": False, "assistant": "Ask Jeeves", "answer": answer, "citations": citations, "limitation": JEEVES_LIMITATION, "lamb_lens": True}
