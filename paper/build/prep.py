"""Run in Colab from pipeline_v2/paper: assemble data/ from the experiment outputs already on Drive."""
import pandas as pd, shutil, os
V2 = '/content/drive/MyDrive/Capstone-w-HERE/pipeline_v2'
K = '/content/drive/MyDrive/Capstone-w-HERE/kely_outputs/kely_mapanything_results.csv'
os.makedirs('data', exist_ok=True); os.makedirs('figs', exist_ok=True)
for f in ['expA2_probe.csv', 'expB_undistort.csv', 'expD_IN.csv', 'expD_WI.csv']:
    if os.path.exists(f'{V2}/{f}'): shutil.copy(f'{V2}/{f}', f'data/{f}')
m = pd.read_csv(K, dtype={'case_id': str})
m = m.rename(columns={'view_mode': 'view', 'gt_clearance_m': 'gt', 'clear_med_m': 'med', 'clear_p10_m': 'p10', 'cam_height_m': 'cam_h',
                      'struct_dist_m': 'dist', 'qc_pass': 'qc', 'cam_make': 'make'})
m['case_id'] = m.case_id.str.replace('nbi_', '', regex=False)
m['status'] = m.status.replace({'no_structure_on_anchor': 'no_structure', 'no_road_on_anchor': 'no_road'})
m[['view', 'case_id', 'gt', 'status', 'med', 'p10', 'cam_h', 'n_cols', 'dist', 'qc', 'make']].to_csv('data/mapanything.csv', index=False)
print('prep ok', os.listdir('data'))
