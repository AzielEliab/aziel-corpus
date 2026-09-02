from __future__ import annotations
import argparse, json
from .external import BootstrapManager, ExternalRuntime

def main():
    p=argparse.ArgumentParser(prog='aziel-bootstrap',description='Acquire/check optional local intelligence dependencies.')
    p.add_argument('--profile',choices=['core','ocr','speech','recommended','all'],default='recommended')
    p.add_argument('--auto',action='store_true',help='Attempt OS package-manager installs for missing binary tools.')
    p.add_argument('--dry-run',action='store_true')
    p.add_argument('--no-models',action='store_true')
    p.add_argument('--status',action='store_true')
    a=p.parse_args()
    if a.status: print(json.dumps(ExternalRuntime().status(),indent=2)); return
    result=BootstrapManager().bootstrap(a.profile,a.auto,a.dry_run,not a.no_models)
    print(json.dumps(result,indent=2))
    if not a.dry_run and not result.get('complete',False): raise SystemExit(2)
if __name__=='__main__': main()
