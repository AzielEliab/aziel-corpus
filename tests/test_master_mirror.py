import json, tempfile, threading, unittest, urllib.error, urllib.parse, urllib.request
from pathlib import Path
from http.server import ThreadingHTTPServer
from aziel_library.core import AzielLibrary
from aziel_library.mirror import publish_mirror

from aziel_library.webapp import Handler


class MasterMirrorTest(unittest.TestCase):
    def test_publish_sanitizes_and_readonly_core_blocks_writes(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); master=AzielLibrary(root/'master')
            src=root/'source-private-path.txt'; src.write_text('Research in Florence 1502. needle',encoding='utf-8')
            rec=master.ingest([src])[0]
            mirror_root=root/'mirror'
            mf=publish_mirror(master,mirror_root)
            self.assertEqual(mf['records'],1)
            self.assertTrue((mirror_root/'published_exports'/'aziel_corpus_index.xlsx').is_file())
            mirror=AzielLibrary(mirror_root,readonly=True)
            rows=mirror.search('needle'); self.assertEqual(len(rows),1)
            self.assertEqual(rows[0]['record_id'],rec['record_id'])
            with mirror._connect() as c:
                original_path=c.execute('SELECT original_path FROM records').fetchone()[0]
            self.assertEqual(original_path,'')
            with self.assertRaises(PermissionError): mirror.ingest([src])

            with self.assertRaises(PermissionError): mirror.add_event('1502','Florence',43.7,11.2)
    def test_public_http_mirror_has_no_mutation_controls_and_rejects_posts(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); master=AzielLibrary(root/'master')
            f=root/'doc.txt'; f.write_text('public corpus research',encoding='utf-8'); master.ingest([f])
            mr=root/'mirror'; publish_mirror(master,mr)
            Handler.mode='mirror'; Handler.vault=AzielLibrary(mr,readonly=True)
            srv=ThreadingHTTPServer(('127.0.0.1',0),Handler); port=srv.server_address[1]
            t=threading.Thread(target=srv.serve_forever,daemon=True); t.start(); base=f'http://127.0.0.1:{port}'
            try:
                pages={}
                for route in ['/','/map','/historical','/gazetteer','/intelligence','/mirror']:
                    with urllib.request.urlopen(base+route,timeout=10) as r: pages[route]=r.read().decode()
                body=pages['/']; self.assertIn('PUBLIC MIRROR · READ ONLY',body)
                self.assertNotIn("action='/upload'",body); self.assertNotIn('Mass Ingest</a>',body)
                for route,page in pages.items(): self.assertNotIn("method='post'",page.lower(),route)
                self.assertIn('Read-only public mirror',pages['/mirror'])
                self.assertNotIn('/usr/bin',pages['/intelligence'])
                req=urllib.request.Request(base+'/event',data=b'date=1502')
                with self.assertRaises(urllib.error.HTTPError) as cm: urllib.request.urlopen(req,timeout=10)
                self.assertEqual(cm.exception.code,403)
                with urllib.request.urlopen(base+'/export/xlsx',timeout=10) as r: self.assertTrue(r.read(4).startswith(b'PK\x03\x04'))
                rid=Handler.vault.search()[0]['record_id']
                with urllib.request.urlopen(base+'/record/'+rid,timeout=10) as r: record_page=r.read().decode()
                self.assertNotIn('<b>Object path</b>',record_page); self.assertIn('/original/'+rid,record_page)
            finally:
                srv.shutdown(); srv.server_close(); t.join(timeout=3)

                Handler.mode='master'
    def test_mass_ingest_raw_endpoint_then_single_finalize(self):
        with tempfile.TemporaryDirectory() as td:
            Handler.mode='master'; Handler.vault=AzielLibrary(Path(td)/'vault')
            srv=ThreadingHTTPServer(('127.0.0.1',0),Handler); port=srv.server_address[1]
            t=threading.Thread(target=srv.serve_forever,daemon=True); t.start(); base=f'http://127.0.0.1:{port}'
            try:
                for i in range(4):
                    payload=(f'file {i} research needle '.encode()*5000)
                    q=urllib.parse.urlencode({'name':f'doc{i}.txt','relative':f'folder/sub/doc{i}.txt'})
                    req=urllib.request.Request(base+'/api/ingest-file?'+q,data=payload,method='POST',headers={'Content-Type':'application/octet-stream'})
                    with urllib.request.urlopen(req,timeout=20) as r:
                        data=json.loads(r.read()); self.assertTrue(data['ok'])
                req=urllib.request.Request(base+'/api/ingest-finalize',data=b'',method='POST')
                with urllib.request.urlopen(req,timeout=20) as r: self.assertTrue(json.loads(r.read())['ok'])
                rows=Handler.vault.search('needle'); self.assertEqual(len(rows),4)
                for row in rows:
                    md=json.loads(row['metadata_json']); self.assertTrue(md.get('ingest_relative_paths'))
                with urllib.request.urlopen(base+'/ingest',timeout=10) as r:
                    page=r.read().decode(); self.assertIn("id='batchFolder'",page); self.assertIn("id='startBatch'",page); self.assertIn('/api/ingest-file',page)
            finally:


                srv.shutdown(); srv.server_close(); t.join(timeout=3)
    def test_incremental_refresh_publishes_new_records(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); master=AzielLibrary(root/'master'); mirror_root=root/'mirror'
            a=root/'a.txt'; a.write_text('alpha research',encoding='utf-8'); master.ingest([a]); publish_mirror(master,mirror_root)
            self.assertEqual(len(AzielLibrary(mirror_root,readonly=True).search()),1)
            b=root/'b.txt'; b.write_text('beta research',encoding='utf-8'); master.ingest([b]); second=publish_mirror(master,mirror_root)
            m=AzielLibrary(mirror_root,readonly=True); self.assertEqual(len(m.search()),2); self.assertEqual(second['records'],2)

            self.assertTrue(m.verify()['ok'])
if __name__=='__main__': unittest.main()
