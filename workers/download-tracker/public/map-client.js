'use strict';
(function(){
var holder = document.getElementById('map-events');
var EVENTS = [];
if (holder) { try { EVENTS = JSON.parse(holder.value || holder.textContent || '[]'); } catch (e) { EVENTS = []; } }
var svg = document.getElementById('worldMap');
if (!svg) return;
var vp = document.getElementById('viewport');
var land = document.getElementById('land');
var pins = document.getElementById('pins');
var grid = document.getElementById('grid');
var history = document.getElementById('history');
var scale = 1, tx = 0, ty = 0, drag = null, histToken = 0, lastDist = null;
function xy(lon, lat) { return [((Number(lon) + 180) / 360) * 1200, ((90 - Number(lat)) / 180) * 600]; }
function mk(tag, attrs) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
for (var lon = -180; lon <= 180; lon += 30) { var x = xy(lon, 0)[0]; grid.appendChild(mk('line', {x1:x,y1:0,x2:x,y2:600,stroke:'#cad6da','stroke-width':1})); }
for (var lat = -60; lat <= 60; lat += 30) { var y = xy(0, lat)[1]; grid.appendChild(mk('line', {x1:0,y1:y,x2:1200,y2:y,stroke:'#cad6da','stroke-width':1})); }
function ringPath(ring) { return ring.map(function(c,i){ var p = xy(c[0], c[1]); return (i ? 'L' : 'M') + p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' ') + ' Z'; }
function geomPath(g) { if (!g) return ''; if (g.type === 'Polygon') return g.coordinates.map(ringPath).join(' '); if (g.type === 'MultiPolygon') return g.coordinates.flatMap(function(p){ return p.map(ringPath); }).join(' '); return ''; }
fetch('/assets/world_110m.geojson').then(function(r){ return r.json(); }).then(function(fc){ (fc.features||[]).forEach(function(f){ var d = geomPath(f.geometry); if (!d) return; land.appendChild(mk('path', {d:d, fill:'#dbe4e1', stroke:'#9dada9', 'stroke-width':0.6, 'fill-rule':'evenodd'})); }); }).catch(function(){ var el = document.getElementById('mapStatus'); if (el) el.textContent = 'Boundary basemap unavailable; coordinate grid and pins remain functional.'; });
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m] || m; }); }
function renderEvents() {
  pins.replaceChildren();
  var y1 = Number((document.getElementById('yearFrom')||{}).value || -9999);
  var y2 = Number((document.getElementById('yearTo')||{}).value || 9999);
  var cf = Number((document.getElementById('conf')||{}).value || 0);
  var show = EVENTS.filter(function(e){ var y = Number(String(e.event_date||'').slice(0,4)); return y>=y1 && y<=y2 && Number(e.confidence||0)>=cf; });
  show.forEach(function(e){
    var p = xy(e.lon, e.lat); var g = mk('g', {class:'pin'});
    var fill = e.source==='MANUAL' ? '#7a3fa0' : (e.status==='REVIEW' ? '#b07800' : '#1f596d');
    var c = mk('circle', {cx:p[0], cy:p[1], r:8, fill:fill, stroke:'#fff', 'stroke-width':2});
    var t = mk('title', {});
    var hc = (e.historical_context||[]).map(function(h){ return h.jurisdiction||h.name; }).join(' / ');
    t.textContent = (e.event_date||'') + ' — ' + (e.place_name||'') + '\n' + (e.title||'') + '\nconfidence ' + Number(e.confidence||0).toFixed(2) + (hc ? '\nhistorical: '+hc : '');
    c.appendChild(t); g.appendChild(c);
    g.addEventListener('click', function(){ var h=(e.historical_context||[]).map(function(x){ return (x.layer_name||'')+': '+(x.jurisdiction||x.name||''); }).join(' · '); document.getElementById('mapStatus').textContent=(e.event_date||'')+' · '+(e.place_name||'')+' · '+(e.title||'')+' · confidence '+Number(e.confidence||0).toFixed(2)+(h?' · '+h:''); });
    pins.appendChild(g);
  });
  var list = document.getElementById('eventList');
  if (list) list.innerHTML = show.slice(0,300).map(function(e){ var h=(e.historical_context||[]).map(function(x){ return esc(x.jurisdiction||x.name); }).join(' / '); return '<div class="event-row"><b>'+esc(e.event_date)+' — '+esc(e.place_name)+'</b><br>'+esc(e.title||'')+(h?'<br><span class="muted">Historical: '+h+'</span>':'')+'<br><span class="muted">'+esc(e.source||'')+' · '+Number(e.confidence||0).toFixed(2)+(e.record_id?' · <a href="/record/'+encodeURIComponent(e.record_id)+'">source document</a>':'')+'</span></div>'; }).join('') || '<p>No events in this temporal window.</p>';
  var st = document.getElementById('mapStatus'); if (st) st.textContent = show.length + ' event pin(s) visible. Drag to pan; pinch or wheel to zoom.';
}
async function renderHistory(year) {
  var token = ++histToken; history.replaceChildren();
  var lab = document.getElementById('contextLabel'); if (lab) lab.textContent = year;
  var hs = document.getElementById('historyStatus'); if (hs) hs.textContent = 'Loading historical state…';
  try {
    var r = await fetch('/api/historical?date=' + encodeURIComponent(year));
    var fc = await r.json(); if (token !== histToken) return;
    var n = 0;
    (fc.features||[]).forEach(function(f){
      var d = geomPath(f.geometry); if (!d) return; n++;
      var p = f.properties || {};
      var path = mk('path', {d:d, fill:'#647cb033', stroke:'#465d86', 'stroke-width':1.2, 'fill-rule':'evenodd'});
      var title = mk('title', {}); title.textContent = (p.name||'')+'\n'+(p.jurisdiction||'')+'\n'+(p.valid_from||'')+' — '+(p.valid_to||'')+'\n'+(p.source_name||'');
      path.appendChild(title);
      path.addEventListener('click', function(){ document.getElementById('historyDetail').innerHTML = '<b>'+esc(p.name||p.jurisdiction||'Historical region')+'</b><br>'+esc(p.jurisdiction||'')+(p.affiliation?'<br>Affiliation: '+esc(p.affiliation):'')+'<br><span class="muted">Valid: '+esc(p.valid_from||'open')+' → '+esc(p.valid_to||'open')+' · confidence '+Number(p.confidence||0).toFixed(2)+'<br>Layer: '+esc(p.aziel_layer_id||'')+'<br>Source: '+esc(p.source_name||'')+' · '+esc(p.license||'')+'<br>'+esc(p.attribution||'')+'</span>'; });
      history.appendChild(path);
    });
    if (hs) hs.textContent = n + ' historical feature(s) active in ' + year + '. Overlaps may represent competing source layers.';
  } catch (err) { if (hs) hs.textContent = 'Historical layer unavailable: ' + err; }
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
var histTimer;
var slider = document.getElementById('contextYear');
if (slider) slider.addEventListener('input', function(e){ clearTimeout(histTimer); var y = e.target.value; var lab=document.getElementById('contextLabel'); if (lab) lab.textContent=y; histTimer=setTimeout(function(){ renderHistory(y); }, 90); });
renderEvents();
if (slider) renderHistory(slider.value);
})();
