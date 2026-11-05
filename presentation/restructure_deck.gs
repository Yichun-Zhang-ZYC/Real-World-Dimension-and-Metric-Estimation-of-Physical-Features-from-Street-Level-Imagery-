/**
 * Reorders the deck by presenter and refreshes page numbers, section chevrons and presenter tags.
 * Safe to run after teammates edited their slides: it only moves their slides and updates footer
 * page numbers, section highlights and presenter tags. It rebuilds four of Kely's own slides
 * (QC, MapAnything results, backbone comparison, decision rules). Re-running it is safe.
 * NOTE: do not run buildDeck() from build_deck.gs again; it would replace teammates' slides.
 */
var BASE = 'https://raw.githubusercontent.com/Yichun-Zhang-ZYC/Real-World-Dimension-and-Metric-Estimation-of-Physical-Features-from-Street-Level-Imagery-/main/';
var C = {
  ink: '#16191D', text: '#3A3F45', mute: '#7B828B', line: '#D5D8DC', card: '#F3F4F6',
  maroon: '#800000', blue: '#2A78D6', green: '#1F8A5B', greenLt: '#E6F4EC',
  orange: '#D2642A', orangeLt: '#FBEDE4', white: '#FFFFFF'
};
var HF = 'Montserrat', BF = 'Lato';
var SECTIONS = ['Overview', 'Data', 'Pipeline', 'Results', 'Impact'];
var S = 1, PRES;

// key: [title prefix, section index (-1 none, null = no footer), presenter tag or null]
var KEYS = {
  title: ['Measuring Bridge Clearance', null, null],
  agenda: ['Agenda', -1, 'ADAORA'],
  scr: ['Clearance data is costly', 0, 'ADAORA'],
  rq: ['Research question', 0, 'ADAORA'],
  data: ['Three sources build', 1, 'ADAORA'],
  bench: ['80 benchmark bridges', 1, 'ADAORA'],
  pipe: ['One modular pipeline', 2, 'ANNA'],
  sam3: ['Segmentation: SAM3', 2, 'ANNA'],
  meas: ['Clearance = deck underside', 2, 'ANNA'],
  qc: ['Quality check: keep only', 2, 'ANNA'],
  ma: ['MapAnything: 0.43 m median error from a single image', 3, 'KELY'],
  da3a: ['Depth Anything 3: reconstructs', 3, 'ANNA'],
  da3b: ['Depth Anything 3: lower observed', 3, 'ANNA'],
  vggt1: ['VGGT: reconstructs', 3, 'ADAORA'],
  vggt2: ['VGGT: 1.58', 3, 'ADAORA'],
  vggt3: ['Scale recovery', 3, 'ADAORA'],
  compare: ['MapAnything and DA3 are comparable', 3, 'KELY'],
  errors: ['Failures are predictable', 3, 'KELY'],
  rules: ['Decision rules: accept, review or reject', 3, 'KELY'],
  held: ['Frozen rules hold', 3, 'KELY'],
  metros: ['Same accuracy in two new cities', 3, 'KELY'],
  funnel: ['Coverage is the bottleneck', 3, 'KELY'],
  v2: ['Pipeline v2 lifts', 3, 'KELY'],
  base: ['A constant 4.97', 4, 'KELY'],
  rec: ['Recommendation: deploy', 4, 'KELY'],
  next: ['Next steps', 4, 'KELY'],
  thanks: ['Thank You', null, null]
};
var ORDER = ['title', 'agenda', 'scr', 'rq', 'data', 'bench',
  'pipe', 'sam3', 'meas', 'qc',
  'ma', 'da3a', 'da3b', 'vggt1', 'vggt2', 'vggt3', 'compare',
  'errors', 'rules', 'held', 'metros', 'funnel', 'v2',
  'base', 'rec', 'next', 'thanks'];
var OLD = ['Every estimate gets a decision', 'MapAnything: 0.43 m median error on quality'];

function restructure() {
  PRES = SlidesApp.getActivePresentation();
  S = PRES.getPageWidth() / 720;
  var map;
  // remove the two slides being replaced
  PRES.getSlides().forEach(function (sl) { var t = texts(sl); if (OLD.some(function (p) { return t.some(function (x) { return x.indexOf(p) === 0; }); })) sl.remove(); });
  map = findSlides();
  var builders = { qc: buildQC, ma: buildMA, compare: buildCompare, rules: buildRules };
  Object.keys(builders).forEach(function (k) {
    if (map[k]) map[k].remove();
    var sl = PRES.insertSlide(0, SlidesApp.PredefinedLayout.BLANK);
    sl.getBackground().setSolidFill(C.white);
    builders[k](sl);
  });
  map = findSlides();
  var missing = ORDER.filter(function (k) { return !map[k]; });
  if (missing.length) throw new Error('Slides not found: ' + missing.join(', '));
  ORDER.forEach(function (k, i) { map[k].move(i); });
  ORDER.forEach(function (k, i) {
    var sl = map[k], cfg = KEYS[k];
    if (cfg[1] === null) return;
    setPage(sl, i + 1);
    setSection(sl, cfg[1]);
    if (cfg[2]) setTag(sl, cfg[2]);
  });
  editPipelineStep(map.pipe);
  unifyMetrics(map);
  updateNotes(map);
}

/* ---------- finding and patching ---------- */
function texts(sl) { return sl.getShapes().map(function (sh) { return sh.getText().asString().trim(); }); }
function findSlides() {
  var map = {}, slides = PRES.getSlides();
  for (var i = 0; i < slides.length; i++) {
    var sl = slides[i], tx = texts(sl);
    if (tx.some(function (t) { return t.indexOf('Previous draft slides below') === 0; })) break;
    Object.keys(KEYS).forEach(function (k) {
      if (map[k]) return;
      if (tx.some(function (t) { return t.indexOf(KEYS[k][0]) === 0; })) map[k] = sl;
    });
  }
  return map;
}
function setPage(sl, n) {
  sl.getShapes().forEach(function (sh) {
    var t = sh.getText().asString().trim();
    if (/^PAGE \d+$/.test(t)) sh.getText().setText('PAGE ' + n);
  });
}
function setSection(sl, sec) {
  sl.getShapes().forEach(function (sh) {
    var t = sh.getText().asString().trim(), i = SECTIONS.indexOf(t);
    if (i < 0 || sh.getTop() < 360 * S) return;
    var on = i === sec;
    sh.getFill().setSolidFill(on ? '#D9DCE0' : C.ink);
    if (on) sh.getBorder().setTransparent(); else { sh.getBorder().getLineFill().setSolidFill('#8A9099'); sh.getBorder().setWeight(1); }
    sh.getText().getTextStyle().setForegroundColor(on ? C.ink : C.white).setBold(on);
  });
}
function setTag(sl, who) {
  var tag = null;
  sl.getShapes().forEach(function (sh) {
    if (['KELY', 'ANNA', 'ADAORA'].indexOf(sh.getText().asString().trim()) >= 0 && sh.getTop() < 80 * S) tag = sh;
  });
  if (tag) { tag.getText().setText(who); style(tag.getText(), { font: HF, size: 9, bold: true, color: C.white }); return; }
  // no tag yet: narrow the title box so the tag does not overlap it, then add the tag
  sl.getShapes().forEach(function (sh) {
    if (Math.abs(sh.getLeft() - 38 * S) < 3 && Math.abs(sh.getTop() - 18 * S) < 3 && sh.getWidth() > 600 * S) sh.setWidth(560 * S);
  });
  pill(sl, 620, 28, 76, 22, who, C.maroon);
}
function editPipelineStep(sl) {
  sl.getShapes().forEach(function (sh) {
    var t = sh.getText().asString().trim();
    if (t === 'Bridge + road masks (Mask2Former, Vistas)') { sh.getText().setText('Bridge + road masks (Mask2Former; SAM3 tested)'); style(sh.getText(), { size: 9.5 }); }
  });
}
function unifyMetrics(m) {
  var R = [[m.held, 'raw held-out error vs 0.92 m on benchmark: no overfitting', 'mean abs. error on held-out vs 0.92 m on benchmark: no overfitting'],
    [m.held, 'with plausibility + camera rules, 84% of estimates kept', 'mean abs. error after plausibility + camera rules, 84% kept'],
    [m.held, '0.62 m error at 57% coverage', '0.62 m mean abs. error at 57% coverage'],
    [m.metros, 'accepted single-view error (Chicago: 0.68 m), 80% within 1 m', 'mean abs. error (median 0.51 m); Chicago: 0.68 m'],
    [m.metros, 'mean abs. error, accepted single-view (Chicago 0.68 m); median 0.51 m, 80% within 1 m', 'mean abs. error (median 0.51 m); Chicago: 0.68 m'],
    [m.v2, 'more pass QC after undistortion; MAE 0.92 → 0.80 m', 'more pass QC after undistortion; mean abs. error 0.92 → 0.80 m']];
  R.forEach(function (r) { if (r[0]) r[0].replaceAllText(r[1], r[2]); });
}
function setNotes(sl, str) { if (sl) sl.getNotesPage().getSpeakerNotesShape().getText().setText(str); }
function updateNotes(m) {
  setNotes(m.agenda, "Here's the plan. First, the business problem and our research question. Then the data: Mapillary imagery, with the federal bridge inventory as ground truth. Then the pipeline, which turns photos into a clearance estimate. Then each of us presents one 3D backbone, and Kely takes the best one further: confidence rules, tests on new bridges and new cities, and a fix for coverage. And finally, what we recommend HERE do with it.\n\nOn the team: Kely built the MapAnything branch and pipeline v2, Anna led Depth Anything 3 and the segmentation comparison, and I led the VGGT branch.");
  setNotes(m.errors, "Looking more closely at MapAnything's errors, the good news is that failures are predictable from metadata.\n\nDashcams without EXIF data are biased low; they have strongly distorted wide-angle lenses. When the camera is closer than 30 metres, the deck sits at the very top edge of the frame where distortion is strongest, and we underestimate by 1.35 metres. Estimates under 3 metres are almost always a barrier or a sign instead of the deck. And across all 83 checked bridges, captures since 2023, mostly fleet cameras, had double the median error.\n\nEvery one of these signals is available before you compare with ground truth, which is exactly why they became our decision rules on the next slide.");
  setNotes(m.held, "The key question for any benchmark is: did we overfit? So we froze every rule and ran the whole pipeline, retrieval to decision, on 51 Chicago bridges we had never used.\n\nRaw accuracy carried over: 0.93 metres mean absolute error on held-out versus 0.92 on the benchmark. The rules carried over too. The plausibility gate and camera rule cut the error from 0.87 to 0.73 metres while keeping 84 percent of estimates, and adding the view-agreement rule brought it to 0.62. Gross errors above 1.5 metres fell from 18 to 11 percent.\n\nYou'll notice the grey bars, the constant baseline, are still lower. I'll come back to that at the end.");
  setNotes(m.funnel, "Back to the benchmark for the biggest remaining problem: coverage.\n\nOf our 80 bridges, only 38 gave us a usable anchor frame. In 41 cases, the segmenter found no overhead structure in any frame at all. When we looked at them, the cause was the inventory coordinate: it marks the structure, not the road underneath, so the closest Mapillary sequence often runs alongside the bridge or over it.\n\nAfter all the rules, 22 bridges, 28 percent, would be accepted automatically. The lesson: the fix had to be in retrieval, not in the 3D model.");
}

/* ---------- drawing helpers ---------- */
function rect(sl, x, y, w, h, fill, type, border) {
  var s = sl.insertShape(type || SlidesApp.ShapeType.RECTANGLE, x * S, y * S, w * S, h * S);
  if (fill) s.getFill().setSolidFill(fill); else s.getFill().setTransparent();
  if (border) { s.getBorder().getLineFill().setSolidFill(border); s.getBorder().setWeight(1); } else s.getBorder().setTransparent();
  return s;
}
function style(r, o) {
  var t = r.getTextStyle();
  t.setFontFamily(o.font || BF).setFontSize(o.size || 12).setForegroundColor(o.color || C.text).setBold(!!o.bold);
  return r;
}
function text(sl, x, y, w, h, str, o) {
  o = o || {};
  var s = sl.insertTextBox(str, x * S, y * S, w * S, h * S);
  style(s.getText(), o);
  if (o.align) s.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment[o.align]);
  if (o.valign) s.setContentAlignment(SlidesApp.ContentAlignment[o.valign]);
  if (o.ls) s.getText().getParagraphStyle().setLineSpacing(o.ls);
  return s;
}
function rich(sl, x, y, w, h, parts, o) {
  o = o || {};
  var s = sl.insertTextBox(' ', x * S, y * S, w * S, h * S), tr = s.getText();
  tr.setText('');
  parts.forEach(function (p) { style(tr.appendText(p[0]), Object.assign({}, o, p[1] || {})); });
  if (o.valign) s.setContentAlignment(SlidesApp.ContentAlignment[o.valign]);
  if (o.ls) tr.getParagraphStyle().setLineSpacing(o.ls);
  return s;
}
function pill(sl, x, y, w, h, str, fill, color) {
  var p = rect(sl, x, y, w, h, fill, SlidesApp.ShapeType.ROUND_RECTANGLE);
  p.getText().setText(str);
  style(p.getText(), { font: HF, size: 9, bold: true, color: color || C.white });
  p.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  p.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  return p;
}
function img(sl, path, x, y, w, h) {
  var im = sl.insertImage(BASE + path);
  var r = Math.min(w / im.getWidth(), h / im.getHeight()), iw = im.getWidth() * r, ih = im.getHeight() * r;
  im.setWidth(iw * S).setHeight(ih * S).setLeft((x + (w - iw) / 2) * S).setTop((y + (h - ih) / 2) * S);
}
function title(sl, str) {
  rect(sl, 28, 26, 4, 34, C.maroon);
  text(sl, 38, 18, 560, 50, str, { font: HF, size: 20, bold: true, color: C.ink, valign: 'MIDDLE', ls: 100 });
}
function stat(sl, x, y, w, num, label, color) {
  text(sl, x, y, w, 34, num, { font: HF, size: 22, bold: true, color: color || C.maroon });
  text(sl, x, y + 32, w, 30, label, { size: 10.5, color: C.text, ls: 105 });
}
function footer(sl) {
  rect(sl, 0, 371, 720, 34, C.ink);
  text(sl, 18, 374, 160, 28, 'THE UNIVERSITY OF CHICAGO\nMS IN APPLIED DATA SCIENCE', { font: HF, size: 6.5, color: C.white, bold: true, valign: 'MIDDLE', ls: 110 });
  SECTIONS.forEach(function (name, i) {
    var sh = rect(sl, 190 + i * 88, 377, 92, 22, C.ink, i === 0 ? SlidesApp.ShapeType.HOME_PLATE : SlidesApp.ShapeType.CHEVRON, '#8A9099');
    sh.getText().setText(name);
    style(sh.getText(), { font: HF, size: 7, color: C.white });
    sh.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    sh.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  });
  text(sl, 640, 374, 66, 28, 'PAGE 0', { font: HF, size: 7, color: C.white, bold: true, align: 'END', valign: 'MIDDLE' });
}

/* ---------- rebuilt slides ---------- */
function buildQC(sl) {
  title(sl, 'Quality check: keep only physically plausible reconstructions');
  var c = [['Camera 0.7–3.5 m high', 'Recovered camera height must look like a car or bike mount (≈ 1.3 m)'],
    ['≥ 10 underside columns', 'Enough bridge-underside points to take a stable median'],
    ['Bridge within 90 m', 'Depth from far-away structures is unreliable']];
  c.forEach(function (r, i) {
    var x = 38 + i * 218;
    rect(sl, x, 92, 204, 150, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rect(sl, x, 92, 204, 6, C.ink);
    text(sl, x + 12, 110, 180, 40, r[0], { font: HF, size: 13, bold: true, color: C.ink, ls: 105 });
    text(sl, x + 12, 156, 180, 70, r[1], { size: 10.5, color: C.text, ls: 115 });
  });
  rect(sl, 38, 262, 644, 84, C.ink, SlidesApp.ShapeType.ROUND_RECTANGLE);
  [['Same check', 'for every backbone'], ['No ground truth', 'used to decide'], ['All errors', 'reported on QC-passing bridges']].forEach(function (r, i) {
    var x = 56 + i * 214;
    text(sl, x, 272, 200, 26, r[0], { font: HF, size: 14, bold: true, color: '#E39B9B' });
    text(sl, x, 298, 200, 40, r[1], { size: 10.5, color: C.white, ls: 110 });
  });
  footer(sl);
  setNotes(sl, "Before we compare any numbers, one more shared step: a quality check. It decides whether a 3D reconstruction is physically plausible, without looking at the ground truth.\n\nThree conditions. First, the recovered camera height has to be between 0.7 and 3.5 metres, which is what a car or bike mount looks like. If the model puts the camera ten metres above the road, the reconstruction is broken. Second, we need at least ten underside columns, so the median is stable. Third, the bridge must be within 90 metres, because depth far away is unreliable.\n\nThis check is identical for all three backbones, and every error you'll see next is reported on the bridges that passed it.");
}
function buildMA(sl) {
  title(sl, 'MapAnything: 0.43 m median error from a single image');
  img(sl, 'paper/build/figs/fig_pred_vs_gt.png', 24, 76, 430, 226);
  text(sl, 30, 304, 420, 40, 'Blue: phone / action camera · Orange: no EXIF (mostly dashcams) · Band: ±0.5 m', { size: 8.5, color: C.mute });
  stat(sl, 478, 80, 210, '0.92 / 1.09 m', 'mean absolute error\nsingle-view / multi-view');
  stat(sl, 478, 148, 210, '0.43 / 0.58 m', 'median absolute error\nsingle-view / multi-view');
  stat(sl, 478, 216, 210, '30 / 32', 'bridges passing quality checks\nsingle-view / multi-view');
  rect(sl, 478, 290, 204, 60, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
  text(sl, 488, 292, 188, 56, 'Phone & action cameras: 0.65 m mean. Biggest misses are dashcams.', { size: 10, bold: true, color: C.ink, valign: 'MIDDLE', ls: 110 });
  footer(sl);
  setNotes(sl, "Now each of us presents one backbone, starting with mine, MapAnything.\n\nOn bridges that passed quality control, single-view had a mean absolute error of 0.92 metres and a median of 0.43; multi-view was 1.09 and 0.58, and the paired difference between the two was not significant. On phone and action-camera imagery the single-view mean drops to 0.65. On the plot, blue points are phones and orange points are dashcams without camera metadata, and that's where most of the big misses are.\n\nA nice sanity check: the recovered camera height came out around 1.3 metres, exactly a car-mounted camera, so the model's metric scale is right. Next, Anna with Depth Anything 3.");
}
function buildCompare(sl) {
  title(sl, 'MapAnything and DA3 are comparable; VGGT trails');
  var rows = [['Backbone', 'View', 'Passing QC', 'Mean abs. error', 'Median abs. error'],
    ['MapAnything', 'Single', '30', '0.92 m', '0.43 m'],
    ['MapAnything', 'Multi', '32', '1.09 m', '0.58 m'],
    ['Depth Anything 3', 'Single', '35', '1.21 m', '0.73 m'],
    ['Depth Anything 3', 'Multi', '32', '0.99 m', '0.55 m'],
    ['VGGT', 'Multi', '35', '1.58 m', '1.20 m']];
  var tb = sl.insertTable(rows.length, 5, 38 * S, 84 * S, 420 * S, 190 * S);
  rows.forEach(function (r, i) {
    r.forEach(function (v, j) {
      var cell = tb.getCell(i, j);
      cell.getText().setText(v);
      style(cell.getText(), { font: i === 0 ? HF : BF, size: i === 0 ? 9 : 10.5, bold: i === 0 || j === 0, color: i === 0 ? C.white : C.ink });
      if (j > 0) cell.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
      cell.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
      cell.getFill().setSolidFill(i === 0 ? C.ink : (i === 5 ? C.orangeLt : (i % 2 ? C.white : C.card)));
    });
  });
  text(sl, 38, 318, 420, 30, 'QC-passing bridges of the same 80-bridge benchmark; same frames, masks and measurement. VGGT is GPS-scaled, multi-view only.', { size: 8.5, color: C.mute });
  var t = [['MapAnything ≈ DA3', 'No significant difference on identical bridges', C.green], ['VGGT trails', '2.2× MapAnything’s error on the same 32 bridges', C.orange], ['Default: MapAnything single-view', 'Needs one frame, ≈ 6 s per bridge', C.maroon]];
  t.forEach(function (r, i) {
    var y = 84 + i * 90;
    rect(sl, 478, y, 204, 78, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rect(sl, 478, y, 4, 78, r[2]);
    text(sl, 490, y + 8, 186, 24, r[0], { font: HF, size: 11, bold: true, color: r[2] });
    text(sl, 490, y + 34, 186, 40, r[1], { size: 10.5, color: C.ink, ls: 110 });
  });
  footer(sl);
  setNotes(sl, "To pull the three backbones together: same 80 bridges, same frames, same masks, same measurement and quality check, so the numbers are directly comparable.\n\nMapAnything and Depth Anything 3 are comparable. Their best settings have a median error around half a metre, and the difference between them on identical bridges is not significant. VGGT trails: on the same 32 bridges its error is about 2.2 times MapAnything's.\n\nWe chose MapAnything single-view as the default, because it needs only one usable frame and runs in about six seconds per bridge. For the rest of the talk, I'll take that configuration further: first, can we tell good estimates from bad ones without ground truth?");
}
function buildRules(sl) {
  title(sl, 'Decision rules: accept, review or reject each estimate');
  rect(sl, 38, 96, 120, 150, C.ink, SlidesApp.ShapeType.ROUND_RECTANGLE);
  text(sl, 48, 104, 100, 134, 'Input\n\nQC-passing estimate\n(pipeline step 5)', { font: HF, size: 11, bold: true, color: C.white, valign: 'MIDDLE', ls: 110 });
  var st = [['Plausibility gate', 'Estimate must be 3–9 m\nBelow 3 m = wrong target', C.orange, 'Fail → reject'], ['Camera rule', 'Wide-angle, uncalibrated lens\n(k1 < −0.06)', C.maroon, 'Flag → review'], ['View agreement', 'Single- vs multi-view differ by > 1.05 m', C.maroon, 'Flag → review']];
  st.forEach(function (s, i) {
    var x = 178 + i * 170;
    text(sl, x - 20, 156, 20, 24, '›', { font: HF, size: 16, bold: true, color: C.mute, align: 'CENTER', valign: 'MIDDLE' });
    rect(sl, x, 96, 154, 150, C.card, SlidesApp.ShapeType.ROUND_RECTANGLE);
    rect(sl, x, 96, 154, 6, s[2]);
    text(sl, x + 10, 110, 134, 22, s[0], { font: HF, size: 11.5, bold: true, color: C.ink });
    text(sl, x + 10, 136, 136, 74, s[1], { size: 10, color: C.text, ls: 115 });
    text(sl, x + 10, 216, 134, 22, s[3], { font: HF, size: 9.5, bold: true, color: s[2] });
  });
  pill(sl, 38, 272, 120, 30, 'ACCEPT', C.green);
  pill(sl, 168, 272, 120, 30, 'REVIEW', C.maroon);
  pill(sl, 298, 272, 120, 30, 'REJECT', C.ink);
  text(sl, 436, 266, 246, 44, 'Set on the 80-bridge benchmark, then frozen', { size: 11, bold: true, color: C.ink, valign: 'MIDDLE' });
  footer(sl);
  setNotes(sl, "Those patterns became three decision rules, applied to every estimate that passed the quality check.\n\nFirst, a plausibility gate: anything below 3 or above 9 metres is rejected. On our benchmark, every estimate below 3 metres was measuring a barrier or sign instead of the deck. Second, a camera rule: wide-angle, uncalibrated lenses go to review. Third, if the single-view and multi-view estimates disagree by more than about a metre, the estimate goes to review. What passes all three is accepted.\n\nAll thresholds were set on the 80-bridge benchmark and then frozen. The next two slides test whether they hold on bridges we never used.");
}
