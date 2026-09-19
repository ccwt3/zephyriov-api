"""Comprueba la transferencia B01 sin ejecutar el motor SRS."""

import hashlib
import json
from pathlib import Path

API = Path(__file__).resolve().parents[2]
MANIFEST = API / 'docs/evidencia/T01-transfer.json'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    manifest = json.loads(MANIFEST.read_text())
    assert manifest['version'] == 'T01-v1'
    reference = Path(manifest['sourceRepository'])
    source_manifest = reference / 'docs/blueprint/evidencia/B01.10.sha256'
    if source_manifest.exists():
        assert manifest['sourceManifestSha256'] == sha256(source_manifest)
        historical = {
            line.split('  ', 1)[1]: line.split('  ', 1)[0]
            for line in source_manifest.read_text().splitlines()
        }
        assert historical['docs/blueprint/reglas-srs.md'] == manifest['sourceRulesSha256']
        assert historical['docs/blueprint/fixtures-srs/README.md'] == manifest['sourceIndexSha256']
    ids: set[str] = set()
    total = 0
    for number in range(1, 23):
        family = f'R{number:02d}'
        filename = f'{family}.json'
        target = API / 'src/domain/fixtures' / filename
        original = reference / 'docs/blueprint/fixtures-srs' / filename
        assert target.is_file(), filename
        digest = sha256(target)
        assert digest == manifest['fixtures'][filename], filename
        if source_manifest.exists():
            assert original.is_file(), filename
            assert digest == sha256(original), filename
        data = json.loads(target.read_text())
        assert data['fixtures'], filename
        for fixture in data['fixtures']:
            assert fixture['rule'] == family, fixture['id']
            assert fixture['id'] not in ids, fixture['id']
            ids.add(fixture['id'])
            total += 1
    assert len(manifest['fixtures']) == 22
    assert total == len(ids) == manifest['variantCount'] == 352
    print(f'PASS T01: {len(manifest["fixtures"])} JSON idénticos, {total} IDs únicos')
    if source_manifest.exists():
        print('PASS manifiesto B01.10 de referencia sin cambios')
    else:
        print('Referencia ausente: hashes locales verificados contra manifiesto T01')


if __name__ == '__main__':
    main()
