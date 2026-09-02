from __future__ import annotations
import argparse, html, json, os, shutil, tempfile, urllib.parse, uuid, webbrowser
from email import policy as email_policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from .core import AzielLibrary
from .external import ExternalRuntime, BootstrapManager

from .mirror import publish_mirror, read_manifest
APP_VERSION='2.6.2'

UI_MODE='master'

CSS='''body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;background:#f4f7f8;color:#18272d}.wrap{max-width:1500px;margin:auto;padding:22px}.card{background:#fff;border:1px solid #dbe3e6;border-radius:12px;padding:18px;margin:14px 0;box-shadow:0 2px 10px #00000008}.top{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.brand{font-size:25px;font-weight:800}.muted{color:#66777e}.pill{background:#e9f1f3;border-radius:12px;padding:3px 8px;font-size:12px}.button,button{background:#1f3a44;color:white;border:0;padding:9px 13px;border-radius:8px;text-decoration:none;cursor:pointer}.search,input,select{padding:9px;border:1px solid #bdcbd0;border-radius:8px}.search{min-width:340px;flex:1}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #e4eaec}th{background:#f3f7f8;position:sticky;top:0}.hash{font-family:ui-monospace,monospace;font-size:11px;word-break:break-all}.why{font-size:12px;color:#52676f}.scroll{overflow:auto;max-height:68vh}.tree ul{margin-left:15px}.tree summary{cursor:pointer;padding:4px}.ok{color:#176a38;font-weight:700}.bad{color:#a51d2d;font-weight:700}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.metric{font-size:28px;font-weight:800}mark{background:#ffe48c}pre{white-space:pre-wrap;word-break:break-word}'''

def page(title,body):
    mode = getattr(globals().get('Handler'), 'mode', UI_MODE)
    master = mode == 'master'
    mode_badge = "<span class='pill ok'>MASTER · WRITABLE</span>" if master else "<span class='pill bad'>PUBLIC MIRROR · READ ONLY</span>"
    admin = "<a class='button' href='/ingest'>Mass Ingest</a><a class='button' href='/mirror'>Publish Mirror</a>" if master else "<a class='button' href='/mirror'>Mirror Info</a>"

    return f"<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>{html.escape(title)}</title><style>{CSS}</style></head><body><div class='wrap'><div class='top'><div class='brand'>Aziel Digital Library</div><span class='pill'>Runtime v{APP_VERSION}</span>{mode_badge}<a class='button' href='/'>Search</a><a class='button' href='/tree'>Tree</a><a class='button' href='/map'>Temporal Map</a><a class='button' href='/historical'>Historical Geography</a><a class='button' href='/gazetteer'>Gazetteer</a><a class='button' href='/intelligence'>Intelligence</a><a class='button' href='/health'>Health</a><a class='button' href='/verify'>Verify</a>{admin}</div>{body}</div></body></html>"
class Handler(BaseHTTPRequestHandler):
    vault: AzielLibrary
    mode: str = 'master'
    def _security_headers(self):
        self.send_header('X-Content-Type-Options','nosniff'); self.send_header('X-Frame-Options','DENY'); self.send_header('Referrer-Policy','no-referrer'); self.send_header('Permissions-Policy','camera=(), microphone=(), geolocation=()'); self.send_header('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
    def send_json(self,obj,status=200):
        data=json.dumps(obj,separators=(',',':'),default=str).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self._security_headers(); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
    def send_html(self,text,status=200):
        data=text.encode(); self.send_response(status); self.send_header('Content-Type','text/html; charset=utf-8'); self._security_headers(); self.send_header('Content-Length',str(len(data))); self.end_headers(); self.wfile.write(data)
    def redirect(self,path): self.send_response(303); self.send_header('Location',path); self.end_headers()
    def send_error(self, code, message=None, explain=None):
        msg=message or 'Request failed'
        body=f"<div class='card'><h2 class='bad'>Error {int(code)}</h2><p>{html.escape(str(msg))}</p><p><a class='button' href='/'>Home</a></p></div>"
        return self.send_html(page(f'Error {code}',body),status=int(code))
    def do_HEAD(self):
        u=urllib.parse.urlparse(self.path)
        known={'/','/tree','/map','/historical','/gazetteer','/intelligence','/health','/verify','/mirror'}
        if self.mode=='master': known.add('/ingest')
        if u.path in known:
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self._security_headers(); self.send_header('Content-Length','0'); self.end_headers(); return
        if u.path=='/assets/world_110m.geojson':
            asset=Path(__file__).resolve().parent.parent/'data'/'world_110m.geojson'
            if not asset.exists(): return self.send_error(404)
            self.send_response(200); self.send_header('Content-Type','application/geo+json'); self._security_headers(); self.send_header('Content-Length',str(asset.stat().st_size)); self.end_headers(); return

        return self.send_error(404)
    def do_GET(self):
        u=urllib.parse.urlparse(self.path); q=urllib.parse.parse_qs(u.query); query=q.get('q',[''])[0]; media=q.get('media',[''])[0]; subject=q.get('subject',[''])[0]
        if u.path=='/assets/world_110m.geojson':
            asset=Path(__file__).resolve().parent.parent/'data'/'world_110m.geojson'
            if not asset.exists(): return self.send_error(404)
            data=asset.read_bytes(); self.send_response(200); self.send_header('Content-Type','application/geo+json'); self._security_headers(); self.send_header('Cache-Control','public, max-age=86400'); self.send_header('Content-Length',str(len(data))); self.end_headers(); return self.wfile.write(data)
        if u.path=='/api/historical':
            date=q.get('date',[''])[0]
            data=json.dumps(self.vault.historical_geojson(date),separators=(',',':')).encode()
            self.send_response(200); self.send_header('Content-Type','application/geo+json'); self._security_headers(); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(data))); self.end_headers(); return self.wfile.write(data)
        if u.path=='/':
            rows=self.vault.search(query,media,subject); subjects=sorted({r['primary_subject'] for r in self.vault.search()})
            media_options=''.join(f"<option value='{x}' {'selected' if media==x else ''}>{x}</option>" for x in ['pdf','document','spreadsheet','presentation','image','video','audio','text','archive','other'])
            subject_options=''.join(f"<option {'selected' if subject==s else ''}>{html.escape(s)}</option>" for s in subjects)
            controls=f"<div class='card'><form class='top'><input class='search' name='q' value='{html.escape(query)}' placeholder='Search title, full text, subjects, people, places...'><select name='media'><option value=''>All media</option>{media_options}</select><select name='subject'><option value=''>All subjects</option>{subject_options}</select><button>Search</button></form><p class='muted'>Searches the locally indexed title and extracted in-document content. No query leaves this machine.</p></div>"
            upload=("<div class='card'><h3>Ingest originals</h3><p><a class='button' href='/ingest'>Open resilient mass-ingest queue</a></p><form method='post' action='/upload' enctype='multipart/form-data'><input type='file' name='files' multiple required> <button>Small batch: preserve + index</button></form><p class='muted'>For thousands of files or whole folders use Mass Ingest; each file streams independently and a single failure does not discard the batch.</p></div>" if self.mode=='master' else "<div class='card'><h3>Read-only research mirror</h3><p class='muted'>This site mirrors a sealed master corpus. Visitors can search, navigate, map, verify, export the published index, and retrieve preserved originals, but cannot add or alter corpus records.</p></div>")
            table="<div class='card scroll'><table><tr><th>Document</th><th>Hierarchy</th><th>Match</th><th>Why</th><th>Immutable object</th></tr>"+(''.join(self.row(r) for r in rows) if rows else "<tr><td colspan='5' class='muted'>No corpus records match this view.</td></tr>")+"</table></div>"
            exports="<div class='card top'><a class='button' href='/export/xlsx'>Export XLSX</a><a class='button' href='/export/pdf'>Export PDF</a></div>"
            return self.send_html(page('Corpus Search',controls+upload+exports+table))
        if u.path=='/ingest':
            if self.mode!='master': return self.send_error(403,'mass ingestion is disabled on the public mirror')
            body="""<div class='card'><h2>Mass Ingest</h2><p>Select any number of files or an entire folder tree. Files upload independently, up to the selected concurrency, so one failed file can be retried without restarting the batch. The relationship graph rebuild runs once after the queue finishes.</p><div class='top'><label>Files <input id='batchFiles' type='file' multiple></label><label>Folder <input id='batchFolder' type='file' webkitdirectory multiple></label><label>Concurrency <select id='concurrency'><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label><button type='button' id='startBatch'>Start batch</button><button type='button' id='retryBatch'>Retry failed</button></div><div class='grid' style='margin-top:14px'><div class='card'><div class='metric' id='queued'>0</div><div class='muted'>Queued</div></div><div class='card'><div class='metric' id='done'>0</div><div class='muted'>Completed</div></div><div class='card'><div class='metric' id='failed'>0</div><div class='muted'>Failed</div></div><div class='card'><div class='metric' id='bytes'>0 B</div><div class='muted'>Uploaded</div></div></div><div id='batchStatus' class='card muted'>Choose files or a folder tree.</div><div class='card scroll'><table><thead><tr><th>File</th><th>Size</th><th>Status</th><th>Progress</th></tr></thead><tbody id='queueBody'><tr><td colspan='4' class='muted'>No files queued.</td></tr></tbody></table></div><p class='muted'>For extremely large local holdings, the CLI can recursively ingest a drive/folder without browser transfer: <code>python -m aziel_library.cli --vault YOUR_VAULT bulk-ingest "D:\\Research"</code>.</p></div><script>const filesInput=document.getElementById('batchFiles'), folderInput=document.getElementById('batchFolder'), tbody=document.getElementById('queueBody'); let items=[],running=false;const fmt=n=>{let u=['B','KB','MB','GB','TB'],i=0,x=n;while(x>=1024&&i<u.length-1){x/=1024;i++}return x.toFixed(i?1:0)+' '+u[i]};function collect(){let all=[...filesInput.files,...folderInput.files],seen=new Set();items=[];for(const f of all){let rel=f.webkitRelativePath||f.name,key=rel+'|'+f.size+'|'+f.lastModified;if(seen.has(key))continue;seen.add(key);items.push({file:f,rel,status:'queued',pct:0,error:''});}render();}function render(){document.getElementById('queued').textContent=items.filter(x=>x.status==='queued'||x.status==='uploading').length;document.getElementById('done').textContent=items.filter(x=>x.status==='done').length;document.getElementById('failed').textContent=items.filter(x=>x.status==='failed').length;document.getElementById('bytes').textContent=fmt(items.filter(x=>x.status==='done').reduce((a,x)=>a+x.file.size,0));tbody.innerHTML=items.length?items.slice(-1000).map((x,i)=>`<tr><td>${esc(x.rel)}</td><td>${fmt(x.file.size)}</td><td>${esc(x.status+(x.error?' — '+x.error:''))}</td><td>${x.pct}%</td></tr>`).join(''):`<tr><td colspan='4' class='muted'>No files queued.</td></tr>`;}function esc(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}function upload(item){return new Promise(resolve=>{item.status='uploading';render();let x=new XMLHttpRequest(),url='/api/ingest-file?name='+encodeURIComponent(item.file.name)+'&relative='+encodeURIComponent(item.rel);x.open('POST',url);x.setRequestHeader('Content-Type','application/octet-stream');x.upload.onprogress=e=>{if(e.lengthComputable){item.pct=Math.floor(e.loaded*100/e.total);render();}};x.onload=()=>{if(x.status>=200&&x.status<300){item.status='done';item.pct=100}else{item.status='failed';try{item.error=JSON.parse(x.responseText).error||('HTTP '+x.status)}catch(e){item.error='HTTP '+x.status}}render();resolve();};x.onerror=()=>{item.status='failed';item.error='network error';render();resolve();};x.send(item.file);});}async function run(){if(running)return;collect();if(!items.length)return;running=true;document.getElementById('batchStatus').textContent='Uploading…';let n=Math.max(1,Math.min(4,Number(document.getElementById('concurrency').value)||2)),idx=0;async function worker(){while(idx<items.length){let i=idx++,it=items[i];if(it.status==='queued')await upload(it);}}await Promise.all(Array.from({length:n},worker));document.getElementById('batchStatus').textContent='Finalizing corpus relationship graph…';let r=await fetch('/api/ingest-finalize',{method:'POST'});document.getElementById('batchStatus').textContent=r.ok?'Batch complete. Corpus graph finalized.':'Uploads finished, but graph finalize failed; use Retry or Verify.';running=false;render();}async function retry(){if(running)return;for(const x of items)if(x.status==='failed'){x.status='queued';x.error='';x.pct=0}running=true;let n=Math.max(1,Math.min(4,Number(document.getElementById('concurrency').value)||2)),idx=0,targets=items.filter(x=>x.status==='queued');async function worker(){while(idx<targets.length)await upload(targets[idx++]);}await Promise.all(Array.from({length:n},worker));await fetch('/api/ingest-finalize',{method:'POST'});running=false;render();}filesInput.addEventListener('change',collect);folderInput.addEventListener('change',collect);document.getElementById('startBatch').addEventListener('click',run);document.getElementById('retryBatch').addEventListener('click',retry);</script>"""
            return self.send_html(page('Mass Ingest',body))
        if u.path=='/mirror':
            mf=read_manifest(self.vault.root)
            if self.mode=='mirror':

                rows=''.join(f"<tr><th>{html.escape(str(k))}</th><td>{html.escape(str(v))}</td></tr>" for k,v in mf.items() if k!='sync_stats') or "<tr><td class='muted'>Mirror manifest unavailable.</td></tr>"
                return self.send_html(page('Mirror Information',f"<div class='card'><h2>Read-only public mirror</h2><p>This process opens the snapshot database in SQLite read-only mode and rejects every POST mutation endpoint.</p><table>{rows}</table></div>"))
            default=str((self.vault.root.parent/'aziel_public_mirror').resolve())
            body=f"<div class='card'><h2>Publish / refresh public mirror</h2><p>The public mirror is a sanitized snapshot, not your live master. Master workstation paths are removed. Immutable originals are synchronized first; the mirror database is atomically replaced last.</p><form method='post' action='/mirror-publish'><label>Destination <input class='search' name='destination' value='{html.escape(default)}' required></label><label>Transfer <select name='copy_mode'><option value='copy'>Copy (portable/server)</option><option value='hardlink'>Hardlink when possible (same disk)</option></select></label><label><input type='checkbox' name='source_dumps' value='1'> Include large raw gazetteer source dumps</label><button>Publish / refresh mirror</button></form><p class='muted'>Run the public server with <code>--mode mirror --vault &lt;mirror folder&gt; --host 0.0.0.0</code>, then place your domain/reverse proxy in front of it.</p></div>"
            return self.send_html(page('Publish Mirror',body))
        if u.path=='/tree': return self.send_html(page('Corpus Tree',f"<div class='card'><h2>Evidence-based corpus tree</h2><p class='muted'>Unclassified or weakly connected objects remain standalone instead of receiving invented links.</p><div class='tree'>{self.tree_html(self.vault.tree())}</div></div>"))
        if u.path=='/map':
            payload=self.vault.map_payload(); events=payload['events']; unresolved=payload['unresolved_places']; hst=payload.get('historical_status',{}); gst=self.vault.gazetteer_status()
            evjson=json.dumps(events).replace('</','<\\/')
            years=[]
            for e in events:
                try: years.append(int(str(e['event_date'])[:4]))
                except Exception: pass
            for x in [hst.get('min_year'),hst.get('max_year')]:
                try:
                    if x: years.append(int(x))
                except Exception: pass
            ymin=min(years) if years else 0; ymax=max(years) if years else 0; ycontext=ymin if ymin else 0
            unresolved_html=''.join(f"<li>{html.escape(x['name'])} — {x['documents']} document(s)</li>" for x in unresolved[:100]) or '<li>None.</li>'
            manual_event = """<details><summary><b>Note a geographic event manually</b></summary><form method='post' action='/event' class='top' style='margin-top:10px'><input name='date' placeholder='YYYY, YYYY-MM-DD, or September 10,2025' required><input name='place' placeholder='Place name' required><input name='lat' type='number' step='any' min='-90' max='90' placeholder='Latitude' required><input name='lon' type='number' step='any' min='-180' max='180' placeholder='Longitude' required><input name='title' placeholder='Event title'><input name='record_id' placeholder='Optional AZDOC source ID'><button>Add immutable event record</button></form></details>""" if self.mode=='master' else "<p class='muted'><b>Mirror:</b> event records are read-only. Manual event creation is available only on the master corpus.</p>"

            body=f"""<div class='card'><h2>Temporal–Geospatial Corpus Map</h2><p class='muted'>The event layer and historical-state layer are independent. Event pins come from corpus evidence; historical polygons come from preserved source layers. Competing historical sources can overlap instead of being silently merged.</p><p class='{'ok' if gst.get('state')=='READY' and gst.get('places',0) else 'bad'}'><b>Geographic resolver:</b> {html.escape(str(gst.get('state')))} · profile {html.escape(str(gst.get('profile') or 'none'))} · {int(gst.get('places') or 0):,} places. {'Document place names can resolve to coordinates.' if gst.get('state')=='READY' and gst.get('places',0) else 'Automatic document pinning needs a ready Gazetteer; MASTER first-run now attempts this automatically.'}</p><div class='top'><label>Events from <input id='yearFrom' type='number' value='{ymin}' style='width:110px'></label><label>Events to <input id='yearTo' type='number' value='{ymax}' style='width:110px'></label><label>Min confidence <select id='conf'><option value='0'>All</option><option value='.7'>≥ 0.70</option><option value='.9'>≥ 0.90</option></select></label><button type='button' id='applyMap'>Apply events</button><button type='button' id='resetMap'>Reset view</button></div><div style='margin-top:14px'><label for='contextYear'><b>Historical context year: <span id='contextLabel'>{ycontext}</span></b></label><input id='contextYear' type='range' min='{ymin}' max='{max(ymax,ymin+1)}' value='{ycontext}' step='1' style='width:100%'><p class='muted'>Move the slider to redraw only the historical boundaries/names valid at that date. Source attribution appears when a region is selected.</p></div><p><span class='pill'>AUTO_SENTENCE = high-confidence textual co-occurrence</span> <span class='pill'>AUTO_CONTEXT = nearby OCR/layout pair · review</span> <span class='pill'>REVIEW = weaker document association</span> <span class='pill'>MANUAL = user-noted event</span> <span class='pill'>HISTORICAL = source-layer context</span></p>{manual_event}</div><div class='card'><svg id='worldMap' viewBox='0 0 1200 600' role='img' aria-label='World map with historical geographic layers and corpus event pins' style='width:100%;height:auto;background:#eef3f4;border-radius:10px;touch-action:none'><g id='viewport'><rect x='0' y='0' width='1200' height='600' fill='#eef3f4'/><g id='land'></g><g id='grid'></g><g id='history'></g><g id='pins'></g></g></svg><div id='mapStatus' class='muted'></div><div id='historyStatus' class='muted'></div></div><div class='grid'><div class='card'><h3>Visible events</h3><div id='eventList'></div></div><div class='card'><h3>Selected historical context</h3><div id='historyDetail'><p class='muted'>Select a historical region on the map.</p></div></div><div class='card'><h3>Unresolved place mentions</h3><p class='muted'>These stay unpinned until a coordinate-bearing kit/gazetteer or manual resolution is supplied.</p><ul>{unresolved_html}</ul></div></div><script>const EVENTS={evjson};const svg=document.getElementById('worldMap'), vp=document.getElementById('viewport'), land=document.getElementById('land'), pins=document.getElementById('pins'), grid=document.getElementById('grid'), history=document.getElementById('history');let scale=1, tx=0, ty=0, drag=null, histToken=0;function xy(lon,lat){{ return [((Number(lon)+180)/360)*1200, ((90-Number(lat))/180)*600]; }}function mk(tag,attrs){{ const e=document.createElementNS('http://www.w3.org/2000/svg',tag); for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v); return e; }}for(let lon=-180;lon<=180;lon+=30){{let [x]=xy(lon,0); grid.appendChild(mk('line',{{x1:x,y1:0,x2:x,y2:600,stroke:'#cad6da','stroke-width':1}}));}}for(let lat=-60;lat<=60;lat+=30){{let [,y]=xy(0,lat); grid.appendChild(mk('line',{{x1:0,y1:y,x2:1200,y2:y,stroke:'#cad6da','stroke-width':1}}));}}function ringPath(ring){{return ring.map((c,i)=>{{const p=xy(c[0],c[1]); return `${{i?'L':'M'}}${{p[0].toFixed(2)}},${{p[1].toFixed(2)}}`;}}).join(' ')+' Z';}}function geomPath(g){{if(!g)return ''; if(g.type==='Polygon') return g.coordinates.map(ringPath).join(' '); if(g.type==='MultiPolygon') return g.coordinates.flatMap(p=>p.map(ringPath)).join(' '); return '';}}fetch('/assets/world_110m.geojson').then(r=>r.json()).then(fc=>{{for(const f of fc.features){{const d=geomPath(f.geometry); if(!d)continue; land.appendChild(mk('path',{{d,fill:'#dbe4e1',stroke:'#9dada9','stroke-width':.6,'fill-rule':'evenodd'}}));}}}}).catch(()=>{{document.getElementById('mapStatus').textContent='Boundary basemap unavailable; coordinate grid and pins remain functional.';}});function esc(v){{return String(v??'').replace(/[&<>\"]/g,m=>({{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}}[m]));}}function renderEvents(){{pins.replaceChildren(); const y1=Number(document.getElementById('yearFrom').value||-9999), y2=Number(document.getElementById('yearTo').value||9999), cf=Number(document.getElementById('conf').value||0);const show=EVENTS.filter(e=>{{const y=Number(String(e.event_date).slice(0,4)); return y>=y1&&y<=y2&&Number(e.confidence)>=cf;}});for(const e of show){{ const [x,y]=xy(e.lon,e.lat); const g=mk('g',{{class:'pin'}}); const c=mk('circle',{{cx:x,cy:y,r:7,fill:e.source==='MANUAL'?'#7a3fa0':(e.status==='REVIEW'?'#b07800':'#1f596d'),stroke:'#fff','stroke-width':2}}); const t=mk('title',{{}}); const hc=(e.historical_context||[]).map(h=>h.jurisdiction||h.name).join(' / '); t.textContent=`${{e.event_date}} — ${{e.place_name}}\n${{e.title}}\nconfidence ${{Number(e.confidence).toFixed(2)}}${{hc?'\\nhistorical: '+hc:''}}`; c.appendChild(t); g.appendChild(c); g.addEventListener('click',()=>{{const h=(e.historical_context||[]).map(x=>`${{x.layer_name}}: ${{x.jurisdiction||x.name}}`).join(' · '); document.getElementById('mapStatus').textContent=`${{e.event_date}} · ${{e.place_name}} · ${{e.title}} · confidence ${{Number(e.confidence).toFixed(2)}}${{h?' · '+h:''}}`;}}); pins.appendChild(g); }}document.getElementById('eventList').innerHTML=show.slice(0,300).map(e=>{{const h=(e.historical_context||[]).map(x=>esc(x.jurisdiction||x.name)).join(' / '); return `<div style="padding:7px 0;border-bottom:1px solid #e4eaec"><b>${{esc(e.event_date)}} — ${{esc(e.place_name)}}</b><br>${{esc(e.title)}}${{h?`<br><span class="muted">Historical: ${{h}}</span>`:''}}<br><span class="muted">${{esc(e.source)}} · ${{Number(e.confidence).toFixed(2)}}${{e.record_id?` · <a href="/record/${{encodeURIComponent(e.record_id)}}">source document</a>`:''}}</span></div>`;}}).join('')||'<p>No events in this temporal window.</p>';document.getElementById('mapStatus').textContent=`${{show.length}} event pin(s) visible. Drag to pan; wheel to zoom.`;}}async function renderHistory(year){{const token=++histToken; history.replaceChildren(); document.getElementById('contextLabel').textContent=year; document.getElementById('historyStatus').textContent='Loading historical state…';try{{ const r=await fetch(`/api/historical?date=${{encodeURIComponent(year)}}`); const fc=await r.json(); if(token!==histToken)return; let n=0;for(const f of fc.features||[]){{const d=geomPath(f.geometry); if(!d)continue; n++; const p=f.properties||{{}}; const path=mk('path',{{d,fill:'#647cb033',stroke:'#465d86','stroke-width':1.2,'fill-rule':'evenodd'}}); const title=mk('title',{{}}); title.textContent=`${{p.name||''}}\n${{p.jurisdiction||''}}\n${{p.valid_from||''}} — ${{p.valid_to||''}}\n${{p.source_name||''}}`; path.appendChild(title); path.addEventListener('click',()=>{{document.getElementById('historyDetail').innerHTML=`<b>${{esc(p.name||p.jurisdiction||'Historical region')}}</b><br>${{esc(p.jurisdiction||'')}}${{p.affiliation?`<br>Affiliation: ${{esc(p.affiliation)}}`:''}}<br><span class="muted">Valid: ${{esc(p.valid_from||'open')}} → ${{esc(p.valid_to||'open')}} · confidence ${{Number(p.confidence||0).toFixed(2)}}<br>Layer: ${{esc(p.aziel_layer_id||'')}}<br>Source: ${{esc(p.source_name||'')}} · ${{esc(p.license||'')}}<br>${{esc(p.attribution||'')}}</span>`;}}); history.appendChild(path); }}document.getElementById('historyStatus').textContent=`${{n}} historical feature(s) active in ${{year}}. Overlaps may represent competing source layers.`;}}catch(err){{document.getElementById('historyStatus').textContent='Historical layer unavailable: '+err;}}}}function transform(){{vp.setAttribute('transform',`translate(${{tx}} ${{ty}}) scale(${{scale}})`);}}svg.addEventListener('wheel',e=>{{e.preventDefault(); scale=Math.max(1,Math.min(8,scale*(e.deltaY<0?1.2:.8333))); transform();}},{{passive:false}});svg.addEventListener('pointerdown',e=>{{drag=[e.clientX,e.clientY,tx,ty]; svg.setPointerCapture(e.pointerId);}});svg.addEventListener('pointermove',e=>{{if(!drag)return; tx=drag[2]+(e.clientX-drag[0]); ty=drag[3]+(e.clientY-drag[1]); transform();}});svg.addEventListener('pointerup',()=>drag=null); document.getElementById('applyMap').addEventListener('click',renderEvents); document.getElementById('resetMap').addEventListener('click',()=>{{scale=1;tx=0;ty=0;transform();}}); let histTimer; document.getElementById('contextYear').addEventListener('input',e=>{{clearTimeout(histTimer); const y=e.target.value; document.getElementById('contextLabel').textContent=y; histTimer=setTimeout(()=>renderHistory(y),90);}}); renderEvents(); renderHistory(document.getElementById('contextYear').value); </script>"""
            return self.send_html(page('Temporal Map',body))
        if u.path=='/historical':
            st=self.vault.historical_status(); layers=self.vault.historical_layers(); sources=self.vault.historical_sources()
            rows=''.join(f"<tr><td>{html.escape(x['name'])}<br><span class='hash'>{html.escape(x['layer_id'])}</span></td><td>{html.escape(x['valid_from'] or 'open')} → {html.escape(x['valid_to'] or 'open')}</td><td>{x['feature_count']:,}</td><td>{x['confidence']:.2f}</td><td>{html.escape(x['source_name'])}<br>{html.escape(x['license'])}</td><td class='hash'>{html.escape(x['source_sha256'])}</td></tr>" for x in layers) or '<tr><td colspan="6">No historical boundary layers installed yet.</td></tr>'
            src=''.join(f"<li>{html.escape(x['source_name'])} — {html.escape(x['license'])} — <span class='hash'>{html.escape(x['sha256'][:24])}…</span></li>" for x in sources) or '<li>None.</li>'
            install_card="<div class='card'><h3>Install a historical layer</h3><form method='post' action='/historical-import' enctype='multipart/form-data'><input type='file' name='layer' accept='.azh,.geojson,.json' required> <button>Preserve + index historical layer</button></form><p class='muted'>Use <b>.azh</b> for a fully described Aziel Historical Geography Kit. Raw GeoJSON also works when each Polygon/MultiPolygon feature carries temporal fields.</p></div>" if self.mode=='master' else ''
            body=f"""<div class='card'><h2>Historical Geographic State</h2><div class='grid'><div><b>Status</b><div class='metric'>{html.escape(st.get('state','EMPTY'))}</div></div><div><b>Layers</b><div class='metric'>{st.get('layers',0):,}</div></div><div><b>Features</b><div class='metric'>{st.get('features',0):,}</div></div><div><b>Coverage</b><div class='metric'>{html.escape(str(st.get('min_year') or '—'))}–{html.escape(str(st.get('max_year') or '—'))}</div></div></div><p class='muted'>Temporal polygons are preserved as source-specific interpretations. Overlapping or contradictory source layers coexist instead of being merged into a false single history.</p></div>{install_card}<div class='card scroll'><table><tr><th>Layer</th><th>Validity</th><th>Features</th><th>Confidence</th><th>Source / license</th><th>Source SHA-256</th></tr>{rows}</table></div><div class='card'><h3>Preserved source receipts</h3><ul>{src}</ul></div>"""
            return self.send_html(page('Historical Geography',body))
        if u.path=='/gazetteer':
            st=self.vault.gazetteer_status(); gq=q.get('q',[''])[0]; results=self.vault.gazetteer_search(gq,50) if gq and st.get('state')=='READY' else []
            rows=''.join(f"<tr><td>{html.escape(x['name'])}<br><span class='muted'>matched: {html.escape(x['matched_name'])}</span></td><td>{html.escape(str(x.get('country_name') or x.get('country_code') or ''))}<br>{html.escape(str(x.get('admin1') or ''))}</td><td>{x['lat']:.5f}, {x['lon']:.5f}</td><td>{html.escape(str(x.get('feature_code') or ''))}</td><td>{'historic' if x.get('historic_name') else ''} {html.escape(str(x.get('valid_from') or ''))} {html.escape(str(x.get('valid_to') or ''))}</td></tr>" for x in results)
            sources=''.join(f"<li>{html.escape(x['filename'])} — <span class='hash'>{html.escape(x['sha256'][:20])}…</span></li>" for x in self.vault.gazetteer_sources()) or '<li>No source dump imported yet.</li>'
            install_form=("<form method='post' action='/gazetteer-install' class='top'><select name='profile'><option value='lite' selected>Lite — baseline cities + aliases</option><option value='full'>Full — all feature classes + aliases</option></select><button>Download / rebuild local gazetteer</button></form><p class='muted'>MASTER first-run attempts the Lite baseline automatically. A successful build automatically re-indexes existing documents. Full adds non-city GeoNames features. Raw source files and SHA-256 receipts are retained.</p>" if self.mode=='master' else '')
            reindex_form=("<form method='post' action='/gazetteer-reindex'><button>Re-index existing corpus geography</button></form>" if self.mode=='master' else '')
            body=f"""<div class='card'><h2>Aziel World Gazetteer</h2><div class='grid'><div><b>Status</b><div class='metric'>{html.escape(str(st.get('state')))}</div><div class='muted'>profile: {html.escape(str(st.get('profile') or 'none'))}</div></div><div><b>Places</b><div class='metric'>{st.get('places',0):,}</div></div><div><b>Aliases</b><div class='metric'>{st.get('aliases',0):,}</div></div><div><b>Historic aliases</b><div class='metric'>{st.get('historical_aliases',0):,}</div></div></div><p class='muted'>Converted locally from GeoNames bulk data. Runtime lookup is offline. Attribution: {html.escape(str(st.get('attribution','')))}</p>{install_form}</div><div class='card'><form class='top'><input class='search' name='q' value='{html.escape(gq)}' placeholder='Search place or historical name'><button>Search gazetteer</button></form><div class='scroll'><table><tr><th>Place</th><th>Region</th><th>Coordinates</th><th>Type</th><th>Name history</th></tr>{rows}</table></div></div><div class='card'><h3>Source receipts</h3><ul>{sources}</ul>{reindex_form}</div>"""
            return self.send_html(page('World Gazetteer',body))
        if u.path=='/intelligence':
            pk=self.vault.packages(); rows=''.join(f"<tr><td>{html.escape(x['package_id'])}</td><td>{html.escape(str(x['kind']))}</td><td>{html.escape(x['package_type'])}</td><td>{html.escape(x['version'])}</td><td class='hash'>{html.escape(x['sha256'])}</td><td>{html.escape(str(x['status']))}</td></tr>" for x in pk) or "<tr><td colspan='6' class='muted'>No .azm/.azk packages installed yet.</td></tr>"
            rt=ExternalRuntime().status() if self.mode=='master' else {}; ready=rt.get('ready',{}); last_test=rt.get('last_ocr_self_test') or {}
            pending=len(self.vault.pending_ocr()) if self.mode=='master' else 0
            def rcard(label,key,tool):
                if self.mode!='master': return f"<div class='card'><b>{html.escape(label)}</b><div class='muted'>Master-side processor status is not exposed by the public mirror.</div></div>"
                ok=bool(ready.get(key)); detail=rt.get(tool,{})
                return f"<div class='card'><b>{html.escape(label)}</b><div class='{'ok' if ok else 'bad'}'>{'FOUND' if ok else 'NOT FOUND'}</div><p class='muted'>{html.escape(str(detail.get('version') or detail.get('path') or 'Required local processor not found.'))}</p></div>"
            runtime_cards=rcard('Image OCR','image_ocr','tesseract')+rcard('Scanned PDF OCR','pdf_ocr','pdftoppm')+rcard('Audio / video transcription','speech','whisper')
            pkg_install=("<form method='post' action='/install' enctype='multipart/form-data'><input type='file' name='package' accept='.azm,.azk' required> <button>Install package</button></form>" if self.mode=='master' else '')
            proc_install=("<form method='post' action='/bootstrap' class='top'><select name='profile'><option value='ocr' selected>OCR — images + scanned PDFs</option><option value='recommended'>Recommended — OCR + speech</option><option value='speech'>Speech only</option></select><button>Install / repair selected processors</button></form><p class='muted'>Setup is considered successful only after bundled image and scanned-PDF OCR fixtures are actually read correctly.</p>" if self.mode=='master' else "<p class='muted'>Processor installation is controlled by the master administrator; this mirror exposes indexed results only.</p>")
            if self.mode=='master':
                verified=bool(last_test.get('ok')); vcls='ok' if verified else 'bad'; vtxt='VERIFIED' if verified else 'NOT YET VERIFIED'
                recovery=f"<div class='card'><h3>OCR verification + recovery</h3><div class='grid'><div><b>End-to-end OCR</b><div class='{vcls}'>{vtxt}</div><p class='muted'>Last test: {html.escape(str(last_test.get('created_utc') or 'never'))}</p></div><div><b>Pending OCR records</b><div class='metric'>{pending:,}</div><p class='muted'>Preserved originals waiting for OCR/re-OCR.</p></div></div><div class='top'><form method='post' action='/ocr-selftest'><button>Run OCR self-test</button></form><form method='post' action='/ocr-reprocess'><button {'disabled' if pending==0 else ''}>Reprocess pending scans</button></form></div><p class='muted'>Reprocessing reads the immutable stored originals, replaces the searchable extraction/index, and does not alter original bytes.</p></div>"
            else: recovery=''
            body=f"<div class='card'><h2>Aziel Intelligence Runtime</h2><p>Packages are local <b>.azm</b> models and <b>.azk</b> knowledge kits. Their manifests and payloads are hashed and verified.</p>{pkg_install}</div><div class='card'><h3>Optional local processors</h3><div class='grid'>{runtime_cards}</div>{proc_install}</div>{recovery}<div class='card'><table><tr><th>ID</th><th>Kind</th><th>Type</th><th>Version</th><th>SHA-256</th><th>Status</th></tr>{rows}</table></div><div class='card'><h3>Native engines</h3><div class='grid'><div><b>AZIEL_TEXT_ENGINE</b><p class='muted'>Text, CSV/TSV, ZIP-office and conservative PDF text extraction.</p></div><div><b>AZIEL_HASH_VECTOR_V1</b><p class='muted'>512-dimensional deterministic local similarity vectors.</p></div><div><b>AZIEL_ENTITY_ENGINE</b><p class='muted'>Dates, people and AZK-gazetteer entities.</p></div><div><b>AZIEL_MODEL_RUNTIME</b><p class='muted'>Executes supported native AZM model families.</p></div></div></div>"
            return self.send_html(page('Intelligence',body))
        if u.path=='/health':
            h=self.vault.health(); cards=''.join(f"<div class='card'><div class='metric'>{html.escape(str(v))}</div><div class='muted'>{html.escape(k.replace('_',' ').title())}</div></div>" for k,v in h.items())
            return self.send_html(page('Health',f"<div class='grid'>{cards}</div>"))
        if u.path=='/verify':
            v=self.vault.verify(); cls='ok' if v['ok'] else 'bad'; return self.send_html(page('Verify',f"<div class='card'><h2 class='{cls}'>{'VERIFIED' if v['ok'] else 'VERIFICATION FAILED'}</h2><pre>{html.escape(json.dumps(v,indent=2))}</pre></div>"))
        if u.path.startswith('/original/'):
            rid=urllib.parse.unquote(u.path.rsplit('/',1)[-1])
            try: r=self.vault.get_record(rid)
            except KeyError: return self.send_error(404,'record not found')
            target=(self.vault.root/r['stored_path']).resolve()
            try: target.relative_to(self.vault.root.resolve())
            except ValueError: return self.send_error(500,'stored object path escaped vault root')
            if not target.is_file(): return self.send_error(404,'stored original missing')
            size=target.stat().st_size
            ctype=r.get('mime_type') or 'application/octet-stream'
            quoted=urllib.parse.quote(r['original_name'],safe='')
            self.send_response(200); self.send_header('Content-Type',ctype); self.send_header('Content-Disposition',f"attachment; filename*=UTF-8''{quoted}"); self._security_headers(); self.send_header('Content-Length',str(size)); self.end_headers()
            with target.open('rb') as src: shutil.copyfileobj(src,self.wfile,length=1024*1024)
            return None
        if u.path.startswith('/record/'):
            rid=urllib.parse.unquote(u.path.rsplit('/',1)[-1])
            try: r=self.vault.get_record(rid)
            except KeyError: return self.send_error(404,'record not found')
            rel=''.join(f"<li><a href='/record/{urllib.parse.quote(x['target_id'],safe='')}'>{html.escape(x['target_id'])}</a> - {x['score']:.3f} - {html.escape(x['reason'])}</li>" for x in r['relationships']) or '<li>No defensible relationship yet.</li>'; ents=''.join(f"<span class='pill'>{html.escape(x['entity_type'])}: {html.escape(x['name'])} [{html.escape(x['source'])}]</span> " for x in r['entities'])
            der=''.join(f"<tr><td>{html.escape(x['artifact_type'])}</td><td>{html.escape(x['processor'])} {html.escape(x['processor_version'])}</td><td>{html.escape(x['model_id'])}</td><td class='hash'>{html.escape(x['content_sha256'])}</td></tr>" for x in r['derived'])
            events_html=''.join(f"<div class='pill'>{html.escape(x['event_date'])} · {html.escape(x['place_name'])} · {x['confidence']:.2f}</div> " for x in r['events']) or "<p class='muted'>No mapped events extracted from this record.</p>"
            body=f"<div class='card'><h2>{html.escape(r['original_name'])}</h2><p><b>{html.escape(r['primary_subject'])}</b> -> {html.escape(r['secondary_subject'])}</p><p>{html.escape(r['classification_reason'])}</p><p><b>Original SHA-256</b><br><span class='hash'>{r['sha256']}</span></p>{("<p><b>Object path</b><br><span class='hash'>"+html.escape(r['stored_path'])+"</span></p>") if self.mode=='master' else ''}<p><a class='button' href='/original/{urllib.parse.quote(r['record_id'],safe='')}'>Download preserved original</a></p><p><b>Extraction</b> {html.escape(r['extraction_status'])}</p><h3>Entities</h3>{ents}<h3>Temporal–Geospatial events</h3>{events_html}<h3>Connections</h3><ul>{rel}</ul><h3>Derived provenance</h3><table><tr><th>Artifact</th><th>Processor</th><th>Model</th><th>Content SHA-256</th></tr>{der}</table><h3>Indexed text</h3><pre>{html.escape(r['extracted_text'][:30000])}</pre></div>"
            return self.send_html(page(r['original_name'],body))
        if u.path.startswith('/export/'):
            kind=u.path.rsplit('/',1)[-1]
            if kind not in {'xlsx','pdf'}: return self.send_error(404,'unknown export format')
            if self.mode=='mirror':
                name='aziel_corpus_index.xlsx' if kind=='xlsx' else 'aziel_corpus_report.pdf'; p=self.vault.root/'published_exports'/name
                if not p.is_file(): return self.send_error(404,'published export not available in this mirror snapshot')
            else:
                p=self.vault.export_xlsx() if kind=='xlsx' else self.vault.export_pdf()
            size=p.stat().st_size; self.send_response(200); self.send_header('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' if kind=='xlsx' else 'application/pdf'); self.send_header('Content-Disposition',f'attachment; filename={p.name}'); self._security_headers(); self.send_header('Content-Length',str(size)); self.end_headers()
            with p.open('rb') as src: shutil.copyfileobj(src,self.wfile,length=1024*1024)
            return None
        self.send_error(404)
    def row(self,r):
        raw_snip=r.get('snippet') or r['extracted_text'][:220]
        snip=html.escape(raw_snip).replace('\x01','<mark>').replace('\x02','</mark>')
        return f"<tr><td><a href='/record/{r['record_id']}'><b>{html.escape(r['original_name'])}</b></a><br><span class='pill'>{html.escape(r['media_class'])}</span></td><td>{html.escape(r['primary_subject'])}<br>-> {html.escape(r['secondary_subject'])}</td><td>{snip}</td><td class='why'>{html.escape(r['classification_reason'])}</td><td class='hash'>{(html.escape(r['stored_path'])+'<br>') if self.mode=='master' else ''}{html.escape(r['sha256'][:20])}...</td></tr>"
    def tree_html(self,node):
        ch=node.get('children',[]); label=html.escape(node['name']); extra=f" <span class='why'>- {html.escape(node.get('reason',''))} ({node.get('connections',0)} links)</span>" if 'reason' in node else ''
        if not ch:

            return f"<li><a href='/record/{node['id']}'>{label}</a>{extra}</li>" if 'id' in node else f"<div>{label}</div>"
        return f"<details open><summary>{label}</summary><ul>{''.join(self.tree_html(x) for x in ch)}</ul></details>"
    def _stream_raw_file(self,name):
        safe=Path(str(name or '').replace('\\','/')).name or 'upload.bin'
        try: remaining=int(self.headers.get('Content-Length','0') or 0)
        except (TypeError,ValueError): raise ValueError('invalid Content-Length')
        if remaining<0: raise ValueError('invalid Content-Length')
        d=Path(tempfile.mkdtemp(prefix='aziel_raw_upload_')); p=d/safe
        try:
            with p.open('wb') as f:
                while remaining:
                    chunk=self.rfile.read(min(8*1024*1024,remaining))
                    if not chunk: raise ValueError('truncated upload')
                    f.write(chunk); remaining-=len(chunk)
            return p
        except Exception:
            p.unlink(missing_ok=True)
            try: d.rmdir()
            except OSError: pass

            raise
    def _multipart_files(self):
        """
        Stream multipart uploads to disk without buffering large media in RAM."""
        ct=self.headers.get('Content-Type','')
        if 'multipart/form-data' not in ct.lower(): raise ValueError('multipart/form-data required')
        msg=BytesParser(policy=email_policy.default).parsebytes(b'Content-Type: '+ct.encode('utf-8','replace')+b'\r\n\r\n')
        boundary=msg.get_boundary()
        if not boundary: raise ValueError('multipart boundary missing')
        delim=b'--'+boundary.encode('utf-8')
        try: remaining=int(self.headers.get('Content-Length','0') or 0)
        except (TypeError,ValueError): raise ValueError('invalid Content-Length')
        if remaining<=0: raise ValueError('empty upload')
        def read_line(limit=1024*1024):
            nonlocal remaining
            if remaining<=0: return b''
            line=self.rfile.readline(min(limit,remaining))
            remaining-=len(line)
            return line
        line=read_line()
        if line.rstrip(b'\r\n') not in (delim,delim+b'--'): raise ValueError('malformed multipart upload')
        out=[]
        batch_dir=Path(tempfile.mkdtemp(prefix='aziel_upload_batch_'))
        try:
            while line and not line.rstrip().endswith(b'--'):
                headers=[]
                while True:
                    line=read_line()
                    if not line: raise ValueError('truncated multipart headers')
                    if line in (b'\r\n',b'\n'): break
                    headers.append(line)
                part=BytesParser(policy=email_policy.default).parsebytes(b''.join(headers)+b'\r\n')
                fn=part.get_filename()
                fobj=None; path=None
                if fn:
                    safe=Path(str(fn).replace('\\','/')).name or 'upload.bin'
                    file_dir=batch_dir/('part_'+uuid.uuid4().hex)
                    file_dir.mkdir(parents=True,exist_ok=False)
                    path=file_dir/safe
                    out.append(path)
                    fobj=path.open('wb')
                prev=None
                try:
                    while True:
                        line=read_line()
                        if not line: raise ValueError('truncated multipart body')
                        if line.rstrip(b'\r\n') in (delim,delim+b'--'):
                            if prev is not None and fobj:
                                if prev.endswith(b'\r\n'): prev=prev[:-2]
                                elif prev.endswith(b'\n'): prev=prev[:-1]
                                fobj.write(prev)
                            break
                        if prev is not None and fobj: fobj.write(prev)
                        prev=line
                finally:
                    if fobj: fobj.close()
            return out
        except Exception:
            for p in out:
                p.unlink(missing_ok=True)
                try: p.parent.rmdir()
                except OSError: pass
            try: batch_dir.rmdir()
            except OSError: pass
            raise
    def do_POST(self):

        if self.mode=='mirror':
            return self.send_error(403,'this is a read-only public mirror; corpus mutations are disabled')
        u=urllib.parse.urlparse(self.path)
        if u.path=='/api/ingest-file':
            q=urllib.parse.parse_qs(u.query); name=q.get('name',['upload.bin'])[0]; rel=q.get('relative',[''])[0]
            p=None
            try:
                p=self._stream_raw_file(name); result=self.vault.ingest([p],rebuild=False)[0]
                if rel: self.vault.add_ingest_origin(result['record_id'],rel)
                return self.send_json({'ok':True,'record_id':result['record_id'],'sha256':result['sha256'],'name':result['original_name']})
            except Exception as e:
                return self.send_json({'ok':False,'error':str(e)},status=400)
            finally:
                if p is not None:
                    parent=p.parent; p.unlink(missing_ok=True)
                    try: parent.rmdir()
                    except OSError: pass
        if u.path=='/api/ingest-finalize':
            try: return self.send_json({'ok':True,'health':self.vault.finalize_ingest_batch()})
            except Exception as e: return self.send_json({'ok':False,'error':str(e)},status=500)
        if u.path=='/mirror-publish':
            try:
                length=int(self.headers.get('Content-Length',0)); raw=self.rfile.read(length).decode('utf-8','replace'); q=urllib.parse.parse_qs(raw)
                dest=q.get('destination',[''])[0]; mode=q.get('copy_mode',['copy'])[0]; dumps=q.get('source_dumps',[''])[0]=='1'
                if not dest: return self.send_error(400,'mirror destination is required')
                publish_mirror(self.vault,dest,mode=mode,include_source_dumps=dumps)
                return self.redirect('/mirror')
            except Exception as e: return self.send_error(500,'mirror publish failed: '+str(e))
        if self.path=='/bootstrap':
            try:
                length=int(self.headers.get('Content-Length',0)); raw=self.rfile.read(length).decode('utf-8','replace'); q=urllib.parse.parse_qs(raw)
                profile=q.get('profile',['ocr'])[0]
                if profile not in {'ocr','speech','recommended'}: return self.send_error(400,'invalid bootstrap profile')
                result=BootstrapManager().bootstrap(profile=profile,auto=True,dry_run=False,download_models=True)
                if profile in {'ocr','recommended'} and not result.get('ocr_complete'):
                    detail='; '.join((result.get('ocr_self_test') or {}).get('errors',[])[:4]) or '; '.join(result.get('errors',[])[:4])
                    return self.send_error(500,'OCR setup incomplete: '+(detail or 'end-to-end OCR self-test failed'))
                if profile=='speech' and not result.get('speech_complete'):
                    return self.send_error(500,'speech setup incomplete: '+'; '.join(result.get('errors',[])[:4]))
                return self.redirect('/intelligence?setup=verified')
            except Exception as e:
                return self.send_error(500,'processor setup failed: '+str(e))
        if self.path=='/ocr-selftest':
            try:
                result=ExternalRuntime().self_test_ocr(write_receipt=True)
                if not result.get('ok'): return self.send_error(500,'OCR self-test failed: '+'; '.join(result.get('errors',[])[:4]))
                return self.redirect('/intelligence?ocr_test=passed')
            except Exception as e: return self.send_error(500,'OCR self-test failed: '+str(e))
        if self.path=='/ocr-reprocess':
            try:
                result=self.vault.reprocess_pending_ocr()
                if not result.get('self_test',{}).get('ok'): return self.send_error(500,'OCR is not ready: '+'; '.join(result.get('errors',[])[:4]))
                if result.get('failed'): return self.send_error(500,f"OCR reprocess completed with {result['failed']} failure(s); {result['remaining']} record(s) still pending")
                return self.redirect('/intelligence?reprocessed='+str(result.get('processed',0)))
            except Exception as e: return self.send_error(500,'OCR reprocess failed: '+str(e))
        if self.path=='/historical-import':
            try:
                paths=self._multipart_files()
            except Exception as e:
                return self.send_error(400,'upload error: '+str(e))
            try:
                if not paths: return self.send_error(400,'no historical layer received')
                try: self.vault.import_historical_geography(paths[0])
                except Exception as e: return self.send_error(400,str(e))
                return self.redirect('/historical')
            finally:
                batch_dirs={p.parent.parent for p in paths}
                for p in paths:
                    p.unlink(missing_ok=True)
                    try: p.parent.rmdir()
                    except OSError: pass
                for d in batch_dirs:
                    try: d.rmdir()
                    except OSError: pass
        if self.path=='/gazetteer-install':
            length=int(self.headers.get('Content-Length',0)); raw=self.rfile.read(length).decode('utf-8','replace'); q=urllib.parse.parse_qs(raw); profile=q.get('profile',['full'])[0]
            if profile not in {'lite','full'}: return self.send_error(400,'profile must be lite or full')
            try: self.vault.install_world_gazetteer(profile,progress=lambda x: print('[gazetteer]',x,flush=True))
            except Exception as e: return self.send_error(500,'gazetteer build failed: '+str(e))
            return self.redirect('/gazetteer')
        if self.path=='/gazetteer-reindex':
            try: self.vault.reindex_geography()
            except Exception as e: return self.send_error(500,str(e))
            return self.redirect('/map')
        if self.path=='/event':
            length=int(self.headers.get('Content-Length',0)); raw=self.rfile.read(length).decode('utf-8','replace'); q=urllib.parse.parse_qs(raw)
            try:
                self.vault.add_event(q.get('date',[''])[0],q.get('place',[''])[0],q.get('lat',[''])[0],q.get('lon',[''])[0],title=q.get('title',[''])[0],record_id=q.get('record_id',[''])[0])
            except Exception as e: return self.send_error(400,str(e))
            return self.redirect('/map')
        if self.path not in {'/upload','/install'}: return self.send_error(404)
        try:
            paths=self._multipart_files()
        except Exception as e:
            return self.send_error(400,'upload error: '+str(e))
        try:
            if not paths: return self.send_error(400,'no file received')
            try:
                if self.path=='/upload': self.vault.ingest(paths); return self.redirect('/')
                self.vault.install_package(paths[0]); return self.redirect('/intelligence')
            except (ValueError,KeyError) as e:
                return self.send_error(400,str(e))
            except Exception as e:
                return self.send_error(500,'processing failed: '+str(e))
        finally:
            batch_dirs={p.parent.parent for p in paths}
            for p in paths:
                p.unlink(missing_ok=True)
                try: p.parent.rmdir()
                except OSError: pass
            for d in batch_dirs:
                try: d.rmdir()
                except OSError: pass

    def log_message(self,fmt,*args): print('[web] '+fmt%args)
def main():
    global UI_MODE
    p=argparse.ArgumentParser(); p.add_argument('--vault',default='./aziel_library_data'); p.add_argument('--host',default='127.0.0.1'); p.add_argument('--port',type=int,default=8765); p.add_argument('--mode',choices=['master','mirror'],default='master'); p.add_argument('--no-browser',action='store_true'); a=p.parse_args(); UI_MODE=a.mode; Handler.mode=a.mode; Handler.vault=AzielLibrary(a.vault,readonly=(a.mode=='mirror')); server=ThreadingHTTPServer((a.host,a.port),Handler); url=f'http://{a.host}:{a.port}'; print(f'Aziel Digital Library v{APP_VERSION} [{a.mode.upper()}] running at {url}\nVault: {Handler.vault.root}')
    if not a.no_browser: webbrowser.open(url)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
if __name__=='__main__': main()
