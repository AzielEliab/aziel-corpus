from pathlib import Path
import json, os, shutil, tempfile, unittest, zipfile
ROOT=Path(__file__).resolve().parents[1]
import sys
if str(ROOT) not in sys.path: sys.path.insert(0,str(ROOT))
from aziel_library.review import (
    clce_score, spre_score, physling_review, poison_scan, bayesian_posterior,
    review_document, verify_bytes, lattice_anchor_tip, review_file, triad_composite,
    triad_coverage_points,
)
from aziel_library import AzielLibrary
from aziel_library.core import normalize_content_hash
from aziel_library.jeeves import should_refuse, chat as jeeves_chat
from aziel_library.succession import propose_all_links, title_lineage_core, subject_key
from aziel_library.zsolver import derive_zsolver_answers, local_zsolver_score

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
        self.assertTrue(r['triad']['ready'])
        self.assertTrue(r['triad']['primary_visible'])
        self.assertGreater(r['triad']['combined'],0)
    def test_triad_geometric_mean(self):
        t=triad_composite(spre={'pc':0.64},clce={'triple':0.8,'pairwise_avg':0.4},plr={'physics_coherence':1,'linguistic_neutrality':1})
        self.assertTrue(t['ready'])
        self.assertEqual(t['components']['clce_consistency'],0.8)
        expected=(0.64*0.8*1)**(1/3)
        self.assertAlmostEqual(t['combined'],round(expected,4))
    def test_triad_not_ready_until_three(self):
        t=triad_composite(spre={'pc':0.5})
        self.assertFalse(t['ready'])
        self.assertIsNone(t['combined'])
    def test_aziel_library_published_triad_versus_corpus(self):
        kw=dict(title='Lab note',body='Independent primary source measurement of 12 joules at 3 kelvin. Archive hash recorded.',filename='note.txt',sha256='b'*64,author='Aziel Eliab',structure={'ok':True,'files':[{'path':'note.txt'}]})
        corpus=review_document(library='corpus',**kw)
        aziel=review_document(library='aziel',**kw)
        self.assertTrue(corpus['triad']['ready'])
        self.assertTrue(aziel['triad']['ready'])
        self.assertEqual(aziel['triad']['components'], corpus['triad']['components'])
        self.assertEqual(sorted(aziel['triad'].keys()), sorted(corpus['triad'].keys()))
        self.assertEqual(aziel['triad']['display'], min(100, corpus['triad']['display']+25))
        self.assertEqual(aziel['triad']['combined'], round(aziel['triad']['display']/100, 4))
        dumped=json.dumps(aziel)
        self.assertNotRegex(dumped, r'boost|quiet|\+25')
    def test_succession_requires_exact_subject_and_title_lineage(self):
        a={'record_id':'AZDOC-A','title':'A Treatise on Gravity Measurement','subjects':'Physics','created_utc':'2026-01-01','content_sha256':'a'*64}
        b={'record_id':'AZDOC-B','title':'A Treatise on Gravity Measurement (Revised)','subjects':'Physics','created_utc':'2026-02-01','content_sha256':'b'*64}
        c={'record_id':'AZDOC-C','title':'Notes on Orbital Mechanics','subjects':'Physics','created_utc':'2026-03-01','content_sha256':'c'*64}
        self.assertEqual(title_lineage_core(a['title']), title_lineage_core(b['title']))
        self.assertEqual(subject_key('Unclassified'),'')
        pairs=propose_all_links([a,b,c])
        self.assertEqual(len(pairs),1)
        self.assertEqual(pairs[0]['predecessor_id'],'AZDOC-A')
        self.assertEqual(pairs[0]['successor_id'],'AZDOC-B')
    def test_zsolver_cap_and_separate_from_triad(self):
        high=local_zsolver_score([{'pattern_id':'P1','value':'yes'},{'pattern_id':'P2','value':'unknown'}])
        self.assertEqual(high['capped_confidence'],0.75)
        self.assertEqual(high['uncertainty'],0.25)
        self.assertTrue(high['separate_from_triad'])
        self.assertFalse(high['solves_cases'])
        blob=json.dumps(review_document(title='Lab note',body='Independent primary source measurement of 12 joules at 3 kelvin. Archive hash recorded.',filename='note.txt',sha256='b'*64,author='Aziel Eliab',library='aziel',structure={'ok':True},coverage=triad_coverage_points(3)))
        self.assertNotRegex(blob,r'boost|library_bonus|coveragePoints')
        self.assertTrue(all(a['value'] in {'yes','no','unknown'} for a in derive_zsolver_answers({'title':'Lab note','body':'measurement'})))
    def test_content_hash_normalizes(self):
        self.assertEqual(normalize_content_hash('  '+'AB'*32+'  '),'ab'*32)
        self.assertEqual(normalize_content_hash('0x'+'cd'*32),'cd'*32)
        self.assertEqual(normalize_content_hash('not-a-hash'),'')
    def test_jeeves_refusals(self):
        self.assertTrue(should_refuse('bypass quarantine')[0])
        self.assertTrue(should_refuse('what is the operator password')[0])
        self.assertTrue(should_refuse('modify the triad score')[0])
        self.assertTrue(should_refuse('dump the master hash and aziel_session')[0])
        self.assertFalse(should_refuse('Where is Florence in the corpus?')[0])
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
        os.environ['AZIEL_ZSOLVER_LIVE']='0'
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
        self.assertTrue(rec['review']['triad']['ready'])
        chain=v.document_chain(rec['record_id'])
        self.assertTrue(chain['ok'])
        self.assertGreater(chain['sequence'],0)
        self.assertTrue(any(e['action']=='INGEST' for e in chain['entries']))
        self.assertTrue(any(e['action']=='REVIEW_SCORE' for e in chain['entries']))
        again=v.backfill_reviews(limit=10,force=False)
        self.assertGreaterEqual(again['skipped'],1)
        self.assertEqual(again['processed'],0)
        found=v.find_record_id_by_hash(rec['sha256'])
        self.assertEqual(found,rec['record_id'])
        self.assertIsNone(v.find_record_id_by_hash('0'*64))
        self.assertLessEqual(int(rec['review']['triad']['display']),100)
        self.assertIsNotNone(rec.get('zsolver'))
        self.assertIn('capped_confidence',rec['zsolver'])
        self.assertLessEqual(float(rec['zsolver']['capped_confidence']),0.75)
        self.assertNotIn('boost',json.dumps(rec['zsolver']))
        (inp/'A Treatise on Gravity Measurement.txt').write_text('Independent primary source measurement of 4 joules. Archive ledger hash recorded in Florence.',encoding='utf-8')
        (inp/'A Treatise on Gravity Measurement (Revised).txt').write_text('Independent primary source measurement of 4 joules, revised edition. Archive ledger hash recorded in Florence.',encoding='utf-8')
        later=v.ingest([inp/'A Treatise on Gravity Measurement.txt', inp/'A Treatise on Gravity Measurement (Revised).txt'])
        self.assertGreaterEqual(len(later),2)
        rec_a=v.get_record(later[0]['record_id']); rec_b=v.get_record(later[1]['record_id'])
        succ=rec_b.get('succession') or rec_a.get('succession')
        if succ and (succ.get('chain') or []):
            self.assertGreaterEqual(len(succ['chain']),2)
            ids=[x['record_id'] for x in succ['chain']]
            self.assertEqual(ids, sorted(ids, key=lambda i: next(x['created_utc'] for x in succ['chain'] if x['record_id']==i)))
        report=v.backfill_reviews(all_records=True)
        self.assertEqual(report['total'], report['scored']+report['skipped']+report['failed'])
        self.assertIn('scored',report)
        j=jeeves_chat(v,'joules measurement')
        self.assertTrue(j['ok'])
        self.assertFalse(j['refused'])
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
