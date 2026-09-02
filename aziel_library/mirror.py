from __future__ import annotations
import hashlib
import json
import os
import shutil
import sqlite3
import stat
import time
from datetime import datetime, timezone


from pathlib import Path
def utc_now() -> str:


    return datetime.now(timezone.utc).isoformat(timespec='seconds')
def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)


    return h.hexdigest()
def sqlite_backup(src: Path, dst: Path, sanitize_master: bool = False) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(dst.name + '.next')
    tmp.unlink(missing_ok=True)
    src_conn = sqlite3.connect(src, timeout=60)
    dst_conn = sqlite3.connect(tmp, timeout=60)
    try:
        src_conn.backup(dst_conn)
        if sanitize_master:
            # Never publish workstation/source filesystem paths. Relative immutable
            # object paths remain because they are needed to serve preserved originals.
            dst_conn.execute("UPDATE records SET original_path='' ")
            dst_conn.commit()
    finally:
        dst_conn.close(); src_conn.close()


    os.replace(tmp, dst)
def _copy_or_link(src: Path, dst: Path, mode: str) -> bool:
    """
    Copy one immutable payload if the destination does not already have it."""
    if dst.exists() and dst.is_file() and dst.stat().st_size == src.stat().st_size:
        # Immutable object/derived filenames are content identities; fixed-name files
        # such as exports and DB-adjacent receipts are compared by hash.
        looks_content_addressed = len(src.stem) >= 32 and all(c in '0123456789abcdefABCDEF-' for c in src.stem)
        if looks_content_addressed or sha256_file(src) == sha256_file(dst):
            return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(dst.name + f'.partial.{os.getpid()}')
    tmp.unlink(missing_ok=True)
    linked=False
    if mode == 'hardlink':
        try:
            os.link(src, tmp); linked=True
        except OSError:
            shutil.copy2(src, tmp)
    else:
        shutil.copy2(src, tmp)
    os.replace(tmp, dst)
    # chmod on a hardlink would also change the master inode. Read-only mirror
    # enforcement is provided by HTTP write rejection + SQLite mode=ro.
    if not linked:
        try: dst.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
        except OSError: pass


    return True
def sync_tree(src: Path, dst: Path, mode: str = 'copy', skip_names: set[str] | None = None) -> dict:
    skip_names = skip_names or set()
    copied = skipped = 0
    if not src.exists():
        return {'copied': 0, 'skipped': 0}
    for p in src.rglob('*'):
        if not p.is_file() or p.name in skip_names or '.partial' in p.name:
            continue
        rel = p.relative_to(src)
        if _copy_or_link(p, dst / rel, mode): copied += 1
        else: skipped += 1

    return {'copied': copied, 'skipped': skipped}
def publish_mirror(vault, destination: str | Path, mode: str = 'copy', include_source_dumps: bool = False) -> dict:

    """
    Publish a consistent, sanitized, read-only research snapshot.
    Object payloads are synchronized before the database is atomically replaced, so
    readers never see a new DB that references files which have not arrived yet."""
    if getattr(vault, 'readonly', False):
        raise PermissionError('cannot publish a mirror from a mirror')
    if mode not in {'copy', 'hardlink'}:
        raise ValueError('mirror mode must be copy or hardlink')
    dest = Path(destination).expanduser().resolve()
    if dest == vault.root or vault.root in dest.parents:
        # A mirror nested inside the master would be recursively ingested by a later
        # whole-vault bulk import and is too easy to delete accidentally.
        raise ValueError('mirror destination must be outside the master vault')

    dest.mkdir(parents=True, exist_ok=True)
    # Freeze public exports on the master first. They are then copied as immutable
    # artifacts and can be downloaded by mirror visitors without causing writes.
    pub_tmp = vault.exports / 'published_mirror'
    pub_tmp.mkdir(parents=True, exist_ok=True)
    xlsx = vault.export_xlsx(pub_tmp / 'aziel_corpus_index.xlsx')

    pdf = vault.export_pdf(pub_tmp / 'aziel_corpus_report.pdf')
    with vault._write_lock:
        stats = {}
        stats['objects'] = sync_tree(vault.objects, dest / 'objects', mode)
        stats['derived'] = sync_tree(vault.derived, dest / 'derived', mode)
        stats['models'] = sync_tree(vault.models_dir, dest / 'models', mode)
        stats['kits'] = sync_tree(vault.kits_dir, dest / 'kits', mode)

        stats['exports'] = sync_tree(pub_tmp, dest / 'published_exports', mode)
        # Auxiliary geographic stores. The runtime DBs are backed up atomically.
        gz_dst = dest / 'gazetteers'; gz_dst.mkdir(parents=True, exist_ok=True)
        hg_dst = dest / 'historical_geography'; hg_dst.mkdir(parents=True, exist_ok=True)
        if include_source_dumps:
            stats['gazetteer_sources'] = sync_tree(vault.gazetteers_dir / 'raw', gz_dst / 'raw', mode)
        else:
            (gz_dst / 'raw').mkdir(exist_ok=True)
            stats['gazetteer_sources'] = {'copied': 0, 'skipped': 0}

        stats['historical_files'] = sync_tree(vault.historical_dir, hg_dst, mode, {'historical_geography.sqlite3'})
        if vault.gazetteer.db_path.exists():
            sqlite_backup(vault.gazetteer.db_path, gz_dst / 'world_gazetteer.sqlite3')
        if vault.historical.db_path.exists():

            sqlite_backup(vault.historical.db_path, hg_dst / 'historical_geography.sqlite3')
        # Main DB is swapped after all referenced immutable content is present.
        sqlite_backup(vault.db_path, dest / 'library.sqlite3', sanitize_master=True)
        if vault.ledger_path.exists():
            dstl = dest / 'ledger.jsonl'
            dstl.unlink(missing_ok=True)
            shutil.copy2(vault.ledger_path, dstl)
        health = vault.health()
        verify = vault.verify(objects=False, packages=False)
        manifest = {'format': 'AZIEL_READ_ONLY_MIRROR_V1','app_version': '2.6.2','published_utc': utc_now(),'master_schema_version': '7.1','source_ledger_entries': health.get('ledger_entries', 0),'source_ledger_head': verify.get('ledger_head', ''),'records': health.get('records', 0),'unique_objects': health.get('unique_objects', 0),'bytes': health.get('bytes', 0),'copy_mode': mode,'includes_gazetteer_source_dumps': bool(include_source_dumps),'database_sha256': sha256_file(dest / 'library.sqlite3'),'public_xlsx_sha256': sha256_file(dest / 'published_exports' / 'aziel_corpus_index.xlsx'),'public_pdf_sha256': sha256_file(dest / 'published_exports' / 'aziel_corpus_report.pdf'),'sync_stats': stats,}
        mp = dest / 'mirror_manifest.json'
        mp.unlink(missing_ok=True)
        mp.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding='utf-8')
        try:
            for p in [dest / 'library.sqlite3', dest / 'ledger.jsonl', mp,gz_dst / 'world_gazetteer.sqlite3', hg_dst / 'historical_geography.sqlite3']:
                if p.exists(): p.chmod(stat.S_IRUSR | stat.S_IRGRP | stat.S_IROTH)
        except OSError:

            pass
    vault._ledger('MIRROR_PUBLISH', {'destination': str(dest), 'records': manifest['records'],'database_sha256': manifest['database_sha256'], 'copy_mode': mode,})

    return manifest
def read_manifest(root: str | Path) -> dict:
    p = Path(root) / 'mirror_manifest.json'
    if not p.exists(): return {}
    try: return json.loads(p.read_text('utf-8'))
    except Exception: return {}
