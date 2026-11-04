# Real-World Dimension and Metric Estimation of Physical Features from Street-Level Imagery

**UChicago MS in Applied Data Science, Capstone with HERE Technologies (Spring–Fall 2026)**
Kely Zhang · Anna Chen · Adaora Ezike. Advisor: Dr. Jeanette Shutay

Can crowd-sourced street-level imagery measure physical map attributes such as **bridge vertical clearance** in real-world units? We built an automated pipeline that does the following for each structure:

1. Retrieves the Mapillary sequences that approach it.
2. Segments the structure and the road.
3. Reconstructs metric 3D geometry with a feed-forward model: **MapAnything**, **Depth Anything 3**, or **VGGT**.
4. Measures clearance to a RANSAC-fitted road plane.
5. Attaches a confidence decision that needs no ground truth.

We benchmarked the pipeline against FHWA National Bridge Inventory (NBI) Item 54B.

📄 **Final paper:** [`paper/HERE_Capstone_Final_Paper_V3.docx`](paper/HERE_Capstone_Final_Paper_V3.docx). 🎤 **Slides:** [`presentation/`](presentation/)

## Key results

| Setting | Result |
|---|---|
| 80-bridge Chicago benchmark, QC-passing, MapAnything single-view | median abs. error **0.43 m**, MAE 0.92 m (0.65 m on phone / action cameras) |
| Depth Anything 3, multi-view | MAE 0.99 m. No backbone was statistically better on identical bridges |
| Frozen rules on 51 held-out Chicago bridges | MAE 0.87 → **0.73 m**, keeping 84% of estimates |
| Unchanged pipeline on 120 bridges in Indianapolis + Milwaukee | accepted single-view MAE **0.70 m**, 80% within 1 m |
| Ranking value | AUC 0.75 for clearance < 4.6 m and AUC 0.90 for > 5.5 m |

On absolute error, the pipeline does not beat predicting the regional median (4.97 m). Its value is as a low-cost **screening and discrepancy-detection layer**. See the paper for the full discussion.

## Who did what

| Member | Main work |
|---|---|
| **Kely Zhang** | MapAnything backbone. NBI benchmark construction (80 bridges) and its expanded version. Pipeline v2: detection-guided retrieval, lens undistortion, camera-class rules, plausibility gate, held-out and external-metro tests. Stop-sign study. Paper analysis and figures. |
| **Anna Chen** | Depth Anything 3 backbone (single- and multi-view). Segmentation comparison of Mask2Former vs SAM3. DA3 figures in the paper. |
| **Adaora Ezike** | VGGT backbone and its scale diagnostics on the benchmark. |

## Repository layout

```
paper/
  HERE_Capstone_Final_Paper_V3.docx     final paper
  drafts/                               V1, V2, spring-quarter paper
  build/                                scripts + data that regenerate every paper figure
    figures.py, figures_v2.py, fig_metros.py, fig_metros2.py, analysis_v2.py, prep.py, summ_ext.py
    build.js, content_final.js          docx builder (docx npm package)
    data/                               slim result tables used by the figures
    figs/                               rendered paper figures
    anna_figs/                          DA3 figures extracted from Anna's section (+ _index.txt captions)
presentation/                           final presentation (PDF)
docs/                                   proposals, weekly update log
notebooks/
  01_spring_exploration/                MapAnything / Pi3 / SAM3 / Mapillary API prototyping
  02_depth_anything_3/                  DA3 experiments (Anna)
  03_mapanything_nbi_benchmark/         MapAnything vs NBI benchmark (Kely)
  04_pipeline_v2/                       pipeline v2 experiments: retrieval, undistortion, held-out, metros
  05_vggt/                              VGGT benchmark (Adaora)
results/
  benchmark_80/                         per-bridge results, metrics, NBI candidates, example overlays + 3D viewer
  mapanything/                          MapAnything results, error map, GeoJSON of estimates
  pipeline_v2/                          crossing experiment + external metro cases (Indianapolis, Milwaukee)
  stop_signs/                           stop-sign width estimates vs MUTCD sizes
  vggt/                                 VGGT results, metrics, scale diagnostics
```

## Reproducing the paper figures

```bash
cd paper/build
pip install numpy pandas matplotlib scikit-learn
DATADIR=data/ FIGDIR=figs/ python figures.py      # core figures
DATADIR=data/ FIGDIR=figs/ python figures_v2.py   # pipeline v2 figures
DATADIR=data/ FIGDIR=figs/ python fig_metros2.py  # external-metro figure
```

`analysis_v2.py` recomputes the statistics and overwrites `data/results_v2.json`.

The notebooks run the full pipeline end to end. They were written for Google Colab with a GPU (L4/A100), and they need two tokens set as environment variables (or Colab secrets): `MAPILLARY_TOKEN` and `HF_TOKEN`. Every hard-coded token has been replaced with a placeholder such as `<YOUR_MAPILLARY_TOKEN>`.

## Data sources

- **Imagery:** [Mapillary](https://www.mapillary.com/developer) API v4, CC BY-SA.
- **Ground truth:** [FHWA National Bridge Inventory 2025](https://www.fhwa.dot.gov/bridge/nbi/2025/delimited/), Item 54B (minimum vertical underclearance). We used the IL, IN, and WI delimited files. They are not committed here; download them from FHWA.

## Not included

- **Three notebooks over 10 MB**, which are too large to export through our tooling:
  - `kely_sam3-mapanything.ipynb`
  - `OpenD4RT_Capstone_Demo.ipynb`
  - `SAM3D_Capstone_Official_API_Demo.ipynb`

  They can be added later with their outputs stripped (`nbstripout`).
- **Bulk per-bridge artifacts** (about 100 MB per run): raw Mapillary images, a full set of overlays and interactive 3D viewers for every bridge, and run logs. One example of each is kept in `results/benchmark_80/examples/`.
