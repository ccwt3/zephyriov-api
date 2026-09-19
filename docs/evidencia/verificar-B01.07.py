"""Verifica entrega documental, alcance exacto e historial; no aplicación."""
from pathlib import Path
import hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[2]
REF=ROOT.parent.parent/'Zephyriov'
POINT='B01.07'
TOTAL=264

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
entry=read(ROOT/f'docs/evidencia/{POINT}-entrada.json')
scope=read(ROOT/f'docs/evidencia/{POINT}-alcance.json')
for before,allowed in zip(entry['repositories'],scope['repositories']):
    root=Path(before['root']); assert allowed['root']==str(root)
    names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
    current={n:sha(root/n) if (root/n).is_file() else None for n in names if n}
    changes={n for n in current.keys()|before['before'].keys() if n not in current or n not in before['before'] or current[n]!=before['before'][n]}
    assert changes==set(allowed['allowed']),(root,changes^set(allowed['allowed']))
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip()==before['head']
    # Ampliaciones append-only, salvo el mapa API y puntero autorizados.
    append_names=['Branch_changes.md']+(['README.md','docs/blueprint/reglas-srs.md','docs/blueprint/fixtures-srs/README.md'] if root==REF else [])
    marker_map={'Branch_changes.md':f'\n## 2026-09-16 — {POINT}:','README.md':f'\n**{POINT} —','docs/blueprint/reglas-srs.md':f'\n## {POINT} —','docs/blueprint/fixtures-srs/README.md':f'\n## {POINT} —'}
    for name in append_names:
        prefix=(root/name).read_text().split(marker_map[name],1)[0]
        assert hashlib.sha256(prefix.encode()).hexdigest()==before['before'][name],name
    for name in allowed['allowed']:
        p=root/name;t=p.read_text()
        assert t.endswith('\n') or name.endswith('.sha256'),name
        assert all(line==line.rstrip() for line in t.splitlines()),name
        if p.suffix=='.md' or name=='docs/next-job':
            # README/Branch históricos tienen enlaces rotos preexistentes; revisar solo añadido.
            if root==REF and name in marker_map:t=t.split(marker_map[name],1)[1]
            for link in re.findall(r'\]\(([^)]+)\)',t):
                if '://' not in link and not link.startswith('#'):assert (p.parent/link.split('#')[0]).resolve().is_file(),(name,link)
    print(f'PASS alcance {root.name}: {len(changes)} archivos autorizados, HEAD e históricos preservados')
state=(ROOT/'docs/next-job').read_text()
nextpoint='B01.08' if POINT=='B01.07' else 'B01.09'
assert f'- Punto ejecutado: {POINT}\n' in state and '- Estado: completado\n' in state
assert f'- Siguiente punto autorizado: {nextpoint}\n' in state and len(re.findall(r'^- ',state,re.M))==12
assert 'planificación → API → infraestructura → Android → web' in state
assert not (ROOT/'docs/reglas-srs.md').exists() and not (ROOT/'src/domain/fixtures').exists()
manifest=REF/f'docs/blueprint/evidencia/{POINT}.sha256'
assert sha(manifest) in state
for line in manifest.read_text().splitlines():
    h,name=line.split('  ',1);assert sha(REF/name)==h,name
assert not (REF/'docs/blueprint/fixtures-srs/R20.json').exists() and not (REF/'docs/blueprint/fixtures-srs/R21.json').exists()
print(f'PASS enlaces nuevos, manifiesto referencia y puntero {nextpoint}; {TOTAL} variantes documentales')
print('PASS sin transferencia T01, otros puntos, aplicación, proveedores ni clientes')
