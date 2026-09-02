import tempfile, threading, unittest, urllib.request, urllib.error, uuid
from pathlib import Path
from http.server import ThreadingHTTPServer
from aziel_library.core import AzielLibrary

from aziel_library.webapp import Handler
class WebAppQATest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        Handler.mode='master'
        Handler.vault=AzielLibrary(Path(self.tmp.name)/'vault')
        self.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        self.port=self.server.server_address[1]
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True); self.thread.start()
        self.base=f'http://127.0.0.1:{self.port}'
    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(timeout=3); self.tmp.cleanup()
    def get(self,path):
        return urllib.request.urlopen(self.base+path,timeout=15)
    def post_multipart(self,path,field,filename,content,ctype='application/octet-stream'):
        boundary='----AzielQA'+uuid.uuid4().hex
        body=(f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{filename}"\r\nContent-Type:{ctype}\r\n\r\n'.encode()+content+f'\r\n--{boundary}--\r\n'.encode())
        req=urllib.request.Request(self.base+path,data=body,headers={'Content-Type':f'multipart/form-data; boundary={boundary}','Content-Length':str(len(body))})

        return urllib.request.urlopen(req,timeout=30)
    def post_multi(self,path,parts):
        boundary='----AzielQAMulti'+uuid.uuid4().hex
        chunks=[]
        for field,filename,content,ctype in parts:
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{filename}"\r\nContent-Type: {ctype}\r\n\r\n'.encode())
            chunks.append(content)
            chunks.append(b'\r\n')
        chunks.append(f'--{boundary}--\r\n'.encode())
        body=b''.join(chunks)
        req=urllib.request.Request(self.base+path,data=body,headers={'Content-Type':f'multipart/form-data; boundary={boundary}','Content-Length':str(len(body))})

        return urllib.request.urlopen(req,timeout=30)
    def test_all_primary_routes_exports_and_errors(self):
        for route in ['/','/tree','/map','/historical','/gazetteer','/intelligence','/health','/verify','/ingest','/mirror','/assets/world_110m.geojson','/api/historical?date=1500']:
            with self.get(route) as r:
                self.assertEqual(r.status,200,route); self.assertGreater(len(r.read()),10)
                if r.headers.get('Content-Type','').startswith('text/html'):
                    self.assertEqual(r.headers.get('X-Frame-Options'),'DENY')
        for route in ['/record/DOES-NOT-EXIST','/export/nope']:
            with self.assertRaises(urllib.error.HTTPError) as cm: self.get(route)
            self.assertEqual(cm.exception.code,404)
        with self.get('/export/xlsx') as r: self.assertTrue(r.read(4).startswith(b'PK\x03\x04'))
        with self.get('/export/pdf') as r: self.assertTrue(r.read(5).startswith(b'%PDF-'))
    def test_streaming_large_upload_and_safe_search_rendering(self):
        dangerous=b'<script>window.AZIEL_XSS=1</script> needle '+(b'X'*(2*1024*1024))
        with self.post_multipart('/upload','files','<bad&name>.txt',dangerous,'text/plain') as r:
            self.assertEqual(r.status,200)
        with self.get('/?q=needle') as r: body=r.read().decode('utf-8')
        self.assertNotIn('<script>window.AZIEL_XSS=1</script>',body)
        self.assertIn('&lt;script&gt;',body)
        self.assertIn('<mark>needle</mark>',body)
        self.assertIn('&lt;bad&amp;name&gt;.txt',body)
    def test_bad_package_and_bad_multipart_are_clean_400s(self):
        try:
            self.post_multipart('/install','package','bad.azm',b'not a package')
            self.fail('invalid package unexpectedly accepted')
        except urllib.error.HTTPError as e:
            self.assertEqual(e.code,400); self.assertIn(b'package',e.read().lower())
        req=urllib.request.Request(self.base+'/upload',data=b'broken',headers={'Content-Type':'text/plain','Content-Length':'6'})
        with self.assertRaises(urllib.error.HTTPError) as cm: urllib.request.urlopen(req,timeout=10)
        self.assertEqual(cm.exception.code,400)
    def test_manual_event_validation_and_map_controls_exist(self):
        data=b'date=1502&place=Florence&lat=43.7696&lon=11.2558&title=Test+Event'
        req=urllib.request.Request(self.base+'/event',data=data,headers={'Content-Type':'application/x-www-form-urlencoded'})
        with urllib.request.urlopen(req,timeout=10) as r: self.assertEqual(r.status,200)
        with self.get('/map') as r: body=r.read().decode('utf-8')
        for marker in ["id='applyMap'","id='resetMap'","id='contextYear'","id='worldMap'","addEventListener('click',renderEvents)","addEventListener('click',()=>"]:
            self.assertIn(marker,body)
        bad=b'date=nope&place=X&lat=999&lon=0'
        req=urllib.request.Request(self.base+'/event',data=bad,headers={'Content-Type':'application/x-www-form-urlencoded'})
        with self.assertRaises(urllib.error.HTTPError) as cm: urllib.request.urlopen(req,timeout=10)

        self.assertEqual(cm.exception.code,400)
    def test_ui_contract_no_dead_controls_and_clean_empty_states(self):
        import re
        pages={}
        for route in ['/','/tree','/map','/historical','/gazetteer','/intelligence','/health','/verify','/ingest','/mirror']:
            with self.get(route) as r: pages[route]=r.read().decode('utf-8')
        combined='\n'.join(pages.values())

        for bad in ['coming soon','not implemented','TODO','FIXME','placeholder feature']:
            self.assertNotIn(bad.lower(),combined.lower())
        actions=set(re.findall(r"action=['\"]([^'\"]+)",combined))
        self.assertTrue({'/upload','/event','/historical-import','/gazetteer-install','/gazetteer-reindex','/install','/bootstrap','/ocr-selftest','/ocr-reprocess','/mirror-publish'}.issubset(actions))
        for marker in ['No corpus records match this view.','No .azm/.azk packages installed yet.','Install / repair selected processors','Mass Ingest','Publish / refresh public mirror']:
            self.assertIn(marker,combined)
        # Every JavaScript-only map and mass-ingest button has an event listener.
        for route in ['/map','/ingest']:
            for bid in re.findall(r"<button[^>]*id=['\"]([^'\"]+)",pages[route]):


                self.assertIn("getElementById('"+bid+"').addEventListener",pages[route],bid)
    def test_original_download_is_wired_streamed_and_exact(self):
        payload=(b'AZIEL-ORIGINAL-'*200000)
        with self.post_multipart('/upload','files','original.bin',payload) as r:
            self.assertEqual(r.status,200)
        rows=Handler.vault.search()
        self.assertEqual(len(rows),1)
        rid=rows[0]['record_id']
        with self.get('/record/'+rid) as r:
            page=r.read().decode('utf-8')
        self.assertIn('/original/'+rid,page)
        with self.get('/original/'+rid) as r:
            self.assertEqual(r.status,200)
            self.assertIn("filename*=UTF-8''original.bin",r.headers.get('Content-Disposition',''))
            self.assertEqual(r.read(),payload)
        with self.assertRaises(urllib.error.HTTPError) as cm: self.get('/original/DOES-NOT-EXIST')

        self.assertEqual(cm.exception.code,404)
    def test_duplicate_upload_names_preserve_original_names_and_binary_boundary_prefix(self):
        fake=b'alpha\r\n--not-the-real-boundary-sentinel\r\nomega'
        with self.post_multi('/upload',[('files','same.txt',b'first','text/plain'),('files','same.txt',fake,'text/plain')]) as r:
            self.assertEqual(r.status,200)
        rows=Handler.vault.search()
        self.assertEqual(sorted(r['original_name'] for r in rows),['same.txt','same.txt'])
        texts=[r['extracted_text'] for r in rows]

        self.assertTrue(any('not-the-real-boundary-sentinel' in t for t in texts))
    def test_bootstrap_ui_is_wired_without_network(self):
        from unittest.mock import patch
        fake={'actions':[],'downloads':[],'ocr_complete':True,'speech_complete':True,'ocr_self_test':{'ok':True},'after':{'ready':{'image_ocr':True,'pdf_ocr':True,'speech':True}}}
        data=b'profile=recommended'
        req=urllib.request.Request(self.base+'/bootstrap',data=data,headers={'Content-Type':'application/x-www-form-urlencoded'})
        with patch('aziel_library.webapp.BootstrapManager.bootstrap',return_value=fake) as boot:
            with urllib.request.urlopen(req,timeout=10) as r:
                self.assertEqual(r.status,200)

            boot.assert_called_once_with(profile='recommended',auto=True,dry_run=False,download_models=True)
if __name__=='__main__': unittest.main()
