import importlib.util
import threading
import unittest
import tempfile
from unittest import mock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('aziel_launcher',ROOT/'aziel_launcher.py')

launcher=importlib.util.module_from_spec(spec); spec.loader.exec_module(launcher)
class _PlainHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        b=b'not aziel'; self.send_response(200); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)

    def log_message(self,*a): pass
class _AzielHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        b=b'<title>Aziel Digital Library</title>'; self.send_response(200); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)

    def log_message(self,*a): pass
class LauncherTest(unittest.TestCase):
    def test_distribution_verifies(self):
        ok,msg=launcher.verify_distribution(ROOT)

        self.assertTrue(ok,msg)
    def test_port_falls_forward_when_non_aziel_service_occupies_preferred(self):
        # Use an OS-assigned port and the launcher's custom-port scan behavior.
        srv=ThreadingHTTPServer(('127.0.0.1',0),_PlainHandler); port=srv.server_address[1]
        t=threading.Thread(target=srv.serve_forever,daemon=True); t.start()
        try:
            picked,existing=launcher.choose_port('127.0.0.1',port)
            self.assertGreater(picked,port); self.assertFalse(existing)
        finally:

            srv.shutdown(); srv.server_close(); t.join(timeout=2)
    def test_existing_aziel_instance_is_detected(self):
        srv=ThreadingHTTPServer(('127.0.0.1',0),_AzielHandler); port=srv.server_address[1]
        t=threading.Thread(target=srv.serve_forever,daemon=True); t.start()
        try:
            picked,existing=launcher.choose_port('127.0.0.1',port)
            self.assertEqual(picked,port); self.assertTrue(existing)
        finally:


            srv.shutdown(); srv.server_close(); t.join(timeout=2)
    def test_mode_mismatch_does_not_reuse_wrong_aziel_instance(self):
        class _MasterHandler(BaseHTTPRequestHandler):
            def do_GET(self):
                b="Aziel Digital Library MASTER · WRITABLE".encode("utf-8"); self.send_response(200); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
            def log_message(self,*a): pass
        srv=ThreadingHTTPServer(('127.0.0.1',0),_MasterHandler); port=srv.server_address[1]
        t=threading.Thread(target=srv.serve_forever,daemon=True); t.start()
        try:
            picked,existing=launcher.choose_port('127.0.0.1',port,'mirror')
            self.assertGreater(picked,port); self.assertFalse(existing)
        finally:


            srv.shutdown(); srv.server_close(); t.join(timeout=2)
    def test_geography_bootstrap_installs_baseline_when_missing(self):
        with tempfile.TemporaryDirectory(prefix='aziel_launcher_geo_') as td:
            inst=mock.Mock()
            inst.gazetteer_status.return_value={'state':'EMPTY','places':0}
            inst.install_world_gazetteer.return_value={'state':'READY','places':123,'reindex':{'records':7,'events_created':4}}
            with mock.patch('aziel_library.AzielLibrary',return_value=inst):
                ok=launcher.ensure_geography_ready(Path(td)/'vault',Path(td)/'runtime','lite')
            self.assertTrue(ok)
            inst.install_world_gazetteer.assert_called_once()

            self.assertTrue(inst.install_world_gazetteer.call_args.kwargs.get('reindex'))
    def test_geography_bootstrap_does_not_reinstall_ready_database(self):
        with tempfile.TemporaryDirectory(prefix='aziel_launcher_geo_ready_') as td:
            inst=mock.Mock(); inst.gazetteer_status.return_value={'state':'READY','places':42}
            with mock.patch('aziel_library.AzielLibrary',return_value=inst):
                self.assertTrue(launcher.ensure_geography_ready(Path(td)/'vault',Path(td)/'runtime','lite'))

            inst.install_world_gazetteer.assert_not_called()
if __name__=='__main__': unittest.main()
