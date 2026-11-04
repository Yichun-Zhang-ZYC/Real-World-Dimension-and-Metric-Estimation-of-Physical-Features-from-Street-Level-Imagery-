import numpy as np, pandas as pd, json, os, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
B, O, A, Y, V = '#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#6250d6'
INK, INK2, GRID, GRAY = '#0b0b0b', '#52514e', '#e4e3df', '#9a9893'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9.5, 'axes.edgecolor': GRAY, 'axes.labelcolor': INK,
    'xtick.color': INK2, 'ytick.color': INK2, 'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': .6,
    'axes.spines.top': False, 'axes.spines.right': False, 'axes.titleweight': 'bold', 'axes.titlesize': 10.5,
    'axes.titlelocation': 'left', 'legend.frameon': False, 'savefig.dpi': 220, 'savefig.bbox': 'tight'})
DATA = os.environ.get('DATADIR', 'data/'); F = os.environ.get('FIGDIR', 'figs/')
def save(fig, n): fig.savefig(F + n); plt.close(fig)
a = pd.read_csv(DATA + 'expA2_probe.csv', dtype={'case_id': str}); b = pd.read_csv(DATA + 'expB_undistort.csv', dtype={'case_id': str})
a['qc'] = a.qc_pass.astype(str) == 'True'; b['qc'] = b.qc_pass.astype(str) == 'True'

# ---- coverage v1 vs v2
fig, ax = plt.subplots(figsize=(7.2, 2.9))
stages = ['Usable anchor frame', 'Passed QC (multi-view)']
v1 = [38, 32]; v2a = [38 + 15, 32 + 15]; v2b = [38 + 15, 35 + 15]
y = np.arange(len(stages))
for off, vals, c, lab in [(-.27, v1, GRAY, 'v1: original retrieval'), (0, v2a, B, '+ detection-guided retrieval'), (.27, v2b, A, '+ lens undistortion (pipeline v2)')]:
    ax.barh(y + off, vals, .25, color=c, label=lab)
    for yy, v in zip(y + off, vals): ax.text(v + .8, yy, f'{v}  ({v/80:.0%})', va='center', fontsize=8.2)
ax.set_yticks(y, stages); ax.invert_yaxis(); ax.set_xlim(0, 100); ax.set_xlabel('Bridges (of 80)'); ax.grid(axis='y', visible=False)
ax.legend(fontsize=8, loc='upper right'); ax.set_title('Coverage of the 80-bridge benchmark, before and after pipeline v2')
save(fig, 'fig_coverage_v2.png')

# ---- camera fingerprint
g = b.copy(); g['grp'] = np.where(g.make.fillna('none') == 'none', 'No EXIF (fleet dashcam)', np.where(g.make.isin(['GoPro', 'SONY']), 'Action camera', 'Phone / tablet'))
fig, ax = plt.subplots(figsize=(5.8, 3.6))
for grp, c in [('Phone / tablet', B), ('Action camera', Y), ('No EXIF (fleet dashcam)', O)]:
    h = g[g.grp == grp]; ax.scatter(h.focal.clip(upper=2), h.k1, s=30, c=c, ec='white', lw=.8, label=f'{grp} (n={len(h)})', zorder=3)
ax.axhline(-.06, color=INK2, ls='--', lw=1); ax.text(.55, -.09, 'k1 < -0.06: strong barrel\ndistortion (wide-angle)', fontsize=8, color=INK2)
ax.set_xlabel('Normalised focal length (Mapillary camera_parameters)'); ax.set_ylabel('Radial distortion k1')
ax.set_title('Camera fingerprint of the 80 benchmark anchors'); ax.legend(fontsize=7.8, loc='lower right')
save(fig, 'fig_camera_fingerprint.png')

# ---- undistortion before/after (single view, bridges QC in both)
both = b[(b.orig_qc.astype(str) == 'True') & b.qc].copy()
both['wide'] = both.k1 < -.06
fig, axs = plt.subplots(1, 2, figsize=(9.4, 3.6), sharey=True)
for ax, (v, o) in zip(axs, [('single_clear_med_m', 'orig_single'), ('multi_clear_med_m', 'orig_multi')]):
    h = both.dropna(subset=[v, o]).copy(); h['e0'] = h[o] - h['gt']; h['e1'] = h[v] - h['gt']
    h = h.sort_values(['wide', 'e0']).reset_index(drop=True)
    for i, r in h.iterrows():
        c = O if r.wide else B
        ax.plot([r.e0, r.e1], [i, i], color=c, lw=1.2, alpha=.7); ax.scatter([r.e0], [i], s=14, c='white', ec=c, zorder=3); ax.scatter([r.e1], [i], s=16, c=c, zorder=3)
    ax.axvline(0, color=INK2, lw=1); ax.axvspan(-.5, .5, color=B, alpha=.07); ax.set_yticks([]); ax.set_xlim(-6, 4.5)
    ax.set_xlabel('Signed error vs NBI (m)'); ax.set_title(('Single-view' if 'single' in v else 'Multi-view') + f' (n={len(h)})')
axs[0].scatter([], [], c=B, label='Phone / tablet'); axs[0].scatter([], [], c=O, label='Wide-angle (k1 < -0.06)')
axs[0].scatter([], [], c='white', ec=INK2, label='hollow = before, filled = after'); axs[0].legend(fontsize=7.6, loc='center left')
fig.suptitle('Effect of lens undistortion on each bridge', x=.06, ha='left', fontsize=10.5, weight='bold')
save(fig, 'fig_undistort.png')

# ---- metros
if os.path.exists(DATA + 'expD_all.csv'):
    d = pd.read_csv(DATA + 'expD_all.csv', dtype={'case_id': str}); R = json.load(open(DATA + 'results_v2.json'))
    names = {'IN': 'Indianapolis', 'WI': 'Milwaukee'}
    rows = [('Chicago\n(dev, v2)', R['V2']['accepted']), ('Chicago\n(held-out)', R['HO']['accepted'])] + \
           [(names[m] + '\n(external)', R[f'D_{m}']['accepted_m']) for m in ['IN', 'WI'] if f'D_{m}' in R]
    fig, ax = plt.subplots(figsize=(7.4, 3.3)); x = np.arange(len(rows))
    mae = [r[1].get('MAE', np.nan) for r in rows]; pri = [r[1].get('prior_MAE', np.nan) for r in rows]; nn = [r[1].get('n', 0) for r in rows]
    ax.bar(x - .18, mae, .34, color=B, label='Pipeline (accepted estimates)'); ax.bar(x + .18, pri, .34, color=GRAY, label='Constant prior (4.97 m)')
    for i in range(len(rows)):
        ax.text(i - .18, mae[i] + .02, f'{mae[i]:.2f}', ha='center', fontsize=8); ax.text(i + .18, pri[i] + .02, f'{pri[i]:.2f}', ha='center', fontsize=8)
    ax.set_xticks(x, [f'{r[0]}\nn={n}' for r, n in zip(rows, nn)], fontsize=8); ax.set_ylabel('MAE (m)'); ax.grid(axis='x', visible=False)
    ax.legend(fontsize=8); ax.set_title('Generalization: same frozen pipeline in new metros')
    save(fig, 'fig_metros.png')
print('ok')
