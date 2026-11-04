import pandas as pd, numpy as np
from sklearn.metrics import roc_auc_score
from scipy.stats import spearmanr
d = pd.read_csv('data/expD_all.csv')
d['qc'] = d.qc_pass.astype(str) == 'True'
q = d[d.qc & ~d.implausible & d.exif].copy()
def row(g, c):
    e = (g[c] - g['gt']).dropna(); ae = e.abs()
    return f"n={len(e)} MAE={ae.mean():.2f} Med={ae.median():.2f} bias={e.mean():+.2f} w05={100*(ae<=.5).mean():.0f} w1={100*(ae<=1).mean():.0f}"
for m, g in list(q.groupby('metro')) + [('ALL', q)]:
    G = d if m == 'ALL' else d[d.metro == m]
    print(m, 'cases', len(G), 'ok', (G.status == 'ok').sum(), 'qc', G.qc.sum(), 'acc', len(g), 'gt_med', G['gt'].median(), 'gt_sd', round(G['gt'].std(), 2),
          'nostruct', (G.status == 'no_structure_on_anchor').sum(), 'yrs', G.anchor_year.min(), G.anchor_year.max(), 'k1wide', (G.k1 < -.06).sum(), 'noexif', (G.make.fillna('none') == 'none').sum())
    for c in ['single_clear_med_m', 'multi_clear_med_m', 'fused']: print('  ', c[:6], row(g, c))
    pa = (g['gt'] - 4.965).abs(); print('   prior', f"{pa.mean():.2f} med {pa.median():.2f}", 'local', f"{(g['gt'] - G['gt'].median()).abs().mean():.2f}")
    for c in ['single_clear_med_m', 'fused']:
        h = g.dropna(subset=[c]); out = [f"rho={spearmanr(h[c], h['gt'])[0]:.2f}"]
        for t, s in [(4.6, -1), (5.5, 1)]:
            y = (h['gt'] < t) if s < 0 else (h['gt'] > t)
            if y.nunique() == 2: out.append(f"AUC{t}={roc_auc_score(y, s * h[c]):.2f}(pos {y.sum()})")
        print('   rank', c[:6], ' '.join(out))
# rejected by rules
r = d[d.qc & (d.implausible | ~d.exif)]
print('rejected', len(r), (r.fused - r['gt']).abs().round(2).tolist())
