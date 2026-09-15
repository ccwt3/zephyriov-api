"""Verifica entrega documental B01.03 y siguiente punto, sin código de aplicación."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT.parent.parent / "Zephyriov"
DIGEST = "2671b50242c33f6b00066abcd8ae341f208761c7b2d06a41015f809cc8f5b40c"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for name in ("README.md", "Branch_changes.md", "docs/next-job", "docs/evidencia/B01.03.md"):
    path = ROOT / name
    content = path.read_text()
    assert content.endswith("\n") and all(line == line.rstrip() for line in content.splitlines())
    content = re.sub(r"```.*?```", "", content, flags=re.S)
    for link in re.findall(r"\]\(([^)]+)\)", content):
        assert (path.parent / link).resolve().is_file(), (name, link)

state = (ROOT / "docs/next-job").read_text()
fields = ["Punto ejecutado", "Estado", "Siguiente punto autorizado", "Fuente",
          "Repositorio", "Archivos permitidos", "Dependencias verificadas",
          "Pruebas ejecutadas", "Evidencia", "Pendientes manuales", "Riesgos",
          "Última actualización"]
assert len(re.findall(r"^- ", state, re.M)) == len(fields)
for field in fields:
    assert len(re.findall(r"^- " + re.escape(field) + ":", state, re.M)) == 1
assert "- Punto ejecutado: B01.03\n" in state
assert "- Estado: completado\n" in state
assert "- Siguiente punto autorizado: B01.04\n" in state
plan = (REFERENCE / "docs/blueprint/plan-trabajo-agentico.md").read_text()
assert "4. `B01.04 [H]`: R11–R13, profundidad máxima y selección reproducible; pools vacíos/agotados y extremos de preferencias." in plan
for rule in ("R11", "R12", "R13"):
    assert f"{rule}.json" in state
    assert not (REFERENCE / "docs/blueprint/fixtures-srs" / f"{rule}.json").exists()
assert DIGEST == sha(REFERENCE / "docs/blueprint/evidencia/B01.03.sha256")
assert DIGEST in state
assert not (ROOT / "docs/reglas-srs.md").exists()
assert not (ROOT / "src/domain/fixtures").exists()
assert "planificación → API → infraestructura → Android → web" in state
print("PASS API: enlaces y formato; 12 campos del puntero; B01.03 completado, B01.04 siguiente según fuente")
print("PASS evidencia: SHA-256 referencia coincide; sin B01.04 ni transferencia T01; repositorios separados")

scope = json.loads((ROOT / "docs/evidencia/B01.03-alcance.json").read_text())
for repo in scope["repositories"]:
    root = Path(repo["root"])
    names = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=root).decode().split("\0")
    current = {name: sha(root / name) if (root / name).is_file() else None
               for name in names if name}
    before = repo["before"]
    changes = {name for name in before.keys() | current.keys()
               if name not in before or name not in current or before[name] != current[name]}
    assert changes <= set(repo["allowed"]), (root, changes - set(repo["allowed"]))
    excluded = set(repo["selfReferentialArtifacts"])
    assert {k: v for k, v in current.items() if k not in excluded} == repo["after"], root
    assert changes == set(repo["changed"]), root
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root).decode().strip() == repo["head"]
    # Adiciones a README/Branch_changes de referencia no reescriben su contenido previo.
    if root == REFERENCE:
        for name, marker in (("README.md", "\n**B01.03 — repasos especificados"),
                             ("Branch_changes.md", "\n## 2026-09-15 — B01.03:")):
            original = (root / name).read_text().split(marker)[0]
            assert hashlib.sha256(original.encode()).hexdigest() == before[name], name
    print(f"PASS alcance {root.name}: {len(changes)} archivos autorizados; cambios ajenos y HEAD preservados")
print("NO EJECUTADO: SRS/SAN, HTTP, Android/web ni tests/lint/build de aplicación")
