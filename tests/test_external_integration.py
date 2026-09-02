from pathlib import Path
import os, stat, sys, tempfile, shutil, unittest
ROOT=Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from aziel_library import AzielLibrary
from aziel_library.external import ExternalRuntime, BootstrapManager

from aziel_library.training import build_knowledge_kit
class ExternalIntegrationTest(unittest.TestCase):
    def setUp(self):
        self.td=Path(tempfile.mkdtemp(prefix='aziel_ext_')); self.runtime=self.td/'runtime'; b=self.runtime/'bin'; b.mkdir(parents=True)
        os.environ['AZIEL_RUNTIME_HOME']=str(self.runtime)
        fixture=ROOT/'data'/'ocr_selftest.png'
        def exe(name, body):
            p=b/name; p.write_text('#!/bin/sh\n'+body,encoding='utf-8'); p.chmod(p.stat().st_mode|stat.S_IXUSR); return p
        self.tess=exe('tesseract','if [ "$1" = "--version" ]; then echo "tesseract fake 1"; exit 0; fi\nif [ -n "$TESSDATA_PREFIX" ] && [ ! -f "$TESSDATA_PREFIX/eng.traineddata" ]; then echo "bad tessdata prefix" >&2; exit 9; fi\necho "AZIEL OCR TEST 7319 IMAGE AND SCANNED PDF"\n')
        self.pop=exe('pdftoppm',f'if [ "$1" = "--version" ]; then echo "pdftoppm fake 1"; exit 0; fi\nfor last; do :; done\n/bin/cp "{fixture}" "${{last}}-1.png"\n')
    def tearDown(self):

        os.environ.pop('AZIEL_RUNTIME_HOME',None); shutil.rmtree(self.td,ignore_errors=True)
    def test_image_ocr_is_used(self):
        img=self.td/'scan.png'; shutil.copy2(ROOT/'data'/'ocr_selftest.png',img)
        v=AzielLibrary(self.td/'vault'); r=v.ingest([img])[0]
        self.assertEqual(r['extraction_status'],'EXTRACTED_EXTERNAL_IMAGE_OCR'); self.assertIn('AZIEL OCR TEST 7319',r['extracted_text'])

        self.assertEqual(r['derived'][0]['processor'],'TESSERACT')
    def test_scanned_pdf_ocr_is_used(self):
        pdf=self.td/'scan.pdf'; shutil.copy2(ROOT/'data'/'ocr_selftest_scanned.pdf',pdf)
        v=AzielLibrary(self.td/'vault_pdf'); r=v.ingest([pdf])[0]
        self.assertEqual(r['extraction_status'],'EXTRACTED_EXTERNAL_PDF_OCR'); self.assertIn('AZIEL OCR TEST 7319',r['extracted_text'])


        self.assertEqual(r['metadata_json']!='',True)
    def test_empty_local_tessdata_does_not_poison_working_tesseract(self):
        (self.runtime/'tessdata').mkdir()
        rt=ExternalRuntime(self.runtime); txt,meta=rt.ocr_image(ROOT/'data'/'ocr_selftest.png',psm='6')

        self.assertIn('AZIEL OCR TEST 7319',txt); self.assertEqual(meta['tessdata_source'],'tesseract-install')
    def test_end_to_end_ocr_selftest_and_bootstrap_completion(self):
        rt=ExternalRuntime(self.runtime); result=rt.self_test_ocr()
        self.assertTrue(result['ok'],result); self.assertTrue(result['image_ok']); self.assertTrue(result['pdf_ok'])
        boot=BootstrapManager(self.runtime).bootstrap(profile='ocr',auto=False,dry_run=False,download_models=False)

        self.assertTrue(boot['ocr_complete'],boot); self.assertTrue(boot['complete'],boot)
    def test_previously_pending_image_can_be_reprocessed(self):
        self.tess.rename(self.tess.with_suffix('.off')); self.pop.rename(self.pop.with_suffix('.off'))
        old_path=os.environ.get('PATH',''); os.environ['PATH']=str(self.runtime/'bin')
        try:
            img=self.td/'pending.png'; shutil.copy2(ROOT/'data'/'ocr_selftest.png',img)
            v=AzielLibrary(self.td/'vault_pending'); r=v.ingest([img])[0]
            self.assertEqual(r['extraction_status'],'OCR_NOT_READY_IMAGE'); self.assertEqual(len(v.pending_ocr()),1)
            self.tess.with_suffix('.off').rename(self.tess); self.pop.with_suffix('.off').rename(self.pop)
            result=v.reprocess_pending_ocr(); self.assertTrue(result['ok'],result); self.assertEqual(result['processed'],1)
            reread=v.get_record(r['record_id']); self.assertEqual(reread['extraction_status'],'EXTRACTED_EXTERNAL_IMAGE_OCR'); self.assertIn('AZIEL OCR TEST 7319',reread['extracted_text'])
        finally:


            os.environ['PATH']=old_path
    def test_ocr_text_flows_into_temporal_geospatial_event_extraction(self):
        # Make the fake OCR engine emit a normal prose date + place, then verify the
        # OCR output is not merely searchable: it must feed the event mapper too.
        self.tess.write_text('#!/bin/sh\nif [ "$1" = "--version" ]; then echo "tesseract fake 1"; exit 0; fi\necho "On September 10, 2025, a documented event occurred in Florence."\n',encoding='utf-8')
        self.tess.chmod(self.tess.stat().st_mode|stat.S_IXUSR)
        pkgdir=self.td/'pkg'; pkgdir.mkdir()
        kit=build_knowledge_kit(pkgdir/'geo.azk','test.ocr.geo',places=[{'name':'Florence','lat':43.7696,'lon':11.2558}])
        v=AzielLibrary(self.td/'vault_ocr_geo'); v.install_package(kit)
        img=self.td/'geo_scan.png'; shutil.copy2(ROOT/'data'/'ocr_selftest.png',img)
        r=v.ingest([img])[0]
        self.assertEqual(r['extraction_status'],'EXTRACTED_EXTERNAL_IMAGE_OCR')
        ev=v.events(record_id=r['record_id'])
        self.assertTrue(ev, r)
        self.assertEqual(ev[0]['event_date'],'2025-09-10')
        self.assertEqual(ev[0]['place_name'],'Florence')

        self.assertAlmostEqual(ev[0]['lat'],43.7696,places=3)
if __name__=='__main__': unittest.main()
