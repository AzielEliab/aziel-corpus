from pathlib import Path
import json, shutil, sys, tempfile, unittest
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))


from aziel_library import AzielLibrary
def polygon_feature(name,start,end):

    return {'type':'Feature','properties':{'name':name,'jurisdiction':name,'affiliation':'Synthetic Test Realm','valid_from':start,'valid_to':end,'confidence':0.93},'geometry':{'type':'Polygon','coordinates':[[[10,40],[13,40],[13,45],[10,45],[10,40]]]}}
class HistoricalGeoTest(unittest.TestCase):
    def setUp(self): self.td=Path(tempfile.mkdtemp(prefix='aziel_hist_'))
    def tearDown(self): shutil.rmtree(self.td,ignore_errors=True)
    def test_temporal_state_switch_context_kit_and_verify(self):
        src=self.td/'states.geojson'
        src.write_text(json.dumps({'type':'FeatureCollection','features':[polygon_feature('State Alpha','1490','1505'),polygon_feature('State Beta','1506','1520')]}),encoding='utf-8')
        v=AzielLibrary(self.td/'vault')
        r=v.import_historical_geography(src,layer_name='Synthetic Temporal States',source_name='Aziel test fixture',license_name='TEST-ONLY')
        self.assertEqual(r['features'],2)
        a=v.historical_context(42,11.5,'1502'); b=v.historical_context(42,11.5,'1510')
        self.assertEqual(a[0]['jurisdiction'],'State Alpha'); self.assertEqual(b[0]['jurisdiction'],'State Beta')
        active=v.historical_geojson('1502'); self.assertEqual(len(active['features']),1); self.assertEqual(active['features'][0]['properties']['name'],'State Alpha')
        eid=v.add_event('1502','Fixture Place',42,11.5,title='Temporal state test')
        payload=v.map_payload(); ev=next(x for x in payload['events'] if x['event_id']==eid)
        self.assertEqual(ev['historical_context'][0]['jurisdiction'],'State Alpha')
        kit=v.create_historical_kit(src,self.td/'states.azh',layer_name='Portable States',source_name='Fixture',license_name='TEST-ONLY')
        self.assertTrue(Path(kit['path']).exists())
        v2=AzielLibrary(self.td/'vault2'); rr=v2.import_historical_geography(self.td/'states.azh')
        self.assertEqual(rr['features'],2); self.assertEqual(v2.historical_context(42,11.5,'1510')[0]['jurisdiction'],'State Beta')
        ver=v.verify(); self.assertTrue(ver['ok']); self.assertEqual(ver['checked_historical_geo_sources'],1)

        x=v.export_xlsx(); p=v.export_pdf(); self.assertTrue(x.exists()); self.assertTrue(p.exists())
if __name__=='__main__': unittest.main()
