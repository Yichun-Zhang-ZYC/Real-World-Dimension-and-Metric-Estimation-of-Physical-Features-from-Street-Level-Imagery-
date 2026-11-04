"""Extract every embedded figure from the Anna-edited paper, in document order, with the caption that follows it."""
import zipfile, re, os, sys
CAP = '/content/drive/MyDrive/Capstone-w-HERE'
SRC = f'{CAP}/HERE Capstone - Final Paper - Anna-edited.docx'
OUT = f'{CAP}/pipeline_v2/paper/anna_figs'
os.makedirs(OUT, exist_ok=True)
z = zipfile.ZipFile(SRC)
rels = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(media/[^"]+)"', z.read('word/_rels/document.xml.rels').decode()))
rels.update({k: v for v, k in re.findall(r'Target="(media/[^"]+)"[^>]*Id="(rId\d+)"', z.read('word/_rels/document.xml.rels').decode())})
doc = z.read('word/document.xml').decode()
paras = re.findall(r'<w:p[ >].*?</w:p>', doc, flags=re.S)
text = lambda p: ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))
lines = []
for i, p in enumerate(paras):
    for rid in re.findall(r'r:embed="(rId\d+)"', p):
        media = rels.get(rid)
        cap = ''
        for q in paras[i + 1:i + 4]:
            t = text(q).strip()
            if t: cap = t[:140]; break
        prev = ''
        for q in reversed(paras[max(0, i - 3):i]):
            t = text(q).strip()
            if t: prev = t[-100:]; break
        if media:
            name = f'img{len(lines):02d}_' + os.path.basename(media)
            open(f'{OUT}/{name}', 'wb').write(z.read('word/' + media))
            lines.append(f'{name}\t{media}\tCAPTION: {cap}\tPREV: {prev}')
open(f'{OUT}/_index.txt', 'w').write('\n'.join(lines))
print('\n'.join(lines))
