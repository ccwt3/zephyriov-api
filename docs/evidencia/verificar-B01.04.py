"""Verifica cierre documental B01.04, siguiente punto y alcance de ambos repos."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT.parent.parent / 'Zephyriov'
DIGEST = '2da3b20c1263847b34ae1e044d64ad8b697c75132241d36f3e23af895e3a2b5d'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for name in ('README.md','Branch_changes.md','docs/next-job','docs/evidencia/B01.04.md'):
    path=ROOT/name
    text=path.read_text()
    assert text.endswith('\n') and all(l==l.rstrip() for l in text.splitlines())
    for link in re.findall(r'\]\(([^)]+)\)',text):
        assert (path.parent/link).resolve().is_file(), (name,link)
state=(ROOT/'docs/next-job').read_text()
fields=['Punto ejecutado','Estado','Siguiente punto autorizado','Fuente','Repositorio',
        'Archivos permitidos','Dependencias verificadas','Pruebas ejecutadas','Evidencia',
        'Pendientes manuales','Riesgos','Última actualización']
assert len(re.findall(r'^- ',state,re.M)) == len(fields)
for field in fields:
    assert len(re.findall(r'^- '+re.escape(field)+':',state,re.M)) == 1
assert '- Punto ejecutado: B01.04\n' in state
assert '- Estado: completado\n' in state
assert '- Siguiente punto autorizado: B01.05\n' in state
plan=(REFERENCE/'docs/blueprint/plan-trabajo-agentico.md').read_text()
assert '5. `B01.05 [H]`: R14–R16, evidencia de actividad, cancelaciones y racha sin nuevas.' in plan
for rule in ('R14','R15','R16'):
    assert f'{rule}.json' in state
    assert not (REFERENCE/'docs/blueprint/fixtures-srs'/f'{rule}.json').exists()
assert sha(REFERENCE/'docs/blueprint/evidencia/B01.04.sha256') == DIGEST and DIGEST in state
assert 'planificación → API → infraestructura → Android → web' in state
assert not (ROOT/'docs/reglas-srs.md').exists() and not (ROOT/'src/domain/fixtures').exists()
print('PASS API: 12 campos, enlaces, B01.04 completado y B01.05 siguiente según fuentes; sin ejecutar R14–R16/T01')
print('PASS evidencia: manifiesto B01.04 de referencia coincide; 132 variantes; repositorios separados')

scope=json.loads((ROOT/'docs/evidencia/B01.04-alcance.json').read_text())
for repo in scope['repositories']:
    root=Path(repo['root'])
    names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
    current={n:sha(root/n) if (root/n).is_file() else None for n in names if n}
    before=repo['before']
    changes={n for n in before.keys()|current.keys() if n not in before or n not in current or before[n]!=current[n]}
    assert changes <= set(repo['allowed']), (root,changes-set(repo['allowed']))
    assert changes == set(repo['changed'])
    excluded=set(repo['selfReferentialArtifacts'])
    assert {n:h for n,h in current.items() if n not in excluded} == repo['after'], root
    assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root).decode().strip() == repo['head']
    if root == REFERENCE:
        markers={'README.md':'\n**B01.04 — profundidad y selección especificadas',
                 'Branch_changes.md':'\n## 2026-09-15 — B01.04:',
                 'docs/blueprint/reglas-srs.md':'\n## B01.04 — Profundidad máxima y selección reproducible'}
        for name,marker in markers.items():
            prefix=(root/name).read_text().split(marker)[0]
            assert hashlib.sha256(prefix.encode()).hexdigest() == before[name], name
    for name in changes-excluded:
        path=root/name
        if path.suffix in ('.md','.json','.py','.txt','.sha256') or name=='docs/next-job':
            text=path.read_text()
            assert text.endswith('\n') and all(l==l.rstrip() for l in text.splitlines()), name
    print(f'PASS alcance {root.name}: {len(changes)} archivos autorizados; HEAD y cambios previos conservados')
print('NO EJECUTADO: dominio/PRNG productivo/SAN, HTTP, Android/web ni tests/lint/build de aplicación')
