from __future__ import annotations
import hashlib
import json
import os
import shutil
import sqlite3
import uuid
import zipfile
from contextlib import contextmanager
from datetime import datetime, timezone

from pathlib import Path
HIST_SCHEMA_VERSION = '1.0'


AZH_MAGIC = 'AZIEL_HISTORICAL_GEOGRAPHY_KIT'
def utc_now():


    return datetime.now(timezone.utc).isoformat(timespec='seconds')
def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for b in iter(lambda: f.read(1024 * 1024), b''):
            h.update(b)


    return h.hexdigest()
def _date_floor(value: str | int | None) -> str:
    if value is None:
        return ''
    s = str(value).strip()
    if not s:
        return ''
    if len(s) >= 10 and s[4] == '-' and s[7] == '-':
        return s[:10]
    if len(s) >= 7 and s[4] == '-':
        return s[:7] + '-01'
    if len(s) >= 4 and (s[:4].lstrip('-').isdigit() or (s.startswith('-') and s[1:5].isdigit())):
        # Current corpus date grammar is CE YYYY; preserve negative/BCE values in raw props,
        # but historical layer filtering currently guarantees ordinary ISO years only.
        try:
            y = int(s[:4])
            if y >= 0:
                return f'{y:04d}-01-01'
        except ValueError:
            pass


    return s
def _date_ceiling(value: str | int | None) -> str:
    if value is None:
        return ''
    s = str(value).strip()
    if not s:
        return ''
    if len(s) >= 10 and s[4] == '-' and s[7] == '-':
        return s[:10]
    if len(s) >= 7 and s[4] == '-':
        return s[:7] + '-31'
    try:
        y = int(s[:4])
        if y >= 0:
            return f'{y:04d}-12-31'
    except ValueError:
        pass


    return s
def _prop(props: dict, *names, default=''):
    low = {str(k).lower(): v for k, v in (props or {}).items()}
    for n in names:
        if n.lower() in low and low[n.lower()] not in (None, ''):
            return low[n.lower()]


    return default
def _iter_coords(geom: dict):
    t = (geom or {}).get('type')
    c = (geom or {}).get('coordinates') or []
    if t == 'Polygon':
        for ring in c:
            for p in ring:

                if len(p) >= 2:
                    yield float(p[0]), float(p[1])
    elif t == 'MultiPolygon':
        for poly in c:
            for ring in poly:
                for p in ring:
                    if len(p) >= 2:


                        yield float(p[0]), float(p[1])
def _bbox(geom: dict):
    pts = list(_iter_coords(geom))
    if not pts:
        raise ValueError('historical feature requires Polygon or MultiPolygon coordinates')
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    if any(not (-180 <= x <= 180 and -90 <= y <= 90) for x, y in pts):
        raise ValueError('historical feature coordinates outside longitude/latitude range')


    return min(xs), min(ys), max(xs), max(ys)
def _point_in_ring(lon: float, lat: float, ring) -> bool:
    inside = False
    n = len(ring)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = float(ring[i][0]), float(ring[i][1])
        xj, yj = float(ring[j][0]), float(ring[j][1])
        # Boundary-inclusive horizontal ray test.
        if ((yi > lat) != (yj > lat)):
            xint = (xj - xi) * (lat - yi) / ((yj - yi) or 1e-30) + xi
            if lon <= xint:
                inside = not inside
        j = i


    return inside
def point_in_geometry(lon: float, lat: float, geom: dict) -> bool:
    t = (geom or {}).get('type')
    coords = (geom or {}).get('coordinates') or []
    polygons = [coords] if t == 'Polygon' else coords if t == 'MultiPolygon' else []
    for poly in polygons:
        if not poly:
            continue
        if _point_in_ring(lon, lat, poly[0]) and not any(_point_in_ring(lon, lat, hole) for hole in poly[1:]):
            return True


    return False
class HistoricalGeography:

    """
    Source-aware temporal polygon store for historical geographic context.
    Layers can overlap and disagree. The engine never collapses competing sources into

    one asserted boundary. Every active feature retains source, license, attribution,validity period and confidence."""
    def __init__(self, root: str | Path, readonly: bool = False):
        self.root = Path(root); self.readonly = bool(readonly)
        self.raw_dir = self.root / 'raw'; self.kits_dir = self.root / 'kits'; self.db_path = self.root / 'historical_geography.sqlite3'
        if self.readonly:
            if not self.db_path.exists(): raise FileNotFoundError(f'historical geography database not found: {self.db_path}')
        else:

            self.root.mkdir(parents=True, exist_ok=True); self.raw_dir.mkdir(exist_ok=True); self.kits_dir.mkdir(exist_ok=True); self._init_db()
    @contextmanager
    def connect(self):
        c = sqlite3.connect(self.db_path.resolve().as_uri()+'?mode=ro', uri=True, timeout=60) if self.readonly else sqlite3.connect(self.db_path, timeout=60)
        c.row_factory = sqlite3.Row; c.execute('PRAGMA busy_timeout=60000')
        try:
            yield c
            if not self.readonly: c.commit()
        except Exception:
            if not self.readonly: c.rollback()
            raise
        finally:

            c.close()
    def _init_db(self):
        with self.connect() as c:

            c.executescript('''
        PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE IF NOT EXISTS sources(source_id TEXT PRIMARY KEY, filename TEXT, stored_path TEXT, sha256 TEXT, bytes INTEGER,source_name TEXT, source_url TEXT, license TEXT, attribution TEXT, imported_utc TEXT); CREATE TABLE IF NOT EXISTS layers(layer_id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',valid_from TEXT DEFAULT '', valid_to TEXT DEFAULT '', source_id TEXT NOT NULL,confidence REAL DEFAULT 1.0, status TEXT DEFAULT 'READY', imported_utc TEXT); CREATE INDEX IF NOT EXISTS idx_layers_dates ON layers(valid_from,valid_to); CREATE TABLE IF NOT EXISTS features(feature_id TEXT PRIMARY KEY, layer_id TEXT NOT NULL, name TEXT NOT NULL,jurisdiction TEXT DEFAULT '', affiliation TEXT DEFAULT '', feature_type TEXT DEFAULT 'POLITY',valid_from TEXT DEFAULT '', valid_to TEXT DEFAULT '', min_lon REAL, min_lat REAL,max_lon REAL, max_lat REAL, geometry_json TEXT NOT NULL, properties_json TEXT DEFAULT '{}',confidence REAL DEFAULT 1.0); CREATE INDEX IF NOT EXISTS idx_features_layer ON features(layer_id); CREATE INDEX IF NOT EXISTS idx_features_dates ON features(valid_from,valid_to); CREATE INDEX IF NOT EXISTS idx_features_bbox ON features(min_lon,max_lon,min_lat,max_lat);

''')
            c.execute("INSERT OR REPLACE INTO metadata VALUES('schema_version',?)", (HIST_SCHEMA_VERSION,))
    def status(self):
        with self.connect() as c:
            layers = c.execute('SELECT COUNT(*) FROM layers').fetchone()[0]
            features = c.execute('SELECT COUNT(*) FROM features').fetchone()[0]
            sources = c.execute('SELECT COUNT(*) FROM sources').fetchone()[0]
            row = c.execute("SELECT MIN(NULLIF(valid_from,'')),MAX(NULLIF(valid_to,'')) FROM features").fetchone()
        ymin = str(row[0])[:4] if row and row[0] else ''
        ymax = str(row[1])[:4] if row and row[1] else ''

        return {'state': 'READY' if features else 'EMPTY', 'layers': layers, 'features': features,'sources': sources, 'min_year': ymin, 'max_year': ymax,'db_path': str(self.db_path), 'db_bytes': self.db_path.stat().st_size if self.db_path.exists() else 0}
    def sources(self):
        with self.connect() as c:

            return [dict(r) for r in c.execute('SELECT * FROM sources ORDER BY imported_utc DESC')]
    def layers(self):
        with self.connect() as c:


            return [dict(r) for r in c.execute('''
        SELECT l.*,s.source_name,s.source_url,s.license,s.attribution,s.sha256 source_sha256,(SELECT COUNT(*) FROM features f WHERE f.layer_id=l.layer_id) feature_count FROM layers l JOIN sources s USING(source_id) ORDER BY l.valid_from,l.name''')]
    def _preserve_source(self, path: Path, source_name: str, source_url: str, license_name: str, attribution: str):
        digest = sha256_file(path)
        dest = self.raw_dir / f'{digest[:16]}_{path.name}'
        if not dest.exists():
            shutil.copy2(path, dest)
        source_id = 'AZHGSRC-' + digest[:12].upper()
        with self.connect() as c:
            c.execute('INSERT OR REPLACE INTO sources VALUES(?,?,?,?,?,?,?,?,?,?)',(source_id, path.name, str(dest.relative_to(self.root)), digest, path.stat().st_size,source_name or path.stem, source_url or '', license_name or 'UNSPECIFIED',attribution or source_name or path.stem, utc_now()))

        return source_id, digest, dest
    def import_geojson(self, path: str | Path, *, layer_name: str = '', valid_from: str = '', valid_to: str = '',source_name: str = '', source_url: str = '', license_name: str = 'UNSPECIFIED',attribution: str = '', confidence: float = 1.0, description: str = ''):
        path = Path(path).resolve()
        fc = json.loads(path.read_text('utf-8'))
        if fc.get('type') != 'FeatureCollection':
            raise ValueError('historical geography import requires a GeoJSON FeatureCollection')
        feats = fc.get('features') or []
        if not feats:
            raise ValueError('historical geography GeoJSON has no features')
        source_id, digest, preserved = self._preserve_source(path, source_name or layer_name, source_url, license_name, attribution)
        lname = layer_name or str((fc.get('name') or path.stem))
        lid_seed = '|'.join([digest, lname, str(valid_from), str(valid_to)])
        layer_id = 'AZHGLYR-' + hashlib.sha256(lid_seed.encode()).hexdigest()[:12].upper()
        rows = []
        for i, f in enumerate(feats):
            geom = f.get('geometry') or {}
            if geom.get('type') not in {'Polygon', 'MultiPolygon'}:
                continue
            minx, miny, maxx, maxy = _bbox(geom)
            p = f.get('properties') or {}
            name = str(_prop(p, 'name', 'NAME', 'label', 'title', default=f'Feature {i+1}'))
            jurisdiction = str(_prop(p, 'jurisdiction', 'sovereign', 'state', 'country', 'admin', default=name))
            affiliation = str(_prop(p, 'affiliation', 'empire', 'realm', 'parent', 'alliance', default=''))
            ftype = str(_prop(p, 'feature_type', 'type', 'status', 'kind', default='POLITY'))
            vf_raw = _prop(p, 'valid_from', 'start_date', 'start', 'from', 'year_start', 'begin', default=valid_from)
            vt_raw = _prop(p, 'valid_to', 'end_date', 'end', 'to', 'year_end', 'finish', default=valid_to)

            vf = _date_floor(vf_raw)
            vt = _date_ceiling(vt_raw)
            conf = float(_prop(p, 'confidence', default=confidence) or confidence)
            fid_seed = json.dumps([layer_id, i, name, vf, vt, geom], sort_keys=True, separators=(',', ':'))
            fid = 'AZHGFT-' + hashlib.sha256(fid_seed.encode()).hexdigest()[:14].upper()
            rows.append((fid, layer_id, name, jurisdiction, affiliation, ftype, vf, vt, minx, miny, maxx, maxy,json.dumps(geom, separators=(',', ':')), json.dumps(p, sort_keys=True), conf))
        if not rows:
            raise ValueError('no Polygon/MultiPolygon features were importable')
        with self.connect() as c:
            c.execute('INSERT OR REPLACE INTO layers VALUES(?,?,?,?,?,?,?,?,?)',(layer_id, lname, description, _date_floor(valid_from), _date_ceiling(valid_to), source_id,float(confidence), 'READY', utc_now()))
            c.execute('DELETE FROM features WHERE layer_id=?', (layer_id,))
            c.executemany('INSERT INTO features VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', rows)

        return {'layer_id': layer_id, 'name': lname, 'features': len(rows), 'source_id': source_id,'source_sha256': digest, 'preserved_source': str(preserved), 'valid_from': valid_from, 'valid_to': valid_to}
    def create_kit(self, geojson_path: str | Path, destination: str | Path, *, layer_name: str = '',valid_from: str = '', valid_to: str = '', source_name: str = '', source_url: str = '',license_name: str = 'UNSPECIFIED', attribution: str = '', confidence: float = 1.0,description: str = ''):
        src = Path(geojson_path).resolve()
        digest = sha256_file(src)
        manifest = {'magic': AZH_MAGIC, 'format_version': '1.0', 'created_utc': utc_now(),'layer_name': layer_name or src.stem, 'valid_from': valid_from, 'valid_to': valid_to,'source_name': source_name or src.stem, 'source_url': source_url, 'license': license_name,'attribution': attribution or source_name or src.stem, 'confidence': float(confidence),'description': description, 'payload': 'layer.geojson', 'payload_sha256': digest,}
        dest = Path(destination)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(dest, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('manifest.json', json.dumps(manifest, sort_keys=True, indent=2))
            z.write(src, 'layer.geojson')

        return {'path': str(dest), 'sha256': sha256_file(dest), 'manifest': manifest}
    def import_kit(self, path: str | Path):
        p = Path(path).resolve()
        with zipfile.ZipFile(p) as z:
            manifest = json.loads(z.read('manifest.json'))
            if manifest.get('magic') != AZH_MAGIC:
                raise ValueError('not an Aziel Historical Geography Kit')
            payload = manifest.get('payload', 'layer.geojson')
            raw = z.read(payload)
            if hashlib.sha256(raw).hexdigest() != manifest.get('payload_sha256'):
                raise ValueError('AZH payload hash mismatch')
            tmp = self.root / ('.import_' + uuid.uuid4().hex + '.geojson')
            tmp.write_bytes(raw)
        try:
            result = self.import_geojson(tmp, layer_name=manifest.get('layer_name', ''),
                valid_from=manifest.get('valid_from', ''), valid_to=manifest.get('valid_to', ''),
                source_name=manifest.get('source_name', ''), source_url=manifest.get('source_url', ''),
                license_name=manifest.get('license', 'UNSPECIFIED'), attribution=manifest.get('attribution', ''),
                confidence=float(manifest.get('confidence', 1.0)), description=manifest.get('description', ''))
            kit_digest = sha256_file(p)
            kit_dest = self.kits_dir / f'{kit_digest[:16]}_{p.name}'
            if not kit_dest.exists(): shutil.copy2(p, kit_dest)
            result['kit_sha256'] = kit_digest
            result['kit_path'] = str(kit_dest)
            return result
        finally:

            tmp.unlink(missing_ok=True)
    def import_path(self, path: str | Path, **kwargs):
        p = Path(path)
        if p.suffix.lower() == '.azh':
            return self.import_kit(p)

        return self.import_geojson(p, **kwargs)
    def active_features(self, date: str, limit: int = 12000):
        d = _date_floor(date)
        if not d:
            return []
        with self.connect() as c:
            rows = c.execute('''
        SELECT f.*,l.name layer_name,l.source_id,s.source_name,s.source_url,s.license,s.attribution FROM features f JOIN layers l USING(layer_id) JOIN sources s USING(source_id)WHERE (f.valid_from='' OR f.valid_from<=?) AND (f.valid_to='' OR f.valid_to>=?)ORDER BY f.confidence DESC,l.name,f.name LIMIT ?''', (d, d, int(limit))).fetchall()

        return [dict(r) for r in rows]
    def active_geojson(self, date: str, limit: int = 12000):
        features = []
        for r in self.active_features(date, limit):

            props = json.loads(r['properties_json'] or '{}')
            props.update({'aziel_feature_id': r['feature_id'], 'aziel_layer_id': r['layer_id'],'name': r['name'], 'jurisdiction': r['jurisdiction'], 'affiliation': r['affiliation'],'feature_type': r['feature_type'], 'valid_from': r['valid_from'], 'valid_to': r['valid_to'],'confidence': r['confidence'], 'source_name': r['source_name'], 'source_url': r['source_url'],'license': r['license'], 'attribution': r['attribution']})
            features.append({'type': 'Feature', 'id': r['feature_id'], 'properties': props,'geometry': json.loads(r['geometry_json'])})

        return {'type': 'FeatureCollection', 'date': date, 'features': features}
    def context_for_point(self, lat: float, lon: float, date: str, limit: int = 20):
        lat, lon = float(lat), float(lon)
        d = _date_floor(date)
        if not d:
            return []
        with self.connect() as c:
            rows = c.execute('''
        SELECT f.*,l.name layer_name,l.source_id,s.source_name,s.source_url,s.license,s.attribution FROM features f JOIN layers l USING(layer_id) JOIN sources s USING(source_id)WHERE min_lon<=? AND max_lon>=? AND min_lat<=? AND max_lat>=?AND (f.valid_from='' OR f.valid_from<=?) AND (f.valid_to='' OR f.valid_to>=?)ORDER BY f.confidence DESC,l.name LIMIT 250''', (lon, lon, lat, lat, d, d)).fetchall()
        out = []
        for r in rows:
            geom = json.loads(r['geometry_json'])
            if point_in_geometry(lon, lat, geom):
                out.append({'feature_id': r['feature_id'], 'layer_id': r['layer_id'], 'layer_name': r['layer_name'],'name': r['name'], 'jurisdiction': r['jurisdiction'], 'affiliation': r['affiliation'],'feature_type': r['feature_type'], 'valid_from': r['valid_from'], 'valid_to': r['valid_to'],'confidence': r['confidence'], 'source_id': r['source_id'], 'source_name': r['source_name'],'source_url': r['source_url'], 'license': r['license'], 'attribution': r['attribution']})
                if len(out) >= limit:
                    break

        return out
    def verify(self):
        errors = []
        checked = 0
        for s in self.sources():
            p = self.root / s['stored_path']
            if not p.exists():
                errors.append('missing historical geography source ' + s['stored_path'])
                continue
            checked += 1
            if sha256_file(p) != s['sha256']:
                errors.append('historical geography source hash mismatch ' + s['filename'])
        return {'ok': not errors, 'checked_sources': checked, 'errors': errors}
