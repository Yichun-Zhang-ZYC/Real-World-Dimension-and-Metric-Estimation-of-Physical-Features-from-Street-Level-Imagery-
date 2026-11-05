/**
 * Builds the final capstone presentation inside the bound Google Slides deck.
 * Run buildDeck() from Extensions > Apps Script. Re-running replaces the slides it generated before;
 * slides it did not generate are kept after a divider.
 * Speaker script for every slide is written into the speaker notes.
 */
var BASE = 'https://raw.githubusercontent.com/Yichun-Zhang-ZYC/Real-World-Dimension-and-Metric-Estimation-of-Physical-Features-from-Street-Level-Imagery-/main/';
var C = {
  ink: '#16191D', text: '#3A3F45', mute: '#7B828B', line: '#D5D8DC', card: '#F3F4F6',
  maroon: '#800000', maroonLt: '#F6E9E9', blue: '#2A78D6', green: '#1F8A5B', greenLt: '#E6F4EC',
  orange: '#D2642A', orangeLt: '#FBEDE4', white: '#FFFFFF'
};
var HF = 'Montserrat', BF = 'Lato';
var SECTIONS = ['Overview', 'Data', 'Pipeline', 'Results', 'Impact'];
var S = 1, PRES, SLIDE_I = 0, PAGE = 0;

function buildDeck() {
  PRES = SlidesApp.getActivePresentation();
  S = PRES.getPageWidth() / 720;
  var props = PropertiesService.getDocumentProperties();
  var prev = JSON.parse(props.getProperty('generated') || '[]');
  PRES.getSlides().forEach(function (sl) { if (prev.indexOf(sl.getObjectId()) >= 0) sl.remove(); });
  var made = [];
  SLIDES.forEach(function (fn) { var sl = newSlide(); fn(sl); made.push(sl.getObjectId()); });
  if (PRES.getSlides().length > made.length) { var d = newSlide(); divider(d); made.push(d.getObjectId()); }
  props.setProperty('generated', JSON.stringify(made));
}

/* ---------- primitives ---------- */
function newSlide() { var sl = PRES.insertSlide(SLIDE_I++, SlidesApp.PredefinedLayout.BLANK); sl.getBackground().setSolidFill(C.white); return sl; }
function rect(sl, x, y, w, h, fill, type, border) {
  var s = sl.insertShape(type || SlidesApp.ShapeType.RECTANGLE, x * S, y * S, w * S, h * S);
  if (fill) s.getFill().setSolidFill(fill); else s.getFill().setTransparent();
  if (border) { s.getBorder().getLineFill().setSolidFill(border); s.getBorder().setWeight(1); } else s.getBorder().setTransparent();
  return s;
}
function text(sl, x, y, w, h, str, o) {
  o = o || {};
  var s = sl.insertTextBox(str, x * S, y * S, w * S, h * S);
  style(s.getText(), o);
  if (o.align) s.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment[o.align]);
  if (o.valign) s.setContentAlignment(SlidesApp.ContentAlignment[o.valign]);
  if (o.ls) s.getText().getParagraphStyle().setLineSpacing(o.ls);
  if (o.sb) s.getText().getParagraphStyle().setSpaceBelow(o.sb);
  return s;
}
function style(r, o) {
  var t = r.getTextStyle();
  t.setFontFamily(o.font || BF).setFontSize(o.size || 12).setForegroundColor(o.color || C.text).setBold(!!o.bold);
  if (o.italic) t.setItalic(true);
  return r;
}
/** rich text: parts = [[string, {style}], ...] */
function rich(sl, x, y, w, h, parts, o) {
  o = o || {};
  var s = sl.insertTextBox(' ', x * S, y * S, w * S, h * S), tr = s.getText();
  tr.setText('');
  parts.forEach(function (p) { style(tr.appendText(p[0]), Object.assign({}, o, p[1] || {})); });
  if (o.align) tr.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment[o.align]);
  if (o.valign) s.setContentAlignment(SlidesApp.ContentAlignment[o.valign]);
  if (o.ls) tr.getParagraphStyle().setLineSpacing(o.ls);
  if (o.sb) tr.getParagraphStyle().setSpaceBelow(o.sb);
  return s;
}
function bullets(sl, x, y, w, h, items, o) {
  o = Object.assign({ size: 13, sb: 7 }, o || {});
  var parts = [];
  items.forEach(function (it, i) {
    var line = Array.isArray(it) ? it : [[it]];
    line.forEach(function (p) { parts.push(p); });
    if (i < items.length - 1) parts.push(['\n']);
  });
  var s = rich(sl, x, y, w, h, parts, o);
  s.getText().getListStyle().applyListPreset(SlidesApp.ListPreset.DISC_CIRCLE_SQUARE);
  return s;
}
function img(sl, path, x, y, w, h, align) {
  var im = sl.insertImage(BASE + path);
  var r = Math.min(w / im.getWidth(), h / im.getHeight());
  var iw = im.getWidth() * r, ih = im.getHeight() * r;
  var left = align === 'left' ? x : x + (w - iw) / 2;
  im.setWidth(iw * S).setHeight(ih * S).setLeft(left * S).setTop((y + (h - ih) / 2) * S);
  return im;
}
function notes(sl, str) { sl.getNotesPage().getSpeakerNotesShape().getText().setText(str); }
function line(sl, x1, y1, x2, y2, color, wt, arrow) {
  var l = sl.insertLine(SlidesApp.LineCategory.STRAIGHT, x1 * S, y1 * S, x2 * S, y2 * S);
  l.getLineFill().setSolidFill(color || C.line); l.setWeight(wt || 1);
  if (arrow) l.setEndArrow(SlidesApp.ArrowStyle.FILL_ARROW);
  return l;
}

/* ---------- layout pieces ---------- */
function footer(sl, sec) {
  PAGE++;
  rect(sl, 0, 371, 720, 34, C.ink);
  text(sl, 18, 374, 160, 28, 'THE UNIVERSITY OF CHICAGO\nMS IN APPLIED DATA SCIENCE', { font: HF, size: 6.5, color: C.white, bold: true, valign: 'MIDDLE', ls: 110 });
  var x0 = 190, cw = 92;
  SECTIONS.forEach(function (name, i) {
    var on = i === sec;
    var sh = rect(sl, x0 + i * (cw - 4), 377, cw, 22, on ? '#D9DCE0' : C.ink,
      i === 0 ? SlidesApp.ShapeType.HOME_PLATE : SlidesApp.ShapeType.CHEVRON, on ? null : '#8A9099');
    sh.getText().setText(name);
    style(sh.getText(), { font: HF, size: 7, bold: on, color: on ? C.ink : C.white });
    sh.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    sh.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });
  text(sl, 640, 374, 66, 28, 'PAGE ' + PAGE, { font: HF, size: 7, color: C.white, bold: true, align: 'END', valign: 'MIDDLE' });
}
function title(sl, str, owner) {
  rect(sl, 28, 26, 4, 34, C.maroon);
  text(sl, 38, 18, owner ? 560 : 650, 50, str, { font: HF, size: 20, bold: true, color: C.ink, valign: 'MIDDLE', ls: 95 });
  if (owner) tag(sl, owner);
}
function tag(sl, who) {
  var t = rect(sl, 620, 28, 76, 22, C.maroon, SlidesApp.ShapeType.ROUND_RECTANGLE);
  t.getText().setText(who);
  style(t.getText(), { font: HF, size: 9, bold: true, color: C.white });
  t.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  t.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}
function stat(sl, x, y, w, num, label, color) {
  text(sl, x, y, w, 34, num, { font: HF, size: 24, bold: true, color: color || C.maroon });
  text(sl, x, y + 32, w, 30, label, { size: 10.5, color: C.text, ls: 105 });
}
function card(sl, x, y, w, h, head, body, o) {
  o = o || {};
  rect(sl, x, y, w, h, o.fill || C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
  if (o.bar) rect(sl, x, y, 4, h, o.bar);
  text(sl, x + 10, y + 8, w - 20, 22, head, { font: HF, size: o.hsize || 11.5, bold: true, color: o.hcolor || C.ink });
  if (body) text(sl, x + 10, y + 30, w - 20, h - 36, body, { size: o.bsize || 10.5, color: C.text, ls: 110 });
}
function pill(sl, x, y, w, h, str, fill, color) {
  var p = rect(sl, x, y, w, h, fill, SlidesApp.ShapeType.ROUND_RECTANGLE);
  p.getText().setText(str);
  style(p.getText(), { font: HF, size: 9, bold: true, color: color || C.white });
  p.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  p.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  return p;
}
function numberDot(sl, x, y, n, fill) {
  var d = rect(sl, x, y, 22, 22, fill || C.maroon, SlidesApp.ShapeType.ELLIPSE);
  d.getText().setText(String(n));
  style(d.getText(), { font: HF, size: 10, bold: true, color: C.white });
  d.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  d.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
}
function placeholder(sl, sec, owner, ttl, hint) {
  title(sl, ttl, owner);
  var b = rect(sl, 38, 82, 644, 270, null, SlidesApp.ShapeType.ROUND_RECTANGLE, C.line);
  b.getBorder().setDashStyle(SlidesApp.DashStyle.DASH);
  footer(sl, sec);
  notes(sl, '[' + owner + ' to write the script for this slide]' + (hint ? '\nSuggested content: ' + hint : ''));
}
function divider(sl) {
  sl.getBackground().setSolidFill(C.card);
  text(sl, 60, 160, 600, 80, 'Previous draft slides below\nKeep for reference, delete before presenting', { font: HF, size: 18, bold: true, color: C.mute, align: 'CENTER', valign: 'MIDDLE' });
}

/* ---------- slides ---------- */
var SLIDES = [
  // 1. Title
  function (sl) {
    sl.getBackground().setSolidFill(C.ink);
    rect(sl, 0, 0, 8, 405, C.maroon);
    text(sl, 40, 56, 360, 18, 'HERE TECHNOLOGIES  ×  UCHICAGO CAPSTONE', { font: HF, size: 9, bold: true, color: '#E39B9B' });
    text(sl, 40, 80, 360, 120, 'Measuring Bridge Clearance from Street-Level Imagery', { font: HF, size: 28, bold: true, color: C.white, ls: 95 });
    text(sl, 40, 198, 350, 44, 'Real-world dimension estimation with metric 3D reconstruction and computer vision', { size: 12, color: '#C9CDD2', ls: 115 });
    line(sl, 40, 256, 120, 256, C.maroon, 2);
    text(sl, 40, 266, 360, 20, 'Kely Zhang  ·  Anna Chen  ·  Adaora Ezike', { font: HF, size: 11, bold: true, color: C.white });
    text(sl, 40, 286, 360, 18, 'Advisor: Dr. Jeanette Shutay   |   December 2026', { size: 10, color: '#C9CDD2' });
    text(sl, 40, 352, 360, 30, 'THE UNIVERSITY OF CHICAGO\nMS IN APPLIED DATA SCIENCE', { font: HF, size: 7, bold: true, color: '#8A9099', ls: 110 });
    rect(sl, 418, 66, 282, 162, C.maroon);
    img(sl, 'results/benchmark_80/examples/nbi_016998700000000_overlay.jpg', 422, 70, 274, 154);
    text(sl, 418, 232, 282, 30, 'Bridge (red) and road (blue) found automatically; yellow = measured underside', { size: 8.5, color: '#9AA0A7', italic: true });
    notes(sl, "Good afternoon everyone. We're Kely, Anna and Adaora, and our capstone with HERE Technologies asks a simple question: can ordinary street-level photos measure the real world in metres?\n\nWe focused on bridge vertical clearance, the height a truck can safely pass under. In the next fifteen minutes we'll walk you through the problem, the data, the pipeline we built, what we found, and what we recommend HERE do with it.");
  },
  // 2. Agenda
  function (sl) {
    title(sl, 'Agenda');
    var items = [['Project Overview', 'Business problem and research question'], ['Data', 'Mapillary imagery + federal bridge inventory'], ['Pipeline', 'Segment, reconstruct, measure, decide'], ['Results', 'Accuracy, coverage, generalization'], ['Impact', 'Recommendation for HERE']];
    items.forEach(function (it, i) {
      var x = 38 + i * 130;
      text(sl, x, 110, 120, 40, '0' + (i + 1), { font: HF, size: 30, bold: true, color: i === 0 ? C.maroon : '#C4C8CD' });
      line(sl, x, 156, x + 116, 156, i === 0 ? C.maroon : C.line, 2);
      text(sl, x, 166, 118, 22, it[0], { font: HF, size: 12, bold: true, color: C.ink });
      text(sl, x, 190, 118, 50, it[1], { size: 10.5, color: C.mute, ls: 110 });
    });
    rich(sl, 38, 280, 644, 40, [['Team  ', { font: HF, bold: true, color: C.ink }], ['Kely Zhang — MapAnything, pipeline v2   ·   Anna Chen — Depth Anything 3, SAM3   ·   Adaora Ezike — VGGT', { color: C.mute }]], { size: 10.5 });
    footer(sl, -1);
    notes(sl, "Here's the plan. First, the business problem and our research question. Then the data: Mapillary imagery, with the federal bridge inventory as ground truth. Then the pipeline, which turns photos into a clearance estimate plus a confidence decision. Then the results: accuracy, coverage, and whether it generalizes to new bridges and new cities. And finally, what we recommend HERE do with it.\n\nOn the team: I built the MapAnything branch and pipeline v2, Anna led Depth Anything 3 and the segmentation comparison, and Adaora led the VGGT branch.");
  },
  // 3. SCR
  function (sl) {
    title(sl, 'Clearance data is costly to collect, but the imagery already exists');
    var cols = [['SITUATION', C.ink, 'HERE maintains physical map attributes', ['Clearance, width, height, offsets', 'Critical for truck routing, navigation, HD maps']],
      ['COMPLICATION', C.orange, 'Collecting them is expensive', ['LiDAR surveys and field audits', 'Hard to repeat across a whole network']],
      ['RESOLUTION', C.green, 'Measure from imagery that already exists', ['Crowd-sourced Mapillary photos', 'Pretrained 3D models give metric depth']]];
    cols.forEach(function (c, i) {
      var x = 38 + i * 220;
      pill(sl, x, 92, 200, 26, c[0], c[1]);
      text(sl, x, 130, 200, 44, c[2], { font: HF, size: 13, bold: true, color: C.ink, ls: 105 });
      bullets(sl, x, 180, 200, 90, c[3], { size: 11.5 });
      if (i < 2) text(sl, x + 200, 92, 20, 26, '›', { font: HF, size: 20, bold: true, color: C.mute, align: 'CENTER', valign: 'MIDDLE' });
    });
    rect(sl, 38, 296, 640, 50, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rich(sl, 52, 300, 620, 42, [['Goal  ', { font: HF, bold: true, color: C.maroon }], ['A low-cost, automated way to estimate clearance at network scale, and to know when to trust it', { color: C.ink }]], { size: 12, valign: 'MIDDLE' });
    footer(sl, 0);
    notes(sl, "HERE maintains physical map attributes such as clearances, widths and heights. They matter for truck routing, navigation and HD maps.\n\nThe complication is cost. Today these values come from LiDAR surveys, field audits or dedicated capture campaigns, which are expensive to repeat across a whole road network.\n\nMeanwhile, millions of crowd-sourced street-level images already exist on Mapillary, and new 3D vision models can recover metric depth from a single photo. So our goal: an automated, low-cost way to estimate clearance at network scale, and just as important, to know when to trust each estimate.");
  },
  // 4. Research question
  function (sl) {
    title(sl, 'Research question: can pretrained 3D models measure clearance in metres?');
    rect(sl, 38, 88, 644, 66, C.ink, SlidesApp.ShapeType.ROUND_RECTANGLE);
    text(sl, 56, 92, 610, 58, '“Can pretrained vision models, plus automatic target localization and geometry, produce useful clearance estimates, and under which conditions?”', { font: HF, size: 13, bold: true, color: C.white, valign: 'MIDDLE', ls: 110, align: 'CENTER' });
    card(sl, 38, 174, 312, 112, 'Test 1 · Accuracy', 'Does the estimate agree with the official inventory?\nReference: FHWA NBI Item 54B (minimum vertical clearance)', { bar: C.blue });
    card(sl, 370, 174, 312, 112, 'Test 2 · Added value', 'Is it better than what HERE knows without any image?\nReference: constant regional median, 4.97 m', { bar: C.maroon });
    rich(sl, 38, 302, 644, 40, [['Scope  ', { font: HF, bold: true, color: C.ink }], ['Main feature: bridge vertical underclearance (Chicago metro)   ·   Second test: stop-sign size', { color: C.mute }]], { size: 11 });
    footer(sl, 0);
    notes(sl, "Our research question: can pretrained 3D vision models, combined with automatic target localization and geometry, produce useful clearance estimates, and under which conditions?\n\nWe judged 'useful' in two ways. First, accuracy: does the estimate agree with the official inventory value, NBI Item 54B? Second, added value: is it better than what HERE already knows without any image? We made that concrete with a no-image baseline that always predicts the regional median, 4.97 metres. That second test keeps us honest, as you'll see later.\n\nBridges in the Chicago metro were the main feature; stop signs were a second, smaller test.");
  },
  // 5. Data sources
  function (sl) {
    title(sl, 'Three sources build a benchmark with official ground truth');
    card(sl, 38, 92, 190, 170, 'Mapillary imagery', '• Crowd-sourced sequences\n• GPS, heading, capture time\n• Camera parameters (focal, k1, k2)\n• 2015–2026 captures', { bar: C.blue });
    text(sl, 228, 150, 40, 50, '+', { font: HF, size: 30, bold: true, color: C.ink, align: 'CENTER', valign: 'MIDDLE' });
    card(sl, 268, 92, 190, 170, 'FHWA Bridge Inventory', '• NBI 2025, Item 54B\n• Minimum vertical clearance\n• Highway underpasses, 3.5–8.5 m\n• Illinois, Indiana, Wisconsin', { bar: C.maroon });
    text(sl, 458, 150, 40, 50, '=', { font: HF, size: 30, bold: true, color: C.ink, align: 'CENTER', valign: 'MIDDLE' });
    rect(sl, 498, 92, 184, 170, C.ink, SlidesApp.ShapeType.ROUND_RECTANGLE);
    text(sl, 510, 100, 160, 22, 'Evaluation sets', { font: HF, size: 11.5, bold: true, color: C.white });
    [['80', 'Chicago benchmark (development)'], ['51', 'held-out Chicago bridges'], ['120', 'bridges in 2 new metros']].forEach(function (r, i) {
      text(sl, 510, 126 + i * 44, 50, 30, r[0], { font: HF, size: 18, bold: true, color: '#E39B9B', valign: 'MIDDLE' });
      text(sl, 560, 126 + i * 44, 116, 30, r[1], { size: 9.5, color: C.white, valign: 'MIDDLE', ls: 105 });
    });
    rich(sl, 38, 290, 644, 40, [['Second feature  ', { font: HF, bold: true, color: C.ink }], ['Stop signs, checked against the MUTCD standard sizes (30 in / 36 in)', { color: C.mute }]], { size: 11 });
    footer(sl, 1);
    notes(sl, "We combined two kinds of data. Street-level imagery comes from the Mapillary API: image sequences with GPS, heading, capture time and camera parameters, captured between 2015 and 2026. Ground truth comes from the Federal Highway Administration's National Bridge Inventory, Item 54B, the minimum vertical clearance under the bridge.\n\nFrom these we built three evaluation sets. An 80-bridge Chicago benchmark, where we developed and tuned everything. 51 held-out Chicago bridges we never used for development. And 120 bridges in Indianapolis and Milwaukee, two cities we never touched until the final test.\n\nFor stop signs, the reference is the national standard size, 30 or 36 inches.");
  },
  // 6. Benchmark map
  function (sl) {
    title(sl, '80 benchmark bridges cover the full clearance range');
    img(sl, 'results/mapanything/fig_kely_error_map.png', 30, 74, 300, 292);
    stat(sl, 360, 90, 150, '523', 'candidate highway underpasses in the Chicago metro');
    stat(sl, 530, 90, 150, '80', 'sampled, stratified by clearance bin and structure type');
    stat(sl, 360, 172, 150, '3.9–7.9 m', 'NBI clearance range (median 4.97 m)');
    stat(sl, 530, 172, 150, '≤ 8', 'frames per bridge from the sequence driving toward it');
    rect(sl, 360, 262, 322, 72, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    text(sl, 372, 268, 300, 60, 'Every rule and threshold was set on these 80 bridges, then frozen before any held-out test', { size: 11, color: C.ink, valign: 'MIDDLE', ls: 110, bold: true });
    footer(sl, 1);
    notes(sl, "This is the benchmark. We started from 523 candidate highway underpasses in the Chicago metro, and sampled 80 of them stratified across five clearance bins and structure types, so it covers low, typical and very high bridges: from 3.9 to 7.9 metres, with a median of 4.97.\n\nFor each bridge we pulled the Mapillary sequence driving toward it and kept up to eight frames. On the map, coloured points passed our quality check and are shaded by error; grey points had no usable estimate.\n\nOne important design choice: every threshold you'll see later was set on these 80 bridges and then frozen before we looked at any held-out data.");
  },
  // 7. Pipeline overview
  function (sl) {
    title(sl, 'One modular pipeline: only the 3D backbone changes');
    var steps = [['Retrieve', 'Mapillary sequence approaching the bridge'], ['Segment', 'Bridge + road masks (Mask2Former, Vistas)'], ['Reconstruct', 'Metric 3D points from 1 or 4 frames'], ['Measure', 'Underside to RANSAC road plane'], ['Quality check', 'Camera height, columns, distance'], ['Decide', 'Accept / review / reject, GeoJSON out']];
    steps.forEach(function (s, i) {
      var x = 38 + i * 108, hl = i === 2, conf = i >= 4;
      var b = rect(sl, x, 100, 98, 128, hl ? C.maroon : (conf ? C.greenLt : C.card), SlidesApp.ShapeType.ROUND_RECTANGLE);
      numberDot(sl, x + 8, 108, i + 1, hl ? C.ink : (conf ? C.green : C.maroon));
      text(sl, x + 6, 136, 88, 24, s[0], { font: HF, size: 11, bold: true, color: hl ? C.white : C.ink });
      text(sl, x + 6, 160, 88, 64, s[1], { size: 9.5, color: hl ? '#F3DADA' : C.text, ls: 110 });
      if (i < 5) text(sl, x + 96, 150, 14, 24, '›', { font: HF, size: 16, bold: true, color: C.mute, align: 'CENTER', valign: 'MIDDLE' });
    });
    text(sl, 38, 248, 300, 20, 'Swappable backbones, same frames, masks and scoring:', { size: 10.5, color: C.mute });
    pill(sl, 38, 272, 140, 28, 'MapAnything', C.maroon);
    pill(sl, 188, 272, 150, 28, 'Depth Anything 3', C.ink);
    pill(sl, 348, 272, 100, 28, 'VGGT', C.ink);
    text(sl, 470, 266, 212, 44, '≈ 6 s per bridge on one L4 GPU', { font: HF, size: 12, bold: true, color: C.ink, valign: 'MIDDLE' });
    footer(sl, 2);
    notes(sl, "Here's the pipeline end to end.\n\nOne: retrieve the Mapillary sequence approaching the bridge. Two: segment the bridge and the road with Mask2Former trained on Mapillary Vistas, and choose the best anchor frame. Three: reconstruct metric 3D geometry. This is the only step that changes between methods. We plugged in MapAnything, Depth Anything 3 and VGGT, and every backbone gets the same frames, the same masks and the same scoring, so the comparison is fair. Four: measure the clearance. Five and six, in green: quality checks and a confidence decision, exported as GeoJSON for a review queue.\n\nThe whole thing runs in about six seconds per bridge on a single GPU.");
  },
  // 8. Measurement
  function (sl) {
    title(sl, 'Clearance = deck underside to a RANSAC-fitted road plane');
    img(sl, 'results/benchmark_80/examples/nbi_016204300000000_overlay.jpg', 30, 84, 350, 197);
    text(sl, 30, 284, 350, 30, 'I-94 Bishop Ford under 115th St · NBI 4.29 m · estimate 4.29–5.54 m across views', { size: 8.5, color: C.mute, italic: true });
    var st = [['Find the underside', 'Lowest bridge pixel with road beneath it, per column'], ['Lift to 3D', 'Look up each pixel’s metric 3D point'], ['Fit the road', 'RANSAC plane through road points'], ['Measure', 'Median distance, underside to plane']];
    st.forEach(function (s, i) {
      var y = 86 + i * 52;
      numberDot(sl, 400, y + 4, i + 1);
      text(sl, 430, y, 250, 20, s[0], { font: HF, size: 11.5, bold: true, color: C.ink });
      text(sl, 430, y + 20, 250, 26, s[1], { size: 10.5, color: C.text });
    });
    rect(sl, 400, 300, 282, 52, C.greenLt, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rich(sl, 410, 302, 266, 48, [['Why it matters  ', { font: HF, bold: true, color: C.green }], ['Point-to-point measure: 25.8 m error. Road plane: under 1 m.', { color: C.ink }]], { size: 10.5, valign: 'MIDDLE' });
    footer(sl, 2);
    notes(sl, "How do we turn a 3D point cloud into a clearance?\n\nIn every image column, we find the lowest bridge pixel that has road beneath it. That's the yellow line on the photo. We look up its metric 3D point, fit a road plane through the road points with RANSAC, keep only underside points above the camera, and take the median perpendicular distance to the plane.\n\nThis geometric step mattered a lot. Our first approach measured point to point and was off by about 25 metres on average, because the road point sat right in front of the car instead of under the bridge. The road plane brought it under a metre.");
  },
  // 9. Decision layer
  function (sl) {
    title(sl, 'Every estimate gets a decision, without using ground truth');
    var st = [['Quality check', 'Camera height 0.7–3.5 m\n≥ 10 underside columns\nBridge within 90 m', C.ink, 'Fail → reject'], ['Plausibility gate', 'Estimate must be 3–9 m\nBelow 3 m = wrong target', C.orange, 'Fail → reject'], ['Camera rule', 'Wide-angle, uncalibrated lens (k1 < −0.06)', C.maroon, 'Flag → review'], ['View agreement', 'Single- vs multi-view differ by > 1.05 m', C.maroon, 'Flag → review']];
    st.forEach(function (s, i) {
      var x = 38 + i * 154;
      rect(sl, x, 96, 140, 150, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
      rect(sl, x, 96, 140, 6, s[2]);
      text(sl, x + 10, 110, 120, 22, s[0], { font: HF, size: 11.5, bold: true, color: C.ink });
      text(sl, x + 10, 136, 122, 74, s[1], { size: 10, color: C.text, ls: 115 });
      text(sl, x + 10, 216, 120, 22, s[3], { font: HF, size: 9.5, bold: true, color: s[2] });
      if (i < 3) text(sl, x + 140, 156, 14, 24, '›', { font: HF, size: 16, bold: true, color: C.mute, align: 'CENTER', valign: 'MIDDLE' });
    });
    pill(sl, 38, 272, 120, 30, 'ACCEPT', C.green);
    pill(sl, 168, 272, 120, 30, 'REVIEW', C.maroon);
    pill(sl, 298, 272, 120, 30, 'REJECT', C.ink);
    text(sl, 436, 266, 246, 44, 'All thresholds set on the benchmark, then frozen', { size: 11, bold: true, color: C.ink, valign: 'MIDDLE' });
    footer(sl, 2);
    notes(sl, "A raw number isn't a map attribute yet, so every estimate gets a decision, using only information available without ground truth.\n\nFirst, a quality check: the recovered camera height has to look like a real car or bike, 0.7 to 3.5 metres, with enough measured columns and the bridge within 90 metres. Second, a plausibility gate: anything below 3 or above 9 metres is rejected. On our benchmark every estimate below 3 metres was measuring a barrier or sign instead of the deck. Third, a camera rule: wide-angle, uncalibrated lenses go to review. Fourth, if the single-view and multi-view estimates disagree by more than about a metre, the estimate goes to review.\n\nWhat passes all four is accepted.");
  },
  // 10. MapAnything accuracy
  function (sl) {
    title(sl, 'MapAnything: 0.43 m median error on quality-checked bridges', 'KELY');
    img(sl, 'paper/build/figs/fig_pred_vs_gt.png', 24, 76, 430, 226);
    text(sl, 30, 304, 420, 40, 'Blue: phone / action camera · Orange: no EXIF (mostly dashcams) · Band: ±0.5 m', { size: 8.5, color: C.mute, italic: true });
    stat(sl, 478, 80, 210, '0.43 m', 'median absolute error, single-view');
    stat(sl, 478, 148, 210, '0.65 m', 'mean error on phone & action-camera imagery (0.92 m overall)');
    stat(sl, 478, 216, 210, '1.3 m', 'recovered camera height: metric scale is right');
    rect(sl, 478, 290, 204, 50, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    text(sl, 488, 292, 188, 46, 'Biggest misses come from dashcams', { size: 10.5, bold: true, color: C.ink, valign: 'MIDDLE' });
    footer(sl, 3);
    notes(sl, "Now the results, starting with my part, MapAnything.\n\nOn bridges that passed quality control, the median error was 0.43 metres, and the mean was 0.92. On phone and action-camera imagery, the mean drops to 0.65. On the plot, blue points are phones and orange points are dashcams without camera metadata, and that's where most of the big misses are.\n\nA nice sanity check: the recovered camera height came out around 1.3 metres, exactly a car-mounted camera. So the model's metric scale is right, and the remaining errors are local: wrong target, distortion, or the underside geometry, not a global scale problem.");
  },
  // 11. Coverage funnel
  function (sl) {
    title(sl, 'Coverage is the bottleneck: half the bridges never get a usable frame', 'KELY');
    img(sl, 'paper/build/figs/fig_funnel.png', 24, 78, 430, 250);
    stat(sl, 478, 84, 210, '41 / 80', 'bridges: no overhead structure in any frame', C.orange);
    stat(sl, 478, 152, 210, '22', 'bridges (28%) accepted after all rules');
    rect(sl, 478, 226, 204, 108, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rich(sl, 488, 230, 188, 100, [['Root cause\n', { font: HF, bold: true, color: C.ink, size: 11 }], ['The inventory point marks the bridge, not the road beneath it, so the nearest sequence often runs alongside or on top', { size: 10, color: C.text }]], { ls: 110 });
    footer(sl, 3);
    notes(sl, "But the biggest loss isn't accuracy, it's coverage.\n\nOf our 80 bridges, only 38 gave us a usable anchor frame. In 41 cases, the segmenter found no overhead structure in any frame at all. When we looked at them, the cause was the inventory coordinate: it marks the structure, not the road underneath, so the closest Mapillary sequence often runs alongside the bridge or over it.\n\nAfter all the rules, 22 bridges, 28 percent, would be accepted automatically. The lesson: the fix had to be in retrieval, not in the 3D model.");
  },
  // 12. Error factors
  function (sl) {
    title(sl, 'Failures are predictable from metadata', 'KELY');
    img(sl, 'paper/build/figs/fig_error_factors.png', 24, 78, 440, 170);
    img(sl, 'paper/build/figs/fig_capture_year.png', 24, 250, 200, 118, 'left');
    var f = [['No-EXIF dashcams', 'biased low; wide-angle lens'], ['Camera < 30 m', 'underestimates by 1.35 m'], ['Estimate < 3 m', 'almost always the wrong target'], ['Captured 2023+', '1.20 m vs 0.59 m median error']];
    f.forEach(function (r, i) {
      var y = 84 + i * 64;
      rect(sl, 480, y, 202, 54, C.orangeLt, SlidesApp.ShapeType.ROUND_RECTANGLE);
      text(sl, 490, y + 6, 186, 20, r[0], { font: HF, size: 11, bold: true, color: C.orange });
      text(sl, 490, y + 26, 186, 22, r[1], { size: 10.5, color: C.ink });
    });
    text(sl, 236, 262, 230, 90, 'All four signals are known before comparing with ground truth, so they become rules', { font: HF, size: 11.5, bold: true, color: C.ink, valign: 'MIDDLE', ls: 115 });
    footer(sl, 3);
    notes(sl, "The good news is that failures are predictable from metadata.\n\nDashcams without EXIF data are biased low; they have strongly distorted wide-angle lenses. When the camera is closer than 30 metres, the deck sits at the very top edge of the frame where distortion is strongest, and we underestimate by 1.35 metres. Estimates under 3 metres are almost always a barrier or a sign instead of the deck. And across all 83 checked bridges, captures since 2023, mostly fleet cameras, had double the median error.\n\nEvery one of these signals is available before you compare with ground truth, which is exactly why they became our confidence rules.");
  },
  // 13. Pipeline v2
  function (sl) {
    title(sl, 'Pipeline v2 lifts coverage from 40% to 62.5%', 'KELY');
    img(sl, 'paper/build/figs/fig_coverage_v2.png', 24, 76, 420, 170);
    card(sl, 38, 258, 200, 92, 'Detection-guided retrieval', 'Probe up to 12 nearby sequences; keep the one where the segmenter sees an underpass', { bar: C.blue, bsize: 10 });
    card(sl, 250, 258, 200, 92, 'Lens undistortion', 'Remove barrel distortion with Mapillary’s k1, k2 before 3D reconstruction', { bar: C.green, bsize: 10 });
    stat(sl, 478, 82, 210, '+15', 'bridges rescued by smarter retrieval alone', C.blue);
    stat(sl, 478, 150, 210, '+3', 'more pass QC after undistortion; MAE 0.92 → 0.80 m', C.green);
    stat(sl, 478, 218, 210, '22 → 34', 'bridges accepted without review');
    rect(sl, 478, 290, 204, 60, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    text(sl, 488, 292, 188, 56, 'Cheapest lever in the project: no change to the 3D model', { size: 10.5, bold: true, color: C.ink, valign: 'MIDDLE', ls: 110 });
    footer(sl, 3);
    notes(sl, "So I built pipeline v2 to attack the two biggest failure modes.\n\nFirst, detection-guided retrieval. Instead of picking the sequence closest to the inventory point, we probe up to twelve nearby sequences and keep the one where the segmenter actually sees an underpass with road beneath it. That alone rescued 15 bridges.\n\nSecond, lens undistortion. We use Mapillary's camera parameters to remove barrel distortion before reconstruction. That let three more bridges pass quality control and lowered single-view error from 0.92 to 0.80 metres.\n\nTogether, coverage went from 40 to 62.5 percent, and accepted bridges from 22 to 34, without touching the 3D model at all.");
  },
  // 14-16. Teammate slides (titles only)
  function (sl) { placeholder(sl, 3, 'ANNA', 'Depth Anything 3: Single-View vs Multi-View', 'DA3 accuracy on the same 80 bridges (Table 1), single- vs multi-view, example reconstruction (Figure 3), Figure 5.'); },
  function (sl) { placeholder(sl, 3, 'ANNA', 'Segmentation: Mask2Former vs SAM3', 'QC-passing counts and accuracy with each segmenter (Figure 6), when SAM3 helps or hurts.'); },
  function (sl) { placeholder(sl, 3, 'ADAORA', 'VGGT Backbone', 'VGGT results and scale diagnostics on the benchmark, comparison with MapAnything and DA3 on identical bridges.'); },
  // 17. Held-out
  function (sl) {
    title(sl, 'Frozen rules hold on 51 bridges never used in development', 'KELY');
    img(sl, 'paper/build/figs/fig_generalization_mae.png', 24, 78, 440, 196);
    text(sl, 30, 276, 430, 20, 'Blue: pipeline · Grey: constant 4.97 m baseline on the same bridges', { size: 8.5, color: C.mute, italic: true });
    stat(sl, 478, 82, 210, '0.93 m', 'raw held-out error vs 0.92 m on benchmark: no overfitting');
    stat(sl, 478, 150, 210, '0.87 → 0.73 m', 'with plausibility + camera rules, 84% of estimates kept');
    stat(sl, 478, 218, 210, '18% → 11%', 'share of gross errors (> 1.5 m) after the rules');
    rect(sl, 38, 304, 412, 46, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rich(sl, 48, 306, 396, 42, [['+ view agreement  ', { font: HF, bold: true, color: C.maroon }], ['0.62 m error at 57% coverage', { color: C.ink }]], { size: 11, valign: 'MIDDLE' });
    footer(sl, 3);
    notes(sl, "The key question for any benchmark is: did we overfit? So we froze every rule and ran 51 Chicago bridges we had never used.\n\nRaw accuracy carried over: 0.93 metres on held-out versus 0.92 on the benchmark. The rules carried over too. The plausibility gate and camera rule cut the error from 0.87 to 0.73 metres while keeping 84 percent of estimates, and adding the view-agreement rule brought it to 0.62. Gross errors above 1.5 metres fell from 18 to 11 percent.\n\nYou'll notice the grey bars, the constant baseline, are still lower. I'll come back to that in two slides.");
  },
  // 18. External metros
  function (sl) {
    title(sl, 'Same accuracy in two new cities, with no retuning', 'KELY');
    img(sl, 'paper/build/figs/fig_metros.png', 24, 78, 440, 200);
    stat(sl, 478, 82, 210, '120', 'bridges in Indianapolis and Milwaukee, never seen before');
    stat(sl, 478, 150, 210, '0.70 m', 'accepted single-view error (Chicago: 0.68 m), 80% within 1 m');
    stat(sl, 478, 218, 210, '3 of 4', 'largest errors caught by camera rule + plausibility gate');
    rect(sl, 38, 292, 412, 58, C.orangeLt, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rich(sl, 48, 294, 396, 54, [['Caveat  ', { font: HF, bold: true, color: C.orange }], ['Multi-view biased +1.1 m in Milwaukee → single-view is the safer default', { color: C.ink }]], { size: 10.5, valign: 'MIDDLE', ls: 110 });
    footer(sl, 3);
    notes(sl, "Then the hardest test: two cities we had never touched. We ran the frozen pipeline on 60 bridges each in Indianapolis and Milwaukee, using the state bridge inventories and every Chicago threshold unchanged.\n\nAccepted single-view estimates had an average error of 0.70 metres with 80 percent within a metre, basically identical to Chicago's 0.68. The same retrieval problem showed up, and the camera rule and plausibility gate caught three of the four largest errors without any retuning.\n\nOne thing did not transfer: multi-view was biased high in Milwaukee, by over a metre. That's why we recommend single-view as the default value.");
  },
  // 19. Baseline + ranking
  function (sl) {
    title(sl, 'A constant 4.97 m is hard to beat; ranking is where imagery adds value', 'KELY');
    card(sl, 38, 84, 200, 120, 'Absolute error', 'Most overpasses sit at 4.3–5.2 m, so the regional median is a strong baseline. Estimates do not beat it yet.', { bar: C.ink, bsize: 10 });
    card(sl, 38, 214, 200, 136, 'Ranking', 'A constant can never find the unusually low bridges, which is what truck routing needs.', { bar: C.green, bsize: 10 });
    img(sl, 'paper/build/figs/fig_roc.png', 250, 80, 290, 160);
    stat(sl, 560, 84, 130, '0.75', 'AUC, flag bridges < 4.6 m (≈ 15 ft)', C.green);
    stat(sl, 560, 156, 130, '0.90', 'AUC, flag bridges > 5.5 m', C.green);
    rect(sl, 250, 262, 432, 88, C.greenLt, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rich(sl, 262, 266, 410, 80, [['Simple screening rule\n', { font: HF, bold: true, color: C.green, size: 11 }], ['Flag any accepted estimate below 4.9 m → catches 13 of 21 truly low bridges', { color: C.ink, size: 11.5, bold: true }]], { ls: 115, valign: 'MIDDLE' });
    footer(sl, 4);
    notes(sl, "Now the honest part. Most Chicago overpasses are built to a narrow band, 4.3 to 5.2 metres, so simply guessing the regional median is a strong baseline. On absolute error, our estimates do not beat it yet.\n\nBut a constant can never tell you which bridges are unusually low, and that is exactly what matters for truck routing. Our estimates rank bridges well: an AUC of 0.75 for flagging bridges under 4.6 metres, about 15 feet, and 0.90 for unusually high ones.\n\nIn practice, a simple rule that flags any accepted estimate below 4.9 metres catches 13 of the 21 truly low bridges.");
  },
  // 20. Recommendation
  function (sl) {
    title(sl, 'Recommendation: deploy as a screening and discrepancy-detection layer');
    var t = [['1', 'Validate map attributes', 'Confident estimate disagrees with the map by > 1 m → send to analyst', C.green, 'Ready now'], ['2', 'Screen low clearances', 'Rank by estimate; survey the lowest bridges first', C.blue, 'Ready now'], ['3', 'Fill missing values', 'Internal prioritization only; verify before publishing', C.maroon, 'After calibration']];
    t.forEach(function (r, i) {
      var x = 38 + i * 218;
      rect(sl, x, 86, 204, 160, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
      rect(sl, x, 86, 204, 6, r[3]);
      numberDot(sl, x + 12, 104, r[0], r[3]);
      text(sl, x + 42, 102, 156, 26, r[1], { font: HF, size: 11.5, bold: true, color: C.ink, valign: 'MIDDLE' });
      text(sl, x + 12, 136, 182, 60, r[2], { size: 10.5, color: C.text, ls: 115 });
      pill(sl, x + 12, 208, 110, 22, r[4], r[3]);
    });
    text(sl, 38, 252, 400, 18, 'Increasing accuracy required  →', { size: 9, color: C.mute, italic: true });
    rect(sl, 38, 278, 644, 72, C.ink, SlidesApp.ShapeType.ROUND_RECTANGLE);
    [['≈ 6 s', 'GPU time per bridge'], ['Hours', 'to screen all of Illinois'], ['Config', 'not a model, to add a region']].forEach(function (r, i) {
      var x = 56 + i * 214;
      text(sl, x, 286, 90, 56, r[0], { font: HF, size: 18, bold: true, color: '#E39B9B', valign: 'MIDDLE' });
      text(sl, x + 88, 286, 116, 56, r[1], { size: 10.5, color: C.white, valign: 'MIDDLE', ls: 110 });
    });
    footer(sl, 4);
    notes(sl, "So our recommendation for HERE: use image-based clearance as a low-cost screening and discrepancy-detection layer, not as a replacement value.\n\nThree uses, in increasing order of required accuracy. One, validate existing map attributes: when a confident estimate disagrees with the map by more than a metre, route it to an analyst. Two, screen for low clearances: rank structures by estimate and survey the lowest first. Three, where no value exists, use the estimate for internal prioritization, and verify before publishing to drivers.\n\nThe cost profile is favourable. About six seconds of GPU time per bridge, so the full Illinois inventory can be screened in hours, and adding a new region is a configuration change: a state inventory file and a bounding box.");
  },
  // 21. Next steps
  function (sl) {
    title(sl, 'Next steps: from screening to publishing values');
    var n = [['Map-matched retrieval', 'Search along the road under each bridge with OpenStreetMap crossings (implemented)'], ['Wide-angle cameras', 'Pass corrected intrinsics to the model; fleet cameras dominate new coverage'], ['Cross-backbone ensemble', 'MapAnything + DA3 + VGGT; disagreement as a confidence signal'], ['Calibrate at scale', 'Several hundred surveyed bridges per camera class before publishing']];
    n.forEach(function (r, i) {
      var x = 38 + (i % 2) * 326, y = 88 + Math.floor(i / 2) * 104;
      rect(sl, x, y, 314, 92, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
      numberDot(sl, x + 12, y + 12, i + 1);
      text(sl, x + 44, y + 10, 260, 24, r[0], { font: HF, size: 12, bold: true, color: C.ink, valign: 'MIDDLE' });
      text(sl, x + 44, y + 38, 260, 48, r[1], { size: 10.5, color: C.text, ls: 115 });
    });
    rich(sl, 38, 304, 644, 40, [['Beyond bridges  ', { font: HF, bold: true, color: C.ink }], ['Overhead sign structures · lane width · building height · stop signs already work (MAE 0.11 m vs standard size)', { color: C.mute }]], { size: 10.5 });
    footer(sl, 4);
    notes(sl, "To move from screening to publishing values, a few steps.\n\nFirst, map-matched retrieval: use OpenStreetMap crossing geometry to search along the road under each bridge. It's already implemented; the public servers were down during our experiment window. Second, better handling of wide-angle fleet cameras, since they dominate recent Mapillary coverage. Third, a cross-backbone ensemble of MapAnything, Depth Anything 3 and VGGT, where disagreement between models becomes a confidence signal. And fourth, calibration on several hundred externally surveyed bridges per camera class.\n\nThe same pipeline also extends beyond bridges. Stop signs already worked without modification, within about 11 centimetres of a standard size.");
  },
  // 22. Thank you
  function (sl) {
    sl.getBackground().setSolidFill(C.ink);
    rect(sl, 0, 0, 8, 405, C.maroon);
    text(sl, 40, 120, 640, 60, 'Thank You', { font: HF, size: 36, bold: true, color: C.white });
    text(sl, 40, 180, 640, 30, 'Questions?', { font: HF, size: 16, color: '#E39B9B', bold: true });
    line(sl, 40, 224, 120, 224, C.maroon, 2);
    text(sl, 40, 236, 640, 20, 'Kely Zhang  ·  Anna Chen  ·  Adaora Ezike   |   Advisor: Dr. Jeanette Shutay', { size: 11, color: '#C9CDD2' });
    text(sl, 40, 258, 640, 20, 'Paper, code and results: github.com/Yichun-Zhang-ZYC', { size: 10, color: '#9AA0A7' });
    text(sl, 40, 352, 360, 30, 'THE UNIVERSITY OF CHICAGO\nMS IN APPLIED DATA SCIENCE', { font: HF, size: 7, bold: true, color: '#8A9099', ls: 110 });
    notes(sl, "Thank you. Everything we showed today, including the paper, code, notebooks and results, is in our public GitHub repository. We're happy to take your questions.");
  }
];
