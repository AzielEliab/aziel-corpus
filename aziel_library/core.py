from __future__ import annotations
import hashlib, json, math, mimetypes, os, re, shutil, sqlite3, stat, uuid, threading
from collections import Counter, defaultdict
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from .engines import TextExtractor, KitRuntime, ModelRuntime, hash_vector, vector_bytes, vector_from_bytes, cosine, terms, DATE_RE, PERSON_RE, extract_dates, extract_date_mentions, normalize_event_date
from .formats import sha256_file, AzielPackage, AZK_MAGIC, AZM_MAGIC
from .exporters import write_xlsx, write_pdf
from .gazetteer import WorldGazetteer

from .historical_geo import HistoricalGeography
from .review import review_document, verify_bytes, lattice_anchor_tip, triad_composite, collection_triad, triad_coverage_points
from .succession import (
    cite_from_chain, compact_record, new_link_id, propose_all_links, work_version_pairs,
)
from .zsolver import score_document as score_zsolver_document
SCHEMA_VERSION='7.4'

SUBJECT_RULES={'Legal':{'court','custody','divorce','motion','filing','attorney','evidence','hearing','order','respondent','petitioner'},'Research':{'research','framework','theory','analysis','manuscript','voynich','codex','translation','discovery','whitepaper'},'Technology':{'software','code','python','github','cloudflare','api','database','arduino','circuit','server','algorithm'},'Forecasting':{'forecast','prediction','verification','accuracy','weather','ledger','calibration','jeeves','aziel','zd30'},'Mechanical & HVAC':{'hvac','compressor','txv','refrigerant','pressure','capacitor','coil','goodman','r32','subcooling'},'Religion & History':{'jesus','god','hebrew','bible','isaiah','religion','resurrection','historical','papacy','vatican'},'Personal Records':{'email','message','call','transcript','calendar','receipt','invoice','account','security','breach'}}
def utc_now(): return datetime.now(timezone.utc).isoformat(timespec='seconds')
def normalize_content_hash(value):
    h=str(value or '').strip().lower()
    if h.startswith('0x'): h=h[2:]
    h=h.replace('-','').replace(' ','')
    if len(h)!=64 or any(c not in '0123456789abcdef' for c in h): return ''
    return h
def stable_id(prefix,digest): return f'{prefix}-{digest[:12].upper()}'
def classify(mime,suffix):
    m=(mime or '').lower(); s=suffix.lower()
    if m.startswith('image/'): return 'image'
    if m.startswith('video/'): return 'video'
    if m.startswith('audio/'): return 'audio'
    if 'pdf' in m or s=='.pdf': return 'pdf'
    if s in {'.doc','.docx','.odt','.rtf'}: return 'document'
    if s in {'.xls','.xlsx','.ods','.csv','.tsv'}: return 'spreadsheet'
    if s in {'.ppt','.pptx','.odp'}: return 'presentation'
    if m.startswith('text/') or s in {'.txt','.md','.json','.xml','.html','.htm','.log','.py','.js','.css'}: return 'text'
    if s in {'.zip','.7z','.rar','.tar','.gz'}: return 'archive'

    return 'other'
def classify_subject(name,text,model_results):
    if model_results and model_results[0][1] >= .50:
        return model_results[0][0], 'Model Classified', f'AZM model classification confidence {model_results[0][1]:.3f}.'
    toks=set(terms(Path(name).stem+' '+text[:220000])); scored=[(len(toks&keys),n,sorted(toks&keys)) for n,keys in SUBJECT_RULES.items()]; score,primary,hits=max(scored)
    if score==0: return 'Unclassified','Standalone', 'No defensible subject signal was found; retained independently.'
    freq=Counter(terms(text[:220000]+' '+Path(name).stem)).most_common(20); second=next((x.title() for x,c in freq if len(x)>3 and x not in hits), 'General')

    return primary,second,'Matched deterministic subject signals: '+', '.join(hits[:8])+'.'
class AzielLibrary:
    def __init__(self,root,readonly=False):
        self.root=Path(root).expanduser().resolve(); self.readonly=bool(readonly); self._write_lock=threading.RLock(); self.objects=self.root/'objects'; self.exports=self.root/'exports'; self.models_dir=self.root/'models'; self.kits_dir=self.root/'kits'; self.derived=self.root/'derived'; self.gazetteers_dir=self.root/'gazetteers'; self.historical_dir=self.root/'historical_geography'; self.db_path=self.root/'library.sqlite3'; self.ledger_path=self.root/'ledger.jsonl'
        if self.readonly:
            if not self.db_path.exists(): raise FileNotFoundError(f'mirror database not found: {self.db_path}')
        else:
            for d in [self.root,self.objects,self.exports,self.models_dir,self.kits_dir,self.derived,self.gazetteers_dir,self.historical_dir]: d.mkdir(parents=True,exist_ok=True)
        self.extractor=TextExtractor(); self.kits=KitRuntime(); self.models=ModelRuntime(); self.gazetteer=WorldGazetteer(self.gazetteers_dir,readonly=self.readonly); self.historical=HistoricalGeography(self.historical_dir,readonly=self.readonly)
        if not self.readonly: self._init_db()
        self.reload_intelligence()
    def _assert_writable(self):
        if self.readonly: raise PermissionError('this corpus is a read-only mirror')
    @contextmanager
    def _connect(self):
        if self.readonly:
            uri=self.db_path.resolve().as_uri()+'?mode=ro'
            c=sqlite3.connect(uri,uri=True,timeout=60)
        else:
            c=sqlite3.connect(self.db_path,timeout=60)
        c.row_factory=sqlite3.Row
        c.execute('PRAGMA foreign_keys=ON'); c.execute('PRAGMA busy_timeout=60000')
        try:
            yield c
            if not self.readonly: c.commit()
        except Exception:
            if not self.readonly: c.rollback()
            raise
        finally:
            c.close()
    def _init_db(self):
        with self._connect() as c:

            c.executescript('''
        CREATE TABLE IF NOT EXISTS works(work_id TEXT PRIMARY KEY,title TEXT,created_utc TEXT,current_version_id TEXT,review_status TEXT DEFAULT 'UNREVIEWED',confidence TEXT DEFAULT 'UNRATED',notes TEXT DEFAULT '',tags TEXT DEFAULT '');CREATE TABLE IF NOT EXISTS versions(version_id TEXT PRIMARY KEY,work_id TEXT,version_number INTEGER,record_id TEXT,reason TEXT,created_utc TEXT);CREATE TABLE IF NOT EXISTS records(record_id TEXT PRIMARY KEY,ingested_utc TEXT,original_name TEXT,original_path TEXT,stored_path TEXT,sha256 TEXT,size_bytes INTEGER,extension TEXT,mime_type TEXT,media_class TEXT,modified_utc TEXT,extracted_text TEXT DEFAULT '',extraction_status TEXT DEFAULT '',primary_subject TEXT DEFAULT 'Unclassified',secondary_subject TEXT DEFAULT 'Standalone',classification_reason TEXT DEFAULT '',search_terms TEXT DEFAULT '',metadata_json TEXT DEFAULT '{}');CREATE INDEX IF NOT EXISTS idx_records_sha ON records(sha256); CREATE INDEX IF NOT EXISTS idx_records_subject ON records(primary_subject,secondary_subject);CREATE TABLE IF NOT EXISTS derived_artifacts(derived_id TEXT PRIMARY KEY,record_id TEXT,artifact_type TEXT,processor TEXT,processor_version TEXT,model_id TEXT DEFAULT '',model_sha256 TEXT DEFAULT '',parameters_json TEXT DEFAULT '{}',content_sha256 TEXT,stored_path TEXT,created_utc TEXT,status TEXT,confidence REAL);CREATE TABLE IF NOT EXISTS embeddings(record_id TEXT PRIMARY KEY,engine TEXT,dims INTEGER,vector BLOB,vector_sha256 TEXT,created_utc TEXT);CREATE TABLE IF NOT EXISTS relationships(source_id TEXT,target_id TEXT,score REAL,relation_type TEXT,reason TEXT,shared_terms TEXT DEFAULT '',manual INTEGER DEFAULT 0,PRIMARY KEY(source_id,target_id));CREATE TABLE IF NOT EXISTS entities(entity_id TEXT PRIMARY KEY,entity_type TEXT,name TEXT,normalized_name TEXT,metadata_json TEXT DEFAULT '{}',UNIQUE(entity_type,normalized_name)); CREATE TABLE IF NOT EXISTS mentions(record_id TEXT,entity_id TEXT,context TEXT,location_ref TEXT DEFAULT '',confidence REAL DEFAULT .5,source TEXT DEFAULT 'NATIVE',PRIMARY KEY(record_id,entity_id,context,source));CREATE TABLE IF NOT EXISTS events(event_id TEXT PRIMARY KEY,record_id TEXT,event_date TEXT,date_precision TEXT,title TEXT,description TEXT,place_entity_id TEXT,place_name TEXT,lat REAL,lon REAL,confidence REAL,source TEXT,locator TEXT DEFAULT '',status TEXT DEFAULT 'AUTO',created_utc TEXT); CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date); CREATE INDEX IF NOT EXISTS idx_events_place ON events(place_name); CREATE INDEX IF NOT EXISTS idx_events_record ON events(record_id); CREATE TABLE IF NOT EXISTS citations(citation_id TEXT PRIMARY KEY,record_id TEXT,label TEXT,quote TEXT,locator TEXT,created_utc TEXT); CREATE TABLE IF NOT EXISTS claims(claim_id TEXT PRIMARY KEY,statement TEXT,confidence TEXT,status TEXT,created_utc TEXT,notes TEXT DEFAULT ''); CREATE TABLE IF NOT EXISTS claim_evidence(claim_id TEXT,citation_id TEXT,stance TEXT,weight REAL DEFAULT 1,PRIMARY KEY(claim_id,citation_id)); CREATE TABLE IF NOT EXISTS contradictions(contradiction_id TEXT PRIMARY KEY,claim_a TEXT,claim_b TEXT,reason TEXT,status TEXT DEFAULT 'OPEN',created_utc TEXT); CREATE TABLE IF NOT EXISTS notebook_entries(entry_id TEXT PRIMARY KEY,title TEXT,entry_type TEXT,body TEXT,confidence TEXT,status TEXT,created_utc TEXT,updated_utc TEXT); CREATE TABLE IF NOT EXISTS collections(collection_id TEXT PRIMARY KEY,name TEXT,description TEXT,created_utc TEXT);CREATE TABLE IF NOT EXISTS collection_items(collection_id TEXT,target_type TEXT,target_id TEXT,PRIMARY KEY(collection_id,target_type,target_id)); CREATE TABLE IF NOT EXISTS intelligence_packages(package_id TEXT PRIMARY KEY,kind TEXT,package_type TEXT,version TEXT,filename TEXT,sha256 TEXT,installed_utc TEXT,manifest_json TEXT,status TEXT); CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT);
''')
            try: c.execute("CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(record_id UNINDEXED,title,body,subjects,entities)")
            except sqlite3.OperationalError: pass
            c.executescript('''
        CREATE TABLE IF NOT EXISTS peer_reviews(review_id TEXT PRIMARY KEY, record_id TEXT NOT NULL, stance TEXT NOT NULL, body TEXT NOT NULL, created_by TEXT, created_utc TEXT NOT NULL, entry_hash TEXT);
        CREATE TABLE IF NOT EXISTS lattice_tips(tip_id TEXT PRIMARY KEY, record_id TEXT, tip_json TEXT NOT NULL, created_utc TEXT NOT NULL, ledger_entry_hash TEXT);
        CREATE TABLE IF NOT EXISTS document_ledger(record_id TEXT NOT NULL, sequence INTEGER NOT NULL, timestamp_utc TEXT NOT NULL, action TEXT NOT NULL, payload_json TEXT NOT NULL, previous_hash TEXT NOT NULL, entry_hash TEXT NOT NULL, PRIMARY KEY(record_id, sequence));
        CREATE TABLE IF NOT EXISTS jeeves_topics(topic TEXT PRIMARY KEY, hits INTEGER NOT NULL, last_utc TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS jeeves_faq(faq_id TEXT PRIMARY KEY, question TEXT NOT NULL, hint TEXT NOT NULL, hits INTEGER NOT NULL, created_utc TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS succession_links(link_id TEXT PRIMARY KEY, predecessor_id TEXT NOT NULL, successor_id TEXT NOT NULL, subject_key TEXT NOT NULL DEFAULT '', reason TEXT NOT NULL, created_utc TEXT NOT NULL, entry_hash TEXT, UNIQUE(predecessor_id, successor_id));
        CREATE INDEX IF NOT EXISTS idx_succ_pred ON succession_links(predecessor_id);
        CREATE INDEX IF NOT EXISTS idx_succ_succ ON succession_links(successor_id);
''')
            c.execute("INSERT OR REPLACE INTO metadata VALUES('schema_version',?)",(SCHEMA_VERSION,))
    def _last_hash(self):
        if not self.ledger_path.exists(): return '0'*64
        last=''
        for line in self.ledger_path.read_text('utf-8').splitlines():
            if line.strip(): last=line
        return json.loads(last)['entry_hash'] if last else '0'*64
    def ledger_count(self): return sum(1 for x in self.ledger_path.read_text('utf-8').splitlines() if x.strip()) if self.ledger_path.exists() else 0
    def _ledger(self,action,payload):
        self._assert_writable()
        with self._write_lock:
            e={'sequence':self.ledger_count()+1,'timestamp_utc':utc_now(),'action':action,'payload':payload,'previous_hash':self._last_hash()}; e['entry_hash']=hashlib.sha256(json.dumps(e,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            with self.ledger_path.open('a',encoding='utf-8') as f: f.write(json.dumps(e,sort_keys=True)+'\n'); f.flush(); os.fsync(f.fileno())
            return e
    def _is_document_id(self, record_id):
        return bool(re.match(r'^AZDOC-[A-Z0-9]+$', str(record_id or '').strip(), re.I))
    def _document_ledger(self, record_id, action, payload):
        self._assert_writable()
        rid=str(record_id or '').strip()
        if not self._is_document_id(rid):
            return None
        body=dict(payload or {}); body['record_id']=rid
        with self._write_lock, self._connect() as c:
            last=c.execute('SELECT sequence, entry_hash FROM document_ledger WHERE record_id=? ORDER BY sequence DESC LIMIT 1',(rid,)).fetchone()
            seq=(last['sequence'] if last else 0)+1
            prev=last['entry_hash'] if last else '0'*64
            ts=utc_now()
            entry={'record_id':rid,'sequence':seq,'timestamp_utc':ts,'action':str(action),'payload':body,'previous_hash':prev}
            entry_hash=hashlib.sha256(json.dumps(entry,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            c.execute('INSERT INTO document_ledger VALUES(?,?,?,?,?,?,?)',(rid,seq,ts,str(action),json.dumps(body,sort_keys=True,separators=(',',':')),prev,entry_hash))
            row=c.execute('SELECT metadata_json FROM records WHERE record_id=?',(rid,)).fetchone()
            try: md=json.loads(row['metadata_json'] if row else '{}')
            except Exception: md={}
            md['chain_tip']=entry_hash; md['chain_sequence']=seq
            if row: c.execute('UPDATE records SET metadata_json=? WHERE record_id=?',(json.dumps(md),rid))
            return {**entry,'entry_hash':entry_hash}
    def document_chain(self, record_id):
        rid=str(record_id or '').strip()
        with self._connect() as c:
            rows=[dict(x) for x in c.execute('SELECT sequence, timestamp_utc, action, payload_json, previous_hash, entry_hash FROM document_ledger WHERE record_id=? ORDER BY sequence ASC',(rid,))]
        errors=[]; expected_prev='0'*64; expected_seq=1; tip='0'*64; entries=[]
        for row in rows:
            seq=int(row['sequence'])
            if seq!=expected_seq: errors.append('sequence gap at '+str(seq))
            if row['previous_hash']!=expected_prev: errors.append('previous_hash mismatch at '+str(seq))
            try: payload=json.loads(row['payload_json'] or '{}')
            except Exception:
                payload={}; errors.append('bad payload at '+str(seq))
            recomputed=hashlib.sha256(json.dumps({'record_id':rid,'sequence':seq,'timestamp_utc':row['timestamp_utc'],'action':row['action'],'payload':payload,'previous_hash':row['previous_hash']},sort_keys=True,separators=(',',':')).encode()).hexdigest()
            if recomputed!=row['entry_hash']: errors.append('entry_hash mismatch at '+str(seq))
            expected_prev=row['entry_hash']; expected_seq=seq+1; tip=row['entry_hash']
            entries.append({**row,'payload':payload})
        return {'record_id':rid,'ok':not errors,'entries':entries,'tip':tip,'sequence':len(entries),'errors':errors}
    def reload_intelligence(self):
        self.kits=KitRuntime(); self.models=ModelRuntime()
        if not self.readonly:
            with self._connect() as c: c.execute('DELETE FROM intelligence_packages')
        for d,kind in [(self.models_dir,'AZM'),(self.kits_dir,'AZK')]:
            for p in sorted(d.glob('*')):
                if p.suffix.lower() not in {'.azm','.azk'}: continue
                v=AzielPackage.verify(p); status='READY' if v.ok else 'INVALID'
                try:
                    if v.ok and kind=='AZM': self.models.load(p)
                    if v.ok and kind=='AZK': self.kits.load(p)
                except Exception: status='INVALID'
                if not self.readonly:
                    with self._connect() as c: c.execute('INSERT OR REPLACE INTO intelligence_packages VALUES(?,?,?,?,?,?,?,?,?)',(v.package_id or p.stem,kind,v.manifest.get('package_type',''),v.manifest.get('version',''),p.name,sha256_file(p),utc_now(),json.dumps(v.manifest),status))
    def install_package(self,path):
        self._assert_writable(); p=Path(path); v=AzielPackage.verify(p)
        if not v.ok: raise ValueError('; '.join(v.errors))
        if v.kind==AZM_MAGIC: dest=self.models_dir/(v.package_id+'.azm')
        elif v.kind==AZK_MAGIC: dest=self.kits_dir/(v.package_id+'.azk')
        else: raise ValueError('unknown Aziel package magic')
        shutil.copy2(p,dest); self._ledger('PACKAGE_INSTALL',{'package_id':v.package_id,'sha256':sha256_file(dest),'kind':v.kind}); self.reload_intelligence(); return dest
    def packages(self):
        with self._connect() as c: return [dict(x) for x in c.execute('SELECT * FROM intelligence_packages ORDER BY kind,package_id')]
    def _iter_source_files(self,paths):
        for p0 in paths:
            p=Path(p0).expanduser().resolve()
            if p.is_file():
                yield p; continue
            if not p.is_dir(): raise FileNotFoundError(str(p))
            for root,dirs,files in os.walk(p,followlinks=False):
                dirs.sort(key=str.casefold); files.sort(key=str.casefold)
                base=Path(root)

                for name in files: yield base/name
    def ingest(self,paths,version_of='',reason='Initial ingest',rebuild=True):
        self._assert_writable(); out=[]
        for f in self._iter_source_files(paths): out.append(self._ingest_file(f,version_of,reason))
        if rebuild: self.rebuild_relationships()
        try: self.backfill_succession()
        except Exception: pass
        return out
    def bulk_ingest(self,paths,reason='Bulk ingest',progress=None):
        self._assert_writable(); processed=failed=0; errors=[]
        for f in self._iter_source_files(paths):
            try:
                self._ingest_file(f,'',reason); processed+=1
                if progress and (processed<=10 or processed%100==0): progress({'processed':processed,'failed':failed,'file':str(f)})
            except Exception as e:
                failed+=1
                if len(errors)<200: errors.append({'file':str(f),'error':str(e)})
                if progress: progress({'processed':processed,'failed':failed,'file':str(f),'error':str(e)})
        self.rebuild_relationships()
        result={'processed':processed,'failed':failed,'errors':errors,'health':self.health()}
        self._ledger('BULK_INGEST_COMPLETE',{'processed':processed,'failed':failed})
        return result
    def _ingest_file(self,source,version_of='',reason='Initial ingest'):

        self._assert_writable()
        with self._write_lock:
            return self._ingest_file_locked(source,version_of,reason)
    def _ingest_file_locked(self,source,version_of='',reason='Initial ingest'):
        digest=sha256_file(source); st=source.stat(); suffix=source.suffix.lower(); mime=mimetypes.guess_type(source.name)[0] or 'application/octet-stream'; mc=classify(mime,suffix); rid=stable_id('AZDOC',digest)
        with self._connect() as c:
            existing=c.execute('SELECT * FROM records WHERE sha256=?',(digest,)).fetchone()
            if existing: self._ledger('DUPLICATE_SEEN',{'record_id':existing['record_id'],'source':str(source)}); return dict(existing)
        shard=self.objects/digest[:2]/digest[2:4]; shard.mkdir(parents=True,exist_ok=True); stored=shard/(digest+suffix)
        tmp=stored.with_suffix(stored.suffix+'.partial'); shutil.copy2(source,tmp)
        if sha256_file(tmp)!=digest: tmp.unlink(missing_ok=True); raise IOError('copy hash mismatch')
        os.replace(tmp,stored)
        try: stored.chmod(stat.S_IRUSR|stat.S_IRGRP|stat.S_IROTH)
        except OSError: pass
        text,status,extra=self.extractor.extract(stored,mc); model_results=self.models.classify_text(source.name+' '+text[:250000]); primary,secondary,why=classify_subject(source.name,text,model_results)
        common=', '.join(x for x,c in Counter(terms(source.stem+' '+text[:300000])).most_common(30)); meta={'dates':extract_dates(text[:500000]),'original_mtime':datetime.fromtimestamp(st.st_mtime,timezone.utc).isoformat(timespec='seconds'),'extractor':extra}
        prev_version_rid=''
        with self._connect() as c:
            c.execute('INSERT INTO records VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(rid,utc_now(),source.name,str(source),str(stored.relative_to(self.root)),digest,st.st_size,suffix,mime,mc,meta['original_mtime'],text,status,primary,secondary,why,common,json.dumps(meta)))
            if version_of:
                work=c.execute('SELECT * FROM works WHERE work_id=?',(version_of,)).fetchone()
                if not work: raise KeyError(version_of)
                prev=c.execute('SELECT record_id FROM versions WHERE work_id=? ORDER BY version_number DESC, created_utc DESC LIMIT 1',(version_of,)).fetchone()
                if prev: prev_version_rid=prev['record_id']
                num=c.execute('SELECT COALESCE(MAX(version_number),0)+1 FROM versions WHERE work_id=?',(version_of,)).fetchone()[0]; vid=str(uuid.uuid4()); c.execute('INSERT INTO versions VALUES(?,?,?,?,?,?)',(vid,version_of,num,rid,reason,utc_now())); c.execute('UPDATE works SET current_version_id=? WHERE work_id=?',(vid,version_of)); wid=version_of
            else:
                wid=stable_id('AZWORK',digest); vid=str(uuid.uuid4()); c.execute('INSERT INTO works VALUES(?,?,?,?,?,?,?,?)',(wid,source.stem,utc_now(),vid,'UNREVIEWED','UNRATED','','')); c.execute('INSERT INTO versions VALUES(?,?,?,?,?,?)',(vid,wid,1,rid,reason,utc_now()))
        proc=extra.get('processor','AZIEL_TEXT_ENGINE'); procver=extra.get('processor_version','1.1.0'); model_sha=extra.get('model_sha256',''); model_id=Path(extra.get('model_path','')).name if extra.get('model_path') else ''
        self._record_derived(rid,'TEXT_EXTRACT',text.encode(),proc,procver,model_id,model_sha,{'status':status,'extractor':extra},1.0 if text else 0.0)
        self._embed(rid,source.name+' '+primary+' '+secondary+' '+text[:500000]); self._extract_entities(rid,source.name,text); self._extract_events(rid,source.name,text); self._upsert_fts(rid)
        ingest_payload={'record_id':rid,'work_id':wid,'sha256':digest,'stored_path':str(stored.relative_to(self.root)),'text_sha256':hashlib.sha256(text.encode()).hexdigest(),'extraction_status':status}
        self._ledger('INGEST',ingest_payload)
        self._document_ledger(rid,'INGEST',ingest_payload)
        extras={'supersedes':prev_version_rid} if prev_version_rid else {}
        self._apply_ingest_review(rid, stored, source.name, text, digest, library='aziel', extras=extras)
        return self.get_record(rid)
    def add_ingest_origin(self,record_id,relative_path):
        self._assert_writable(); rel=str(relative_path or '').replace('\\','/').strip('/')
        if not rel: return
        with self._write_lock, self._connect() as c:
            row=c.execute('SELECT metadata_json FROM records WHERE record_id=?',(record_id,)).fetchone()
            if not row: raise KeyError(record_id)
            try: md=json.loads(row['metadata_json'] or '{}')
            except Exception: md={}
            vals=list(md.get('ingest_relative_paths') or [])
            if rel not in vals: vals.append(rel)
            md['ingest_relative_paths']=vals[-100:]
            c.execute('UPDATE records SET metadata_json=? WHERE record_id=?',(json.dumps(md),record_id))

        self._ledger('INGEST_ORIGIN',{'record_id':record_id,'relative_path':rel})
    def finalize_ingest_batch(self):
        self._assert_writable()
        with self._write_lock:
            self.rebuild_relationships()
            try: self.backfill_succession()
            except Exception: pass
            self._ledger('BATCH_FINALIZE',{'records':self.health().get('records',0)})

        return self.health()
    def pending_ocr(self):
        """Return records that were preserved but still need image/scanned-PDF OCR."""
        with self._connect() as c:
            rows=c.execute("""
        SELECT record_id,original_name,media_class,extraction_status FROM records WHERE extraction_status IN ('OCR_NOT_READY_IMAGE','OCR_NOT_READY_SCANNED_PDF','EXTRACTED_BASIC_PDF_WEAK_OCR_PENDING')OR ((media_class='image' OR extension='.pdf') AND extraction_status LIKE 'EXTRACTION_ERROR:%')ORDER BY ingested_utc""").fetchall()

        return [dict(x) for x in rows]
    def reprocess_record_extraction(self, record_id):
        """Re-run extraction from the immutable stored original without changing it."""
        self._assert_writable()
        with self._write_lock:
            with self._connect() as c:
                row=c.execute('SELECT * FROM records WHERE record_id=?',(record_id,)).fetchone()
                if not row: raise KeyError(record_id)
                old=dict(row)
            stored=(self.root/old['stored_path']).resolve()
            stored.relative_to(self.root.resolve())
            if not stored.is_file(): raise FileNotFoundError(stored)
            text,status,extra=self.extractor.extract(stored,old['media_class'])
            model_results=self.models.classify_text(old['original_name']+' '+text[:250000])
            primary,secondary,why=classify_subject(old['original_name'],text,model_results)
            common=', '.join(x for x,cnt in Counter(terms(Path(old['original_name']).stem+' '+text[:300000])).most_common(30))
            try: meta=json.loads(old['metadata_json'] or '{}')
            except Exception: meta={}
            meta['dates']=extract_dates(text[:500000])
            meta['extractor']=extra
            meta['last_reprocessed_utc']=utc_now()
            with self._connect() as c:
                c.execute('UPDATE records SET extracted_text=?,extraction_status=?,primary_subject=?,secondary_subject=?,classification_reason=?,search_terms=?,metadata_json=? WHERE record_id=?',(text,status,primary,secondary,why,common,json.dumps(meta),record_id))
                c.execute('DELETE FROM mentions WHERE record_id=?',(record_id,))
                c.execute("DELETE FROM events WHERE record_id=? AND source IN ('AUTO_SENTENCE','AUTO_CONTEXT','AUTO_DOCUMENT')",(record_id,))
            proc=extra.get('processor','AZIEL_TEXT_ENGINE'); procver=extra.get('processor_version','1.2.0'); model_sha=extra.get('model_sha256',''); model_id=Path(extra.get('model_path','')).name if extra.get('model_path') else ''
            self._record_derived(record_id,'TEXT_EXTRACT',text.encode(),proc,procver,model_id,model_sha,{'status':status,'extractor':extra,'reprocessed':True},1.0 if text else 0.0)

            self._embed(record_id,old['original_name']+' '+primary+' '+secondary+' '+text[:500000])
            self._extract_entities(record_id,old['original_name'],text)
            self._extract_events(record_id,old['original_name'],text)
            self._upsert_fts(record_id)
            self._ledger('REPROCESS_EXTRACTION',{'record_id':record_id,'old_status':old['extraction_status'],'new_status':status,'text_sha256':hashlib.sha256(text.encode()).hexdigest()})

            return self.get_record(record_id)
    def reprocess_pending_ocr(self, limit=0):
        """OCR previously preserved scans after the local processors become usable."""
        self._assert_writable()
        test=self.extractor.external.self_test_ocr(write_receipt=True)
        if not test.get("ok"):
            return {"ok":False,"processed":0,"failed":0,"remaining":len(self.pending_ocr()),"self_test":test,"errors":test.get("errors",[])}
        pending=self.pending_ocr()
        if limit: pending=pending[:int(limit)]
        processed=failed=0; errors=[]
        for item in pending:
            try:
                r=self.reprocess_record_extraction(item["record_id"])
                if r["extraction_status"] in {"EXTRACTED_EXTERNAL_IMAGE_OCR","EXTRACTED_EXTERNAL_PDF_OCR","EXTRACTED_BASIC_PDF"}: processed+=1
                else:
                    failed+=1; errors.append({"record_id":item["record_id"],"status":r["extraction_status"]})
            except Exception as e:
                failed+=1; errors.append({"record_id":item["record_id"],"error":str(e)[:500]})
        if processed: self.rebuild_relationships()
        remaining=len(self.pending_ocr())
        self._ledger("OCR_REPROCESS_BATCH",{"processed":processed,"failed":failed,"remaining":remaining})
        return {"ok":failed==0 and remaining==0,"processed":processed,"failed":failed,"remaining":remaining,"self_test":test,"errors":errors[:200]}
    def _record_derived(self,rid,typ,data,processor,version,model_id,model_sha,params,confidence):
        did='AZDER-'+hashlib.sha256((rid+typ+hashlib.sha256(data).hexdigest()).encode()).hexdigest()[:12].upper(); sub=self.derived/rid; sub.mkdir(parents=True,exist_ok=True); ext='.txt' if typ=='TEXT_EXTRACT' else '.bin'; p=sub/(did+ext); p.write_bytes(data)
        with self._connect() as c: c.execute('INSERT OR REPLACE INTO derived_artifacts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',(did,rid,typ,processor,version,model_id,model_sha,json.dumps(params),hashlib.sha256(data).hexdigest(),str(p.relative_to(self.root)),utc_now(),'READY',confidence))
    def _embed(self,rid,text):
        vec=hash_vector(text); raw=vector_bytes(vec)
        with self._connect() as c: c.execute('INSERT OR REPLACE INTO embeddings VALUES(?,?,?,?,?,?)',(rid,'AZIEL_HASH_VECTOR_V1',len(vec),raw,hashlib.sha256(raw).hexdigest(),utc_now()))
    def _extract_entities(self,rid,name,text):
        raw=name+' '+text[:900000]; native=[]
        for n,count in Counter(PERSON_RE.findall(raw)).most_common(100): native.append({'type':'PERSON','name':n,'count':count,'source':'NATIVE'})
        for n,count in Counter(extract_dates(raw)).most_common(100): native.append({'type':'DATE','name':n,'count':count,'source':'NATIVE'})
        kit=self.kits.entity_hits(raw)
        world=self.gazetteer.entity_hits(raw) if self.gazetteer.status().get('state')=='READY' else []
        with self._connect() as c:
            for item in native+kit+world:
                typ=item['type']; n=item['name']; norm=n.strip().lower(); eid=hashlib.sha256((typ+':'+norm).encode()).hexdigest()[:24]
                md={k:v for k,v in item.items() if k not in {'type','name','count','source'}}
                existing=c.execute('SELECT metadata_json FROM entities WHERE entity_id=?',(eid,)).fetchone()
                if existing:
                    try: oldmd=json.loads(existing['metadata_json'] or '{}')
                    except Exception: oldmd={}
                    # Re-indexing may resolve a previously unresolved/kit-only place. Prefer
                    # new non-empty coordinates and resolution metadata without discarding history.
                    merged=dict(oldmd)
                    for k,v in md.items():
                        if v not in (None,'',[]): merged[k]=v
                    c.execute('UPDATE entities SET name=?,normalized_name=?,metadata_json=? WHERE entity_id=?',(n,norm,json.dumps(merged),eid))
                else:
                    c.execute('INSERT INTO entities VALUES(?,?,?,?,?)',(eid,typ,n,norm,json.dumps(md)))

                c.execute('INSERT OR IGNORE INTO mentions VALUES(?,?,?,?,?,?)',(rid,eid,f"{item.get('count',1)} occurrence(s)",'',min(.99,.5+.05*item.get('count',1)),item.get('source','NATIVE')))
    @staticmethod
    def _mention_spans(text, names):
        spans=[]; seen=set()
        for name in sorted({str(n).strip() for n in names if str(n).strip()},key=len,reverse=True):
            # Unicode-aware-enough boundary guard for ordinary gazetteer names.
            rx=re.compile(r'(?<!\w)'+re.escape(name)+r'(?!\w)',re.I)
            for m in rx.finditer(text):
                key=(m.start(),m.end())
                if key in seen: continue
                seen.add(key); spans.append({'start':m.start(),'end':m.end(),'raw':m.group(0),'name':name})

        return sorted(spans,key=lambda x:x['start'])
    @staticmethod
    def _context_excerpt(text,start,end,pad=180):
        a=max(0,start-pad); b=min(len(text),end+pad)
        excerpt=re.sub(r'\s+',' ',text[a:b]).strip()

        return excerpt[:1200]
    def _extract_events(self,rid,name,text):
        """Create conservative temporal-geospatial events from document content."""
        raw=(text[:900000] or name).strip()
        if not raw: return 0
        with self._connect() as c:
            places=[]
            for row in c.execute("SELECT e.entity_id,e.name,e.metadata_json FROM mentions m JOIN entities e USING(entity_id) WHERE m.record_id=? AND e.entity_type='PLACE'",(rid,)):
                try: md=json.loads(row['metadata_json'] or '{}')
                except Exception: md={}
                lat,lon=md.get('lat'),md.get('lon')
                try: lat=float(lat); lon=float(lon)
                except (TypeError,ValueError): continue
                if not (-90<=lat<=90 and -180<=lon<=180): continue
                places.append({'entity_id':row['entity_id'],'name':row['name'],'matched_name':md.get('matched_name') or row['name'],'lat':lat,'lon':lon,'metadata':md})
        if not places: return 0
        date_mentions=extract_date_mentions(raw)

        if not date_mentions: return 0
        # Exact text locations are important: entity_hits collapses mentions, but event
        # pairing must be based on where the date/place actually occur in the document.
        pmentions=[]
        for pl in places:
            names=[pl['name'],pl.get('matched_name')]
            for sp in self._mention_spans(raw,names):
                pmentions.append({**sp,'place':pl})

        pmentions.sort(key=lambda x:x['start'])
        made=[]; pair_keys=set()
        boundaries=[0]
        for m in re.finditer(r'[!?\n]+|\.(?=\s+[A-Z0-9])',raw): boundaries.append(m.end())
        boundaries.append(len(raw)+1)
        def segment_id(pos):
            import bisect

            return bisect.bisect_right(boundaries,pos)-1
        for pm in pmentions:
            pl=pm['place']
            candidates=[]
            for dm in date_mentions:
                if dm['end'] < pm['start']: gap=pm['start']-dm['end']
                elif pm['end'] < dm['start']: gap=dm['start']-pm['end']
                else: gap=0
                same_segment=segment_id(dm['start'])==segment_id(pm['start'])
                if same_segment: candidates.append((0 if gap<500 else gap, -.94, dm, 'AUTO_SENTENCE', .94, 'AUTO'))
                elif gap<=220: candidates.append((gap, -.82, dm, 'AUTO_CONTEXT', .82, 'REVIEW'))
            # Closest two dates max per place mention avoids exploding timelines in dense prose.
            for _,_,dm,source,conf,status in sorted(candidates,key=lambda x:(x[0],x[1]))[:2]:
                pair=(dm['date'],pl['entity_id'],pm['start'],dm['start'])
                if pair in pair_keys: continue
                pair_keys.add(pair)
                a=min(pm['start'],dm['start']); b=max(pm['end'],dm['end'])
                desc=self._context_excerpt(raw,a,b)
                locator=f"text:chars:{a+1}-{b}"
                eid='AZEVT-'+hashlib.sha256('|'.join([rid,dm['date'],pl['entity_id'],str(pm['start']),str(dm['start'])]).encode()).hexdigest()[:12].upper()

                made.append((eid,rid,dm['date'],dm['precision'],f"{dm['date']} — {pl['name']}",desc,pl['entity_id'],pl['name'],pl['lat'],pl['lon'],conf,source,locator,status,utc_now()))
        if not made:
            unique_dates=[]; seen_dates=set()
            for d in date_mentions:
                if d['date'] not in seen_dates: seen_dates.add(d['date']); unique_dates.append(d)
            unique_places={p['entity_id']:p for p in places}
            if len(unique_dates)==1 and len(unique_places)==1:
                dm=unique_dates[0]; pl=next(iter(unique_places.values()))
                desc=f"Document-level date/place association from {name}; review before treating as a specific event."
                eid='AZEVT-'+hashlib.sha256((rid+'|'+dm['date']+'|'+pl['entity_id']).encode()).hexdigest()[:12].upper()
                made.append((eid,rid,dm['date'],dm['precision'],f"{dm['date']} — {pl['name']}",desc,pl['entity_id'],pl['name'],pl['lat'],pl['lon'],.68,'AUTO_DOCUMENT','document','REVIEW',utc_now()))
        if made:
            with self._connect() as c: c.executemany('INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',made)

        return len(made)
    def add_event(self,event_date,place_name,lat,lon,title='',description='',record_id='',confidence=1.0,locator='',status='CONFIRMED'):
        self._assert_writable()
        lat=float(lat); lon=float(lon)
        if not (-90<=lat<=90 and -180<=lon<=180): raise ValueError('coordinates out of range')
        event_date=normalize_event_date(str(event_date))
        precision='DAY' if len(event_date)>=10 else ('MONTH' if len(event_date)>=7 else 'YEAR')
        key='|'.join([str(event_date),place_name,str(lat),str(lon),title,description,record_id,locator])
        eid='AZEVT-'+hashlib.sha256(key.encode()).hexdigest()[:12].upper()
        with self._connect() as c:
            c.execute('INSERT OR REPLACE INTO events VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(eid,record_id,event_date,precision,title or f'{event_date} — {place_name}',description,'',place_name,lat,lon,float(confidence),'MANUAL',locator,status,utc_now()))

        self._ledger('EVENT_ADD',{'event_id':eid,'date':event_date,'place':place_name,'lat':lat,'lon':lon,'record_id':record_id}); return eid
    def events(self,start='',end='',place='',record_id='',min_confidence=0.0):
        sql='SELECT * FROM events WHERE confidence>=?'; args=[float(min_confidence)]
        if start: sql+=' AND event_date>=?'; args.append(start)
        if end: sql+=' AND event_date<=?'; args.append(end)
        if place: sql+=' AND place_name LIKE ?'; args.append('%'+place+'%')

        if record_id: sql+=' AND record_id=?'; args.append(record_id)
        sql+=' ORDER BY event_date,place_name,event_id'

        with self._connect() as c: return [dict(x) for x in c.execute(sql,args)]
    def map_payload(self,start='',end='',min_confidence=0.0):
        ev=self.events(start,end,min_confidence=min_confidence)
        for e in ev:
            try: e['historical_context']=self.historical.context_for_point(e['lat'],e['lon'],e['event_date']) if e.get('lat') is not None and e.get('lon') is not None else []
            except Exception: e['historical_context']=[]
        unresolved=[]
        with self._connect() as c:
            for x in c.execute("SELECT e.name,e.metadata_json,COUNT(DISTINCT m.record_id) documents FROM entities e JOIN mentions m USING(entity_id) WHERE e.entity_type='PLACE' GROUP BY e.entity_id ORDER BY documents DESC"):
                try: md=json.loads(x['metadata_json'] or '{}')
                except Exception: md={}
                if md.get('lat') is None or md.get('lon') is None: unresolved.append({'name':x['name'],'documents':x['documents']})

        return {'events':ev,'unresolved_places':unresolved,'historical_status':self.historical.status()}
    def historical_status(self):
        return self.historical.status()
    def historical_sources(self):
        return self.historical.sources()
    def historical_layers(self):


        return self.historical.layers()
    def historical_geojson(self,date):
        return self.historical.active_geojson(date)
    def historical_context(self,lat,lon,date):
        return self.historical.context_for_point(lat,lon,date)
    def import_historical_geography(self,path,**kwargs):
        self._assert_writable()
        result=self.historical.import_path(path,**kwargs)
        self._ledger('HISTORICAL_GEOGRAPHY_IMPORT',{'layer_id':result.get('layer_id'),'name':result.get('name'),'features':result.get('features'),'source_sha256':result.get('source_sha256'),'kit_sha256':result.get('kit_sha256','')})
        return result
    def create_historical_kit(self,geojson_path,destination,**kwargs):
        self._assert_writable()
        result=self.historical.create_kit(geojson_path,destination,**kwargs)
        self._ledger('HISTORICAL_GEOGRAPHY_KIT_CREATE',{'path':str(destination),'sha256':result['sha256']})

        return result
    def _upsert_fts(self,rid):
        with self._connect() as c:
            r=c.execute('SELECT * FROM records WHERE record_id=?',(rid,)).fetchone(); ents=' '.join(x[0] for x in c.execute('SELECT e.name FROM mentions m JOIN entities e USING(entity_id) WHERE m.record_id=?',(rid,)))
            try: c.execute('DELETE FROM records_fts WHERE record_id=?',(rid,)); c.execute('INSERT INTO records_fts VALUES(?,?,?,?,?)',(rid,r['original_name'],r['extracted_text'],r['primary_subject']+' '+r['secondary_subject'],ents))
            except sqlite3.OperationalError: pass
    def search(self,q='',media_class='',subject=''):
        with self._connect() as c:
            if q:
                try:
                    sql="SELECT r.*,snippet(records_fts,2,char(1),char(2),' ... ',22) snippet FROM records_fts JOIN records r USING(record_id) WHERE records_fts MATCH ?"; args=[q]
                    if media_class: sql+=' AND r.media_class=?'; args.append(media_class)
                    if subject: sql+=' AND r.primary_subject=?'; args.append(subject)
                    sql+=' ORDER BY bm25(records_fts)'; return [dict(x) for x in c.execute(sql,args)]
                except sqlite3.OperationalError: pass
            sql="SELECT r.*,'' snippet FROM records r WHERE 1=1"; args=[]
            if q: sql+=' AND (original_name LIKE ? OR extracted_text LIKE ? OR search_terms LIKE ?)'; args += ['%'+q+'%']*3
            if media_class: sql+=' AND media_class=?'; args.append(media_class)
            if subject: sql+=' AND primary_subject=?'; args.append(subject)
            return [dict(x) for x in c.execute(sql+' ORDER BY ingested_utc DESC',args)]
    def find_record_id_by_hash(self, digest):
        h=normalize_content_hash(digest)
        if not h: return None
        with self._connect() as c:
            row=c.execute('SELECT record_id FROM records WHERE lower(sha256)=? ORDER BY ingested_utc ASC LIMIT 1',(h,)).fetchone()
            return row['record_id'] if row else None
    def get_record(self,rid):
        with self._connect() as c:
            r=c.execute('SELECT * FROM records WHERE record_id=?',(rid,)).fetchone()
            if not r: raise KeyError(rid)
            d=dict(r); d['entities']=[dict(x) for x in c.execute('SELECT e.*,m.context,m.confidence,m.source FROM mentions m JOIN entities e USING(entity_id) WHERE m.record_id=? ORDER BY e.entity_type,e.name',(rid,))]; d['relationships']=[dict(x) for x in c.execute('SELECT * FROM relationships WHERE source_id=? ORDER BY score DESC',(rid,))]; d['derived']=[dict(x) for x in c.execute('SELECT * FROM derived_artifacts WHERE record_id=? ORDER BY created_utc',(rid,))]; d['events']=[dict(x) for x in c.execute('SELECT * FROM events WHERE record_id=? ORDER BY event_date',(rid,))]
            try: md=json.loads(d.get('metadata_json') or '{}')
            except Exception: md={}
            d['review']=md.get('aziel_review'); d['lattice_tip']=md.get('lattice_tip'); d['quarantine_status']=md.get('quarantine_status','CLEAR'); d['bayesian']= (d['review'] or {}).get('bayesian'); d['triad']=(d['review'] or {}).get('triad'); d['triad_combined']=md.get('triad_combined') if md.get('triad_combined') is not None else ((d['triad'] or {}).get('combined')); d['chain_tip']=md.get('chain_tip'); d['chain_sequence']=md.get('chain_sequence')
            d['succession']=md.get('succession') or self._succession_cite(rid, conn=c)
            d['zsolver']=md.get('zsolver'); d['zsolver_score']=(md.get('zsolver') or {}).get('capped_confidence'); d['zsolver_status']=(md.get('zsolver') or {}).get('status')
            try: d['peer_reviews']=[dict(x) for x in c.execute('SELECT * FROM peer_reviews WHERE record_id=? ORDER BY created_utc',(rid,))]
            except sqlite3.OperationalError: d['peer_reviews']=[]
            return d
    def _compact_records(self, extras_by_id=None):
        extras_by_id=extras_by_id or {}
        with self._connect() as c:
            rows=[dict(x) for x in c.execute('SELECT record_id,original_name,primary_subject,search_terms,extracted_text,ingested_utc,sha256,metadata_json FROM records')]
        out=[]
        for row in rows:
            packed=compact_record({
                'record_id':row['record_id'],
                'title':row['original_name'],
                'original_name':row['original_name'],
                'primary_subject':row['primary_subject'],
                'subjects':row['primary_subject'],
                'search_terms':row['search_terms'],
                'body':row['extracted_text'] or '',
                'ingested_utc':row['ingested_utc'],
                'sha256':row['sha256'],
                'metadata_json':row['metadata_json'],
            }, extras_by_id.get(row['record_id']))
            out.append(packed)
        return out
    def _work_version_extra_pairs(self):
        try:
            with self._connect() as c:
                rows=[dict(x) for x in c.execute('SELECT work_id, record_id, version_number, created_utc FROM versions')]
        except sqlite3.OperationalError:
            return []
        return work_version_pairs(rows)
    def _persist_succession_link(self, pair):
        with self._connect() as c:
            exists=c.execute('SELECT link_id FROM succession_links WHERE predecessor_id=? AND successor_id=?',(pair['predecessor_id'],pair['successor_id'])).fetchone()
            if exists: return None
        link_id=new_link_id()
        payload={'link_id':link_id,'predecessor_id':pair['predecessor_id'],'successor_id':pair['successor_id'],'subject_key':pair.get('subject_key') or '','reason':pair.get('reason') or ''}
        pred_entry=self._ledger('SUPERSEDED_BY',{**payload,'record_id':pair['predecessor_id']})
        self._document_ledger(pair['predecessor_id'],'SUPERSEDED_BY',{**payload,'record_id':pair['predecessor_id']})
        self._ledger('SUPERSEDES',{**payload,'record_id':pair['successor_id']})
        self._document_ledger(pair['successor_id'],'SUPERSEDES',{**payload,'record_id':pair['successor_id']})
        with self._connect() as c:
            c.execute('INSERT INTO succession_links VALUES(?,?,?,?,?,?,?)',(link_id,pair['predecessor_id'],pair['successor_id'],pair.get('subject_key') or '',pair.get('reason') or '',utc_now(),pred_entry['entry_hash']))
        return link_id
    def _succession_component_ids(self, record_id, conn=None):
        seen={record_id}; queue=[record_id]
        def walk(c):
            while queue:
                current=queue.pop(0)
                try:
                    rows=c.execute('SELECT predecessor_id, successor_id FROM succession_links WHERE predecessor_id=? OR successor_id=?',(current,current)).fetchall()
                except sqlite3.OperationalError:
                    return seen
                for row in rows:
                    for x in (row['predecessor_id'], row['successor_id']):
                        if x not in seen:
                            seen.add(x); queue.append(x)
            return seen
        if conn is not None:
            return walk(conn)
        with self._connect() as c:
            return walk(c)
    def _succession_cite(self, record_id, conn=None):
        ids=self._succession_component_ids(record_id, conn=conn)
        if len(ids)<2: return None
        def load_chain(c):
            chain=[]
            for rid in ids:
                row=c.execute('SELECT record_id, original_name, ingested_utc FROM records WHERE record_id=?',(rid,)).fetchone()
                if row: chain.append({'record_id':row['record_id'],'title':row['original_name'],'created_utc':row['ingested_utc']})
                else: chain.append({'record_id':rid,'title':rid,'created_utc':''})
            chain.sort(key=lambda x: (x.get('created_utc') or '', x.get('record_id') or ''))
            return cite_from_chain(record_id, chain)
        if conn is not None:
            return load_chain(conn)
        with self._connect() as c:
            return load_chain(c)
    def _succession_coverage(self, record_id):
        cite=self._succession_cite(record_id)
        return triad_coverage_points(len((cite or {}).get('chain') or []))
    def _write_succession_snapshot(self, record_id, cite):
        if not cite: return
        payload={'record_id':record_id,'chain':[x['record_id'] for x in cite['chain']],'supersedes':[x['record_id'] for x in cite['supersedes']],'superseded_by':[x['record_id'] for x in cite['superseded_by']]}
        self._ledger('SUCCESSION_CITE',payload)
        self._document_ledger(record_id,'SUCCESSION_CITE',payload)
        with self._write_lock, self._connect() as c:
            row=c.execute('SELECT metadata_json FROM records WHERE record_id=?',(record_id,)).fetchone()
            try: md=json.loads(row['metadata_json'] if row else '{}')
            except Exception: md={}
            md['succession']=cite
            if row: c.execute('UPDATE records SET metadata_json=? WHERE record_id=?',(json.dumps(md),record_id))
    def apply_succession_for_record(self, record_id, extras=None):
        extras_by_id={record_id: extras or {}}
        catalog=self._compact_records(extras_by_id)
        pairs=propose_all_links(catalog, self._work_version_extra_pairs())
        linked=0
        affected={record_id}
        for pair in pairs:
            if self._persist_succession_link(pair): linked+=1
            affected.add(pair['predecessor_id']); affected.add(pair['successor_id'])
        cite=self._succession_cite(record_id)
        if linked:
            for rid in affected:
                snap=self._succession_cite(rid)
                if snap: self._write_succession_snapshot(rid, snap)
                if rid==record_id: cite=snap
        return {'linked':linked,'cite':cite,'chain':(cite or {}).get('chain') or []}
    def _apply_triad_coverage(self, record_id):
        rec=self.get_record(record_id)
        review=rec.get('review') or {}
        if not (review.get('spre') and review.get('clce') and review.get('plr')): return None
        coverage=self._succession_coverage(record_id)
        triad=collection_triad(triad_composite(spre=review.get('spre'),clce=review.get('clce'),plr=review.get('plr')), 'aziel', coverage)
        stored=rec.get('triad_combined') if rec.get('triad_combined') is not None else (review.get('triad') or {}).get('combined')
        try:
            if stored is not None and triad.get('combined') is not None and abs(float(stored)-float(triad['combined']))<0.0002:
                return triad
        except (TypeError,ValueError):
            pass
        review=dict(review); review['triad']=triad
        payload={'record_id':record_id,'event':'succession_recalibrate','triad_combined':triad.get('combined'),'triad_ready':bool(triad.get('ready'))}
        self._ledger('REVIEW_SCORE',payload)
        self._document_ledger(record_id,'REVIEW_SCORE',payload)
        with self._write_lock, self._connect() as c:
            row=c.execute('SELECT metadata_json FROM records WHERE record_id=?',(record_id,)).fetchone()
            try: md=json.loads(row['metadata_json'] if row else '{}')
            except Exception: md={}
            md['aziel_review']=review; md['triad_combined']=triad.get('combined')
            if row: c.execute('UPDATE records SET metadata_json=? WHERE record_id=?',(json.dumps(md),record_id))
        return triad
    def backfill_succession(self):
        self._assert_writable()
        catalog=self._compact_records()
        pairs=propose_all_links(catalog, self._work_version_extra_pairs())
        linked=0
        affected=set()
        for pair in pairs:
            if self._persist_succession_link(pair): linked+=1
            affected.add(pair['predecessor_id']); affected.add(pair['successor_id'])
        for rid in affected:
            snap=self._succession_cite(rid)
            if snap: self._write_succession_snapshot(rid, snap)
            try: self._apply_triad_coverage(rid)
            except Exception: pass
        return {'ok':True,'linked':linked,'records':len(affected)}
    def _apply_ingest_review(self, record_id, stored, filename, text, digest, library='aziel', event='verified_ingest', extras=None):
        self._assert_writable()
        try: self.apply_succession_for_record(record_id, extras)
        except Exception: pass
        coverage=self._succession_coverage(record_id)
        raw=Path(stored).read_bytes() if Path(stored).is_file() else (text or '').encode()
        structure=verify_bytes(raw, filename)
        review=review_document(title=Path(filename).stem, body=text, filename=filename, sha256=digest, author='Aziel Eliab', library=library, structure=structure, coverage=coverage)
        struct_payload={'record_id':record_id,'sha256':digest,'event':event,'ok':structure['ok'],'file_count':len(structure.get('files') or []),'errors':structure.get('errors') or []}
        entry=self._ledger('STRUCTURE_VERIFY',struct_payload)
        self._document_ledger(record_id,'STRUCTURE_VERIFY',struct_payload)
        score_payload={'record_id':record_id,'sha256':digest,'event':event,'spre_pc':review['spre']['pc'],'clce_triple':review['clce']['triple'],'plr_status':review['plr']['status'],'triad_combined':(review.get('triad') or {}).get('combined'),'triad_ready':bool((review.get('triad') or {}).get('ready')),'bayesian_posterior':review['bayesian']['posterior'],'unranked':True,'lights':review['lights']}
        self._ledger('REVIEW_SCORE',score_payload)
        self._document_ledger(record_id,'REVIEW_SCORE',score_payload)
        if review['quarantine_status']!='CLEAR':
            q_payload={'record_id':record_id,'sha256':digest,'status':review['quarantine_status'],'markers':review['poison']['markers'],'immutable':True,'never_delete':True}
            self._ledger('POISON_QUARANTINE',q_payload)
            self._document_ledger(record_id,'POISON_QUARANTINE',q_payload)
        tip=None
        if structure['ok']:
            tip=lattice_anchor_tip(record_id=record_id,library=library,content_sha256=digest,ledger_entry_hash=entry['entry_hash'],structure=structure,review=review,event=event)
            tip_payload={'record_id':record_id,'sha256':digest,'schema':tip['schema'],'kind':tip['kind'],'carrier':tip['carrier'],'triad_combined':(review.get('triad') or {}).get('combined')}
            tip_entry=self._ledger('LATTICE_ANCHOR',tip_payload)
            self._document_ledger(record_id,'LATTICE_ANCHOR',tip_payload)
            tip['ledger_entry_hash']=tip_entry['entry_hash']
            with self._connect() as c:
                c.execute('INSERT OR REPLACE INTO lattice_tips VALUES(?,?,?,?,?)',('AZTIP-'+digest[:12].upper(),record_id,json.dumps(tip),utc_now(),tip_entry['entry_hash']))
        zsolver=score_zsolver_document({'title':Path(filename).stem,'body':text,'filename':filename,'record_id':record_id}, prefer_live=True)
        z_payload={'record_id':record_id,'capped_confidence':zsolver.get('capped_confidence'),'display':zsolver.get('display'),'status':zsolver.get('status'),'source':zsolver.get('source'),'provisional':True,'separate_from_triad':True}
        self._ledger('ZSOLVER_SCORE',z_payload)
        self._document_ledger(record_id,'ZSOLVER_SCORE',z_payload)
        with self._write_lock, self._connect() as c:
            row=c.execute('SELECT metadata_json FROM records WHERE record_id=?',(record_id,)).fetchone()
            try: md=json.loads(row['metadata_json'] if row else '{}')
            except Exception: md={}
            if zsolver.get('queued'):
                q=list(md.get('zsolver_queue') or [])
                q.append({'utc':utc_now(),'reason':zsolver.get('last_error') or 'zsolver API unavailable'})
                md['zsolver_queue']=q[-20:]
            else:
                md.pop('zsolver_queue', None)
            md['aziel_review']=review; md['lattice_tip']=tip; md['quarantine_status']=review['quarantine_status']; md['triad_combined']=(review.get('triad') or {}).get('combined')
            md['zsolver']=zsolver; md['succession']=self._succession_cite(record_id)
            c.execute('UPDATE records SET metadata_json=? WHERE record_id=?',(json.dumps(md),record_id))
        cite=md.get('succession')
        for item in (cite or {}).get('chain') or []:
            if item.get('record_id') and item['record_id']!=record_id:
                try: self._apply_triad_coverage(item['record_id'])
                except Exception: pass
        return review
    def inspect_original(self, record_id):
        rec=self.get_record(record_id)
        stored=(self.root/rec['stored_path']).resolve()
        stored.relative_to(self.root.resolve())
        raw=stored.read_bytes() if stored.is_file() else b''
        structure=verify_bytes(raw, rec['original_name'])
        if rec.get('sha256') and structure.get('sha256') and rec['sha256']!=structure['sha256']:
            structure=dict(structure); structure['ok']=False; structure.setdefault('errors',[]).append('stored hash mismatch')
        review=review_document(title=Path(rec['original_name']).stem, body=rec.get('extracted_text') or '', filename=rec['original_name'], sha256=rec.get('sha256') or structure.get('sha256'), author='Aziel Eliab', library='aziel', structure=structure, coverage=self._succession_coverage(record_id))
        return {'record_id':record_id,'structure':structure,'review':review}
    def verify_original(self, record_id, event='download_verify'):
        rec=self.get_record(record_id)
        stored=(self.root/rec['stored_path']).resolve()
        stored.relative_to(self.root.resolve())
        if self.readonly:
            return self.inspect_original(record_id)['review']
        return self._apply_ingest_review(record_id, stored, rec['original_name'], rec.get('extracted_text') or '', rec['sha256'], library='aziel', event=event)
    def add_peer_review(self, record_id, stance, body, created_by='peer'):
        self._assert_writable()
        st=str(stance or 'note').lower()
        if st not in {'endorse','challenge','note'}: raise ValueError('stance must be endorse, challenge, or note')
        note=str(body or '').strip()
        if not note: raise ValueError('review note required')
        self.get_record(record_id)
        rid='AZPEER-'+uuid.uuid4().hex[:12].upper()
        peer_payload={'record_id':record_id,'review_id':rid,'stance':st,'body':note[:4000],'created_by':created_by}
        entry=self._ledger('PEER_REVIEW',peer_payload)
        self._document_ledger(record_id,'PEER_REVIEW',peer_payload)
        with self._connect() as c:
            c.execute('INSERT INTO peer_reviews VALUES(?,?,?,?,?,?,?)',(rid,record_id,st,note[:4000],created_by,entry['timestamp_utc'],entry['entry_hash']))
        return {'review_id':rid,'record_id':record_id,'stance':st,'entry_hash':entry['entry_hash']}
    def _is_fully_scored(self, rec):
        review=(rec.get('review') if rec else None) or {}
        triad=review.get('triad') or {}
        combined=rec.get('triad_combined') if rec and rec.get('triad_combined') is not None else triad.get('combined')
        return bool(review.get('spre') and review.get('clce') and review.get('plr') and triad.get('ready') and combined is not None)
    def _stored_triad_matches(self, rec):
        if not self._is_fully_scored(rec): return False
        review=rec.get('review') or {}
        expected=collection_triad(triad_composite(spre=review.get('spre'),clce=review.get('clce'),plr=review.get('plr')), rec.get('library') or 'aziel', self._succession_coverage(rec.get('record_id')))
        stored=rec.get('triad_combined') if rec.get('triad_combined') is not None else (review.get('triad') or {}).get('combined')
        if expected.get('combined') is None or stored is None: return False
        try: return abs(float(stored)-float(expected['combined']))<0.0002
        except (TypeError,ValueError): return False
    def backfill_reviews(self, *, limit=50, force=False, record_id=None, all_records=False):
        self._assert_writable()
        try: succ=self.backfill_succession()
        except Exception: succ={'linked':0}
        with self._connect() as c:
            if record_id:
                row=c.execute('SELECT * FROM records WHERE record_id=?',(record_id,)).fetchone()
                rows=[dict(row)] if row else []
            else:
                rows=[dict(x) for x in c.execute('SELECT * FROM records ORDER BY ingested_utc ASC')]
        total=len(rows)
        cap=total if all_records or record_id else max(1,min(int(limit or 50),200))
        results=[]; processed=0; skipped=0; failed=0
        for raw in rows:
            if processed+skipped+failed>=cap: break
            try:
                rec=self.get_record(raw['record_id'])
                z=rec.get('zsolver') or {}
                z_ok=z.get('capped_confidence') is not None
                if z_ok and z.get('status')=='queued':
                    try:
                        fresh=score_zsolver_document({'title':rec.get('original_name'),'body':rec.get('extracted_text') or '','filename':rec.get('original_name')}, prefer_live=True)
                        with self._write_lock, self._connect() as c:
                            row=c.execute('SELECT metadata_json FROM records WHERE record_id=?',(rec['record_id'],)).fetchone()
                            try: md=json.loads(row['metadata_json'] if row else '{}')
                            except Exception: md={}
                            md['zsolver']=fresh
                            if row: c.execute('UPDATE records SET metadata_json=? WHERE record_id=?',(json.dumps(md),rec['record_id']))
                    except Exception:
                        pass
                if self._stored_triad_matches(rec) and z_ok and not force:
                    skipped+=1
                    results.append({'record_id':rec['record_id'],'skipped':True,'reason':'already fully scored'})
                    continue
                review=self._apply_ingest_review(rec['record_id'], self.root/rec['stored_path'], rec['original_name'], rec.get('extracted_text') or '', rec.get('sha256') or '', library='aziel', event='verify_backfill')
                processed+=1
                rec2=self.get_record(rec['record_id'])
                results.append({'record_id':rec['record_id'],'skipped':False,'triad_combined':(review.get('triad') or {}).get('combined'),'zsolver_score':(rec2.get('zsolver') or {}).get('capped_confidence'),'zsolver_status':(rec2.get('zsolver') or {}).get('status'),'quarantine_status':review.get('quarantine_status')})
            except Exception as e:
                failed+=1
                results.append({'record_id':raw.get('record_id'),'failed':True,'error':str(e)[:200]})
        return {'ok':True,'force':bool(force),'all':bool(all_records),'total':total,'scored':processed,'processed':processed,'skipped':skipped,'failed':failed,'succession_linked':succ.get('linked',0),'results':results}
    def note_download(self, record_id):
        rec=self.get_record(record_id)
        payload={'record_id':record_id,'sha256':rec.get('sha256'),'filename':rec.get('original_name'),'quarantine_status':rec.get('quarantine_status') or 'CLEAR'}
        if self.readonly:
            return payload
        self._ledger('DOWNLOAD',payload)
        self._document_ledger(record_id,'DOWNLOAD',payload)
        return payload
    def add_citation(self,rid,label,quote,locator):
        self._assert_writable()
        cid='CIT-'+uuid.uuid4().hex[:12].upper()
        with self._connect() as c: c.execute('INSERT INTO citations VALUES(?,?,?,?,?,?)',(cid,rid,label,quote,locator,utc_now()))
        self._ledger('CITATION_ADD',{'citation_id':cid,'record_id':rid,'locator':locator}); return cid
    def add_claim(self,statement,confidence='POSSIBLE',status='OPEN',notes=''):
        self._assert_writable()
        cid='CLM-'+uuid.uuid4().hex[:12].upper()
        with self._connect() as c: c.execute('INSERT INTO claims VALUES(?,?,?,?,?,?)',(cid,statement,confidence,status,utc_now(),notes))
        self._ledger('CLAIM_ADD',{'claim_id':cid,'statement_sha256':hashlib.sha256(statement.encode()).hexdigest()}); return cid
    def link_evidence(self,claim_id,citation_id,stance='SUPPORTS',weight=1):
        self._assert_writable()
        with self._connect() as c: c.execute('INSERT OR REPLACE INTO claim_evidence VALUES(?,?,?,?)',(claim_id,citation_id,stance,float(weight)))
        self._ledger('EVIDENCE_LINK',{'claim_id':claim_id,'citation_id':citation_id,'stance':stance,'weight':weight})
    def add_notebook(self,title,body,entry_type='OBSERVATION',confidence='POSSIBLE',status='OPEN'):
        self._assert_writable()
        eid='NOTE-'+uuid.uuid4().hex[:12].upper(); now=utc_now()
        with self._connect() as c: c.execute('INSERT INTO notebook_entries VALUES(?,?,?,?,?,?,?,?)',(eid,title,entry_type,body,confidence,status,now,now))
        self._ledger('NOTEBOOK_ADD',{'entry_id':eid,'title':title}); return eid
    def add_contradiction(self,claim_a,claim_b,reason,status='OPEN'):
        self._assert_writable()
        cid='CON-'+uuid.uuid4().hex[:12].upper()
        with self._connect() as c: c.execute('INSERT INTO contradictions VALUES(?,?,?,?,?,?)',(cid,claim_a,claim_b,reason,status,utc_now()))

        self._ledger('CONTRADICTION_ADD',{'contradiction_id':cid,'claim_a':claim_a,'claim_b':claim_b}); return cid
    def claims(self):
        with self._connect() as c: return [dict(x) for x in c.execute('SELECT c.*,COUNT(ce.citation_id) evidence_count FROM claims c LEFT JOIN claim_evidence ce USING(claim_id) GROUP BY c.claim_id ORDER BY c.created_utc DESC')]
    def notebooks(self):
        with self._connect() as c: return [dict(x) for x in c.execute('SELECT * FROM notebook_entries ORDER BY updated_utc DESC')]
    def contradictions(self):
        with self._connect() as c: return [dict(x) for x in c.execute('SELECT * FROM contradictions ORDER BY created_utc DESC')]
    def people(self):
        with self._connect() as c: return [dict(x) for x in c.execute("SELECT e.entity_id,e.name,COUNT(DISTINCT m.record_id) documents FROM entities e JOIN mentions m USING(entity_id) WHERE e.entity_type='PERSON' GROUP BY e.entity_id ORDER BY documents DESC,e.name")]
    def gazetteer_status(self):
        return self.gazetteer.status()
    def install_world_gazetteer(self,profile='full',force_download=False,include_alternate_names=True,source_files=None,progress=None,reindex=True):
        self._assert_writable()
        before=self.gazetteer.status()
        result=self.gazetteer.install(profile,force_download=force_download,include_alternate_names=include_alternate_names,source_files=source_files,progress=progress)
        self._ledger('GAZETTEER_BUILD',{'profile':profile,'places':result.get('places',0),'aliases':result.get('aliases',0),'historical_aliases':result.get('historical_aliases',0),'source_date':result.get('source_date',''),'previous_state':before.get('state','')})
        # A newly installed gazetteer must immediately become useful for records that
        # were ingested before coordinates were available. Do not require a second click.
        if reindex and result.get('state')=='READY':
            try:
                result['reindex']=self.reindex_geography()
            except Exception as exc:
                result['reindex']={'ok':False,'error':str(exc)}
        return result
    def gazetteer_search(self,query,limit=50):
        return self.gazetteer.search(query,limit)
    def gazetteer_sources(self):
        return self.gazetteer.sources()
    def reindex_geography(self,batch_size=100,progress=None):
        self._assert_writable()

        """
        Re-run gazetteer entity/event extraction incrementally.
        Existing manual events are preserved. Existing automatic geographic mentions
        and events are replaced deterministically. Rows are paged by SQLite rowid so
        a very large corpus does not load every extracted document into RAM at once."""
        batch_size=max(1,min(int(batch_size or 100),1000)); changed=processed=0; last_rowid=0
        with self._connect() as c:
            c.execute("DELETE FROM events WHERE source IN ('AUTO_SENTENCE','AUTO_CONTEXT','AUTO_DOCUMENT')")
            c.execute("DELETE FROM mentions WHERE source='AZIEL_WORLD_GAZETTEER'")
        while True:
            with self._connect() as c:
                rows=[dict(x) for x in c.execute('SELECT rowid AS _rowid,record_id,original_name,extracted_text FROM records WHERE rowid>? ORDER BY rowid LIMIT ?',(last_rowid,batch_size))]
            if not rows: break
            for r in rows:
                self._extract_entities(r['record_id'],r['original_name'],r['extracted_text'])
                changed += self._extract_events(r['record_id'],r['original_name'],r['extracted_text'])
                self._upsert_fts(r['record_id']); processed+=1; last_rowid=r['_rowid']
            if progress: progress({'processed':processed,'events_created':changed})
        self._ledger('GEOGRAPHY_REINDEX',{'records':processed,'events_created':changed})
        return {'records':processed,'events_created':changed}
    def places(self):
        with self._connect() as c: return [dict(x) for x in c.execute("SELECT e.entity_id,e.name,e.metadata_json,COUNT(DISTINCT m.record_id) documents FROM entities e JOIN mentions m USING(entity_id) WHERE e.entity_type='PLACE' GROUP BY e.entity_id ORDER BY documents DESC,e.name")]
    def rebuild_relationships(self,threshold=.19,max_links=12):
        self._assert_writable()
        rows=self.search(); vectors={}
        with self._connect() as c:
            for x in c.execute('SELECT record_id,vector FROM embeddings'): vectors[x['record_id']]=vector_from_bytes(x['vector'])
        links=[]
        for i,a in enumerate(rows):
            cand=[]
            for b in rows[i+1:]:
                va=vectors.get(a['record_id']); vb=vectors.get(b['record_id']); score=cosine(va,vb) if va and vb else 0; shared=sorted(set(terms(a['search_terms']))&set(terms(b['search_terms'])))[:12]
                bonus=.05 if a['primary_subject']==b['primary_subject'] and a['primary_subject']!='Unclassified' else 0; total=min(1,max(0,score+bonus)); why=f"AZIEL_HASH_VECTOR_V1 similarity {score:.3f}"+(f"; same subject {a['primary_subject']}" if bonus else '')+(f"; shared terms: {', '.join(shared[:8])}" if shared else '')
                if total>=threshold: cand.append((total,b,shared,why))
            for score,b,shared,why in sorted(cand,key=lambda x:x[0],reverse=True)[:max_links]: links += [(a['record_id'],b['record_id'],score,'LOCAL_VECTOR_SIMILARITY',why,', '.join(shared),0),(b['record_id'],a['record_id'],score,'LOCAL_VECTOR_SIMILARITY',why,', '.join(shared),0)]
        with self._connect() as c: c.execute('DELETE FROM relationships WHERE manual=0'); c.executemany('INSERT OR REPLACE INTO relationships VALUES(?,?,?,?,?,?,?)',links)
        return len(links)
    def tree(self):
        rows=self.search(); counts=defaultdict(int)
        with self._connect() as c:
            for x in c.execute('SELECT source_id,COUNT(*) n FROM relationships GROUP BY source_id'): counts[x['source_id']]=x['n']
        grouped=defaultdict(lambda:defaultdict(list))
        for r in rows:
            p=r['primary_subject'] if counts[r['record_id']] or r['primary_subject']!='Unclassified' else 'Standalone / Unconnected'; s=r['secondary_subject'] if p!='Standalone / Unconnected' else r['media_class'].title(); grouped[p][s].append({'id':r['record_id'],'name':r['original_name'],'reason':r['classification_reason'],'connections':counts[r['record_id']]})
        return {'name':'Master Corpus','children':[{'name':p,'children':[{'name':s,'children':sorted(ds,key=lambda x:x['name'].lower())} for s,ds in sorted(sub.items())]} for p,sub in sorted(grouped.items())]}
    def timeline(self):
        out=[]
        for r in self.search():
            for d in json.loads(r['metadata_json'] or '{}').get('dates',[]): out.append({'date':d,'record_id':r['record_id'],'title':r['original_name'],'subject':r['primary_subject']})
        return sorted(out,key=lambda x:x['date'])
    def health(self):
        rows=self.search(); connected=set()
        with self._connect() as c:
            connected={x[0] for x in c.execute('SELECT DISTINCT source_id FROM relationships')}; der=c.execute('SELECT COUNT(*) FROM derived_artifacts').fetchone()[0]; ents=c.execute('SELECT COUNT(*) FROM entities').fetchone()[0]; pkgs=c.execute("SELECT COUNT(*) FROM intelligence_packages WHERE status='READY'").fetchone()[0]; claims=c.execute('SELECT COUNT(*) FROM claims').fetchone()[0]; notes=c.execute('SELECT COUNT(*) FROM notebook_entries').fetchone()[0]; contradictions=c.execute('SELECT COUNT(*) FROM contradictions').fetchone()[0]; events=c.execute('SELECT COUNT(*) FROM events').fetchone()[0]; mapped_events=c.execute('SELECT COUNT(*) FROM events WHERE lat IS NOT NULL AND lon IS NOT NULL').fetchone()[0]

        gz=self.gazetteer.status(); hg=self.historical.status()
        return {'records':len(rows),'unique_objects':len({r['sha256'] for r in rows}),'bytes':sum(r['size_bytes'] for r in rows),'orphans':sum(r['record_id'] not in connected for r in rows),'derived_artifacts':der,'entities':ents,'installed_intelligence_packages':pkgs,'claims':claims,'notebook_entries':notes,'contradictions':contradictions,'temporal_geo_events':events,'mapped_events':mapped_events,'gazetteer_state':gz.get('state'),'gazetteer_places':gz.get('places',0),'gazetteer_aliases':gz.get('aliases',0),'gazetteer_historical_aliases':gz.get('historical_aliases',0),'historical_geo_layers':hg.get('layers',0),'historical_geo_features':hg.get('features',0),'historical_geo_sources':hg.get('sources',0),'pending_ocr':len(self.pending_ocr()),'ledger_entries':self.ledger_count()}
    def verify(self,objects=True,packages=True):
        errs=[]; prev='0'*64; count=0
        if self.ledger_path.exists():
            for count,line in enumerate(self.ledger_path.read_text('utf-8').splitlines(),1):
                e=json.loads(line); stored=e.pop('entry_hash'); calc=hashlib.sha256(json.dumps(e,sort_keys=True,separators=(',',':')).encode()).hexdigest()
                if e['previous_hash']!=prev: errs.append(f'ledger {count}: previous hash mismatch')
                if calc!=stored: errs.append(f'ledger {count}: entry hash mismatch')
                prev=stored
        checked=0
        if objects:
            for r in self.search():
                checked+=1; p=self.root/r['stored_path']
                if not p.exists(): errs.append('missing '+r['stored_path'])
                elif sha256_file(p)!=r['sha256']: errs.append('hash mismatch '+r['record_id'])
        if packages:
            for p in list(self.models_dir.glob('*.azm'))+list(self.kits_dir.glob('*.azk')):
                v=AzielPackage.verify(p)
                if not v.ok: errs.extend(f'{p.name}: {x}' for x in v.errors)
        gz_checked=0
        for src in self.gazetteer.sources():
            p=self.gazetteer.raw_dir/src['filename']
            if p.exists():
                gz_checked+=1
                if sha256_file(p)!=src['sha256']: errs.append('gazetteer source hash mismatch '+src['filename'])
        hv=self.historical.verify(); errs.extend(hv.get('errors',[]))
        return {'ok':not errs,'checked_records':checked,'checked_ledger_entries':count,'checked_gazetteer_sources':gz_checked,'checked_historical_geo_sources':hv.get('checked_sources',0),'ledger_head':prev,'errors':errs,'verified_utc':utc_now()}
    def export_xlsx(self,destination=None):
        self._assert_writable()
        d=Path(destination) if destination else self.exports/f'aziel_library_{datetime.now():%Y%m%d_%H%M%S}.xlsx'; rec=self.search(); tree=[]
        for p in self.tree()['children']:
            for s in p['children']:
                for x in s['children']: tree.append([p['name'],s['name'],x['name'],x['connections'],x['reason']])
        events=self.events(); contexts=[]
        for e in events:
            for h in self.historical.context_for_point(e['lat'],e['lon'],e['event_date']) if e.get('lat') is not None and e.get('lon') is not None else []:
                contexts.append([e['event_id'],e['event_date'],e['place_name'],h['layer_name'],h['name'],h['jurisdiction'],h['affiliation'],h['valid_from'],h['valid_to'],h['confidence'],h['source_name'],h['license']])
        hlayers=self.historical.layers(); pk=self.packages()
        write_xlsx(d,[('Master Corpus',[['Record ID','Title','Subject','Branch','Class','Extraction','SHA-256','Stored Original','Why']]+[[r['record_id'],r['original_name'],r['primary_subject'],r['secondary_subject'],r['media_class'],r['extraction_status'],r['sha256'],r['stored_path'],r['classification_reason']] for r in rec]),('Corpus Tree',[['Subject','Branch','Document','Connections','Reason']]+tree),('Timeline',[['Date','Record ID','Title','Subject']]+[[x['date'],x['record_id'],x['title'],x['subject']] for x in self.timeline()]),('Temporal Map',[['Event ID','Date','Precision','Place','Latitude','Longitude','Confidence','Source','Status','Record ID','Title','Description','Locator']]+[[x['event_id'],x['event_date'],x['date_precision'],x['place_name'],x['lat'],x['lon'],x['confidence'],x['source'],x['status'],x['record_id'],x['title'],x['description'],x['locator']] for x in events]),('Historical Context',[['Event ID','Date','Place','Layer','Historical Feature','Jurisdiction','Affiliation','Valid From','Valid To','Confidence','Source','License']]+contexts),('Historical Layers',[['Layer ID','Name','Valid From','Valid To','Features','Confidence','Source','License','SHA-256']]+[[x['layer_id'],x['name'],x['valid_from'],x['valid_to'],x['feature_count'],x['confidence'],x['source_name'],x['license'],x['source_sha256']] for x in hlayers]),('Intelligence',[['ID','Kind','Type','Version','SHA-256','Status']]+[[x['package_id'],x['kind'],x['package_type'],x['version'],x['sha256'],x['status']] for x in pk]),('Claims',[['Claim ID','Statement','Confidence','Status','Evidence']]+[[x['claim_id'],x['statement'],x['confidence'],x['status'],x['evidence_count']] for x in self.claims()]),('Notebook',[['Entry ID','Title','Type','Confidence','Status','Body']]+[[x['entry_id'],x['title'],x['entry_type'],x['confidence'],x['status'],x['body']] for x in self.notebooks()]),('Health',[['Metric','Value']]+[[k,json.dumps(v) if isinstance(v,dict) else v] for k,v in self.health().items()])]); self._ledger('EXPORT_XLSX',{'path':str(d),'sha256':sha256_file(d)}); return d
    def export_pdf(self,destination=None):
        self._assert_writable()
        d=Path(destination) if destination else self.exports/f'aziel_library_{datetime.now():%Y%m%d_%H%M%S}.pdf'; lines=['CORPUS HEALTH',json.dumps(self.health(),sort_keys=True),'','INTELLIGENCE PACKAGES']+[f"{x['kind']} {x['package_id']} {x['package_type']} v{x['version']} {x['status']} {x['sha256']}" for x in self.packages()]+['','CORPUS TREE']
        for p in self.tree()['children']:
            lines.append(p['name'])
            for s in p['children']:
                lines.append('  '+s['name'])
                for x in s['children']: lines.append(f"    {x['name']} | links={x['connections']} | {x['reason']}")
        lines += ['','TEMPORAL–GEOSPATIAL EVENTS'] + [f"{x['event_date']} | {x['place_name']} | lat={x['lat']} lon={x['lon']} | conf={x['confidence']:.2f} | {x['source']} | {x['title']}" for x in self.events()]
        lines += ['','HISTORICAL GEOGRAPHIC LAYERS'] + [f"{x['name']} | {x['valid_from']}..{x['valid_to']} | features={x['feature_count']} | source={x['source_name']} | license={x['license']}" for x in self.historical.layers()]
        for e in self.events():
            if e.get('lat') is None or e.get('lon') is None: continue
            for h in self.historical.context_for_point(e['lat'],e['lon'],e['event_date']): lines.append(f"  CONTEXT {e['event_id']} | {h['layer_name']} | {h['jurisdiction']} | {h['affiliation']} | {h['source_name']}")
        write_pdf(d,'Aziel Digital Library - Preservation Report',lines); self._ledger('EXPORT_PDF',{'path':str(d),'sha256':sha256_file(d)}); return d
