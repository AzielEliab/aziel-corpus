from pathlib import Path
import os, shutil, sys, tempfile, unittest, zipfile
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from aziel_library import AzielLibrary, AzielPackage
from aziel_library.training import build_knowledge_kit, train_text_classifier

from aziel_library.external import BootstrapManager, ExternalRuntime
class SmokeTest(unittest.TestCase):
    def setUp(self):
        self.td=Path(tempfile.mkdtemp(prefix='aziel_test_'))
        os.environ['AZIEL_RUNTIME_HOME']=str(self.td/'runtime')
    def tearDown(self):
        os.environ.pop('AZIEL_RUNTIME_HOME',None); shutil.rmtree(self.td,ignore_errors=True)
    def test_end_to_end(self):
        vault=self.td/'vault'; inp=self.td/'input'; inp.mkdir()
        (inp/'research_note.txt').write_text('Leonardo da Vinci discussed a manuscript in Florence in 1502. Codex research evidence.',encoding='utf-8')
        (inp/'software_note.txt').write_text('Software database runtime code algorithm model package.',encoding='utf-8')
        with zipfile.ZipFile(inp/'letter.docx','w') as z: z.writestr('word/document.xml','<w:document xmlns:w="x"><w:p><w:t>Hidden inside document phrase and year 1499.</w:t></w:p></w:document>')
        pkgdir=self.td/'packages'; pkgdir.mkdir()
        kit=build_knowledge_kit(pkgdir/'demo.azk','test.entities',entities=[{'type':'PERSON','name':'Leonardo da Vinci','aliases':['Leonardo']}],places=[{'name':'Florence','lat':43.7,'lon':11.2}])
        model=train_text_classifier([('Research','manuscript research codex evidence'),('Technology','software code database runtime')],pkgdir/'subjects.azm','test.subjects')
        self.assertTrue(AzielPackage.verify(kit).ok and AzielPackage.verify(model).ok)
        v=AzielLibrary(vault); v.install_package(kit); v.install_package(model); rows=v.ingest([inp]); self.assertEqual(len(rows),3)
        self.assertTrue(v.search('"Hidden inside document phrase"')); self.assertTrue(v.search('Leonardo'))
        rid=rows[0]['record_id']; cit=v.add_citation(rid,'Test quote','Leonardo da Vinci','text:1'); cl=v.add_claim('Leonardo is mentioned in the ingested research note','LIKELY'); v.link_evidence(cl,cit); v.add_notebook('Test observation','Corpus smoke-test observation.'); v.add_contradiction(cl,cl,'Synthetic contradiction test','RESOLVED')

        self.assertTrue(v.verify()['ok']); x=v.export_xlsx(); p=v.export_pdf(); self.assertTrue(zipfile.is_zipfile(x)); self.assertTrue(p.read_bytes().startswith(b'%PDF-'))
    def test_temporal_geospatial_autopin(self):
        inp=self.td/'geo'; inp.mkdir(); (inp/'event.txt').write_text('In 1502 Leonardo da Vinci worked in Florence. The archive records the event.',encoding='utf-8')
        pkgdir=self.td/'packages2'; pkgdir.mkdir()
        kit=build_knowledge_kit(pkgdir/'geo.azk','test.geo',places=[{'name':'Florence','lat':43.7696,'lon':11.2558}])
        v=AzielLibrary(self.td/'geovault'); v.install_package(kit); rows=v.ingest([inp])
        ev=v.events(); self.assertEqual(len(ev),1); self.assertEqual(ev[0]['event_date'],'1502'); self.assertEqual(ev[0]['place_name'],'Florence'); self.assertGreaterEqual(ev[0]['confidence'],.9)
        payload=v.map_payload(); self.assertEqual(len(payload['events']),1); self.assertAlmostEqual(payload['events'][0]['lat'],43.7696,places=3)


        mid=v.add_event('2026-08-08','Indianapolis',39.7684,-86.1581,title='Manual map test'); self.assertTrue(mid.startswith('AZEVT-')); self.assertEqual(len(v.events()),2)
    def test_docx_natural_date_geospatial_event(self):
        pkgdir=self.td/'docx_geo_pkg'; pkgdir.mkdir()
        kit=build_knowledge_kit(pkgdir/'geo.azk','test.docx.geo',places=[{'name':'Florence','lat':43.7696,'lon':11.2558}])
        doc=self.td/'event.docx'
        with zipfile.ZipFile(doc,'w') as z:
            z.writestr('word/document.xml','<w:document xmlns:w="x"><w:p><w:t>On September 10, 2025, a documented meeting occurred in Florence.</w:t></w:p></w:document>')
        v=AzielLibrary(self.td/'docx_geo_vault'); v.install_package(kit); r=v.ingest([doc])[0]
        ev=v.events(record_id=r['record_id'])
        self.assertTrue(ev)
        self.assertEqual(ev[0]['event_date'],'2025-09-10')

        self.assertEqual(ev[0]['place_name'],'Florence')
    def test_downloader_hashes_and_caches(self):
        src=self.td/'source.bin'; src.write_bytes(b'aziel-bootstrap-test')
        import hashlib
        expected=hashlib.sha256(src.read_bytes()).hexdigest()
        bm=BootstrapManager(); dest=self.td/'runtime'/'downloads'/'copy.bin'
        r=bm._download(src.as_uri(),dest,expected_sha256=expected)
        self.assertEqual(r['sha256'],expected); self.assertEqual(dest.read_bytes(),src.read_bytes())
        r2=bm._download(src.as_uri(),dest,expected_sha256=expected)

        self.assertEqual(r2['status'],'already_present')
    def test_download_fallback_and_failed_partial_cleanup(self):
        good=self.td/'good.bin'; good.write_bytes(b'fallback-ok')
        bm=BootstrapManager(); dest=self.td/'runtime2'/'tessdata'/'eng.traineddata'
        result=bm._download_any([(self.td/'missing.bin').as_uri(),good.as_uri()],dest)
        self.assertEqual(dest.read_bytes(),b'fallback-ok'); self.assertEqual(result['status'],'downloaded')
        bad_dest=self.td/'runtime3'/'tessdata'/'eng.traineddata'
        with self.assertRaises(Exception): bm._download((self.td/'missing2.bin').as_uri(),bad_dest)
        self.assertFalse(bad_dest.exists()); self.assertFalse(bad_dest.with_suffix('.traineddata.partial').exists())

        self.assertFalse(bad_dest.parent.exists())
    def test_bootstrap_dry_run(self):
        r=BootstrapManager().bootstrap('all',auto=True,dry_run=True)

        self.assertTrue(r['dry_run']); self.assertIn('after',r)
if __name__=='__main__': unittest.main()
