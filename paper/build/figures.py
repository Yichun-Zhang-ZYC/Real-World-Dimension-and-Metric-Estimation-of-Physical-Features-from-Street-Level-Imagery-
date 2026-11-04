import numpy as np, pandas as pd, json, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from sklearn.metrics import roc_curve, roc_auc_score
B, O, A, Y = '#2a78d6', '#eb6834', '#1baf7a', '#eda100'
INK, INK2, GRID, GRAY = '#0b0b0b', '#52514e', '#e4e3df', '#9a9893'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9.5, 'axes.edgecolor': GRAY, 'axes.labelcolor': INK,
    'xtick.color': INK2, 'ytick.color': INK2, 'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': .6,
    'axes.spines.top': False, 'axes.spines.right': False, 'axes.titleweight': 'bold', 'axes.titlesize': 10.5,
    'axes.titlelocation': 'left', 'legend.frameon': False, 'savefig.dpi': 220, 'savefig.bbox': 'tight'})
import os
F = os.environ.get('FIGDIR', 'figs/')
b = pd.read_csv('data/mapanything.csv', dtype={'case_id': str}).rename(columns={'gt': 'y'})
b['exif'] = b.make.isin(['Apple', 'GoPro'])
x = pd.read_csv('data/expanded_slim.csv', dtype={'case_id': str})
PRIOR = 4.965
def save(fig, n): fig.savefig(F + n); plt.close(fig)

# ---- Fig 1: pipeline diagram
fig, ax = plt.subplots(figsize=(12, 3.4)); ax.axis('off'); ax.set_xlim(0, 101); ax.set_ylim(0, 34)
stages = [('1  Target &\nimage retrieval', 'NBI record →\nMapillary sequence\n(heading and\ndistance gates)'),
          ('2  Frame selection\n& segmentation', 'Mask2Former (Vistas)\nSAM3 fallback\nanchor + 3 views'),
          ('3  Metric 3D\nreconstruction', 'MapAnything | DA3 |\nVGGT (GPS-scaled)\nbackbone-agnostic'),
          ('4  Geometric\nmeasurement', 'RANSAC road plane\nunderside → plane\nmedian clearance'),
          ('5  QC & confidence', 'camera height, columns,\nplausibility gate,\ncamera type / recency,\nview spread'),
          ('6  Output &\nreview routing', 'GeoJSON + confidence\naccept or review,\ncompare with\nexisting map value')]
w, gap = 14.6, 2.3
for i, (t, s) in enumerate(stages):
    x0 = 1 + i*(w+gap); col = B if i < 4 else A
    ax.add_patch(FancyBboxPatch((x0, 6), w, 22, boxstyle='round,pad=0.3,rounding_size=1.2', fc='white', ec=col, lw=1.6))
    ax.text(x0+w/2, 23.5, t, ha='center', va='center', fontsize=8.2, weight='bold', color=INK)
    ax.text(x0+w/2, 13, s, ha='center', va='center', fontsize=6.9, color=INK2)
    if i < 5: ax.annotate('', (x0+w+gap-0.2, 17), (x0+w+0.3, 17), arrowprops=dict(arrowstyle='-|>', color=GRAY, lw=1.2))
ax.text(1, 1.5, 'Blue: measurement chain shared by all backbones. Green: added confidence layer that decides what is published vs. reviewed.', fontsize=7.6, color=INK2)
save(fig, 'fig1_pipeline.png')

# ---- Fig: coverage funnel
fig, ax = plt.subplots(figsize=(7, 3))
labels = ['Benchmark bridges', 'Structure + road\nfound on anchor', 'Clearance measured\n(multi-view)', 'Passed QC\n(multi-view)', 'Passed QC\n(single-view)', 'Accepted after\nplausibility + camera rules']
vals = [80, 38, 34, 32, 30, 22]
ax.barh(range(len(vals))[::-1], vals, color=[GRAY, B, B, B, B, A], height=.62)
for i, v in enumerate(vals): ax.text(v+1, len(vals)-1-i, f'{v}  ({v/80:.0%})', va='center', fontsize=8.5, color=INK)
ax.set_yticks(range(len(vals))[::-1], labels, fontsize=8.3); ax.set_xlim(0, 95); ax.grid(axis='y', visible=False)
ax.set_xlabel('Bridges'); ax.set_title('Coverage funnel on the 80-bridge benchmark (MapAnything)')
ax.text(52, 2.6, '41 of 42 drop-outs: no overhead\nstructure in any frame (location)', fontsize=7.8, color=INK2)
save(fig, 'fig_funnel.png')

# ---- Fig: pred vs GT, dev, single and multi, colored by camera
fig, axs = plt.subplots(1, 2, figsize=(9, 4), sharey=True)
for ax, v in zip(axs, ['single', 'multi']):
    q = b[(b.view == v) & (b.qc.astype(str) == 'True')]
    ax.fill_between([3, 9.5], [2.5, 9], [3.5, 10], color=B, alpha=.08, lw=0)
    ax.plot([3, 9.5], [3, 9.5], '--', color=GRAY, lw=1)
    for ex, c, lab in [(True, B, 'Phone / action camera (EXIF)'), (False, O, 'No EXIF (mostly dashcam)')]:
        g = q[q.exif == ex]; ax.scatter(g.y, g.med, s=34, c=c, ec='white', lw=1, label=f'{lab}, n={len(g)}', zorder=3)
    ax.set_title(f'{v.capitalize()}-view'); ax.set_xlabel('NBI minimum vertical clearance (m)'); ax.set_xlim(3.5, 8.5); ax.set_ylim(1, 9.5)
axs[0].set_ylabel('Estimated clearance (m)'); axs[0].legend(loc='upper left', fontsize=8)
axs[1].text(5.9, 1.25, 'Gross under-estimates\n(< 3 m) = wrong target', fontsize=7.8, color=INK2)
fig.suptitle('MapAnything estimates vs. NBI on QC-passing benchmark bridges (band = ±0.5 m)', x=.06, ha='left', fontsize=10.5, weight='bold')
save(fig, 'fig_pred_vs_gt.png')

# ---- Fig: error distributions by factor (single-view)
q = b[(b.view == 'single') & (b.qc.astype(str) == 'True')].copy(); q['err'] = q.med - q.y
fig, axs = plt.subplots(1, 3, figsize=(10, 3.4), sharey=True)
groups = [('Camera', [('EXIF', q[q.exif].err), ('No EXIF', q[~q.exif].err)]),
          ('Distance to structure', [('<30 m', q[q.dist < 30].err), ('30–45 m', q[(q.dist >= 30) & (q.dist < 45)].err), ('>45 m', q[q.dist >= 45].err)]),
          ('NBI clearance', [('≤4.75', q[q.y <= 4.75].err), ('4.75–5.5', q[(q.y > 4.75) & (q.y <= 5.5)].err), ('>5.5', q[q.y > 5.5].err)])]
for ax, (t, gs) in zip(axs, groups):
    for i, (lab, e) in enumerate(gs):
        ax.boxplot([e], positions=[i], widths=.5, showfliers=False, medianprops=dict(color=INK, lw=1.5),
                   boxprops=dict(color=GRAY), whiskerprops=dict(color=GRAY), capprops=dict(color=GRAY))
        ax.scatter(np.random.default_rng(i).normal(i, .06, len(e)), e, s=16, c=B, alpha=.8, zorder=3, ec='white', lw=.6)
        ax.text(i, 2.35, f'n={len(e)}', ha='center', fontsize=7.5, color=INK2)
    ax.axhline(0, color=GRAY, lw=1); ax.set_xticks(range(len(gs)), [g[0] for g in gs]); ax.set_title(t); ax.grid(axis='x', visible=False)
axs[0].set_ylabel('Signed error, estimate − NBI (m)'); axs[0].set_ylim(-6, 2.6)
save(fig, 'fig_error_factors.png')

# ---- Fig: measurement definition median vs p10
fig, ax = plt.subplots(figsize=(5.2, 3.4))
qs = b[(b.view == 'single') & (b.qc.astype(str) == 'True')]
for col, c, lab in [('med', B, 'Median of underside columns'), ('p10', O, '10th percentile (≈ "minimum")')]:
    e = qs[col] - qs.y; ax.hist(e, bins=np.arange(-6, 2.5, .4), color=c, alpha=.55, label=f'{lab}: MAE {e.abs().mean():.2f} m', ec='white')
ax.axvline(0, color=INK, lw=1); ax.set_ylim(0, 13); ax.legend(fontsize=7.8, loc='upper left'); ax.set_xlabel('Signed error (m)'); ax.set_ylabel('Bridges')
ax.set_title('Which underside statistic matches NBI Item 54B?')
save(fig, 'fig_definition.png')

# ---- Fig: generalization dev vs held-out, model vs prior
t = pd.read_csv('data/baseline_table.csv')
fig, axs = plt.subplots(1, 2, figsize=(10, 3.6), sharey=True)
for ax, split, ttl in [(axs[0], 'dev', 'Development (80-bridge benchmark, QC pass)'), (axs[1], 'heldout', 'Held-out (51 new Chicago-area bridges)')]:
    r = t[t.subset.str.startswith(split)]
    xs = np.arange(len(r)); lab = ['All QC', '+ plausibility\ngate', '+ exclude\nrecent captures']
    ax.bar(xs-.18, r.model_MAE, .34, color=B, label='Pipeline (median of views)')
    ax.bar(xs+.18, r.prior_MAE, .34, color=GRAY, label='Constant prior (4.97 m)')
    for i, (m, p, n) in enumerate(zip(r.model_MAE, r.prior_MAE, r.n)):
        ax.text(i-.18, m+.03, f'{m:.2f}', ha='center', fontsize=7.8); ax.text(i+.18, p+.03, f'{p:.2f}', ha='center', fontsize=7.8)
    ax.set_xticks(xs, [f'{l}\nn={n}' for l, n in zip(lab, r.n)], fontsize=8); ax.set_title(ttl, fontsize=9.5); ax.grid(axis='x', visible=False); ax.set_ylim(0, 1.3)
axs[0].set_ylabel('MAE (m)'); axs[0].legend(fontsize=8, loc='upper right')
fig.suptitle('Absolute accuracy against a no-image baseline', x=.06, ha='left', fontsize=10.5, weight='bold')
save(fig, 'fig_generalization_mae.png')

# ---- Fig: ROC for low / high clearance screening (accepted cases, all 83)
acc = x[~x.implausible & ~x.recent]
fig, axs = plt.subplots(1, 2, figsize=(8.4, 3.6))
for ax, (lab, yv, sc, c) in zip(axs, [('NBI < 4.6 m (≈15 ft)', acc.ytrue < 4.6, -acc.fused, B), ('NBI > 5.5 m', acc.ytrue > 5.5, acc.fused, A)]):
    fpr, tpr, _ = roc_curve(yv, sc); auc = roc_auc_score(yv, sc)
    ax.plot(fpr, tpr, color=c, lw=2); ax.plot([0, 1], [0, 1], '--', color=GRAY, lw=1)
    ax.set_title(f'Flag {lab}: AUC {auc:.2f}', fontsize=9.5); ax.set_xlabel('False-positive rate'); ax.set_ylabel('True-positive rate')
    ax.text(.55, .1, f'positives {int(yv.sum())} / {len(yv)}', fontsize=8, color=INK2)
fig.suptitle('Ranking value: separating unusually low and high structures (accepted estimates, n=65)', x=.06, ha='left', fontsize=10.5, weight='bold')
save(fig, 'fig_roc.png')

# ---- Fig: risk-coverage dev vs heldout
rc = json.load(open('data/rc_heldout.json'))
fig, ax = plt.subplots(figsize=(5.6, 3.5))
for k, c, lab in [('dev', B, 'Development'), ('heldout', O, 'Held-out')]:
    cov, mae, base = rc[k]; ax.plot(np.array(cov)*100, mae, color=c, lw=2, label=lab); ax.axhline(base, color=c, lw=.8, ls=':')
ax.set_xlabel('Coverage: % of bridges published (most confident first)'); ax.set_ylabel('MAE of published estimates (m)')
ax.set_ylim(0, 1.6); ax.legend(fontsize=8); ax.set_title('Selective prediction with the confidence score')
save(fig, 'fig_risk_coverage.png')

# ---- Fig: capture year
fig, ax = plt.subplots(figsize=(5.4, 3.3))
x['ae'] = (x.fused - x.ytrue).abs()
for i, (lab, g) in enumerate([('2015–2022', x[~x.recent]), ('2023–2026', x[x.recent])]):
    ax.boxplot([g.ae], positions=[i], widths=.5, showfliers=False, medianprops=dict(color=INK, lw=1.5), boxprops=dict(color=GRAY), whiskerprops=dict(color=GRAY), capprops=dict(color=GRAY))
    ax.scatter(np.random.default_rng(3).normal(i, .07, len(g)), g.ae, s=14, c=[B, O][i], alpha=.8, ec='white', lw=.5, zorder=3)
    ax.text(i, 6.4, f'n={len(g)}  median {g.ae.median():.2f} m', ha='center', fontsize=7.8, color=INK2)
ax.set_xticks([0, 1], ['Captured 2015–2022', 'Captured 2023–2026']); ax.set_ylabel('Absolute error (m)'); ax.set_ylim(0, 7)
ax.set_title('Recent captures (mostly no-EXIF fleet cameras) fail more'); ax.grid(axis='x', visible=False)
save(fig, 'fig_capture_year.png')
print('done')
