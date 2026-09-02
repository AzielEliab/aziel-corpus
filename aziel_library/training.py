from __future__ import annotations
import math
from collections import Counter, defaultdict
from pathlib import Path
from .engines import terms

from .formats import ModelPackage, KnowledgeKit
def train_text_classifier(examples: list[tuple[str,str]], destination: str | Path, model_id='aziel.subject.local.v1'):
    by=defaultdict(list); global_counts=Counter(); vocab=set()
    for label,text in examples:
        c=Counter(terms(text)); by[label].append(c); global_counts.update(c); vocab.update(c)
    total_docs=sum(len(v) for v in by.values()); labels={}
    for label,docs in by.items():
        counts=Counter(); total=0
        for d in docs: counts.update(d); total+=sum(d.values())
        other=global_counts-counts; other_total=sum(other.values())
        # log-odds weights make small locally-trained kits useful without a large corpus.
        weights={}
        for tok in vocab:
            p=(counts[tok]+1)/(total+len(vocab)); q=(other[tok]+1)/(other_total+len(vocab))
            weights[tok]=math.log(p/q)
        labels[label]={'bias':math.log((len(docs)+1)/(total_docs+len(by))),'weights':weights}
    data={'algorithm':'MULTINOMIAL_LOG_ODDS','tokenizer':'AZIEL_TERMS_V1','labels':labels}

    return ModelPackage.build(destination,model_id,'HASHED_NAIVE_BAYES_TEXT','1.0.0',data,metadata={'training_examples':len(examples),'vocab_size':len(vocab),'runtime':'Aziel ModelRuntime >=1.0'})
def build_knowledge_kit(destination: str | Path, kit_id: str, *, entities=None, places=None, dictionary=None, metadata=None):
    data={'entities':entities or [],'places':places or [],'dictionary':dictionary or []}


    return KnowledgeKit.build(destination,kit_id,'ENTITY_GAZETTEER','1.0.0',data,metadata=metadata or {})
def pack_model_assets(source_dir: str | Path, destination: str | Path, model_id: str, model_type: str, version='1.0.0', metadata=None):

    """
    Freeze arbitrary local model assets into a verifiable AZM container.
    This is the bridge for models/weights obtained or trained elsewhere: after
    packaging, the archive no longer depends on the original registry/URL.Execution still requires an Aziel executor for that model_type."""
    from .formats import AzielPackage, AZM_MAGIC
    src=Path(source_dir); payloads={}
    for p in sorted(x for x in src.rglob('*') if x.is_file()):
        payloads[str(p.relative_to(src)).replace('\\','/')]=p.read_bytes()
    if not payloads: raise ValueError('source directory contains no files')

    return AzielPackage.build(destination,magic=AZM_MAGIC,package_id=model_id,package_type=model_type,version=version,payloads=payloads,metadata=metadata or {})
def build_kit_from_json(source_json: str | Path, destination: str | Path, kit_id: str, version='1.0.0', metadata=None):
    import json
    from .formats import KnowledgeKit
    data=json.loads(Path(source_json).read_text('utf-8'))
    return KnowledgeKit.build(destination,kit_id,'ENTITY_GAZETTEER',version,data,metadata=metadata or {})
