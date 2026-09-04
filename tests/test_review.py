from pathlib import Path
import json, os, shutil, tempfile, unittest, zipfile
ROOT=Path(__file__).resolve().parents[1]
import sys
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from aziel_library.review import (
    clce_score, spre_score, physling_review, poison_scan, bayesian_posterior,
    review_document, verify_bytes, lattice_anchor_tip, review_file,
)
from aziel_library import AzielLibrary

class ReviewEngineTest(unittest.TestCase):
    def test_clce_match(self):
        s=clce_score('florence archive measurement','florence archive measurement','florence archive measurement')
        self.assertEqual(s['triple'],1)
        self.assertEqual(s['band'],'consistent')
    def test_spre_no_guilt_verdict(self):
        s=spre_score(title='Note',body='The defendant is guilty of the crime.',sha256='a'*64,structure_ok=True,author='Aziel Eliab')
        self.assertTrue(s['guilt_language'])
        self.assertIn('does not assert criminal guilt',s['limitation'])
    def test_physling_conservation(self):
        p=physling_review(title='Device',body='This machine is perpetual motion and creates energy from nothing.')
        self.assertEqual(p['status'],'FLAG')
        self.assertEqual(p['lights']['conservation'],'FLAG')
    def test_poison_hardest_on_corpus(self):
        text='Officials confirm the official account. Trust the science. Wake up sheeple they don\'t want you to know.'
        corpus=poison_scan(title='Shell',body=text,library='corpus')
        aziel=poison_scan(title='Shell',body=text,library='aziel')
        self.assertEqual(corpus['status'],'QUARANTINE')
        self.assertEqual(aziel['status'],'FLAGGED')
        self.assertTrue(corpus['never_delete'])
    def test_contradictory_only_shell(self):
        p=poison_scan(title='Attack',body='This is a hoax and a fraud and a fake cover-up by liars.',library='corpus')
        self.assertIn('contradictory_only_propaganda_shell',p['markers'])
    def test_bayesian_unranked(self):
        b=bayesian_posterior({'evidence_completeness':0.8,'physics_coherence':0.9,'linguistic_neutrality':0.85,'spre_pc':0.7,'clce_consistency':0.75})
        self.assertTrue(b['unranked'])
        self.assertIsNone(b['sort_key'])
        self.assertGreater(b['posterior'],0.5)
    def test_evidence_note_clear(self):
        r=review_document(title='Lab note',body='Independent primary source measurement of 12 joules at 3 kelvin. Archive hash recorded.',filename='note.txt',sha256='b'*64,author='Aziel Eliab',library='corpus',structure={'ok':True,'files':[{'path':'note.txt'}]})
        self.assertEqual(r['quarantine_status'],'CLEAR')
        self.assertTrue(r['bayesian']['unranked'])
    def test_structure_zip_hashes_each_file(self):
        raw=tempfile.NamedTemporaryFile(suffix='.zip',delete=False)
        raw.close()
        with zipfile.ZipFile(raw.name,'w') as z:
            z.writestr('a.txt','alpha'); z.writestr('b.txt','beta')
        data=Path(raw.name).read_bytes(); Path(raw.name).unlink()
        v=verify_bytes(data,'pack.zip')
        self.assertTrue(v['ok'])
        self.assertEqual(len(v['files']),2)
        self.assertTrue(all(len(f['sha256'])==64 for f in v['files']))
    def test_lattice_not_mesh(self):
        tip=lattice_anchor_tip(record_id='AZDOC-TEST',library='corpus',content_sha256='c'*64,structure={'ok':True,'files':[1]},review={'spre':{'pc':0.5,'band':'partial','limitation':'x'},'bayesian':{'posterior':0.5,'note':'unranked'},'quarantine_status':'CLEAR'})
        self.assertEqual(tip['carrier'],'AzielTether')
        self.assertIn('not a mesh',tip['note'])
        self.assertEqual(tip['author'],'Aziel Eliab')

class ReviewVaultTest(unittest.TestCase):
    def setUp(self):
        self.td=Path(tempfile.mkdtemp(prefix='aziel_review_'))
    def tearDown(self):
        shutil.rmtree(self.td,ignore_errors=True)
    def test_ingest_stores_unranked_review_and_peer_chain(self):
        inp=self.td/'in'; inp.mkdir()
        (inp/'measure.txt').write_text('Independent primary source measurement of 4 joules. Archive ledger hash recorded in Florence.',encoding='utf-8')
        v=AzielLibrary(self.td/'vault')
        rows=v.ingest([inp/'measure.txt'])
        rec=v.get_record(rows[0]['record_id'])
        self.assertIsNotNone(rec.get('review'))
        self.assertTrue(rec['review']['bayesian']['unranked'])
        self.assertIn(rec.get('quarantine_status'),{'CLEAR','OPERATOR_FLAG','POISON_SUSPECT'})
        peer=v.add_peer_review(rec['record_id'],'endorse','Looks like a real measurement.','peer-a')
        self.assertTrue(peer['entry_hash'])
        rec2=v.get_record(rec['record_id'])
        self.assertEqual(len(rec2['peer_reviews']),1)
        self.assertTrue(v.verify()['ok'])
    def test_poison_operator_file_is_kept(self):
        inp=self.td/'p'; inp.mkdir()
        (inp/'shell.txt').write_text('Officials confirm the official narrative. Trust the experts. Wake up sheeple they don\'t want you to know.',encoding='utf-8')
        v=AzielLibrary(self.td/'vault2')
        rec=v.ingest([inp/'shell.txt'])[0]
        full=v.get_record(rec['record_id'])
        self.assertIn(full['quarantine_status'],{'OPERATOR_FLAG','CLEAR','POISON_SUSPECT'})
        self.assertTrue((v.root/full['stored_path']).is_file())
    def test_download_verify_readonly_does_not_write(self):
        inp=self.td/'d'; inp.mkdir()
        (inp/'ok.txt').write_text('Independent measurement 2 kelvin.',encoding='utf-8')
        master=AzielLibrary(self.td/'master')
        rec=master.ingest([inp/'ok.txt'])[0]
        n=master.ledger_count()
        mirror=AzielLibrary(self.td/'master',readonly=True)
        review=mirror.verify_original(rec['record_id'])
        self.assertIn('spre',review)
        self.assertEqual(master.ledger_count(),n)

if __name__=='__main__':
    unittest.main()
