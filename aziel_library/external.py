from __future__ import annotations
import hashlib, json, os, platform, re, shutil, subprocess, tempfile, time, urllib.request, tarfile, zipfile

from pathlib import Path
RUNTIME_ENV = 'AZIEL_RUNTIME_HOME'
DEFAULT_WHISPER_MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
WHISPER_SOURCE_URL = 'https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.9.2.tar.gz'
WHISPER_BINARIES={('windows','amd64'):('https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip','49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a'),('windows','x86_64'):('https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip','49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a'),('linux','x86_64'):('https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-ubuntu-x64.tar.gz','46811a3ecf584307480a220b9ef5ff81b7b22dc41577cbc274ce3afc61f753b1'),('linux','amd64'):('https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-ubuntu-x64.tar.gz','46811a3ecf584307480a220b9ef5ff81b7b22dc41577cbc274ce3afc61f753b1'),('linux','aarch64'):('https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-ubuntu-arm64.tar.gz','7e26fa6a36d9174d5c0bf033ccbc026c3b5e569e2ee787058241346ef5392719'),('linux','arm64'):('https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-ubuntu-arm64.tar.gz','7e26fa6a36d9174d5c0bf033ccbc026c3b5e569e2ee787058241346ef5392719'),}
# Use raw.githubusercontent.com first. The old github.com/.../raw route has changed


# redirect behavior over time, so a second official-repository URL is retained.
TESSDATA_ENG_URLS = ('https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata','https://github.com/tesseract-ocr/tessdata_fast/raw/refs/heads/main/eng.traineddata',)
def sha256_file(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024), b''): h.update(b)


    return h.hexdigest()
def runtime_home() -> Path:
    p=os.environ.get(RUNTIME_ENV)
    if p: return Path(p).expanduser().resolve()


    return (Path(__file__).resolve().parent.parent/'runtime_assets').resolve()
def app_root() -> Path:


    return Path(__file__).resolve().parent.parent
class ExternalRuntime:

    """
    Resolver/executor for optional local processors.
    Managed assets live under AZIEL_RUNTIME_HOME. On Windows, discovery also checks
    the standard Tesseract install directory and WinGet's package/link directories,so a processor installed moments ago can be used without restarting the app."""
    def __init__(self, home: Path|str|None=None):
        self.home=Path(home).expanduser().resolve() if home else runtime_home()
        self.bin=self.home/'bin'; self.models=self.home/'models'; self.receipts=self.home/'receipts'

        for d in (self.home,self.bin,self.models,self.receipts): d.mkdir(parents=True,exist_ok=True)
    def _windows_extra_candidates(self, name: str):
        if os.name!='nt': return
        exe=name if name.lower().endswith(('.exe','.bat','.cmd')) else name+'.exe'
        local=Path(os.environ.get('LOCALAPPDATA','')) if os.environ.get('LOCALAPPDATA') else None
        pf=Path(os.environ.get('ProgramFiles','')) if os.environ.get('ProgramFiles') else None
        pfx86=Path(os.environ.get('ProgramFiles(x86)','')) if os.environ.get('ProgramFiles(x86)') else None
        direct=[]
        if local:
            direct += [local/'Microsoft'/'WinGet'/'Links'/exe]
            if name.lower().startswith('tesseract'):
                direct += [local/'Programs'/'Tesseract-OCR'/'tesseract.exe']
        if pf and name.lower().startswith('tesseract'): direct += [pf/'Tesseract-OCR'/'tesseract.exe']
        if pfx86 and name.lower().startswith('tesseract'): direct += [pfx86/'Tesseract-OCR'/'tesseract.exe']
        for p in direct:
            if p.is_file(): yield str(p)
        if not local: return
        packages=local/'Microsoft'/'WinGet'/'Packages'
        if not packages.is_dir(): return
        prefixes=[]
        lo=name.lower()
        if lo=='pdftoppm': prefixes=['oschwartz10612.Poppler_','Poppler.Poppler_']
        elif lo=='ffmpeg': prefixes=['Gyan.FFmpeg_','BtbN.FFmpeg_']
        elif lo.startswith('tesseract'): prefixes=['UB-Mannheim.TesseractOCR_','tesseract-ocr.tesseract_']
        for prefix in prefixes:
            for package_dir in packages.glob(prefix+'*'):
                try:
                    for p in package_dir.rglob(exe):
                        if p.is_file(): yield str(p)
                except OSError:

                    continue
    def _candidates(self, name: str):

        names=[name]
        if os.name=='nt' and not name.lower().endswith(('.exe','.bat','.cmd')):
            names=[name+'.exe', name+'.bat', name+'.cmd', name]
        for n in names:
            p=self.bin/n
            if p.exists(): yield str(p)
        for n in names:
            p=shutil.which(n)
            if p: yield p
        if os.name=='nt':

            yield from self._windows_extra_candidates(name)
    def find(self, *names: str) -> str|None:
        seen=set()
        for name in names:
            for p in self._candidates(name):
                key=os.path.normcase(os.path.abspath(p))
                if key in seen: continue
                seen.add(key)
                if Path(p).exists(): return p

        return None
    def version(self, *names: str) -> str:
        exe=self.find(*names)
        if not exe: return ''
        for arg in ('--version','-version','-v'):
            try:
                r=subprocess.run([exe,arg],capture_output=True,text=True,errors='replace',timeout=12)
                s=(r.stdout or r.stderr).strip().splitlines()
                if r.returncode==0 and s: return s[0][:240]
            except Exception:
                pass

        return 'present'
    def _last_selftest(self) -> dict:
        p=self.receipts/'ocr_selftest_latest.json'
        if not p.is_file(): return {}
        try: return json.loads(p.read_text('utf-8'))

        except Exception: return {}
    def status(self) -> dict:
        model=self.whisper_model(); tess=self.find('tesseract'); pop=self.find('pdftoppm')
        local_eng=self.home/'tessdata'/'eng.traineddata'

        return {'runtime_home':str(self.home),'tesseract':{'path':tess,'version':self.version('tesseract')},'pdftoppm':{'path':pop,'version':self.version('pdftoppm')},'ffmpeg':{'path':self.find('ffmpeg'),'version':self.version('ffmpeg')},'whisper':{'path':self.find('whisper-cli','main'),'version':self.version('whisper-cli','main')},'whisper_model':{'path':str(model) if model else '', 'sha256':sha256_file(model) if model else ''},'local_tessdata':{'path':str(local_eng) if local_eng.is_file() else '', 'sha256':sha256_file(local_eng) if local_eng.is_file() else ''},'last_ocr_self_test':self._last_selftest(),'ready':{'image_ocr':bool(tess),'pdf_ocr':bool(tess and pop),'speech':bool(self.find('ffmpeg') and self.find('whisper-cli','main') and model),}}
    def whisper_model(self) -> Path|None:
        env=os.environ.get('AZIEL_WHISPER_MODEL')
        if env and Path(env).exists(): return Path(env).expanduser().resolve()
        for pat in ('ggml-base.en.bin','ggml-base.bin','ggml-small.en.bin','*.bin'):
            hits=sorted((self.models/'whisper').glob(pat)) if (self.models/'whisper').exists() else []
            if hits: return hits[0]

        return None
    def _tesseract_env(self, lang='eng') -> tuple[dict,bool]:
        env=os.environ.copy(); td=self.home/'tessdata'/f'{lang}.traineddata'
        # Never point Tesseract at an empty/failed-download directory. If the local
        # model is missing, let the installed Tesseract use its own known-good data.
        if td.is_file() and td.stat().st_size>1024:
            env['TESSDATA_PREFIX']=str(td.parent); return env,True
        env.pop('TESSDATA_PREFIX',None)

        return env,False
    def ocr_image(self, path: Path, lang='eng', psm='3') -> tuple[str,dict]:
        exe=self.find('tesseract')
        if not exe: return '',{}
        env,using_local=self._tesseract_env(lang)
        cmd=[exe,str(path),'stdout','-l',lang,'--psm',str(psm)]
        r=subprocess.run(cmd,capture_output=True,text=True,errors='replace',env=env,timeout=600)
        # A locally downloaded language file must never make a working system
        # Tesseract unusable. Retry against the install's normal tessdata once.
        if r.returncode!=0 and using_local:

            env2=os.environ.copy(); env2.pop('TESSDATA_PREFIX',None)
            r2=subprocess.run(cmd,capture_output=True,text=True,errors='replace',env=env2,timeout=600)
            if r2.returncode==0: r=r2; using_local=False
        if r.returncode!=0: raise RuntimeError((r.stderr or r.stdout)[-1600:])

        return r.stdout, {'processor':'TESSERACT','processor_version':self.version('tesseract'),'language':lang,'tessdata_source':'aziel-local' if using_local else 'tesseract-install'}
    @staticmethod
    def _page_number(p: Path) -> int:
        m=re.search(r'-(\d+)\.[^.]+$',p.name)

        return int(m.group(1)) if m else 10**9
    def ocr_pdf(self, path: Path, lang='eng', dpi=200, max_pages=500) -> tuple[str,dict]:
        pop=self.find('pdftoppm'); tess=self.find('tesseract')
        if not pop or not tess: return '',{}
        with tempfile.TemporaryDirectory(prefix='aziel_pdfocr_') as td:
            prefix=Path(td)/'page'
            r=subprocess.run([pop,'-png','-r',str(dpi),'-f','1','-l',str(max_pages),str(path),str(prefix)],capture_output=True,text=True,errors='replace',timeout=3600)
            if r.returncode!=0: raise RuntimeError((r.stderr or r.stdout)[-1600:])
            chunks=[]; pages=sorted(Path(td).glob('page-*.png'),key=self._page_number)
            if not pages: raise RuntimeError('pdftoppm produced no page images')
            for i,p in enumerate(pages,1):
                txt,_=self.ocr_image(p,lang=lang); chunks.append(f'[[PAGE {i}]]\n{txt}')

            return '\n'.join(chunks), {'processor':'POPPLER+TESSERACT','processor_version':self.version('tesseract'),'renderer_version':self.version('pdftoppm'),'language':lang,'dpi':dpi,'pages':len(pages)}
    def self_test_ocr(self, write_receipt=True) -> dict:
        """Run real local image + scanned-PDF OCR against bundled raster fixtures."""
        img=app_root()/'data'/'ocr_selftest.png'; pdf=app_root()/'data'/'ocr_selftest_scanned.pdf'
        result={'created_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'image_ok':False,'pdf_ok':False,'ok':False,'errors':[]}
        result['tesseract']=self.find('tesseract') or ''; result['pdftoppm']=self.find('pdftoppm') or ''
        try:
            if not img.is_file(): raise RuntimeError('bundled OCR image fixture is missing')
            txt,meta=self.ocr_image(img,psm='6'); result['image_text']=txt[:500]; result['image_meta']=meta
            result['image_ok']='AZIEL' in txt.upper() and '7319' in txt
            if not result['image_ok']: result['errors'].append('image OCR output did not contain expected self-test tokens')
        except Exception as e:
            result['errors'].append('image OCR: '+str(e)[:1000])
        try:
            if not pdf.is_file(): raise RuntimeError('bundled scanned-PDF fixture is missing')
            txt,meta=self.ocr_pdf(pdf,dpi=150,max_pages=3); result['pdf_text']=txt[:700]; result['pdf_meta']=meta
            result['pdf_ok']='AZIEL' in txt.upper() and '7319' in txt
            if not result['pdf_ok']: result['errors'].append('scanned-PDF OCR output did not contain expected self-test tokens')
        except Exception as e:
            result['errors'].append('scanned PDF OCR: '+str(e)[:1000])
        result['ok']=bool(result['image_ok'] and result['pdf_ok'])
        if write_receipt:
            self.receipts.mkdir(parents=True,exist_ok=True)
            (self.receipts/'ocr_selftest_latest.json').write_text(json.dumps(result,indent=2),encoding='utf-8')

        return result
    def transcribe(self, path: Path) -> tuple[str,dict]:
        ff=self.find('ffmpeg'); wh=self.find('whisper-cli','main'); model=self.whisper_model()
        if not (ff and wh and model): return '',{}
        with tempfile.TemporaryDirectory(prefix='aziel_speech_') as td:
            wav=Path(td)/'audio.wav'; out=Path(td)/'transcript'
            r=subprocess.run([ff,'-nostdin','-y','-i',str(path),'-ac','1','-ar','16000',str(wav)],capture_output=True,text=True,errors='replace',timeout=1800)
            if r.returncode!=0: raise RuntimeError((r.stderr or r.stdout)[-1200:])
            r=subprocess.run([wh,'-m',str(model),'-f',str(wav),'-otxt','-of',str(out)],capture_output=True,text=True,errors='replace',timeout=7200)
            if r.returncode!=0: raise RuntimeError((r.stderr or r.stdout)[-1200:])
            txt=(out.with_suffix('.txt')).read_text('utf-8',errors='replace') if out.with_suffix('.txt').exists() else r.stdout


            return txt, {'processor':'FFMPEG+WHISPER_CPP','processor_version':self.version('whisper-cli','main'),'ffmpeg_version':self.version('ffmpeg'),'model_path':str(model),'model_sha256':sha256_file(model)}
class BootstrapManager:
    """
        Acquire optional processors and prove that requested OCR actually works."""
    def __init__(self, home: Path|str|None=None): self.rt=ExternalRuntime(home)
    def _run(self, cmd, dry_run=False):
        if dry_run: return {'cmd':cmd,'returncode':None,'dry_run':True}
        r=subprocess.run(cmd,text=True,errors='replace',capture_output=True)

        return {'cmd':cmd,'returncode':r.returncode,'stdout':r.stdout[-3000:],'stderr':r.stderr[-3000:]}
    def _package_commands(self, profile='recommended') -> list[list[str]]:
        want=set()
        if profile in {'ocr','recommended','all'}: want.update({'tesseract','poppler'})
        if profile in {'speech','recommended','all'}: want.add('ffmpeg')
        sysname=platform.system().lower(); cmds=[]
        if sysname=='windows' and shutil.which('winget'):
            ids={'ffmpeg':'Gyan.FFmpeg','tesseract':'UB-Mannheim.TesseractOCR','poppler':'oschwartz10612.Poppler'}
            for x in sorted(want):
                cmds.append(['winget','install','--exact','--id',ids[x],'--accept-source-agreements','--accept-package-agreements'])
        elif sysname=='darwin' and shutil.which('brew'):
            pk=[x for x in ('ffmpeg','tesseract','poppler') if x in want]
            if profile in {'speech','recommended','all'}: pk.append('cmake')
            if pk: cmds.append(['brew','install',*pk])
        elif sysname=='linux':

            if shutil.which('apt-get'):
                pk=[]
                if 'ffmpeg' in want: pk.append('ffmpeg')
                if 'tesseract' in want: pk.append('tesseract-ocr')
                if 'poppler' in want: pk.append('poppler-utils')
                if pk:
                    pref=[] if (hasattr(os,'geteuid') and os.geteuid()==0) else (['sudo'] if shutil.which('sudo') else [])
                    cmds.append(pref+['apt-get','update']); cmds.append(pref+['apt-get','install','-y',*pk])
            elif shutil.which('dnf'):
                pk=[]
                if 'ffmpeg' in want: pk.append('ffmpeg')
                if 'tesseract' in want: pk.append('tesseract')
                if 'poppler' in want: pk.append('poppler-utils')
                if pk: cmds.append((['sudo'] if shutil.which('sudo') else [])+['dnf','install','-y',*pk])
            elif shutil.which('pacman'):
                pk=[x for x in ('ffmpeg','tesseract','poppler') if x in want]
                if pk: cmds.append((['sudo'] if shutil.which('sudo') else [])+['pacman','-S','--needed','--noconfirm',*pk])

        return cmds
    def _download(self,url: str,dest: Path,dry_run=False,expected_sha256: str='') -> dict:
        dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists():
            got=sha256_file(dest)
            if expected_sha256 and got.lower()!=expected_sha256.lower(): raise RuntimeError(f'cached asset hash mismatch: {dest}')
            return {'url':url,'path':str(dest),'sha256':got,'expected_sha256':expected_sha256,'status':'already_present'}
        if dry_run: return {'url':url,'path':str(dest),'status':'dry_run'}
        tmp=dest.with_suffix(dest.suffix+'.partial'); tmp.unlink(missing_ok=True)
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'AzielDigitalLibrary/2.7.0','Accept':'*/*'})
            with urllib.request.urlopen(req,timeout=90) as r, tmp.open('wb') as f:
                while True:
                    b=r.read(1024*1024)
                    if not b: break
                    f.write(b)
                f.flush(); os.fsync(f.fileno())
            if not tmp.is_file() or tmp.stat().st_size==0: raise RuntimeError('download produced an empty file')
            got=sha256_file(tmp)
            if expected_sha256 and got.lower()!=expected_sha256.lower(): raise RuntimeError(f'download hash mismatch for {url}: {got}')
            os.replace(tmp,dest)
            return {'url':url,'path':str(dest),'sha256':got,'expected_sha256':expected_sha256,'bytes':dest.stat().st_size,'status':'downloaded'}
        except Exception:
            tmp.unlink(missing_ok=True)
            # Remove newly-created empty directories so they cannot poison runtime
            # discovery (notably TESSDATA_PREFIX).
            try:
                if dest.parent.exists() and not any(dest.parent.iterdir()): dest.parent.rmdir()
            except OSError:
                pass

            raise
    def _download_any(self, urls, dest: Path, dry_run=False, expected_sha256: str='') -> dict:
        errors=[]
        for url in urls:
            try: return self._download(url,dest,dry_run=dry_run,expected_sha256=expected_sha256)
            except Exception as e: errors.append(f'{url}: {e}')

        raise RuntimeError('all download sources failed; '+' | '.join(errors[-3:]))
    def _install_whisper_binary(self,dry_run=False) -> dict:
        if self.rt.find('whisper-cli','main'): return {'status':'already_present','path':self.rt.find('whisper-cli','main')}
        key=(platform.system().lower(),platform.machine().lower()); asset=WHISPER_BINARIES.get(key)
        if asset:
            url,expected=asset; name=url.rsplit('/',1)[-1]; archive=self.rt.home/'downloads'/name
            dl=self._download(url,archive,dry_run=dry_run,expected_sha256=expected)
            if dry_run: return {'status':'dry_run','asset':dl}
            with tempfile.TemporaryDirectory(prefix='aziel_whisper_bin_') as td:
                td=Path(td)
                if archive.suffix.lower()=='.zip':
                    with zipfile.ZipFile(archive) as z: z.extractall(td)
                else:
                    with tarfile.open(archive,'r:*') as t: t.extractall(td)
                candidates=list(td.rglob('whisper-cli.exe'))+list(td.rglob('whisper-cli'))+list(td.rglob('main.exe'))+list(td.rglob('main'))
                candidates=[x for x in candidates if x.is_file()]
                if not candidates: raise RuntimeError('whisper.cpp release archive did not contain a CLI executable')
                src=candidates[0]
                for f in src.parent.iterdir():
                    if f.is_file():
                        dst=self.rt.bin/f.name; shutil.copy2(f,dst)
                        try: dst.chmod(dst.stat().st_mode|0o111)
                        except OSError: pass
            return {'status':'installed_release_binary','asset':dl,'path':self.rt.find('whisper-cli','main')}
        archive=self.rt.home/'sources'/'whisper.cpp-v1.9.2.tar.gz'; dl=self._download(WHISPER_SOURCE_URL,archive,dry_run=dry_run)
        if dry_run: return {'status':'dry_run_source_build','asset':dl}
        cmake=shutil.which('cmake')
        if not cmake: return {'status':'needs_cmake','asset':dl}
        srcroot=self.rt.home/'buildsrc'/'whisper.cpp-v1.9.2'; build=self.rt.home/'build'/'whisper.cpp-v1.9.2'

        if not srcroot.exists():
            srcroot.parent.mkdir(parents=True,exist_ok=True)
            with tempfile.TemporaryDirectory(prefix='aziel_whisper_src_') as td:
                with tarfile.open(archive,'r:*') as t: t.extractall(td)
                tops=[x for x in Path(td).iterdir() if x.is_dir()]
                if not tops: raise RuntimeError('invalid whisper.cpp source archive')
                shutil.copytree(tops[0],srcroot)
        build.mkdir(parents=True,exist_ok=True)
        cfg=self._run([cmake,'-S',str(srcroot),'-B',str(build),'-DWHISPER_BUILD_TESTS=OFF','-DWHISPER_BUILD_EXAMPLES=ON'])
        if cfg['returncode']!=0: return {'status':'cmake_configure_failed','configure':cfg,'asset':dl}
        bld=self._run([cmake,'--build',str(build),'--config','Release','-j','2'])
        if bld['returncode']!=0: return {'status':'cmake_build_failed','build':bld,'asset':dl}
        candidates=list(build.rglob('whisper-cli'))+list(build.rglob('whisper-cli.exe'))
        if not candidates: return {'status':'built_but_cli_not_found','asset':dl}
        src=candidates[0]
        for f in src.parent.iterdir():
            if f.is_file():
                dst=self.rt.bin/f.name; shutil.copy2(f,dst)
                try: dst.chmod(dst.stat().st_mode|0o111)
                except OSError: pass

        return {'status':'built_from_source','asset':dl,'path':self.rt.find('whisper-cli','main')}
    def bootstrap(self,profile='recommended',auto=False,dry_run=False,download_models=True) -> dict:
        before=self.rt.status(); actions=[]; downloads=[]; errors=[]
        if auto:
            for cmd in self._package_commands(profile):
                action=self._run(cmd,dry_run=dry_run); actions.append(action)
                if action.get('returncode') not in (None,0): errors.append('package install failed: '+' '.join(cmd))
        if profile in {'speech','recommended','all'}:
            try: actions.append({'whisper_cpp':self._install_whisper_binary(dry_run=dry_run)})
            except Exception as e:
                actions.append({'whisper_cpp':{'status':'failed','error':str(e)}}); errors.append('whisper.cpp: '+str(e))
        if download_models and profile in {'speech','recommended','all'}:
            try: downloads.append(self._download(DEFAULT_WHISPER_MODEL_URL,self.rt.models/'whisper'/'ggml-base.en.bin',dry_run=dry_run))
            except Exception as e: downloads.append({'status':'failed','url':DEFAULT_WHISPER_MODEL_URL,'error':str(e)}); errors.append('whisper model: '+str(e))
        if profile in {'ocr','recommended','all'}:
            try: downloads.append(self._download_any(TESSDATA_ENG_URLS,self.rt.home/'tessdata'/'eng.traineddata',dry_run=dry_run))
            except Exception as e:
                # A failed optional local language-data mirror does not invalidate a
                # working Tesseract install; the self-test below is authoritative.
                downloads.append({'status':'failed','urls':list(TESSDATA_ENG_URLS),'error':str(e)}); errors.append('local tessdata: '+str(e))
        if profile in {'speech','all'}:
            try: downloads.append(self._download(WHISPER_SOURCE_URL,self.rt.home/'sources'/'whisper.cpp-v1.9.2.tar.gz',dry_run=dry_run))
            except Exception as e: downloads.append({'status':'failed','url':WHISPER_SOURCE_URL,'error':str(e)}); errors.append('whisper source: '+str(e))
        after=self.rt.status(); ocr_test={}
        if not dry_run and profile in {'ocr','recommended','all'}:
            ocr_test=self.rt.self_test_ocr(write_receipt=True)
            if not ocr_test.get('ok'): errors.extend(ocr_test.get('errors',[]))
            after=self.rt.status()
        ready=after.get('ready',{})
        ocr_complete=True if profile not in {'ocr','recommended','all'} else bool(ocr_test.get('ok'))
        speech_complete=True if profile not in {'speech','recommended','all'} else bool(ready.get('speech'))
        # `recommended` can still launch with OCR working if optional speech setup
        # fails, but the receipt makes the partial state explicit.
        complete = ocr_complete and (speech_complete if profile in {'speech','all'} else True)
        receipt={'created_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'profile':profile,'auto':auto,'dry_run':dry_run,'before':before,'actions':actions,'downloads':downloads,'ocr_self_test':ocr_test,'ocr_complete':ocr_complete,'speech_complete':speech_complete,'complete':complete,'errors':errors,'after':after}
        if not dry_run:
            p=self.rt.receipts/(time.strftime('%Y%m%d_%H%M%S',time.gmtime())+'_bootstrap.json'); p.write_text(json.dumps(receipt,indent=2),encoding='utf-8'); receipt['receipt_path']=str(p)
        return receipt
