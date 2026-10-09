'use strict';
(function(){
var EVENTS = [];
var svg = document.getElementById('worldMap');
if (!svg) return;
var vp = document.getElementById('viewport');
var land = document.getElementById('land');
var pins = document.getElementById('pins');
var grid = document.getElementById('grid');
var history = document.getElementById('history');
var scale = 1, tx = 0, ty = 0, drag = null, histToken = 0, lastDist = null;
var MONTH_NAMES = ['Off','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatYearLabel(y){ y=Number(y); if(!Number.isFinite(y)) return ''; if(y<0) return (-y)+' BCE'; if(y===0) return '1 BCE'; return y+' CE'; }
function parseEventYear(value){ var s=String(value==null?'':value).trim(); if(!s) return null; var m=s.match(/^(-?\d{1,6})(?:$|[^\d])/); if(m){ var y=Number(m[1]); if(Number.isFinite(y)) return y; } m=s.match(/(\d{1,6})\s*(BCE|BC)\b/i); if(m){ var n=Number(m[1]); return Number.isFinite(n)&&n>0?-n:null; } m=s.match(/(\d{1,6})\s*(CE|AD)\b/i); if(m){ var n2=Number(m[1]); return Number.isFinite(n2)&&n2>0?n2:null; } return null; }
function xy(lon, lat) { return [((Number(lon) + 180) / 360) * 1200, ((90 - Number(lat)) / 180) * 600]; }
function mk(tag, attrs) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
for (var lon = -180; lon <= 180; lon += 30) { var x = xy(lon, 0)[0]; grid.appendChild(mk('line', {x1:x,y1:0,x2:x,y2:600,stroke:'#cad6da','stroke-width':1})); }
for (var lat = -60; lat <= 60; lat += 30) { var y = xy(0, lat)[1]; grid.appendChild(mk('line', {x1:0,y1:y,x2:1200,y2:y,stroke:'#cad6da','stroke-width':1})); }
function ringPath(ring) { return ring.map(function(c,i){ var p = xy(c[0], c[1]); return (i ? 'L' : 'M') + p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' ') + ' Z'; }
function geomPath(g) { if (!g) return ''; if (g.type === 'Polygon') return g.coordinates.map(ringPath).join(' '); if (g.type === 'MultiPolygon') return g.coordinates.flatMap(function(p){ return p.map(ringPath); }).join(' '); return ''; }
fetch('/assets/world_110m.geojson').then(function(r){ return r.json(); }).then(function(fc){ (fc.features||[]).forEach(function(f){ var d = geomPath(f.geometry); if (!d) return; land.appendChild(mk('path', {d:d, fill:'#dbe4e1', stroke:'#9dada9', 'stroke-width':0.6, 'fill-rule':'evenodd'})); }); }).catch(function(){ var el = document.getElementById('mapStatus'); if (el) el.textContent = 'Boundary basemap unavailable; coordinate grid and pins remain functional.'; });
var AZ = window.AZMapPins || null;
var RUNTIME = 'https://aziel-runtime.vibelock.workers.dev';
var NEWS = [], CORR = [], VISIBLE = {}, NEWS_SHOWN = 0, NEWS_STATE = 'loading';
function eraFilter(){ var on = document.getElementById('eraOn'); if (!on || !on.checked) return null; var v = elVal('eraYear', null); var lab = document.getElementById('eraLabel'); if (lab) lab.textContent = formatYearLabel(v) + ' ± 3 years'; return v; }
function corpusPins(list){ return list.map(function(e){ var type = e.pin_type || (AZ ? AZ.corpusPinType(e, 'event') : 'corpus-event'); return { id:e.event_id, kind:'corpus', pin_type:type, date:e.event_date||null, lat:Number(e.lat), lon:Number(e.lon), place:e.place_name, title:e.title||'', added_at:e.created_utc||null, record_id:e.record_id||null, source:e.source||'', source_id:'corpus:'+(e.record_id||e.event_id) }; }); }
function newsPins(rows){ return (rows||[]).filter(function(p){ return p && p.geo && Number.isFinite(Number(p.geo.lat)) && Number.isFinite(Number(p.geo.lon)); }).map(function(p){ return { id:p.pin_id, kind:'news', pin_type:p.pin_type, date:p.date||null, date_reason:p.date_reason||null, lat:Number(p.geo.lat), lon:Number(p.geo.lon), place:p.geo.name||'', title:p.event||'', added_at:p.added_at||null, link:RUNTIME + (p.permalink||'/aznews'), outlet:(p.source&&p.source.outlet)||'', source_id:'news:'+(p.report_seq||p.pin_id), exclude:(p.source&&p.source.outlet)||'' }; }); }
function visibleNews(y1, y2, monthSel, era){
  var out = NEWS.filter(function(p){ var y = parseEventYear(p.date); if (y == null) return false; if (y < y1 || y > y2) return false; if (monthSel > 0) { var mm = String(p.date).match(/^-?\d{1,6}-(\d{2})/); if (!mm || Number(mm[1]) !== monthSel) return false; } if (era != null && !(AZ && AZ.inEra(p.date, era))) return false; return true; });
  NEWS_SHOWN = out.length;
  var ids = {}; out.forEach(function(p){ ids[p.id] = 1; });
  CORR.forEach(function(c){ c.visible = !!ids[c.b]; });
  return out;
}
function allPins(){ return corpusPins(EVENTS.filter(function(e){ return Number.isFinite(Number(e.lat)) && Number.isFinite(Number(e.lon)); })).concat(NEWS).concat(CORR); }
function findPin(id){ var all = allPins(); for (var i = 0; i < all.length; i++) if (String(all[i].id) === String(id)) return all[i]; return null; }
function flyTo(pin){ var p = xy(pin.lon, pin.lat); scale = 4; tx = 600 - p[0]*scale; ty = 300 - p[1]*scale; transform(); }
function openPin(id, push){
  var pin = findPin(id);
  var box = document.getElementById('pinDetail');
  if (!pin) { if (box) box.innerHTML = '<p class="muted">Pin ' + esc(id) + ' is not loaded on this map.</p>'; return; }
  flyTo(pin);
  var col = (AZ && AZ.colorFor(pin.pin_type)) || { color:'', label:'' };
  if (box) box.innerHTML = '<b>' + esc(pin.title || pin.place || pin.id) + '</b><br><span class="muted">' + esc(col.color) + ' · ' + esc(col.label) + '</span><br>Date: ' + esc(pin.date || ('undated' + (pin.date_reason ? ' (' + pin.date_reason + ')' : ''))) + '<br>Place: ' + esc(pin.place || '') + ' (' + Number(pin.lat).toFixed(3) + ', ' + Number(pin.lon).toFixed(3) + ')' + (pin.record_id ? '<br>Record: <a href="/record/' + encodeURIComponent(pin.record_id) + '">' + esc(pin.record_id) + '</a>' : '') + (pin.link ? '<br>AZNews pin: <a href="' + esc(pin.link) + '">' + esc(pin.id) + '</a>' + (pin.outlet ? ' · ' + esc(pin.outlet) : '') : '') + (pin.kind === 'corr' ? '<br>Rule: AZNEWS-MATCH-1.0 · shared ' + esc((pin.shared||[]).join(', ')) + ' · Jaccard ' + pin.jaccard + ' · ' + pin.km + ' km · ' + pin.years + ' y · <a href="?pin=' + encodeURIComponent(pin.a) + '">' + esc(pin.a) + '</a> ↔ <a href="?pin=' + encodeURIComponent(pin.b) + '">' + esc(pin.b) + '</a>' : '') + '<br><a href="?pin=' + encodeURIComponent(pin.id) + '">Permalink</a>';
  if (push && window.history && window.history.pushState) window.history.pushState({ pin:pin.id }, '', '?pin=' + encodeURIComponent(pin.id));
}
function renderLast10(){
  var el = document.getElementById('last10'); if (!el || !AZ) return;
  var rows = AZ.lastAdded(allPins(), 10);
  el.innerHTML = rows.length ? '<ol>' + rows.map(function(p){ var col = AZ.colorFor(p.pin_type) || { hex:'#999', color:'' }; return '<li><span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:1px solid #333;background:' + col.hex + '"></span> <a href="?pin=' + encodeURIComponent(p.id) + '" data-pin="' + esc(p.id) + '">' + esc(p.title || p.place || p.id) + '</a> <span class="muted">' + esc(col.color) + ' · ' + esc(p.added_at || '') + '</span></li>'; }).join('') + '</ol>' : '<p class="muted">No pins loaded yet.</p>';
  Array.prototype.forEach.call(el.querySelectorAll('a[data-pin]'), function(a){ a.addEventListener('click', function(ev){ ev.preventDefault(); openPin(a.getAttribute('data-pin'), true); }); });
}
function loadNews(){
  var st = document.getElementById('newsStatus');
  fetch(RUNTIME + '/v1/fraggate/call', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ slug:'4dmap', op:'news_pins', payload:{ limit:200, via:'corpus:/map' } }) })
    .then(function(r){ return r.json(); })
    .then(function(j){
      var b = (j && j.result) || j || {};
      if (!b.pins) throw new Error(b.code || b.message || 'no pins');
      NEWS = newsPins(b.pins.filter(function(p){ return p.pin_type === 'news-event' || p.pin_type === 'news-report'; }));
      var corpus = corpusPins(EVENTS.filter(function(e){ return Number.isFinite(Number(e.lat)); }));
      var newsEvents = NEWS.filter(function(p){ return p.pin_type === 'news-event'; });
      CORR = AZ ? AZ.correspondences(corpus, newsEvents, 200).map(function(c){ return { id:'corr-' + c.a + '-' + c.b, kind:'corr', pin_type:c.pin_type, lat:c.lat, lon:c.lon, date:null, title:(c.level === 'black' ? 'Corresponding: ' : 'Potential correspondence: ') + c.a + ' ↔ ' + c.b, place:'', added_at:null, a:c.a, b:c.b, shared:c.shared, jaccard:c.jaccard, km:c.km, years:c.years, visible:false }; }) : [];
      NEWS_STATE = 'ok';
      if (st) st.innerHTML = NEWS.length + ' AZNews pins via the runtime FragGate door (4dmap/news_pins). ' + CORR.length + ' correspondence(s) under AZNEWS-MATCH-1.0. <a href="' + RUNTIME + '/aznews">Open the AZNews globe</a> (real news, weather, sky).';
      renderEvents();
      openFromQuery();
    })
    .catch(function(err){ NEWS_STATE = 'error'; if (st) st.innerHTML = 'AZNews pins did not load (' + esc(err && err.message || 'error') + '). Corpus pins are unaffected. <a href="' + RUNTIME + '/aznews">AZNews globe</a>.'; openFromQuery(); });
}
var OPENED = false;
function openFromQuery(){ if (OPENED) return; var q = new URLSearchParams(location.search).get('pin'); if (!q) return; if (findPin(q)) { OPENED = true; openPin(q, false); } else if (NEWS_STATE !== 'loading') { OPENED = true; openPin(q, false); } }
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m] || m; }); }
function elVal(id, fallback) {
  var n = document.getElementById(id);
  if (!n) return fallback;
  var v = Number(n.value);
  return Number.isFinite(v) ? v : fallback;
}
function syncYearOrder() {
  var a = document.getElementById('yearFrom');
  var b = document.getElementById('yearTo');
  if (!a || !b) return;
  var y1 = Number(a.value), y2 = Number(b.value);
  if (y1 > y2) { a.value = y2; b.value = y1; }
  var lf = document.getElementById('yearFromLabel');
  var lt = document.getElementById('yearToLabel');
  if (lf) lf.textContent = formatYearLabel(a.value);
  if (lt) lt.textContent = formatYearLabel(b.value);
}
function syncMonthLabel() {
  var m = document.getElementById('monthFilter');
  var lab = document.getElementById('monthLabel');
  if (!m || !lab) return;
  var v = Number(m.value) || 0;
  lab.textContent = MONTH_NAMES[v] || 'Off';
}
function renderEvents() {
  pins.replaceChildren();
  syncYearOrder();
  syncMonthLabel();
  var y1 = elVal('yearFrom', -9999);
  var y2 = elVal('yearTo', 9999);
  if (y1 > y2) { var tmp = y1; y1 = y2; y2 = tmp; }
  var monthSel = elVal('monthFilter', 0);
  var cf = elVal('conf', 0);
  var show = EVENTS.filter(function(e){
    if (Number(e.lat) !== Number(e.lat) || Number(e.lon) !== Number(e.lon)) return false;
    if (Number(e.confidence || 0) < cf) return false;
    var ds = String(e.event_date || '');
    var y = parseEventYear(ds);
    if (y != null) {
      if (y < y1 || y > y2) return false;
    }
    // Undated place pins remain visible across year filters (month Off only).
    if (monthSel > 0) {
      if (y == null) return false;
      var mm = ds.match(/^-?\d{1,6}-(\d{2})/);
      if (!mm) return false;
      var em = Number(mm[1]);
      if (em !== monthSel) return false;
    }
    return true;
  });
  var era = eraFilter();
  if (era != null) show = show.filter(function(e){ return AZ ? AZ.inEra(e.event_date, era) : true; });
  var drawn = corpusPins(show).concat(visibleNews(y1, y2, monthSel, era)).concat(CORR.filter(function(c){ return c.visible; }));
  VISIBLE = {};
  var placed = drawn.map(function(pin){ var p = xy(pin.lon, pin.lat); return { x:p[0], y:p[1], pin:pin }; });
  var fanned = AZ ? AZ.fanOut(placed, 9) : placed.map(function(q){ return { pin:q, dx:0, dy:0, cluster:1 }; });
  fanned.forEach(function(f){
    var q = f.pin, pin = q.pin; VISIBLE[pin.id] = pin;
    var col = (AZ && AZ.colorFor(pin.pin_type)) || { hex:'#1f596d', color:'teal' };
    var g = mk('g', {class:'pin', 'data-pin':pin.id, 'data-type':pin.pin_type});
    if (f.cluster > 1) g.appendChild(mk('line', {x1:q.x, y1:q.y, x2:q.x+f.dx, y2:q.y+f.dy, stroke:'#555', 'stroke-width':1}));
    var c = mk('circle', {cx:q.x+f.dx, cy:q.y+f.dy, r:pin.kind==='corr'?6:7, fill:col.hex, stroke:col.color==='white'||col.color==='gold'?'#333':'#c9a227', 'stroke-width':2});
    var t = mk('title', {});
    t.textContent = (pin.date||'undated') + ' — ' + (pin.place||'') + '\n' + (pin.title||'') + '\n' + col.color + ' · ' + pin.pin_type + (pin.record_id ? '\nsource ' + pin.record_id : '');
    c.appendChild(t); g.appendChild(c);
    g.addEventListener('click', function(){ openPin(pin.id, true); });
    pins.appendChild(g);
  });
  var list = document.getElementById('eventList');
  if (list) list.innerHTML = show.slice(0,300).map(function(e){
    var h=(e.historical_context||[]).map(function(x){ return esc(x.jurisdiction||x.name); }).join(' / ');
    return '<div class="event-row"><b>'+esc(e.event_date||'undated')+' — '+esc(e.place_name)+'</b><br>'+esc(e.title||'')+(h?'<br><span class="muted">Historical: '+h+'</span>':'')+'<br><span class="muted">'+esc(e.source||'')+' · '+Number(e.confidence||0).toFixed(2)+(e.record_id?' · <a href="/record/'+encodeURIComponent(e.record_id)+'">'+esc(e.record_id)+'</a>':'')+'</span></div>';
  }).join('') || '<p>No events in this temporal window.</p>';
  renderLast10();
  var st = document.getElementById('mapStatus'); if (st) st.textContent = show.length + ' corpus event pin(s), ' + NEWS_SHOWN + ' AZNews pin(s), ' + CORR.filter(function(c){ return c.visible; }).length + ' correspondence pin(s) visible. Drag year/month sliders to filter; drag map to pan; pinch or wheel to zoom.';
}
async function renderHistory(year) {
  var token = ++histToken; history.replaceChildren();
  var lab = document.getElementById('contextLabel'); if (lab) lab.textContent = formatYearLabel(year);
  var hs = document.getElementById('historyStatus'); if (hs) hs.textContent = 'Loading historical state…';
  try {
    var r = await fetch('/api/historical?date=' + encodeURIComponent(year));
    var fc = await r.json(); if (token !== histToken) return;
    var n = 0;
    (fc.features||[]).forEach(function(f){
      var d = geomPath(f.geometry); if (!d) return; n++;
      var p = f.properties || {};
      var path = mk('path', {d:d, fill:'#647cb033', stroke:'#465d86', 'stroke-width':1.2, 'fill-rule':'evenodd'});
      var when = p.sheet_year ? ('Sheet year ' + p.sheet_year + (p.year_matches_sheet === false && p.requested_year != null ? (' · requested ' + p.requested_year + ' ≠ sheet') : '')) : ((p.valid_from||'')+' — '+(p.valid_to||''));
      var title = mk('title', {}); title.textContent = (p.name||'')+'\n'+(p.jurisdiction||'')+'\n'+when+'\n'+(p.source_name||'')+(p.honesty?'\n'+p.honesty:'');
      path.appendChild(title);
      path.addEventListener('click', function(){ document.getElementById('historyDetail').innerHTML = '<b>'+esc(p.name||p.jurisdiction||'Historical region')+'</b><br>'+esc(p.jurisdiction||'')+(p.affiliation?'<br>Affiliation: '+esc(p.affiliation):'')+'<br><span class="muted">'+esc(when)+(p.confidence!=null?' · confidence '+Number(p.confidence||0).toFixed(2):'')+'<br>Layer: '+esc(p.aziel_layer_id||'')+'<br>Source: '+esc(p.source_name||'')+' · '+esc(p.license||'')+'<br>'+esc(p.attribution||'')+(p.honesty?'<br>'+esc(p.honesty):'')+'</span>'; });
      history.appendChild(path);
    });
    var sheet = fc.sheet_year;
    var requested = fc.requested_year;
    var mismatch = fc.year_matches_sheet === false && sheet != null && requested != null;
    var honesty = fc.honesty ? (' ' + fc.honesty) : '';
    if (hs) {
      if (mismatch) hs.textContent = n + ' feature(s) from sheet ' + sheet + '. Requested ' + requested + ' is not that sheet.' + honesty;
      else if (sheet != null) hs.textContent = n + ' feature(s) from sheet ' + sheet + '. Requested year matches this sheet.' + honesty;
      else hs.textContent = n + ' historical feature(s).' + honesty;
    }
  } catch (err) { if (hs) hs.textContent = 'Historical layer unavailable: ' + err; }
}
function scheduleAfterPaint(fn) {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function(){ requestAnimationFrame(fn); });
  else setTimeout(fn, 0);
}
function loadUnresolved() {
  var list = document.getElementById('unresolvedList');
  if (!list) return;
  fetch('/api/unresolved').then(function(r){ return r.json(); }).then(function(payload){
    var rows = (payload && payload.unresolved) || [];
    var note = document.getElementById('unresolvedNote');
    if (note && payload && payload.note) note.textContent = payload.note;
    if (!rows.length) { list.innerHTML = '<li>None in this sample.</li>'; return; }
    list.innerHTML = rows.map(function(x){ return '<li>' + esc(x.name) + ' — ' + esc(x.documents) + ' document(s)</li>'; }).join('');
  }).catch(function(){
    list.innerHTML = '<li>Unresolved place list did not load. Pins above do not wait on it.</li>';
  });
}
function startLazyLayers() {
  if (startLazyLayers.done) return;
  startLazyLayers.done = true;
  scheduleAfterPaint(function(){
    var yearSlider = document.getElementById('contextYear');
    if (yearSlider) renderHistory(yearSlider.value);
    loadUnresolved();
  });
}
function transform(){ vp.setAttribute('transform', 'translate('+tx+' '+ty+') scale('+scale+')'); }
svg.addEventListener('wheel', function(e){ e.preventDefault(); scale = Math.max(1, Math.min(8, scale * (e.deltaY < 0 ? 1.2 : 0.8333))); transform(); }, {passive:false});
svg.addEventListener('pointerdown', function(e){ drag = [e.clientX, e.clientY, tx, ty]; svg.setPointerCapture(e.pointerId); });
svg.addEventListener('pointermove', function(e){ if (!drag) return; tx = drag[2] + (e.clientX - drag[0]); ty = drag[3] + (e.clientY - drag[1]); transform(); });
svg.addEventListener('pointerup', function(){ drag = null; });
svg.addEventListener('touchmove', function(e){ if (e.touches.length === 2) { e.preventDefault(); var d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); if (lastDist) { scale = Math.max(1, Math.min(8, scale * (d/lastDist))); transform(); } lastDist = d; } }, {passive:false});
svg.addEventListener('touchend', function(){ lastDist = null; });
var apply = document.getElementById('applyMap'); if (apply) apply.addEventListener('click', renderEvents);
var reset = document.getElementById('resetMap'); if (reset) reset.addEventListener('click', function(){ scale=1; tx=0; ty=0; transform(); });
var conf = document.getElementById('conf'); if (conf) conf.addEventListener('change', renderEvents);
['eraOn','eraYear'].forEach(function(id){ var n = document.getElementById(id); if (n) { n.addEventListener('input', renderEvents); n.addEventListener('change', renderEvents); } });
window.addEventListener('popstate', function(){ var q = new URLSearchParams(location.search).get('pin'); if (q) openPin(q, false); });
['yearFrom','yearTo','monthFilter'].forEach(function(id){
  var node = document.getElementById(id);
  if (!node) return;
  // input fires continuously on drag (mouse + touch)
  node.addEventListener('input', renderEvents);
  node.addEventListener('change', renderEvents);
});
var histTimer;
var slider = document.getElementById('contextYear');
if (slider) slider.addEventListener('input', function(e){ clearTimeout(histTimer); var y = e.target.value; var lab=document.getElementById('contextLabel'); if (lab) lab.textContent=formatYearLabel(y); histTimer=setTimeout(function(){ renderHistory(y); }, 90); });
function paintPinsThenLazy() {
  renderEvents();
  startLazyLayers();
}
function takeEvents(list, failed) {
  EVENTS = Array.isArray(list) ? list : [];
  paintPinsThenLazy();
  openFromQuery();
  scheduleAfterPaint(loadNews);
  if (!failed) return;
  var st = document.getElementById('mapStatus');
  if (st) st.textContent = 'Event pins did not load. The basemap still pans. Historical layers load on their own.';
}
var boot = window.__mapEventsPromise;
if (boot && typeof boot.then === 'function') {
  boot.then(function(list){ takeEvents(list, false); }).catch(function(){ takeEvents([], true); });
} else {
  fetch('/api/events', { headers: { Accept: 'application/json' } }).then(function(r){ return r.json(); }).then(function(b){ takeEvents((b && b.events) || [], false); }).catch(function(){ takeEvents([], true); });
}
})();
