import numpy as np, pandas as pd, os, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
B, V, INK2, GRID, GRAY = '#2a78d6', '#6250d6', '#52514e', '#e4e3df', '#9a9893'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9.5, 'axes.edgecolor': GRAY, 'xtick.color': INK2, 'ytick.color': INK2,
    'axes.grid': True, 'grid.color': GRID, 'grid.linewidth': .6, 'axes.spines.top': False, 'axes.spines.right': False,
    'axes.titleweight': 'bold', 'axes.titlelocation': 'left', 'legend.frameon': False, 'savefig.dpi': 220, 'savefig.bbox': 'tight'})
DATA = os.environ.get('DATADIR', 'data/'); F = os.environ.get('FIGDIR', 'figs/')
T = lambda s: s.astype(str) == 'True'
d = pd.read_csv(DATA + 'expD_all.csv', dtype={'case_id': str})
v = pd.read_csv(DATA + 'benchmark_v2.csv', dtype={'case_id': str})
sets = [('Chicago\n(dev, v2)', v[~T(v.wide) & ~T(v.implausible)])]
for m, nm in [('IN', 'Indianapolis'), ('WI', 'Milwaukee')]:
    sets.append((nm + '\n(external)', d[(d.metro == m) & T(d.qc_pass) & ~T(d.implausible) & T(d.exif)]))
fig, axs = plt.subplots(1, 2, figsize=(9.6, 3.6), sharey=True, gridspec_kw={'width_ratios': [1.35, 1]})
for k, ax in enumerate(axs):
    x = np.arange(len(sets)); labs = []
    cols = [('single_clear_med_m', B, 'Single-view'), ('fused', V, 'Fused (median of views)')] if k == 0 else [('single_clear_med_m', B, 'Single-view')]
    w = .8 / (len(cols) + 1)
    for i, (nm, g) in enumerate(sets):
        if k == 1: g = g[(g.single_clear_med_m - g.multi_clear_med_m).abs() <= 1.05]
        vals = [(g[c] - g['gt']).abs().mean() for c, _, _ in cols] + [(g['gt'] - 4.965).abs().mean()]
        for j, (val, c) in enumerate(zip(vals, [c for _, c, _ in cols] + [GRAY])):
            xx = i + (j - (len(vals) - 1) / 2) * w; ax.bar(xx, val, w * .92, color=c); ax.text(xx, val + .02, f'{val:.2f}', ha='center', fontsize=7.5)
        labs.append(f'{nm}\nn={len(g)}')
    ax.set_xticks(x, labs, fontsize=8); ax.grid(axis='x', visible=False)
    for c, col, lab in cols: ax.bar([], [], color=col, label=lab)
    ax.bar([], [], color=GRAY, label='Constant prior (4.97 m)'); ax.legend(fontsize=7.5, loc='upper left', ncol=1)
    ax.set_title('(a) Accepted estimates' if k == 0 else '(b) Accepted, views agree within 1.05 m', fontsize=9.5)
axs[0].set_ylabel('MAE (m)'); axs[0].set_ylim(0, 1.6)
fig.suptitle('Generalization: frozen pipeline in two new metropolitan areas', x=.06, ha='left', fontsize=10.5, weight='bold')
fig.savefig(F + 'fig_metros.png'); print('metros ok', [len(s[1]) for s in sets])
