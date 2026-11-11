"""Reproduce the bundled sign images from the official Appendix 1 DOCX.
Usage: python scripts/import-signs.py /path/to/f89740n2524.docx
Uses Python standard library; preserves the original image bytes.
"""
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

SOURCE = 'https://zakon.rada.gov.ua/laws/file/text/141/f89740n2524.docx'
NUMBERS = ['1.1', '1.2', '1.6', '1.7', '1.13', '1.33',
           '2.1', '2.2', '2.3', '2.4', '2.5', '2.6',
           '3.1', '3.2', '3.3', '3.21', '3.34', '3.35',
           '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '7.1.1', '7.2.1', '7.3.1', '7.4.1', '7.7', '7.17']
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'v': 'urn:schemas-microsoft-com:vml'}
project = Path(__file__).resolve().parent.parent
out = project / 'public/signs'
out.mkdir(exist_ok=True, parents=True)
with zipfile.ZipFile(sys.argv[1]) as archive:
    root = ET.fromstring(archive.read('word/document.xml'))
    rels = {x.get('Id'): x.get('Target') for x in ET.fromstring(archive.read('word/_rels/document.xml.rels'))}
    mapping = {}
    for table in root.findall('.//w:tbl', NS):
        rows = table.findall('w:tr', NS)
        for i, row in enumerate(rows[:-1]):
            cells = row.findall('w:tc', NS)
            next_cells = rows[i + 1].findall('w:tc', NS)
            if len(cells) != len(next_cells):
                continue
            for cell, label in zip(cells, next_cells):
                number = ''.join(x.text or '' for x in label.findall('.//w:t', NS)).strip()
                refs = [x.get('{'+NS['r']+'}embed') for x in cell.findall('.//a:blip', NS)]
                refs += [x.get('{'+NS['r']+'}id') for x in cell.findall('.//v:imagedata', NS)]
                if number in NUMBERS and len(refs) == 1:
                    mapping[number] = rels[refs[0]]
    # Some supplementary plates share a cell with their own number labels.
    import re
    for cell in root.findall('.//w:tc', NS):
        labels = re.findall(r'7\.\d+(?:\.\d+)?', ' '.join(x.text or '' for x in cell.findall('.//w:t', NS)))
        refs = [x.get('{'+NS['r']+'}embed') for x in cell.findall('.//a:blip', NS)]
        if len(labels) == len(refs):
            for number, ref in zip(labels, refs):
                if number in NUMBERS:
                    mapping[number] = rels[ref]
    # 7.4.1 spans a merged cell with an intervening row in this official edition.
    mapping['7.4.1'] = 'media/image330.png'
    assert set(mapping) == set(NUMBERS), f'Missing signs: {set(NUMBERS) - set(mapping)}'
    manifest = []
    for number in NUMBERS:
        original = mapping[number]
        filename = number + Path(original).suffix
        data = archive.read('word/' + original)
        (out / filename).write_bytes(data)
        manifest.append({'number': number, 'file': filename, 'original': original,
                         'source': SOURCE, 'sha256': hashlib.sha256(data).hexdigest()})
    (out / 'sources.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Imported {len(manifest)} original sign images.')
