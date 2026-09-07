# -*- coding: utf-8 -*-
"""
SIH PS 26017 — Risk tiering, explainability, and recommendations
Run AFTER train_model.py (needs model_output/model_bundle.joblib).

What this does
---------------
1. Loads the frozen model bundle produced by train_model.py.
2. Scores the UNLABELED inference set (infra_projects_inference_unlabeled.csv)
   — this file is only ever touched after the classifier is finalized, per
   MODELING_GUIDE.txt.
3. Computes a per-project delay probability + risk tier (Low/Medium/High).
4. Uses SHAP to find each project's top delay drivers, and maps those to
   plain-English labels + suggested actions (matches the PDF's requirement
   for "explainable AI" + "actionable recommendations").
5. Writes a single CSV: inference_predictions_explained.csv

This script has NO dashboard / hosting / Streamlit code — pure ML output.

Run:
    python explain_and_score.py --data_dir extracted --model_dir model_output
"""
import argparse
import os

import numpy as np
import pandas as pd
import joblib
import sqlite3
from recommendation_rules import get_recommendations

DROP_COLS = [
    "target_is_delayed", "label_confidence_tier", "is_unlabeled",
    "ml_split_v2", "project_id", "quarter",
    "time_overrun_months", "time_overrun_months_was_missing",
]
CAT_COLS = ["region_final", "sector_extracted"]
HISTORY_DIR = "history"
HISTORY_FILE = "scoring_history.csv"

# Map raw feature names (or prefixes, for one-hot dummy cols like
# sector_extracted_COAL) -> (plain-English driver label, suggested action)
RECOMMENDATIONS = {
    "legal_dispute":                  ("Legal dispute pending",              "Escalate to legal cell / expedite court resolution"),
    "rr_issue":                       ("R&R (resettlement) issue",           "Accelerate rehabilitation & resettlement package disbursal"),
    "row_issue":                      ("Right-of-way issue",                 "Coordinate with utility owners to clear RoW obstructions"),
    "administrative_issue":           ("Administrative bottleneck",          "Fast-track pending approvals via nodal officer"),
    "forest_land_or_clearance_issue": ("Forest/environment clearance issue", "Prioritize forest/environment clearance file at state level"),
    "compensation_mentioned":         ("Compensation dispute",               "Expedite compensation disbursement to affected families"),
    "land_acquisition_progress_ratio":("Slow land acquisition",              "Increase land acquisition task-force engagement in district"),
    "land_gap_ha_calc":               ("Large land acquisition gap",         "Prioritize remaining land parcel acquisition"),
    "land_acquisition_pct":           ("Low land acquisition %",             "Prioritize remaining land parcel acquisition"),
    "land_possession_pct_calc":       ("Low land possession %",              "Follow up on pending possession handover"),
    "num_issue_flags_v2":             ("Multiple compounding issues",        "Convene inter-departmental coordination meeting"),
    "project_age_months_at_report":   ("Long-running project",               "Review project for scope creep / re-baseline timeline"),
    "kw_court_litigation":            ("Litigation mentioned in narrative",  "Legal cell review of ongoing litigation"),
    "kw_forest_clearance":            ("Forest clearance mentioned",         "Escalate forest clearance application"),
    "kw_environment_clearance":       ("Environment clearance mentioned",    "Escalate environment clearance application"),
    "kw_rr_resettlement":             ("R&R mentioned in narrative",         "Review resettlement progress with district administration"),
    "kw_compensation_dispute":        ("Compensation dispute mentioned",     "Resolve compensation disputes with affected parties"),
    "kw_row_utility_shift":           ("Utility shifting mentioned",         "Coordinate utility shifting with respective departments"),
    "kw_contractor_agency":           ("Contractor/agency issue",            "Review contractor performance and enforce penalty clauses"),
    "kw_equipment_supply":            ("Equipment/supply issue mentioned",   "Review procurement and supply chain timelines"),
    "kw_funding_financial":           ("Funding issue mentioned",            "Review fund release schedule with finance ministry"),
    "kw_monsoon_weather":             ("Weather/monsoon impact",             "Adjust construction schedule around monsoon window"),
    "kw_geological_technical":        ("Geological/technical issue",         "Commission technical/geological review"),
    "kw_law_and_order":               ("Law and order issue mentioned",      "Coordinate with local administration/police on site security"),
    "kw_railway_line_issue":          ("Railway line crossing issue",        "Coordinate with railway authority for line crossing clearance"),
    "kw_defence_land":                ("Defence land issue mentioned",       "Coordinate with defence ministry for land release"),
    "kw_admin_approval_delay":        ("Approval delay mentioned",           "Expedite pending administrative approvals"),
    "original_completion_date_was_missing":  ("Missing completion date record", "Improve data reporting completeness for this project"),
    "extracted_scheduled_date_was_missing":  ("Missing scheduled date record",  "Improve data reporting completeness for this project"),
    "delay_reason_was_missing":       ("Missing delay-reason narrative",     "Improve narrative reporting quality for this project"),
    "physical_progress_pct":         ("Low physical progress",              "Site-level review of construction pace"),
    "narrative_issue_richness_score":("Rich issue narrative",               "Review the full narrative for compounding issues"),
    "cost_overrun_pct_calc_clean":   ("Cost overrun",                       "Review budget/financial sanction status"),
    "state_freq_encoded":            ("State-level historical delay pattern","Compare with other projects in the same state; escalate at state review meeting"),
    "anticipated_cost_crore_extracted": ("High anticipated project cost",   "Review financial sanction and cost-control measures"),
    "original_cost_crore":           ("High original project cost",         "Review financial sanction and cost-control measures"),
    "narrative_word_count":          ("Lengthy issue narrative reported",   "Review the full quarterly narrative for compounding issues"),
    "narrative_char_length":         ("Lengthy issue narrative reported",   "Review the full quarterly narrative for compounding issues"),
    "has_delay_reason_text":         ("Delay reason explicitly reported",   "Review the reported delay reason and assign a corrective owner"),
    "has_land_component_v2":         ("Project has a land acquisition component", "Prioritize land-acquisition monitoring for this project"),
    "land_required_ha":              ("Large land requirement",             "Plan phased land acquisition to reduce exposure"),
    "land_acquired_ha":              ("Land acquisition shortfall",         "Follow up on pending land acquisition"),
    "land_possession_ha":            ("Land possession shortfall",          "Follow up on pending possession handover"),
    "sector_extracted":              ("Sector-level historical delay pattern", "Benchmark against other projects in this sector"),
    "region_final":                  ("Region-level historical delay pattern", "Benchmark against other projects in this region"),
    "Insufficient evidence": (
    "Insufficient project information",
    "Review and complete the latest project reporting data"
),
}


def tier(p):
    if p >= 0.7:
        return "High"
    elif p >= 0.4:
        return "Medium"
    return "Low"


def explain_row(drivers):
    labels, actions = [], []
    for d in drivers:
        matched = None
        for key in RECOMMENDATIONS:
            if d == key or d.startswith(key):
                matched = key
                break
        if matched:
            labels.append(RECOMMENDATIONS[matched][0])
            actions.append(RECOMMENDATIONS[matched][1])
        else:
            labels.append("Other contributing factor")
            actions.append("Review project details manually")
    return "; ".join(labels), "; ".join(actions)


def update_scoring_history(out, out_dir):
    history_dir = os.path.join(out_dir, HISTORY_DIR)
    os.makedirs(history_dir, exist_ok=True)

    history_path = os.path.join(history_dir, HISTORY_FILE)

    # Load previous scoring results, if available
    if os.path.exists(history_path):
        history = pd.read_csv(history_path)

        previous = history.sort_values("run_timestamp").groupby(
            "project_id", as_index=False
        ).tail(1)

        previous = previous[
            ["project_id", "risk_tier", "predicted_delay_probability"]
        ].rename(columns={
            "risk_tier": "previous_risk_tier",
            "predicted_delay_probability": "previous_probability"
        })

        out = out.merge(previous, on="project_id", how="left")

        out["newly_high_risk"] = (
            (out["risk_tier"] == "High") &
            (out["previous_risk_tier"].fillna("") != "High")
        )
    else:
        out["previous_risk_tier"] = "No previous run"
        out["previous_probability"] = np.nan
        out["newly_high_risk"] = out["risk_tier"].eq("High")

    # Timestamp current run
    from datetime import datetime
    out["run_timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Append current run to history
    history_columns = [
        "run_timestamp",
        "project_id",
        "quarter",
        "predicted_delay_probability",
        "risk_tier",
        "previous_probability",
        "previous_risk_tier",
        "newly_high_risk",
    ]

    snapshot = out[history_columns].copy()

    if os.path.exists(history_path):
        snapshot.to_csv(history_path, mode="a", header=False, index=False)
    else:
        snapshot.to_csv(history_path, index=False)

    return out

def add_priority_score(out, infer):
    df = out.copy()

    # ---------- Normalize helper ----------
    def minmax(series):
        s = pd.to_numeric(series, errors="coerce").fillna(0)
        mn, mx = s.min(), s.max()
        if mx == mn:
            return pd.Series(0.0, index=s.index)
        return (s - mn) / (mx - mn)

    # 1. Delay probability
    delay_score = df["predicted_delay_probability"].clip(0, 1)

    # 2. Project cost
    cost_score = minmax(infer["original_cost_crore"])

    # 3. Land acquisition gap
    gap_score = minmax(infer["land_gap_ha_calc"])

    # 4. Physical progress urgency
    progress = pd.to_numeric(
        infer["physical_progress_pct"], errors="coerce"
    ).fillna(0).clip(0, 100)

    progress_urgency = 1 - (progress / 100)

    # 5. Issue severity
    issue_score = minmax(infer["num_issue_flags_v2"])

    # 6. Sector criticality
    # Temporary deterministic mapping; can be replaced with an
    # officially approved sector-criticality table later.
    sector = infer["sector_extracted"].fillna("UNKNOWN").astype(str)

    critical_sectors = {
        "ROAD TRANSPORT AND HIGHWAYS": 1.0,
        "RAILWAYS": 1.0,
        "POWER": 0.9,
        "PORTS": 0.9,
        "AIRPORT": 0.8,
    }

    sector_score = sector.map(critical_sectors).fillna(0.5)

    # ---------- Composite priority ----------
    df["priority_score"] = (
        40 * delay_score
        + 20 * cost_score
        + 15 * gap_score
        + 10 * progress_urgency
        + 10 * issue_score
        + 5 * sector_score
    ).round(2)

    return df

def has_insufficient_evidence(row):
    return row.isna().mean() > 0.40

def main(data_dir, model_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)

    print("Loading model bundle...")
    bundle = joblib.load(os.path.join(model_dir, "model_bundle.joblib"))
    model = bundle["model"]
    train_cols = bundle["columns"]
    model_name = bundle["model_name"]
    needs_scaling = bundle["needs_scaling"]
    scaler = bundle["scaler"]
    print(f"Loaded model: {model_name}")

    infer = pd.read_csv(os.path.join(data_dir, "infra_projects_inference_unlabeled.csv"))
    X_infer = infer.drop(columns=[c for c in DROP_COLS if c in infer.columns])
    X_infer = pd.get_dummies(X_infer, columns=[c for c in CAT_COLS if c in X_infer.columns], dummy_na=True)
    X_infer = X_infer.reindex(columns=train_cols, fill_value=0)

    X_for_pred = scaler.transform(X_infer) if needs_scaling else X_infer
    proba = model.predict_proba(X_for_pred)[:, 1]
    risk_tier = np.array([tier(p) for p in proba])

    print("Computing SHAP explanations (this can take a minute)...")
    top_n = 3
    feature_names = X_infer.columns.to_numpy()
    top_drivers = []

    try:
        import shap
        if needs_scaling:
            # Linear model -> use scaled input + LinearExplainer
            explainer = shap.LinearExplainer(model, scaler.transform(X_infer))
            shap_values = explainer.shap_values(scaler.transform(X_infer))
        else:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_infer)
            # Some tree explainers return a list per class; take class-1 contributions
            if isinstance(shap_values, list):
                shap_values = shap_values[1]

        for i in range(shap_values.shape[0]):

            if has_insufficient_evidence(X_infer.iloc[i]):
                top_drivers.append(["Insufficient evidence"])
                continue

            row_shap = shap_values[i]
            top_idx = np.argsort(row_shap)[::-1][:top_n]
            drivers = [feature_names[j] for j in top_idx if row_shap[j] > 0]

            if not drivers:
                drivers = ["Other contributing factor"]

            top_drivers.append(drivers)
    except Exception as e:
        print(f"SHAP failed ({e}); falling back to global feature importance for driver labels.")
        fi_path = os.path.join(model_dir, "feature_importance.csv")
        global_top = pd.read_csv(fi_path, index_col=0).index[:top_n].tolist()
        top_drivers = [global_top for _ in range(len(X_infer))]

    driver_labels, recommendations = [], []
    for drivers in top_drivers:
        lbl, act = explain_row(drivers)
        driver_labels.append(lbl)
        recommendations.append(act)

    out = infer[
    [
        "project_id",
        "quarter",
        "region_final",
        "sector_extracted",
    ]
].copy()
    out["predicted_delay_probability"] = proba.round(4)
    out["risk_tier"] = risk_tier
    out["top_delay_drivers"] = driver_labels
    out["recommended_actions"] = recommendations
    out = add_priority_score(out, infer)
    out = update_scoring_history(out, out_dir)

    out = out.sort_values("priority_score", ascending=False)

    db_path = os.path.join(out_dir, "scoring.db")
    
    conn = sqlite3.connect(db_path)
    out.to_sql(
    "project_scores",
    conn,
    if_exists="append",
    index=False
    )
    conn.close()
    
    print(f"Saved scores to database -> {db_path}")

    out_path = os.path.join(out_dir, "inference_predictions_explained.csv")
    out.to_csv(out_path, index=False)

    

    print(f"\nSaved {len(out)} explained predictions -> {out_path}")
    print("\nRisk tier distribution:")
    print(out["risk_tier"].value_counts())
    print("\nSample high-risk project:")
    print(out.iloc[0])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", default="extracted", help="Folder with the CSVs")
    parser.add_argument("--model_dir", default="model_output", help="Folder with model_bundle.joblib")
    parser.add_argument("--out_dir", default="model_output", help="Folder to write the explained predictions CSV")
    args = parser.parse_args()
    main(args.data_dir, args.model_dir, args.out_dir)
