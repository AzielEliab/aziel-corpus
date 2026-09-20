/**
 * Visible tag / chip filter for library HTML.
 * Keep human keywords and subjects; hide machine paths, JSON dumps, hashes, and "...." junk.
 * Author: Aziel Eliab.
 */

export const TAG_LABEL_MAX = 42;
export const TAG_KEEP_MAX = 80;

export function splitRawTokens(value) {
  const groups = Array.isArray(value) ? value : [value];
  const out = [];
  for (const group of groups) {
    for (const part of String(group == null ? "" : group).split(/[,;]+/)) {
      const piece = part.trim();
      if (!piece) continue;
      if (/#/.test(piece) && /\s/.test(piece)) {
        for (const word of piece.split(/\s+/)) {
          if (word.trim()) out.push(word.trim());
        }
      } else {
        out.push(piece);
      }
    }
  }
  return out;
}

export function normalizeTag(token) {
  return String(token == null ? "" : token).trim().replace(/^#+/, "").trim();
}

export function isMachineFileTag(token) {
  const t = String(token == null ? "" : token).trim();
  if (!t) return true;
  if (/metadata\.json/i.test(t)) return true;
  if (/jsonazdoc/i.test(t)) return true;
  if (/\.Json\//i.test(t)) return true;
  if (/\.json(?:[\/\\]|$)/i.test(t)) return true;
  if (/(?:^|[\/\\])[^\/\\]+\.json$/i.test(t)) return true;
  return false;
}

function isEllipsisJunk(token) {
  const s = normalizeTag(token);
  if (!s) return true;
  if (/^[.\u2026·•…]+$/.test(s)) return true;
  if (/^\.{2,}$/.test(s)) return true;
  if (/^[\s.#…·•\u2026]+$/.test(s)) return true;
  return false;
}

function isJsonBlob(token) {
  const t = String(token == null ? "" : token).trim();
  if (!t) return false;
  if (/^[{\[]/.test(t)) return true;
  if (/[}\]]$/.test(t) && /["']?\s*:/.test(t)) return true;
  if (/"[^"]+"\s*:/.test(t) && /[{[]}]/.test(t)) return true;
  return false;
}

function isHashToken(token) {
  const t = normalizeTag(token);
  if (/^(?:sha-?256[:\s-]*)?[a-f0-9]{32,}$/i.test(t)) return true;
  return false;
}

function letterRatio(token) {
  const t = String(token == null ? "" : token);
  const letters = (t.match(/[\p{L}\p{N}]/gu) || []).length;
  return { letters, ratio: t.length ? letters / t.length : 0 };
}

/** True when a visible byline would name Aziel Eliab on human library chrome. Machine cite stays. */
export function isChromeAuthorByline(name) {
  const s = String(name == null ? "" : name).trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return false;
  return s === "aziel eliab" || s === "aziel elroi eliab" || /^aziel(?:\s+elroi)?\s+eliab$/.test(s);
}

export function isHumanTag(token) {
  const raw = String(token == null ? "" : token).trim();
  if (!raw) return false;
  if (isEllipsisJunk(raw)) return false;
  if (isJsonBlob(raw)) return false;
  if (isMachineFileTag(raw)) return false;
  const t = normalizeTag(raw);
  if (!t) return false;
  if (isEllipsisJunk(t)) return false;
  if (isJsonBlob(t)) return false;
  if (isMachineFileTag(t)) return false;
  if (isHashToken(t)) return false;
  if (t.length > TAG_KEEP_MAX) return false;
  const { letters, ratio } = letterRatio(t);
  if (letters < 2) return false;
  if (t.length >= 6 && ratio < 0.45) return false;
  return true;
}

export function formatTagLabel(token) {
  const t = normalizeTag(token);
  if (t.length <= TAG_LABEL_MAX) return t;
  return t.slice(0, TAG_LABEL_MAX - 1) + "…";
}

export function visibleTagEntries(value) {
  const seen = new Set();
  const out = [];
  for (const raw of splitRawTokens(value)) {
    if (!isHumanTag(raw)) continue;
    const valueNorm = normalizeTag(raw);
    const key = valueNorm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ value: valueNorm, label: formatTagLabel(valueNorm) });
  }
  return out;
}

export function visibleTagTokens(value) {
  return visibleTagEntries(value).map((x) => x.value);
}
