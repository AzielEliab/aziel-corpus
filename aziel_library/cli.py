from __future__ import annotations
import argparse, json
from .core import AzielLibrary
from .external import ExternalRuntime
from .bootstrap import BootstrapManager


from .mirror import publish_mirror, read_manifest
def main():
    p=argparse.ArgumentParser(prog='aziel-library')
    p.add_argument('--vault',default='./aziel_library_data')
    sub=p.add_subparsers(dest='cmd',required=True)
    i=sub.add_parser('ingest'); i.add_argument('paths',nargs='+')
    bi=sub.add_parser('bulk-ingest'); bi.add_argument('paths',nargs='+')
    s=sub.add_parser('search'); s.add_argument('query'); s.add_argument('--subject',default=''); s.add_argument('--media',default='')
    sub.add_parser('health'); sub.add_parser('verify'); sub.add_parser('packages'); sub.add_parser('runtime-status'); sub.add_parser('events')
    rv=sub.add_parser('review'); rv.add_argument('record_id')
    pr=sub.add_parser('peer-review'); pr.add_argument('record_id'); pr.add_argument('stance',choices=['endorse','challenge','note']); pr.add_argument('body')
    mp=sub.add_parser('publish-mirror'); mp.add_argument('destination'); mp.add_argument('--copy-mode',choices=['copy','hardlink'],default='copy'); mp.add_argument('--include-source-dumps',action='store_true')
    ms=sub.add_parser('mirror-status'); ms.add_argument('mirror_root')
    b=sub.add_parser('bootstrap'); b.add_argument('--profile',choices=['core','ocr','speech','recommended','all'],default='recommended'); b.add_argument('--auto',action='store_true'); b.add_argument('--dry-run',action='store_true'); b.add_argument('--no-models',action='store_true')
    ins=sub.add_parser('install'); ins.add_argument('package')
    gi=sub.add_parser('gazetteer-install'); gi.add_argument('--profile',choices=['lite','full'],default='full'); gi.add_argument('--force-download',action='store_true'); gi.add_argument('--no-alternate-names',action='store_true')
    gs=sub.add_parser('gazetteer-search'); gs.add_argument('query'); gs.add_argument('--limit',type=int,default=25)
    sub.add_parser('gazetteer-status'); sub.add_parser('gazetteer-reindex')
    sub.add_parser('historical-status'); sub.add_parser('historical-layers')
    hi=sub.add_parser('historical-import'); hi.add_argument('path'); hi.add_argument('--name',default=''); hi.add_argument('--from-date',default=''); hi.add_argument('--to-date',default=''); hi.add_argument('--source-name',default=''); hi.add_argument('--source-url',default=''); hi.add_argument('--license',default='UNSPECIFIED'); hi.add_argument('--attribution',default=''); hi.add_argument('--confidence',type=float,default=1.0)
    hc=sub.add_parser('historical-context'); hc.add_argument('date'); hc.add_argument('lat',type=float); hc.add_argument('lon',type=float)
    ha=sub.add_parser('historical-active'); ha.add_argument('date')
    hk=sub.add_parser('historical-build-kit'); hk.add_argument('geojson'); hk.add_argument('destination'); hk.add_argument('--name',default=''); hk.add_argument('--from-date',default=''); hk.add_argument('--to-date',default=''); hk.add_argument('--source-name',default=''); hk.add_argument('--source-url',default=''); hk.add_argument('--license',default='UNSPECIFIED'); hk.add_argument('--attribution',default=''); hk.add_argument('--confidence',type=float,default=1.0)
    ev=sub.add_parser('add-event'); ev.add_argument('date'); ev.add_argument('place'); ev.add_argument('lat',type=float); ev.add_argument('lon',type=float); ev.add_argument('--title',default=''); ev.add_argument('--description',default=''); ev.add_argument('--record-id',default=''); ev.add_argument('--locator',default='')
    sub.add_parser('export-xlsx'); sub.add_parser('export-pdf')

    a=p.parse_args()
    if a.cmd=='runtime-status': print(json.dumps(ExternalRuntime().status(),indent=2)); return
    if a.cmd=='bootstrap': print(json.dumps(BootstrapManager().bootstrap(a.profile,a.auto,a.dry_run,not a.no_models),indent=2)); return

    if a.cmd=='mirror-status': print(json.dumps(read_manifest(a.mirror_root),indent=2)); return
    v=AzielLibrary(a.vault)
    if a.cmd=='ingest': print(json.dumps(v.ingest(a.paths),indent=2,default=str))
    elif a.cmd=='bulk-ingest': print(json.dumps(v.bulk_ingest(a.paths,progress=lambda x: print('[bulk]',json.dumps(x),flush=True)),indent=2,default=str))
    elif a.cmd=='publish-mirror': print(json.dumps(publish_mirror(v,a.destination,a.copy_mode,a.include_source_dumps),indent=2))
    elif a.cmd=='search': print(json.dumps(v.search(a.query,a.media,a.subject),indent=2))
    elif a.cmd=='health': print(json.dumps(v.health(),indent=2))
    elif a.cmd=='verify': print(json.dumps(v.verify(),indent=2))
    elif a.cmd=='review': print(json.dumps(v.get_record(a.record_id).get('review'),indent=2,default=str))
    elif a.cmd=='peer-review': print(json.dumps(v.add_peer_review(a.record_id,a.stance,a.body),indent=2))
    elif a.cmd=='packages': print(json.dumps(v.packages(),indent=2))
    elif a.cmd=='gazetteer-status': print(json.dumps(v.gazetteer_status(),indent=2))
    elif a.cmd=='gazetteer-install': print(json.dumps(v.install_world_gazetteer(a.profile,a.force_download,not a.no_alternate_names,progress=lambda x: print('[gazetteer]',x,flush=True)),indent=2))
    elif a.cmd=='gazetteer-search': print(json.dumps(v.gazetteer_search(a.query,a.limit),indent=2))
    elif a.cmd=='gazetteer-reindex': print(json.dumps(v.reindex_geography(),indent=2))
    elif a.cmd=='historical-status': print(json.dumps(v.historical_status(),indent=2))
    elif a.cmd=='historical-layers': print(json.dumps(v.historical_layers(),indent=2))
    elif a.cmd=='historical-import': print(json.dumps(v.import_historical_geography(a.path,layer_name=a.name,valid_from=a.from_date,valid_to=a.to_date,source_name=a.source_name,source_url=a.source_url,license_name=a.license,attribution=a.attribution,confidence=a.confidence),indent=2))
    elif a.cmd=='historical-context': print(json.dumps(v.historical_context(a.lat,a.lon,a.date),indent=2))
    elif a.cmd=='historical-active': print(json.dumps(v.historical_geojson(a.date),indent=2))
    elif a.cmd=='historical-build-kit': print(json.dumps(v.create_historical_kit(a.geojson,a.destination,layer_name=a.name,valid_from=a.from_date,valid_to=a.to_date,source_name=a.source_name,source_url=a.source_url,license_name=a.license,attribution=a.attribution,confidence=a.confidence),indent=2))
    elif a.cmd=='events': print(json.dumps(v.events(),indent=2))
    elif a.cmd=='add-event': print(v.add_event(a.date,a.place,a.lat,a.lon,title=a.title,description=a.description,record_id=a.record_id,locator=a.locator))
    elif a.cmd=='install': print(v.install_package(a.package))
    elif a.cmd=='export-xlsx': print(v.export_xlsx())

    elif a.cmd=='export-pdf': print(v.export_pdf())
if __name__=='__main__': main()
