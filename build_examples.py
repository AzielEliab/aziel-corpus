from pathlib import Path

from aziel_library.training import build_knowledge_kit, train_text_classifier
out=Path(__file__).parent/'examples'/'generated'; out.mkdir(parents=True,exist_ok=True)
build_knowledge_kit(out/'aziel_demo_entities.azk','aziel.demo.entities.v1',entities=[{'type':'PERSON','name':'Leonardo da Vinci','aliases':['Leonardo','da Vinci']},{'type':'DOCUMENT','name':'Codex Atlanticus','aliases':['Atlantic Codex']},],places=[{'name':'Florence','aliases':['Firenze'],'lat':43.7696,'lon':11.2558}],dictionary=['manuscript','codex','provenance'],metadata={'purpose':'Example only'})
train_text_classifier([('Research','manuscript codex research translation analysis historical archive'),('Research','theory framework evidence discovery manuscript'),('Technology','software database code algorithm server circuit'),('Technology','python software runtime model package database'),('Legal','court motion custody evidence attorney filing'),('Legal','hearing order petitioner respondent legal evidence'),],out/'aziel_demo_subjects.azm','aziel.demo.subjects.v1')
print('Created:',*(str(p) for p in sorted(out.iterdir())),sep='\n - ')
