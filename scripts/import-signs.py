"""Import all official images using an explicit, reviewed source-edition map.
Usage: python scripts/import-signs.py /path/to/f89740n2524.docx
No dependencies; no network access; rejects changed source documents.
"""
import hashlib
import json
import sys
import zipfile
from pathlib import Path
root = Path(__file__).resolve().parent.parent
mapping = json.loads((root / 'data/catalogue/image-map.json').read_text())
metadata = json.loads((root / 'data/catalogue/source.json').read_text())
archive_path = Path(sys.argv[1])
assert hashlib.sha256(archive_path.read_bytes()).hexdigest() == metadata['annexSha256'], 'Source changed: review the image map before import'
inventory = json.loads((root / 'data/catalogue/inventory.json').read_text())
assert set(mapping.values()) == set(inventory), 'Missing or unexpected official numbers'
out = root / 'public/signs'
manifest = []
counts = {}
with zipfile.ZipFile(archive_path) as archive:
    all_images = {n[5:] for n in archive.namelist() if n.startswith('word/media/')}
    assert all_images == set(mapping), 'Unmapped original images'
    for original, number in sorted(mapping.items(), key=lambda x: int(x[0].split('image')[1].split('.')[0])):
        index = counts.get(number, 0)
        filename = number + (f'-{index + 1}' if index else '') + Path(original).suffix
        data = archive.read('word/' + original)
        (out / filename).write_bytes(data)
        counts[number] = index + 1
        manifest.append(dict(number=number, file=filename, original=original, source=metadata['annexUrl'], sha256=hashlib.sha256(data).hexdigest()))
(out / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
report = dict(numbers=len(inventory), images=len(manifest), categories={str(i): sum(n.startswith(str(i)+'.') for n in inventory) for i in range(1,8)}, missing=[], unexpected=[], unmappedImages=[], source=metadata)
(root / 'data/catalogue/report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps(report, ensure_ascii=False, indent=2))
