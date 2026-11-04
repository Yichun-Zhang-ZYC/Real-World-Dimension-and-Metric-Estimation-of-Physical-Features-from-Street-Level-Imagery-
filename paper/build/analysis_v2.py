"""Analysis of the new Colab experiments (A2 probe retrieval, B undistortion, D new metros)."""
import numpy as np, pandas as pd, json, sys
from sklearn.metrics import roc_auc_score
rng = np.random.default_rng(42)
PRIOR = 4.965
import os
D = os.environ.get('DATADIR', 'data/')
def boot(ae, n=2000):
    ae = np.asarray(ae); return np.percentile([rng.choice(ae, len(ae)).mean() for _ in range(n)], [2.5, 97.5])
def M(est, y, prior=PRIOR):
    est, y = np.asarray(est, float), np.asarray(y, float); k = ~(np.isnan(est) | np.isnan(y)); est, y = est[k], y[k]
    if len(est) == 0: return dict(n=0)
    e = est - y; ae = np.abs(e); lo, hi = boot(ae) if len(ae) > 1 else (np.nan, np.nan); pa = np.abs(y - prior)
    return dict(n=int(len(e)), MAE=round(ae.mean(), 3), CI=f'{lo:.2f}–{hi:.2f}', MedAE=round(np.median(ae), 3), bias=round(e.mean(), 3),
                w05=round(100*np.mean(ae <= .5), 1), w1=round(100*np.mean(ae <= 1), 1), prior_MAE=round(pa.mean(), 3))
def fused(df):
    return df[['single_clear_med_m', 'multi_clear_med_m', 'multi_allframes_med_m']].median(axis=1, skipna=True)
EXIF = lambda m: m.fillna('none').astype(str).str.strip().ne('none') & m.notna()
R = {}

# ---------------- A2: detection-guided retrieval on the 42 no-anchor bridges
a = pd.read_csv(D + 'expA2_probe.csv', dtype={'case_id': str})
a['qc'] = a.qc_pass.astype(str) == 'True'
R['A2'] = dict(n=len(a), probe_found=int((a.probe == 'found').sum()), planned=int((a.plan == 'ok').sum()), measured=int((a.status == 'ok').sum()), qc=int(a.qc.sum()),
               plan_reasons=a.plan.value_counts(dropna=False).to_dict(), probe_reasons=a.probe.value_counts().to_dict())
aq = a[a.qc].copy(); aq['fused'] = fused(aq)
R['A2_acc'] = {c: M(aq[c], aq['gt']) for c in ['single_clear_med_m', 'multi_clear_med_m', 'fused']}
R['A2_makes'] = aq.make.fillna('none').value_counts().to_dict()

# ---------------- B: undistortion on the 38 anchored benchmark bridges
b = pd.read_csv(D + 'expB_undistort.csv', dtype={'case_id': str})
b['exif'] = EXIF(b.make)
R['B_makes_all80'] = b.make.fillna('none').value_counts().to_dict()
bb = b[b.orig_status.isin(['ok', 'estimate_failed'])].copy()
bb['orig_qc'] = bb.orig_qc.astype(str) == 'True'; bb['qc'] = bb.qc_pass.astype(str) == 'True'
R['B_counts'] = dict(anchored=len(bb), orig_qc=int(bb.orig_qc.sum()), new_qc=int(bb.qc.sum()))
both = bb[bb.orig_qc & bb.qc]
for grp, g in [('all', both), ('EXIF', both[both.exif]), ('no EXIF', both[~both.exif])]:
    out = {}
    for v, o in [('single', 'orig_single'), ('multi', 'orig_multi')]:
        out[v] = dict(orig=M(g[o], g['gt']), undist=M(g[f'{v}_clear_med_m'], g['gt']))
        d = (np.abs(g[f'{v}_clear_med_m'] - g['gt']) - np.abs(g[o] - g['gt'])).dropna().values
        if len(d) > 1:
            bs = [rng.choice(d, len(d)).mean() for _ in range(2000)]
            out[v]['paired_diff'] = [round(d.mean(), 3), round(np.percentile(bs, 2.5), 3), round(np.percentile(bs, 97.5), 3)]
    R[f'B_{grp}'] = out
bq = bb[bb.qc].copy(); bq['fused'] = fused(bq)
R['B_S1'] = {c: M(bq[c], bq['gt']) for c in ['single_clear_med_m', 'multi_clear_med_m', 'fused']}

# ---------------- pipeline v2 on the benchmark: undistorted original anchors + rescued bridges
from scipy.stats import spearmanr
bq2 = b[b.qc_pass.astype(str) == 'True'].copy(); bq2['wide'] = bq2.k1 < -0.06
aq2 = a[a.qc].copy(); aq2['wide'] = aq2.make.fillna('none').isin(['none', 'GoPro', 'SONY'])
v2 = pd.concat([bq2.assign(src='undistorted'), aq2.assign(src='rescued')]); v2['fused'] = fused(v2)
v2['implausible'] = (v2.fused < 3) | (v2.fused > 9)
acc = v2[~v2.wide & ~v2.implausible]
R['V2'] = dict(n_qc=len(v2), coverage=round(len(v2) / 80, 3), all_qc=M(v2.fused, v2['gt']), single=M(v2.single_clear_med_m, v2['gt']),
               multi=M(v2.multi_clear_med_m, v2['gt']), accepted=M(acc.fused, acc['gt']), accepted_single=M(acc.single_clear_med_m, acc['gt']),
               accepted_multi=M(acc.multi_clear_med_m, acc['gt']), n_accepted=len(acc), spearman=round(spearmanr(acc.fused, acc['gt'])[0], 3),
               AUC_low=round(roc_auc_score(acc['gt'] < 4.6, -acc.fused), 3), AUC_high=round(roc_auc_score(acc['gt'] > 5.5, acc.fused), 3))
v2.to_csv(D + 'benchmark_v2.csv', index=False)
R['HO'] = dict(accepted=dict(n=43, MAE=0.73, prior_MAE=0.365))  # from heldout.py (gate + recent-capture rule)

# ---------------- D: two new metros
ds = []
for st in ['IN', 'WI']:
    try: ds.append(pd.read_csv(D + f'expD_{st}.csv', dtype={'case_id': str}))
    except FileNotFoundError: pass
if ds:
    d = pd.concat(ds); d['qc'] = d.qc_pass.astype(str) == 'True'; d['exif'] = ~((d.make.fillna('none') == 'none') | (d.k1 < -0.06))
    d['fused'] = fused(d); d['recent'] = d.anchor_year >= 2023
    d['implausible'] = (d.fused < 3) | (d.fused > 9)
    for metro, g in d.groupby('metro'):
        q = g[g.qc]; acc = q[~q.implausible & q.exif]
        r = dict(cases=len(g), status=g.status.value_counts().to_dict(), qc=len(q), accepted=len(acc), gt_median=round(g['gt'].median(), 2), gt_sd=round(g['gt'].std(), 2),
                 all_qc=M(q.fused, q['gt']), single=M(q.single_clear_med_m, q['gt']), multi=M(q.multi_clear_med_m, q['gt']),
                 gated=M(q[~q.implausible].fused, q[~q.implausible]['gt']), accepted_m=M(acc.fused, acc['gt']),
                 local_prior_acc=round((acc['gt'] - g['gt'].median()).abs().mean(), 3) if len(acc) else None, makes=q.make.fillna('none').value_counts().to_dict())
        if len(acc) > 4 and (acc['gt'] < 4.6).nunique() == 2: r['AUC_low'] = round(roc_auc_score(acc['gt'] < 4.6, -acc.fused), 3)
        if len(acc) > 4 and (acc['gt'] > 5.5).nunique() == 2: r['AUC_high'] = round(roc_auc_score(acc['gt'] > 5.5, acc.fused), 3)
        R[f'D_{metro}'] = r
    q = d[d.qc]; acc = q[~q.implausible & q.exif]
    R['D_all'] = dict(all_qc=M(q.fused, q['gt']), accepted=M(acc.fused, acc['gt']), n_cases=len(d))
    if len(acc) > 4 and (acc['gt'] < 4.6).nunique() == 2: R['D_all']['AUC_low'] = round(roc_auc_score(acc['gt'] < 4.6, -acc.fused), 3)
    d.to_csv(D + 'expD_all.csv', index=False)
json.dump(R, open(D + 'results_v2.json', 'w'), indent=1, default=str)
print('analysis ok')
