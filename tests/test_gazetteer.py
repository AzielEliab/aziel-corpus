from pathlib import Path
import os, shutil, sys, tempfile, unittest, zipfile
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))

from aziel_library import AzielLibrary
class GazetteerTest(unittest.TestCase):
    def setUp(self): self.td=Path(tempfile.mkdtemp(prefix='aziel_gz_'))
    def tearDown(self): shutil.rmtree(self.td,ignore_errors=True)
    def _sources(self):
        d=self.td/'src'; d.mkdir()
        # GeoNames geoname row: 19 columns.
        rows=[
            ['3176959','Florence','Florence','Firenze,Florentia','43.77925','11.24626','P','PPLA','IT','','16','FI','','','367150','50','51','Europe/Rome','2026-08-01'],
            ['1275339','Mumbai','Mumbai','Bombay','19.07283','72.88261','P','PPLA','IN','','16','518','','','12691836','14','8','Asia/Kolkata','2026-08-01'],]
        with zipfile.ZipFile(d/'allCountries.zip','w',zipfile.ZIP_DEFLATED) as z:
            z.writestr('allCountries.txt','\n'.join('\t'.join(x) for x in rows)+'\n')
        alts=[
            ['1','3176959','it','Firenze','1','0','0','0','',''],
            ['2','3176959','la','Florentia','0','0','0','1','1200','1700'],
            ['3','1275339','en','Bombay','0','0','0','1','','1995'],]
        with zipfile.ZipFile(d/'alternateNamesV2.zip','w',zipfile.ZIP_DEFLATED) as z:
            z.writestr('alternateNamesV2.txt','\n'.join('\t'.join(x) for x in alts)+'\n')
        (d/'admin1CodesASCII.txt').write_text('IT.16\tTuscany\tTuscany\t3165361\nIN.16\tMaharashtra\tMaharashtra\t1264418\n',encoding='utf-8')
        # countryInfo uses 19 fields; parser ignores comments.
        it=['IT','ITA','380','IT','Italy','Rome','301230','60431283','EU','.it','EUR','Euro','39','#####','', 'it-IT,de-IT,fr-IT','3175395','CH,AT,SI,SM,FR,VA','']
        ind=['IN','IND','356','IN','India','New Delhi','3287590','1352617328','AS','.in','INR','Rupee','91','######','', 'en-IN,hi,bn','1269750','CN,NP,MM,BT,PK,BD','']
        (d/'countryInfo.txt').write_text('\n'.join(['\t'.join(it),'\t'.join(ind)])+'\n',encoding='utf-8')
        return {x.name:x for x in d.iterdir()}
    def test_world_gazetteer_build_resolve_autopin_and_verify(self):
        v=AzielLibrary(self.td/'vault'); st=v.install_world_gazetteer('full',source_files=self._sources())
        self.assertEqual(st['state'],'READY'); self.assertEqual(st['places'],2); self.assertGreaterEqual(st['historical_aliases'],2)
        f=v.gazetteer_search('Firenze'); self.assertEqual(f[0]['name'],'Florence'); self.assertAlmostEqual(f[0]['lat'],43.77925,places=4)
        b=v.gazetteer_search('Bombay'); self.assertEqual(b[0]['name'],'Mumbai'); self.assertTrue(b[0]['historic_name'])
        doc=self.td/'note.txt'; doc.write_text('In 1502 a documented event occurred in Firenze. Another note mentions Bombay in 1890.',encoding='utf-8')
        v.ingest([doc]); ev=v.events(); places={x['place_name'] for x in ev}; self.assertIn('Florence',places); self.assertIn('Mumbai',places)


        self.assertTrue(v.verify()['ok']); self.assertGreaterEqual(v.verify()['checked_gazetteer_sources'],4)
    def test_install_auto_reindexes_existing_records_and_natural_dates(self):
        v=AzielLibrary(self.td/'vault_reindex')
        doc=self.td/'before_gazetteer.txt'
        doc.write_text('On September 10, 2025, a documented event occurred in florence.\nOn 11 September 2025 another record was filed in Firenze.',encoding='utf-8')
        r=v.ingest([doc])[0]
        self.assertEqual(v.events(),[])
        st=v.install_world_gazetteer('full',source_files=self._sources())
        self.assertEqual(st['state'],'READY')
        self.assertGreaterEqual((st.get('reindex') or {}).get('events_created',0),2)
        ev=v.events(record_id=r['record_id'])
        dates={x['event_date'] for x in ev}
        self.assertIn('2025-09-10',dates)
        self.assertIn('2025-09-11',dates)

        self.assertTrue(all(x['lat'] is not None and x['lon'] is not None for x in ev))
if __name__=='__main__': unittest.main()
