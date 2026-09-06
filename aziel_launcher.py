from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request

import webbrowser
APP_VERSION = '2.7.0'
DEFAULT_PORT = 8765


MAX_PORT = 8785
def app_root() -> Path:


    return Path(__file__).resolve().parent
def python_ok() -> bool:


    return sys.version_info >= (3, 11)
def verify_distribution(root: Path) -> tuple[bool, str]:
    manifest = root / 'PACKAGE_SHA256SUMS.txt'
    if not manifest.exists():
        return False, 'PACKAGE_SHA256SUMS.txt is missing.'
    import hashlib
    for raw in manifest.read_text('utf-8').splitlines():
        raw = raw.strip()
        if not raw or raw.startswith('#'):
            continue
        try:
            expected, rel = raw.split('  ', 1)
        except ValueError:
            return False, f'Malformed manifest line: {raw[:120]}'
        path = root / rel
        if not path.is_file():
            return False, f'Missing distribution file: {rel}'
        h = hashlib.sha256()
        with path.open('rb') as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b''):
                h.update(chunk)
        if h.hexdigest().lower() != expected.lower():
            return False, f'Integrity mismatch: {rel}'


    return True, 'Distribution verified.'
def port_open(host: str, port: int, timeout: float = .25) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)


        return s.connect_ex((host, port)) == 0
def looks_like_aziel(host: str, port: int, expected_mode: str | None = None) -> bool:
    probe_host = '127.0.0.1' if host in {'0.0.0.0','::','[::]'} else host
    try:
        with urllib.request.urlopen(f'http://{probe_host}:{port}/', timeout=1.2) as r:
            body = r.read(16384).decode('utf-8', 'replace')
            if 'Aziel Digital Library' not in body: return False
            if expected_mode=='master': return 'MASTER · WRITABLE' in body
            if expected_mode=='mirror': return 'PUBLIC MIRROR · READ ONLY' in body
            return True
    except Exception:


        return False
def choose_port(host: str, preferred: int, expected_mode: str | None = None) -> tuple[int, bool]:
    upper = max(MAX_PORT, preferred + 20)
    probe_host = '127.0.0.1' if host in {'0.0.0.0','::','[::]'} else host
    for port in range(preferred, upper + 1):
        if not port_open(probe_host, port):
            return port, False
        if looks_like_aziel(host, port, expected_mode):
            return port, True


    raise RuntimeError(f'No free local port found in {preferred}-{upper}.')
def run_bootstrap_once(root: Path, runtime_home: Path, repair: bool = False) -> bool:
    """
    Make OCR a verified first-run capability, not a best-effort install."""
    marker = runtime_home / f'.ocr_verified_v{APP_VERSION}.json'
    runtime_home.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy(); env['AZIEL_RUNTIME_HOME'] = str(runtime_home)
    log_path = runtime_home / 'launcher_bootstrap.log'
    from aziel_library.external import ExternalRuntime, BootstrapManager
    rt=ExternalRuntime(runtime_home)
    if marker.exists() and not repair:
        try:
            test=rt.self_test_ocr(write_receipt=True)
            if test.get('ok'): return True
        except Exception:
            pass
    stamp = time.strftime('%Y-%m-%d %H:%M:%S')
    try:
        result=BootstrapManager(runtime_home).bootstrap(profile='ocr',auto=True,dry_run=False,download_models=True)
        with log_path.open('a',encoding='utf-8') as log:
            log.write(f'\n[{stamp}] verified OCR bootstrap\n')
            log.write(json.dumps(result,indent=2,default=str)+'\n')
        if result.get('ocr_complete'):
            marker.write_text(json.dumps({'verified_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'self_test':result.get('ocr_self_test',{})},indent=2),encoding='utf-8')
            return True
        marker.unlink(missing_ok=True)
        return False
    except Exception as exc:
        marker.unlink(missing_ok=True)
        with log_path.open('a',encoding='utf-8') as log:
            log.write(f'\n[{stamp}] OCR bootstrap exception={exc!r}\n')



        return False
def ensure_geography_ready(vault: Path, runtime_home: Path, profile: str = 'lite') -> bool:

    """
    Install a baseline world gazetteer automatically and re-index existing records.
    The baseline uses the GeoNames cities1000 profile plus aliases. Full geography can
    still be installed from the Gazetteer page. Failure never blocks the private vault,but it is logged and retried on a later launch until a READY gazetteer exists."""
    runtime_home.mkdir(parents=True,exist_ok=True)
    log_path = runtime_home / 'launcher_geography.log'
    stamp = time.strftime('%Y-%m-%d %H:%M:%S')
    try:
        from aziel_library import AzielLibrary
        lib=AzielLibrary(vault)
        status=lib.gazetteer_status()
        if status.get('state')=='READY' and int(status.get('places') or 0)>0:
            return True
        with log_path.open('a',encoding='utf-8') as log:
            log.write(f'\n[{stamp}] installing baseline world gazetteer profile={profile}\n')
        result=lib.install_world_gazetteer(profile,progress=lambda x: print('[gazetteer]',x,flush=True),reindex=True)
        ok=result.get('state')=='READY' and int(result.get('places') or 0)>0
        with log_path.open('a',encoding='utf-8') as log:
            log.write(json.dumps(result,indent=2,default=str)+'\n')
        return ok
    except Exception as exc:
        runtime_home.mkdir(parents=True,exist_ok=True)
        with log_path.open('a',encoding='utf-8') as log:
            log.write(f'\n[{stamp}] gazetteer bootstrap exception={exc!r}\n')

        return False
def write_launcher_receipt(runtime_home: Path, vault: Path, host: str, port: int, mode: str) -> None:
    runtime_home.mkdir(parents=True, exist_ok=True)
    receipt = {'app_version': APP_VERSION,'python': sys.version,'executable': sys.executable,'vault': str(vault),'host': host,'port': port,'mode': mode,'started_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),}


    (runtime_home / 'last_launch.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
def main() -> int:
    p = argparse.ArgumentParser(description='Aziel Digital Library portable launcher')
    p.add_argument('--vault', default='')
    p.add_argument('--host', default='127.0.0.1')
    p.add_argument('--port', type=int, default=DEFAULT_PORT)
    p.add_argument('--repair-runtime', action='store_true')
    p.add_argument('--mode', choices=['master','mirror'], default='master')
    p.add_argument('--skip-bootstrap', action='store_true')
    p.add_argument('--skip-gazetteer', action='store_true', help='Skip automatic baseline world gazetteer setup.')
    p.add_argument('--gazetteer-profile', choices=['lite','full'], default=os.environ.get('AZIEL_GAZETTEER_PROFILE','lite'))
    p.add_argument('--no-browser', action='store_true')

    args = p.parse_args()
    if not python_ok():
        print('Aziel Digital Library requires Python 3.11 or newer.', file=sys.stderr)
        return 2
    root = app_root()
    os.chdir(root)
    default_vault = root / ('aziel_library_data' if args.mode=='master' else 'aziel_public_mirror')
    vault = Path(args.vault or os.environ.get('AZIEL_LIBRARY_PATH') or default_vault).expanduser().resolve()
    runtime_home = Path(os.environ.get('AZIEL_RUNTIME_HOME') or (root / 'runtime_assets')).expanduser().resolve()

    os.environ['AZIEL_RUNTIME_HOME'] = str(runtime_home)
    ok, message = verify_distribution(root)
    if not ok:
        print('STARTUP BLOCKED:', message, file=sys.stderr)
        print('Re-extract a clean copy of the release.', file=sys.stderr)
        return 3

    print(message)
    try:
        from aziel_library.update_check import report_update
        print(report_update(APP_VERSION))
    except Exception:
        pass
    if args.mode=='master':
        vault.mkdir(parents=True, exist_ok=True)
    elif not (vault/'library.sqlite3').exists():
        print('STARTUP BLOCKED: mirror snapshot library.sqlite3 is missing.', file=sys.stderr); return 4
    if args.mode=='master' and not args.skip_bootstrap:
        print('Verifying image + scanned-PDF OCR (first run may install/download components)...')
        if not run_bootstrap_once(root, runtime_home, repair=args.repair_runtime):
            print('WARNING: OCR setup is not complete. The library will still open; use Intelligence > Install / repair OCR and review runtime_assets/launcher_bootstrap.log.')
    if args.mode=='master' and not args.skip_gazetteer:
        print(f'Verifying temporal-geospatial resolver (baseline gazetteer: {args.gazetteer_profile})...')
        if not ensure_geography_ready(vault, runtime_home, args.gazetteer_profile):

            print('WARNING: world gazetteer setup is not complete. Geographic event extraction will remain limited until Gazetteer setup succeeds; see runtime_assets/launcher_geography.log.')
    port, existing = choose_port(args.host, args.port, args.mode)
    url = f'http://{args.host}:{port}'
    if existing:
        print(f'Aziel Digital Library is already running at {url}')
        if not args.no_browser:
            webbrowser.open(url)

        return 0
    write_launcher_receipt(runtime_home, vault, args.host, port, args.mode)
    print(f'Starting Aziel Digital Library v{APP_VERSION} [{args.mode.upper()}]')
    print(f'Vault: {vault}')

    print(f'URL:   {url}')
    cmd = [sys.executable, '-m', 'aziel_library.webapp', '--vault', str(vault), '--host', args.host, '--port', str(port), '--mode', args.mode]
    if args.no_browser:
        cmd.append('--no-browser')
    try:
        return subprocess.call(cmd, cwd=root, env=os.environ.copy())
    except KeyboardInterrupt:


        return 0
if __name__ == '__main__':
    raise SystemExit(main())
