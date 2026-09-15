"""Verifica documentación y puntero API de la entrega B01.02."""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT.parent.parent / 'Zephyriov'
files = ['README.md', 'Branch_changes.md', 'docs/next-job', 'docs/evidencia/B01.02.md']
for name in files:
    p = ROOT / name
    content = p.read_text()
    assert content.endswith('\n')
    assert all(line == line.rstrip() for line in content.splitlines()), name
    content = re.sub(r'```.*?```', '', content, flags=re.S)
    for link in re.findall(r'\]\(([^)]+)\)', content):
        assert (p.parent / link).resolve().is_file(), (name, link)

state = (ROOT / 'docs/next-job').read_text()
fields = ['Punto ejecutado', 'Estado', 'Siguiente punto autorizado', 'Fuente',
          'Repositorio', 'Archivos permitidos', 'Dependencias verificadas',
          'Pruebas ejecutadas', 'Evidencia', 'Pendientes manuales', 'Riesgos',
          'Última actualización']
assert state.startswith('# Estado de trabajo agéntico\n')
assert len(re.findall(r'^- ', state, re.M)) == len(fields)
for field in fields:
    assert len(re.findall(r'^- ' + re.escape(field) + ':', state, re.M)) == 1
assert '- Punto ejecutado: B01.02\n' in state
assert '- Estado: completado\n' in state
assert '- Siguiente punto autorizado: B01.03\n' in state
plan = (REFERENCE / 'docs/blueprint/plan-trabajo-agentico.md').read_text()
assert '3. `B01.03 [H]`: repasos R07–R10, redondeo decimal/fecha, lapse sin reset de profundidad.' in plan
for name in ('R07.json', 'R08.json', 'R09.json', 'R10.json'):
    assert name in state
    assert not (REFERENCE / 'docs/blueprint/fixtures-srs' / name).exists(), 'B01.03 anticipado'
manifest = REFERENCE / 'docs/blueprint/evidencia/B01.02.sha256'
digest = hashlib.sha256(manifest.read_bytes()).hexdigest()
assert digest == '3d876d8ae468b8bba923744c62ff7ab9f6fdb50a083c587c2846b591fe19d3cc'
assert digest in state and digest in (ROOT / 'docs/evidencia/B01.02.md').read_text()
assert not (ROOT / 'docs/reglas-srs.md').exists()
assert not (ROOT / 'src/domain/fixtures').exists()
print('PASS API: 4 documentos, enlaces y formato; 12 campos del puntero')
print('PASS estado: B01.02 completado; siguiente B01.03 contrastado con fuente; sin fixtures anticipados ni transferencia T01')
print('PASS evidencia: hash de manifiesto B01.02 coincide con informe y puntero')
