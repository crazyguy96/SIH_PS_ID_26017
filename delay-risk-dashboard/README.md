# SIH 26017: Predictive Analytics System for Early Detection of Land Acquisition Delays
**Smart India Hackathon 2026 — Ministry of Rural Development**

A production-quality full-stack decision-support system for policymakers, project administrators, and infrastructure managers to monitor, explain, and mitigate land acquisition delays across Indian infrastructure projects.

---

## Key Highlights & Architectural Safeguards

1. **Strict Anti-Leakage Compliance**:
   - `time_overrun_months` and `time_overrun_months_was_missing` are **strictly excluded** from feature inputs, inference scoring, and SHAP delay explanations.
   - They appear **only** in an isolated "Audit / Historical Record" tab in the Project Detail drawer.
2. **Authentic Model Inference**:
   - Every risk score is computed by a trained LightGBM classifier (`model_bundle.joblib`).
   - Risk tiers are dynamically computed as:
     - **Low Risk**: $< 35\%$
     - **Medium Risk**: $35\% - 65\%$
     - **High Risk**: $> 65\%$
3. **Local Explainable AI (XAI)**:
   - Each project prediction is explained via real **TreeSHAP** feature attribution values.
4. **MOSPI Quarterly Narrative Integration**:
   - Quarterly reports from `infra_projects_narratives.csv` are joined on `(project_id, quarter)`.
   - Delay keywords (litigation, forest clearance, compensation disputes, utility shifting) are dynamically highlighted in the text.
5. **Auditable Rule-Based Interventions**:
   - Transparent mapping of active delay drivers to suggested operational and policy interventions.
6. **Regional GIS Mapping**:
   - Regional aggregated bubbles (North, South, East, West, Central, Northeast, Multi-State/National) rendered via Leaflet without fabricating raw GPS coordinates.
7. **Role-Based Access Control (RBAC)**:
   - `admin`: Full access to ML models, inference, and test set confusion matrix.
   - `policymaker`: Aggregate-level overview and regional analytics (anecdotal project-level narratives restricted).
   - `project_manager`: Scoped to their assigned region/sector.

---

## Repository Structure

```
delay-risk-dashboard/
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── data_repo.py             # CSV repository, indexing, and audit isolation
│   ├── ml_engine.py             # LightGBM inference & SHAP explainability engine
│   ├── recommendation_rules.py  # Rule-based policy interventions & friendly labels
│   ├── auth.py                  # JWT authentication & RBAC middleware
│   ├── test_system.py           # Automated test suite (9 test cases)
│   └── routers/
│       ├── overview.py          # GET /api/overview
│       ├── projects.py          # GET /api/projects, GET /api/projects/{id}
│       ├── predict.py           # POST /api/predict (External Land Management API)
│       ├── regional.py          # GET /api/regional (GIS & Comparative Matrix)
│       ├── alerts.py            # GET /api/alerts (Early Warning Feed)
│       ├── model_meta.py        # GET /api/model/metadata (Admin Governance)
│       └── auth.py              # POST /api/auth/login, GET /api/auth/me
└── dashboard/
    ├── app/
    │   ├── page.tsx             # Main dashboard page coordinating all 5 views
    │   ├── globals.css          # Styling & Leaflet styles
    │   └── layout.tsx           # Application layout & metadata
    ├── components/
    │   ├── map-view.tsx         # Leaflet Regional GIS Map
    │   ├── comparative-matrix.tsx # Sector x Region Heatmap & Timeline
    │   ├── kpi-strip.tsx        # Overview KPI strip with confidence tiers
    │   ├── overview-charts.tsx  # Region, sector, and quarterly delay trend charts
    │   ├── projects-table.tsx   # Sortable/filterable inference register table
    │   ├── project-detail-panel.tsx # SHAP charts, highlighted narrative & audit
    │   ├── alerts-panel.tsx     # High-risk (>65%) early warning cards
    │   ├── admin-model-view.tsx # Test metrics & 2x2 confusion matrix
    │   ├── filter-bar.tsx       # Multi-dimensional filter toolbar
    │   ├── role-selector.tsx    # JWT quick role switcher
    │   └── sidebar.tsx          # Navigation sidebar
    ├── lib/
    │   ├── api.ts               # Typed frontend API client
    │   ├── types.ts             # TypeScript interfaces
    │   └── format.ts            # Formatting helpers & confidence badges
    └── package.json
```

---

## Quickstart Guide

### 1. Launch FastAPI Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 2. Launch Next.js Frontend

```bash
cd dashboard
npm run dev
```
- Open `http://localhost:3000` in your browser.

---

## Automated Verification

To run the automated verification test suite:

```bash
cd backend
python test_system.py
```

All 9 system verification tests will execute:
1. Executive Overview KPI verification
2. Filtered project register & pagination
3. SHAP local explainability & narrative text join
4. Strict Anti-Leakage compliance (verifies exclusion of `time_overrun_months`)
5. Public `POST /api/predict` external integration endpoint
6. Regional GIS map clusters & comparative heatmap matrix
7. High-risk early warning alert generation
8. Admin model metadata & confusion matrix evaluation
9. JWT role-based access control authentication

---

## Pre-Seeded Demo Roles

Use the role switcher in the top-right header to switch personas:

| Role | Username | Password | Access Scope |
|------|----------|----------|--------------|
| **Administrator** | `admin` | `adminpassword` | Full system access, Model Governance panel, Confusion Matrix |
| **Policymaker** | `policymaker` | `policypassword` | Overview, Regional Analytics, Alerts (Drill-down narratives restricted) |
| **Project Manager** | `project_manager` | `pmpassword` | Risk Register, Project Detail, Alerts (Scoped to North Zone) |

---

## Retraining the Classifier

To retrain the baseline model with fresh data:

```bash
python train_model.py --data_dir extracted --out_dir model_output
```
- Features are fitted strictly on `infra_projects_train.csv`.
- Tuned on `infra_projects_val.csv`.
- Final evaluation conducted once on `infra_projects_test.csv` ($N=6,099$).
- Outputs `model_bundle.joblib`, `test_metrics.txt`, and `feature_importance.csv`.
