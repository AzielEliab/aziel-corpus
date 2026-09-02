import argparse
from aziel_library.training import pack_model_assets
p=argparse.ArgumentParser(description='Freeze a local model folder into an Aziel .azm package')
p.add_argument('source_dir'); p.add_argument('destination'); p.add_argument('--id',required=True); p.add_argument('--type',required=True); p.add_argument('--version',default='1.0.0')
a=p.parse_args(); print(pack_model_assets(a.source_dir,a.destination,a.id,a.type,a.version))
