"""Verifica alcance y cierre B01.05 en ambos repositorios, sin código de aplicación."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT.parent.parent / "Zephyriov"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


entry = json.loads((ROOT / "docs/evidencia/B01.05-entrada.json").read_text())
scope = json.loads((ROOT / "docs/evidencia/B01.05-alcance.json").read_text())
for repo, allowed_repo in zip(entry["repositories"], scope["repositories"]):
    root = Path(repo["root"])
    assert str(root) == allowed_repo["root"]
    names = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=root).decode().split("\0")
    current = {n: sha(root / n) if (root / n).is_file() else None for n in names if n}
    before = repo["before"]
    changes = {n for n in before.keys() | current.keys()
               if n not in before or n not in current or before[n] != current[n]}
    assert changes == set(allowed_repo["allowed"]), (root, changes ^ set(allowed_repo["allowed"]))
    assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root).decode().strip() == repo["head"]
    if root == REFERENCE:
        markers = {
            "README.md": "\n**B01.05 — actividad especificada",
            "Branch_changes.md": "\n## 2026-09-15 — B01.05:",
            "docs/blueprint/reglas-srs.md": "\n## B01.05 — Actividad,",
        }
        for name, marker in markers.items():
            prefix = (root / name).read_text().split(marker)[0]
            assert hashlib.sha256(prefix.encode()).hexdigest() == before[name], name
    for name in changes:
        text = (root / name).read_text()
        assert text.endswith("\n") and all(line == line.rstrip() for line in text.splitlines()), name
    print(f"PASS alcance {root.name}: {len(changes)} archivos autorizados; HEAD y artefactos previos preservados")

state = (ROOT / "docs/next-job").read_text()
fields = ["Punto ejecutado", "Estado", "Siguiente punto autorizado", "Fuente",
          "Repositorio", "Archivos permitidos", "Dependencias verificadas",
          "Pruebas ejecutadas", "Evidencia", "Pendientes manuales", "Riesgos",
          "Última actualización"]
assert len(re.findall(r"^- ", state, re.M)) == len(fields)
for field in fields:
    assert len(re.findall(r"^- " + re.escape(field) + ":", state, re.M)) == 1
assert "- Punto ejecutado: B01.05\n" in state and "- Estado: completado\n" in state
assert "- Siguiente punto autorizado: B01.06\n" in state
assert "planificación → API → infraestructura → Android → web" in state
assert "6. " + chr(96) + "B01.06 [H]" in (REFERENCE / "docs/blueprint/plan-trabajo-agentico.md").read_text()
assert "R17.json" in state and not (REFERENCE / "docs/blueprint/fixtures-srs/R17.json").exists()
assert not (ROOT / "docs/reglas-srs.md").exists() and not (ROOT / "src/domain/fixtures").exists()
for name in ("README.md", "Branch_changes.md", "docs/next-job", "docs/evidencia/B01.05.md"):
    path = ROOT / name
    for link in re.findall(r"\]\(([^)]+)\)", path.read_text()):
        assert (path.parent / link).resolve().is_file(), (name, link)
assert sha(REFERENCE / "docs/blueprint/evidencia/B01.05.sha256") in state
for root, manifest in ((REFERENCE, "docs/blueprint/evidencia/B01.05.sha256"),
                       (ROOT, "docs/evidencia/B01.05.sha256")):
    for line in (root / manifest).read_text().splitlines():
        digest, name = line.split("  ", 1)
        assert sha(root / name) == digest, (root, name)
print("PASS enlaces, 12 campos, manifiestos y B01.05 completado; B01.06 siguiente sin ejecutar")
print("PASS separación de repositorios; sin transferencia T01 ni clientes")
print("NO EJECUTADO: dominio, HTTP/persistencia, Android/web ni tests/lint/build de aplicación")
