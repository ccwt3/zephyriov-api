"""Verifica alcance documental de la entrega sin modificar históricos."""
from pathlib import Path
import hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[2]
REF=ROOT.parent.parent/'Zephyriov'
POINT='B01.09'
NEXT='B01.10'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
entry=read(ROOT/f'docs/evidencia/{POINT}-entrada.json')
scope=read(ROOT/f'docs/evidencia/{POINT}-alcance.json')
for before,allowed in zip(entry['repositories'],scope['repositories']):
    root=Path(before['root']);assert str(root)==allowed['root']
    names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
    current={n:sha(root/n) if (root/n).is_file() else None for n in names if n}
    changes={n for n in current.keys()|before['before'].keys() if n not in current or n not in before['before'] or current[n]!=before['before'][n]}
    assert changes==set(allowed['allowed']),(root,changes^set(allowed['allowed']))
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()==before['head']
    markers={'Branch_changes.md':f'\n## 2026-09-16 — {POINT}:','README.md':f'\n**{POINT} —','docs/blueprint/reglas-srs.md':f'\n## {POINT} —','docs/blueprint/fixtures-srs/README.md':f'\n## {POINT} —'}
    for name in allowed['allowed']:
        p=root/name;t=p.read_text()
        assert t.endswith('\n') and all(line==line.rstrip() for line in t.splitlines()),name
        if name in markers and (root==REF or name=='Branch_changes.md'):
            prefix,addition=t.split(markers[name],1)
            assert hashlib.sha256(prefix.encode()).hexdigest()==before['before'][name],name
            t=addition
        if p.suffix=='.md' or name=='docs/next-job':
            for link in re.findall(r'\]\(([^)]+)\)',t):
                if '://' not in link and not link.startswith('#'):assert (p.parent/link.split('#')[0]).resolve().is_file(),(name,link)
    print(f'PASS alcance {root.name}: {len(changes)} archivos; HEAD, históricos y cambios previos intactos')
state=(ROOT/'docs/next-job').read_text()
assert f'- Punto ejecutado: {POINT}\n' in state and '- Estado: completado\n' in state
assert f'- Siguiente punto autorizado: {NEXT}\n' in state
assert 'planificación → API → infraestructura → Android → web' in state
manifest=REF/f'docs/blueprint/evidencia/{POINT}.sha256'
assert sha(manifest) in state
for line in manifest.read_text().splitlines():
    h,name=line.split('  ',1);assert sha(REF/name)==h,name
assert not (ROOT/'docs/reglas-srs.md').exists() and not (ROOT/'src/domain/fixtures').exists()
print(f'PASS enlaces, manifiesto referencia y puntero {NEXT}; sin T01 ni desarrollo de aplicaciones')
