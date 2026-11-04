const fs = require('fs');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell,
  WidthType, ShadingType, LineRuleType, BorderStyle, TableOfContents, PageBreak, LevelFormat, Footer, PageNumber } = D;
const C = require(process.env.CONTENT || './content.js');
const FIG = process.env.FIGDIR || '/home/claude/work/figs/';
const ANNA = process.env.ANNADIR || '/home/claude/work/anna_figs/';
const FONT = 'Times New Roman';

function runs(text, base = {}) {
  // **bold**, *italic*
  const out = []; const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const sizeOf = (p) => { const b = fs.readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), b }; };
const border = { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' };
const borders = { top: border, bottom: border, left: border, right: border };

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (t, i, head) => new TableCell({
    borders, width: { size: widths[i], type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 70, right: 70 },
    shading: head ? { fill: 'E8EEF6', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER, spacing: { after: 0, line: 240 },
      children: runs(String(t), { size: 17, bold: !!head, font: FONT }) })] });
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
           ...rows.map(r => new TableRow({ children: r.map((t, i) => cell(t, i, false)) }))] });
}

const kids = [];
for (const it of C) {
  const [k, a, b, c] = it;
  if (k === 'title') kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 400 }, children: runs(a, { size: 32, bold: true, font: FONT }) }));
  else if (k === 'center') kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: runs(a, { size: 24, font: FONT }) }));
  else if (k === 'break') kids.push(new Paragraph({ children: [new PageBreak()] }));
  else if (k === 'toc') kids.push(new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }));
  else if (k === 'h1') kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(a)] }));
  else if (k === 'h2') kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(a)] }));
  else if (k === 'h3') kids.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(a)] }));
  else if (k === 'p') kids.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: runs(a) }));
  else if (k === 'owner') kids.push(new Paragraph({ children: runs(a, { italics: true, color: '7F7F7F', size: 20 }) }));
  else if (k === 'eq') kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 }, children: runs(a, { font: 'Cambria Math', italics: true }) }));
  else if (k === 'bul') for (const t of a) kids.push(new Paragraph({ numbering: { reference: 'bul', level: 0 }, alignment: AlignmentType.JUSTIFIED, children: runs(t) }));
  else if (k === 'num') for (const t of a) kids.push(new Paragraph({ numbering: { reference: b || 'num', level: 0 }, alignment: AlignmentType.JUSTIFIED, children: runs(t) }));
  else if (k === 'fig') {
    const p = a.startsWith('anna:') ? ANNA + a.slice(5) : FIG + a; if (!fs.existsSync(p)) { kids.push(new Paragraph({ children: runs('[missing figure ' + a + ']') })); kids.push(new Paragraph({ children: runs(b, { size: 20 }) })); continue; } const s = sizeOf(p); const w = Math.min(c || 620, 620); const h = Math.round(w * s.h / s.w);
    kids.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60, line: 240, lineRule: LineRuleType.AUTO },
      children: [new ImageRun({ type: 'png', data: s.b, transformation: { width: w, height: h }, altText: { title: b, description: b, name: a } })] }));
    kids.push(new Paragraph({ spacing: { after: 240 }, alignment: AlignmentType.JUSTIFIED, children: runs(b, { size: 20 }) }));
  } else if (k === 'ph') {
    kids.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
      shading: { fill: 'FFF4D6', type: ShadingType.CLEAR, color: 'auto' },
      border: { top: border, bottom: border, left: border, right: border },
      children: runs(a, { size: 20, italics: true, color: '7F6000' }) }));
    if (b) kids.push(new Paragraph({ spacing: { after: 240 }, alignment: AlignmentType.JUSTIFIED, children: runs(b, { size: 20 }) }));
  } else if (k === 'tcap') kids.push(new Paragraph({ keepNext: true, spacing: { before: 200, after: 80 }, children: runs(a, { size: 20, bold: true }) }));
  else if (k === 'table') { kids.push(table(a, b, c)); kids.push(new Paragraph({ spacing: { after: 60 }, children: [] })); }
  else if (k === 'note') kids.push(new Paragraph({ spacing: { after: 240 }, alignment: AlignmentType.JUSTIFIED, children: runs(a, { size: 18 }) }));
  else if (k === 'ref') kids.push(new Paragraph({ indent: { left: 720, hanging: 720 }, spacing: { after: 120 }, children: runs(a, { size: 22 }) }));
  else throw new Error('unknown ' + k);
}

const numbering = { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] };
for (const r of ['num', 'num2', 'num3', 'num4'])
  numbering.config.push({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] });

const doc = new Document({
  creator: 'Kely Zhang, Anna Chen, Adaora Ezike', title: 'HERE Capstone Final Paper',
  styles: {
    default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { after: 160, line: 300, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: FONT, color: '1F3864' }, paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 27, bold: true, font: FONT, color: '1F3864' }, paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, italics: true, font: FONT }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } }] },
  numbering,
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 20 })] })] }) },
    children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2] || 'out.docx', b); console.log('written'); });
