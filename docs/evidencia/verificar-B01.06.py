"""Comprueba alcance B01.06, prefijos históricos y siguiente punto; sin aplicación."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = ROOT.parent.parent / "Zephyriov"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


entry = json.loads((ROOT / "docs/evidencia/B01.06-entrada.json").read_text())
scope = json.loads((ROOT / "docs/evidencia/B01.06-alcance.json").read_text())
assert entry["version"] == scope["version"] == "B01.06-v1"
assert len(entry["repositories"]) == len(scope["repositories"]) == 2
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
            "README.md": "\n**B01.06 — repertorio",
            "Branch_changes.md": "\n## 2026-09-15 — B01.06:",
            "docs/blueprint/reglas-srs.md": "\n## B01.06 — Repertorio,",
            "docs/blueprint/fixtures-srs/README.md": "\n## B01.06 — Retiro,",
        }
        for name, marker in markers.items():
            prefix, suffix = (root / name).read_text().split(marker, 1)
            assert digest(prefix) == before[name], name
            for link in re.findall(r"\]\(([^)]+)\)", suffix):
                assert (root / name).parent.joinpath(link).resolve().is_file(), (name, link)
    else:
        branch = (root / "Branch_changes.md").read_text().split("\n## 2026-09-15 — B01.06 completado")[0]
        assert digest(branch) == before["Branch_changes.md"]
        readme = (root / "README.md").read_text().split("\n[Informe B01.06 y evidencia]")[0]
        readme = (readme.replace("B01.01–B01.06", "B01.01–B01.05")
                  .replace("reglas R01–R17", "reglas R01–R16")
                  .replace("208 fixtures declarativos", "184 fixtures declarativos")
                  .replace("B01.07 queda registrado", "B01.06 queda registrado"))
        assert digest(readme) == before["README.md"]
    for name in changes:
        text = (root / name).read_text()
        # El manifiesto API se sella con sha256sum después de guardar esta salida.
        if name != "docs/evidencia/B01.06.sha256":
            assert text.endswith("\n"), name
        assert all(line == line.rstrip() for line in text.splitlines()), name
    print(f"PASS alcance {root.name}: {len(changes)} archivos autorizados; HEAD, prefijos e históricos preservados")

state = (ROOT / "docs/next-job").read_text()
fields = ["Punto ejecutado", "Estado", "Siguiente punto autorizado", "Fuente",
          "Repositorio", "Archivos permitidos", "Dependencias verificadas",
          "Pruebas ejecutadas", "Evidencia", "Pendientes manuales", "Riesgos",
          "Última actualización"]
assert len(re.findall(r"^- ", state, re.M)) == len(fields)
for field in fields:
    assert len(re.findall(r"^- " + re.escape(field) + ":", state, re.M)) == 1
assert "- Punto ejecutado: B01.06\n" in state and "- Estado: completado\n" in state
assert "- Siguiente punto autorizado: B01.07\n" in state
assert "planificación → API → infraestructura → Android → web" in state
assert "7. " + chr(96) + "B01.07 [H]" in (REFERENCE / "docs/blueprint/plan-trabajo-agentico.md").read_text()
for family in ("R18", "R19", "R20", "R21", "R22"):
    assert not (REFERENCE / f"docs/blueprint/fixtures-srs/{family}.json").exists()
assert "R18.json" in state and "R22.json" in state
assert not (ROOT / "docs/reglas-srs.md").exists() and not (ROOT / "src/domain/fixtures").exists()
for name in ("README.md", "Branch_changes.md", "docs/next-job", "docs/evidencia/B01.06.md"):
    path = ROOT / name
    for link in re.findall(r"\]\(([^)]+)\)", path.read_text()):
        assert (path.parent / link).resolve().is_file(), (name, link)
manifest = REFERENCE / "docs/blueprint/evidencia/B01.06.sha256"
assert sha(manifest) in state
lines = manifest.read_text().splitlines()
assert len(lines) == 9
for line in lines:
    expected_digest, name = line.split("  ", 1)
    assert sha(REFERENCE / name) == expected_digest, name
print("PASS enlaces, 12 campos, nueve hashes de referencia; B01.06 completado y B01.07 sin ejecutar")
print("PASS R01–R16 y evidencia previa intactos; fuentes activas en referencia hasta T01")
print("PASS separación planificación/API/infraestructura/clientes; sin otros puntos")
print("NO EJECUTADO: dominio, HTTP/persistencia, Android/web ni tests/lint/build de aplicación")
