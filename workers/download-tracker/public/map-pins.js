/*
 * Corpus /map pin colors, eras, correspondence and last-10 (AZNEWS-PINS-1.0 / AZNEWS-MATCH-1.0).
 * Same palette and rules as the aziel-runtime 4DMap AZNews store (src/engines/4dmap/aznews-pins.js).
 *
 *   RED         news event location               BLUE        news reporting location
 *   PURPLE      Aziel Library document event      PINK        that document's origin/report location as cited in the document
 *   LIGHT GREEN other corpus event                DARK GREEN  other corpus report location
 *   BLACK       corresponding events (rule passed) WHITE      potential correspondence (below threshold)
 *   ORANGE      weather (added; not in the operator palette)
 *   GOLD        sky (added; not in the operator palette)
 *
 * Library membership comes from records.library ('aziel' = Aziel Library), never from who uploaded.
 * Corpus events are event locations. A report/origin pin is drawn only when the record cites one;
 * this hub does not extract origins yet, so PINK and DARK GREEN have no pins until it does.
 *
 * CORRESPONDENCE (AZNEWS-MATCH-1.0): two event pins from DIFFERENT sources, both dated,
 * |year difference| <= 3, both located:
 *   BLACK: >= 3 shared salient tokens AND Jaccard >= 0.30 AND distance <= 150 km
 *   WHITE: >= 2 shared salient tokens AND distance <= 500 km, BLACK not passed
 * WHITE is never promoted to BLACK; BLACK only when the full rule passes.
 * Author: Aziel Eliab. Identity is Aziel Eliab only.
 */
(function (root) {
  'use strict';
  var PIN_COLORS = {
    'news-event': { color: 'red', hex: '#e53935', label: 'News event location' },
    'news-report': { color: 'blue', hex: '#1e88e5', label: 'News reporting location (dateline in the item text; outlet HQ only when labeled report_location_source: outlet_hq)' },
    'library-aziel-event': { color: 'purple', hex: '#8e24aa', label: 'Aziel Library document event location' },
    'library-aziel-report': { color: 'pink', hex: '#f06292', label: 'Aziel Library document origin/report location (cited in the document)' },
    'corpus-event': { color: 'lightgreen', hex: '#9ccc65', label: 'Other corpus event location' },
    'corpus-report': { color: 'darkgreen', hex: '#2e7d32', label: 'Other corpus report location' },
    'correspondence': { color: 'black', hex: '#111111', label: 'Corresponding events (matching rule passed)' },
    'correspondence-candidate': { color: 'white', hex: '#ffffff', label: 'Potential correspondence (below the confirmation threshold)' },
    'weather-report': { color: 'orange', hex: '#fb8c00', label: 'Weather observation anchor (added; not in the operator palette)' },
    'weather-event': { color: 'orange', hex: '#fb8c00', label: 'Weather model cell (added; not in the operator palette)' },
    'sky-report': { color: 'gold', hex: '#fdd835', label: 'Sky computation reference (added; not in the operator palette)' },
    'sky-event': { color: 'gold', hex: '#fdd835', label: 'Sub-solar point (added; not in the operator palette)' }
  };
  var KEY_ORDER = ['news-event', 'news-report', 'library-aziel-event', 'library-aziel-report', 'corpus-event', 'corpus-report', 'correspondence', 'correspondence-candidate', 'weather-event', 'sky-event'];
  var MATCH_YEARS = 3;
  var BLACK_RULE = { min_shared: 3, min_jaccard: 0.3, max_km: 150, max_years: MATCH_YEARS };
  var WHITE_RULE = { min_shared: 2, max_km: 500, max_years: MATCH_YEARS };
  var STOP = {};
  ('The A An And Or Of In On At To For From By With As Is Are Was Were Be Been It Its This That These Those After Before Over Under Into About Amid Says Said New News Live Update Updates How Why What When Who Will Would Could Should May Might Can Not No Yes Up Out Off More Most Than Then There Here Day Week Year Years Estimated Corpus Record Document Audit').split(' ').forEach(function (w) { STOP[w.toLowerCase()] = 1; });

  function colorFor(type) { return PIN_COLORS[type] || null; }
  function corpusPinType(e, role) {
    var aziel = String((e && e.library) || '').toLowerCase() === 'aziel';
    if (role === 'report') return aziel ? 'library-aziel-report' : 'corpus-report';
    return aziel ? 'library-aziel-event' : 'corpus-event';
  }
  /** Year from '2026-10-09', '1101', '-400', '400 BCE', '12 CE'. Null when undated. */
  function yearOf(value) {
    var s = String(value == null ? '' : value).trim();
    if (!s) return null;
    var m = s.match(/(\d{1,6})\s*(BCE|BC)\b/i); if (m) return -Number(m[1]);
    m = s.match(/^(-?\d{1,6})(?:$|[^\d])/);
    if (m) { var y = Number(m[1]); if (isFinite(y)) return y; }
    m = s.match(/(\d{1,6})\s*(CE|AD)\b/i); if (m) return Number(m[1]);
    return null;
  }
  function withinYears(a, b, years) {
    var ya = yearOf(a), yb = yearOf(b);
    if (ya == null || yb == null) return false;
    return Math.abs(ya - yb) <= (years == null ? MATCH_YEARS : years);
  }
  /** Era slider: pins whose event year is within +/- 3 years of the slider year. Undated pins are excluded. */
  function inEra(date, year, window) {
    var y = yearOf(date);
    if (y == null) return false;
    return Math.abs(y - Number(year)) <= (window == null ? MATCH_YEARS : window);
  }
  function distanceKm(a, b) {
    var R = 6371, toR = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function salientTokens(title, exclude) {
    var ex = String(exclude || '').toLowerCase();
    var out = {};
    (String(title || '').match(/[A-Z][\w'-]{2,}|\d{3,}/g) || []).forEach(function (w) {
      var k = w.toLowerCase().replace(/'s$/, '');
      if (k.length < 3 || STOP[k] || (ex && ex.indexOf(k) >= 0)) return;
      out[k] = 1;
    });
    return Object.keys(out);
  }
  /** Compare one event pin to another. Returns {level:'black'|'white'|null, shared, jaccard, km, years}. */
  function matchPair(a, b) {
    var none = { level: null };
    if (!a || !b || a.source_id === b.source_id) return none;
    if (!isFinite(a.lat) || !isFinite(b.lat) || !isFinite(a.lon) || !isFinite(b.lon)) return none;
    if (!withinYears(a.date, b.date, MATCH_YEARS)) return none;
    var ta = salientTokens(a.title, a.exclude), tb = salientTokens(b.title, b.exclude);
    var setB = {}; tb.forEach(function (t) { setB[t] = 1; });
    var shared = ta.filter(function (t) { return setB[t]; });
    var union = ta.length + tb.length - shared.length;
    var jac = union ? shared.length / union : 0;
    var km = distanceKm(a, b);
    var out = { shared: shared, jaccard: Number(jac.toFixed(3)), km: Math.round(km), years: Math.abs(yearOf(a.date) - yearOf(b.date)) };
    if (shared.length >= BLACK_RULE.min_shared && jac >= BLACK_RULE.min_jaccard && km <= BLACK_RULE.max_km) out.level = 'black';
    else if (shared.length >= WHITE_RULE.min_shared && km <= WHITE_RULE.max_km) out.level = 'white';
    else out.level = null;
    return out;
  }
  /** Cross-source correspondences between corpus events and news events (bounded). */
  function correspondences(corpus, news, cap) {
    var out = [];
    for (var i = 0; i < corpus.length; i++) {
      for (var j = 0; j < news.length; j++) {
        var m = matchPair(corpus[i], news[j]);
        if (m.level) out.push({ level: m.level, pin_type: m.level === 'black' ? 'correspondence' : 'correspondence-candidate', a: corpus[i].id, b: news[j].id, lat: (corpus[i].lat + news[j].lat) / 2, lon: (corpus[i].lon + news[j].lon) / 2, shared: m.shared, jaccard: m.jaccard, km: m.km, years: m.years });
        if (out.length >= (cap || 200)) return out;
      }
    }
    return out;
  }
  /** The last 10 pins added across all layers, newest first, by added_at. */
  function lastAdded(pins, n) {
    return pins.filter(function (p) { return p && p.id && isFinite(Date.parse(p.added_at)); })
      .slice().sort(function (a, b) { return Date.parse(b.added_at) - Date.parse(a.added_at) || String(b.id).localeCompare(String(a.id)); })
      .slice(0, n == null ? 10 : n);
  }
  /** Pins that share a spot are fanned out on a small ring so each one shows. Returns [{pin, dx, dy}]. */
  function fanOut(points, radius) {
    var groups = {}, order = [];
    points.forEach(function (p) {
      var k = Number(p.x).toFixed(1) + ',' + Number(p.y).toFixed(1);
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(p);
    });
    var out = [];
    order.forEach(function (k) {
      var g = groups[k];
      g.forEach(function (p, i) {
        if (g.length === 1) { out.push({ pin: p, dx: 0, dy: 0, cluster: 1 }); return; }
        var ang = (2 * Math.PI * i) / g.length;
        out.push({ pin: p, dx: Math.cos(ang) * (radius || 10), dy: Math.sin(ang) * (radius || 10), cluster: g.length });
      });
    });
    return out;
  }
  var api = { PIN_COLORS: PIN_COLORS, KEY_ORDER: KEY_ORDER, MATCH_YEARS: MATCH_YEARS, BLACK_RULE: BLACK_RULE, WHITE_RULE: WHITE_RULE, colorFor: colorFor, corpusPinType: corpusPinType, yearOf: yearOf, withinYears: withinYears, inEra: inEra, distanceKm: distanceKm, salientTokens: salientTokens, matchPair: matchPair, correspondences: correspondences, lastAdded: lastAdded, fanOut: fanOut };
  root.AZMapPins = api;
})(typeof window !== 'undefined' ? window : globalThis);
