# -*- coding: utf-8 -*-
"""
predict_new_project.py
------------------------
New endpoint: POST /predict-new-project

Lets a user enter data for a brand-new (not-yet-in-dataset) project and get
a live delay-risk prediction from the EXISTING trained model
(model_output/model_bundle.joblib). Does NOT retrain, replace, or modify
the model in any way -- it only loads it and runs inference, exactly like
explain_and_score.py does for the batch inference file, but for one
user-submitted row instead.

Feature engineering mirrors train_model.py / explain_and_score.py:
  - Same DROP_COLS / CAT_COLS
  - Same pd.get_dummies(..., dummy_na=True) + reindex(columns=train_cols, fill_value=0)
  - Same tier() thresholds, same RECOMMENDATIONS/explain_row driver-labeling,
    same priority-score formula (imported/mirrored from explain_and_score.py)

A few raw model inputs cannot be honestly reconstructed from what a user
would type into a short form (see NOTES below). Those are approximated,
clearly flagged as approximate in the response, and documented here rather
than silently guessed:

  - state_freq_encoded: the delivered dataset only stores a frequency-
    encoded number per historical project, not the original state name, so
    there is no lookup table to give a new project its true state
    frequency. We fall back to the AVERAGE state_freq_encoded observed for
    the chosen region_final in the training data. This is an approximation,
    not the real per-state value.
  - extracted_scheduled_date_was_missing / original_completion_date_was_missing:
    a brand-new project entered via this form has no scheduled/completion
    date extraction pipeline behind it, so both are set to 1 (matching how
    the training data treats projects with no such record). If the
    dashboard later adds date fields to this form, wire them here instead.
  - land_acquisition_pct / land_possession_pct_calc / land_acquisition_progress_ratio:
    in the historical dataset these do NOT equal simple ratios of the ha
    columns (verified against the delivered data -- they were evidently
    sourced from the original report text, not calculated). We compute the
    straightforward ratio (acquired/required, possession/required) as the
    best available proxy. Flagged as approximate in the API response.
  - num_issue_flags_v2: approximated as the sum of the 6 structured issue
    checkboxes (compensation_mentioned, legal_dispute,
    forest_land_or_clearance_issue, rr_issue, row_issue,
    administrative_issue). This matched ~83% of historical rows exactly --
    good enough for a live estimate, not guaranteed identical to the
    original construction.

Everything else (land_gap_ha_calc, has_land_component_v2,
narrative_issue_richness_score, cost_overrun_pct_calc_clean, kw_* flags via
narrative_keywords.py) was verified against the delivered CSVs and matches
the historical formula closely.
"""
import os
import sys

import numpy as np
import pandas as pd
import joblib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

# --- import sibling modules from the project root (one level up from api/) ---
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from narrative_keywords import extract_keyword_flags  # noqa: E402

router = APIRouter()

MODEL_DIR = os.path.join(ROOT_DIR, "model_output")
DATA_FILE_FOR_REFERENCE = os.path.join(ROOT_DIR, "infra_projects_ml_ready_clean.csv")
INFER_FILE_FOR_PRIORITY_REF = os.path.join(ROOT_DIR, "infra_projects_inference_unlabeled.csv")

DROP_COLS = [
    "target_is_delayed", "label_confidence_tier", "is_unlabeled",
    "ml_split_v2", "project_id", "quarter",
    "time_overrun_months", "time_overrun_months_was_missing",
]
CAT_COLS = ["region_final", "sector_extracted"]

VALID_REGIONS = [
    "Central", "East", "Multi-State/National", "North",
    "Northeast", "South", "Unknown", "West",
]
VALID_SECTORS = [
    "ATOMIC ENERGY", "CIVIL AVIATION", "COAL", "COMMERCE", "COMMERCE AND INDUSTRY",
    "DEFENCE PRODUCTION", "DEPARTMENT OF HIGHER EDUCATION", "FERTILISERS",
    "FERTILIZERS", "FINANCE", "HEALTH AND FAMILY WELFARE", "HEAVY INDUSTRY",
    "HOME AFFAIRS", "HUMAN RESOURCE DEVELOPMENT", "INFORMATION AND BROADCASTING",
    "MINES", "PETROCHEMICALS", "PETROLEUM", "POWER", "RAILWAYS",
    "RENEWABLE ENERGY", "ROAD TRANSPORT AND HIGHWAYS", "RURAL DEVELOPMENT",
    "SHIPPING AND PORTS", "STEEL", "TELECOMMUNICATIONS", "UNKNOWN",
    "URBAN DEVELOPMENT", "WATER RESOURCES",
]

CRITICAL_SECTORS = {
    "ROAD TRANSPORT AND HIGHWAYS": 1.0,
    "RAILWAYS": 1.0,
    "POWER": 0.9,
    "PORTS": 0.9,
    "AIRPORT": 0.8,
}

# Mirrors explain_and_score.py's RECOMMENDATIONS dict (raw feature name/prefix
# -> (plain-English driver label, suggested action)) so a new project gets the
# exact same explanation vocabulary as existing projects in the dashboard.
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
    "original_completion_date_was_missing": ("Missing completion date record", "Improve data reporting completeness for this project"),
    "extracted_scheduled_date_was_missing": ("Missing scheduled date record",  "Improve data reporting completeness for this project"),
    "delay_reason_was_missing":       ("Missing delay-reason narrative",     "Improve narrative reporting quality for this project"),
    "physical_progress_pct":         ("Low physical progress",              "Site-level review of construction pace"),
    "narrative_issue_richness_score":("Rich issue narrative",               "Review the full narrative for compounding issues"),
    "cost_overrun_pct_calc_clean":   ("Cost overrun",                       "Review budget/financial sanction status"),
    "state_freq_encoded":            ("State/region-level historical delay pattern", "Compare with other projects in the same region; escalate at review meeting"),
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
}


def tier(p: float) -> str:
    """Identical thresholds to explain_and_score.py's tier()."""
    if p >= 0.7:
        return "High"
    elif p >= 0.4:
        return "Medium"
    return "Low"


def explain_row(drivers: List[str]):
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
    return labels, actions


# --------------------------------------------------------------------------
# Lazy-loaded, process-wide caches (loaded once, reused across requests)
# --------------------------------------------------------------------------
_bundle = None
_state_freq_by_region = None
_priority_ref = None  # {"cost": (min,max), "gap": (min,max), "issues": (min,max)}


def _get_bundle():
    global _bundle
    if _bundle is None:
        bundle_path = os.path.join(MODEL_DIR, "model_bundle.joblib")
        if not os.path.exists(bundle_path):
            raise HTTPException(status_code=500, detail=f"model_bundle.joblib not found at {bundle_path}")
        _bundle = joblib.load(bundle_path)
    return _bundle


def _get_state_freq_by_region():
    """Approximate per-region state_freq_encoded, since real state names
    aren't preserved in the delivered dataset (see module docstring)."""
    global _state_freq_by_region
    if _state_freq_by_region is None:
        if os.path.exists(DATA_FILE_FOR_REFERENCE):
            df = pd.read_csv(DATA_FILE_FOR_REFERENCE, usecols=["region_final", "state_freq_encoded"])
            _state_freq_by_region = df.groupby("region_final")["state_freq_encoded"].mean().to_dict()
        else:
            _state_freq_by_region = {}
    return _state_freq_by_region


def _get_priority_ref():
    """Reference min/max for priority-score normalization, computed once
    from the existing inference set so a single new project's cost/gap/issue
    values are normalized against a real distribution (a per-row min-max on
    one project is degenerate -- see explain_and_score.py's add_priority_score,
    which only works correctly on a whole batch)."""
    global _priority_ref
    if _priority_ref is None:
        if os.path.exists(INFER_FILE_FOR_PRIORITY_REF):
            df = pd.read_csv(INFER_FILE_FOR_PRIORITY_REF)
            _priority_ref = {
                "cost": (df["original_cost_crore"].min(), df["original_cost_crore"].max()),
                "gap": (df["land_gap_ha_calc"].min(), df["land_gap_ha_calc"].max()),
                "issues": (df["num_issue_flags_v2"].min(), df["num_issue_flags_v2"].max()),
            }
        else:
            _priority_ref = {"cost": (0, 1), "gap": (0, 1), "issues": (0, 1)}
    return _priority_ref


def _minmax_ref(value, ref_range):
    mn, mx = ref_range
    if mx == mn:
        return 0.0
    return float(np.clip((value - mn) / (mx - mn), 0, 1))


class NewProjectInput(BaseModel):
    project_id: Optional[str] = Field(None, description="Optional label only, not used as a model feature")
    scheduled_completion_date: Optional[str] = None
    original_completion_date: Optional[str] = None
    region_final: str
    sector_extracted: str
    original_cost_crore: float
    anticipated_cost_crore_extracted: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    project_age_months_at_report: Optional[float] = None
    land_required_ha: Optional[float] = None
    land_acquired_ha: Optional[float] = None
    land_possession_ha: Optional[float] = None
    compensation_mentioned: bool = False
    legal_dispute: bool = False
    forest_land_or_clearance_issue: bool = False
    rr_issue: bool = False
    row_issue: bool = False
    administrative_issue: bool = False
    covid_period: bool = False
    narrative_text: Optional[str] = Field(
        None, description="Optional free-text project status note used to derive kw_* narrative flags"
    )


def _build_feature_row(payload: NewProjectInput) -> pd.DataFrame:
    land_required = payload.land_required_ha
    land_acquired = payload.land_acquired_ha
    land_possession = payload.land_possession_ha
    physical_progress = payload.physical_progress_pct
    anticipated_cost = payload.anticipated_cost_crore_extracted

    land_required_was_missing = int(land_required is None)
    physical_progress_was_missing = int(physical_progress is None)

    extracted_scheduled_date_was_missing = int(
    not bool(
        payload.scheduled_completion_date
        and payload.scheduled_completion_date.strip()
    )
)

    original_completion_date_was_missing = int(
    not bool(
        payload.original_completion_date
        and payload.original_completion_date.strip()
    )
)

    land_required = land_required or 0.0
    land_acquired = land_acquired or 0.0
    land_possession = land_possession or 0.0
    physical_progress = physical_progress if physical_progress is not None else 0.0

    # cost_overrun_pct_calc_clean -- verified formula: (anticipated-original)/original*100
    if anticipated_cost is not None and payload.original_cost_crore:
        cost_overrun_pct = (anticipated_cost - payload.original_cost_crore) / payload.original_cost_crore * 100
    else:
        anticipated_cost = anticipated_cost if anticipated_cost is not None else payload.original_cost_crore
        cost_overrun_pct = 0.0

    # land_gap_ha_calc -- verified formula (98% match against historical data)
    land_gap_ha_calc = land_required - land_acquired

    # land_acquisition_pct / land_possession_pct_calc / progress_ratio -- APPROXIMATE
    # (historical values do not equal simple ratios of the ha columns; see docstring)
    land_acquisition_pct = (land_acquired / land_required * 100) if land_required else 0.0
    land_possession_pct_calc = (land_possession / land_required * 100) if land_required else 0.0
    land_acquisition_progress_ratio = (land_acquired / land_required) if land_required else 0.0

    has_land_component_v2 = int(land_required > 0)

    core_issue_flags = [
        payload.compensation_mentioned, payload.legal_dispute,
        payload.forest_land_or_clearance_issue, payload.rr_issue,
        payload.row_issue, payload.administrative_issue,
    ]
    num_issue_flags_v2 = sum(int(f) for f in core_issue_flags)  # APPROXIMATE, see docstring

    kw_flags = extract_keyword_flags(payload.narrative_text)
    narrative_issue_richness_score = sum(kw_flags.values())  # verified formula
    narrative_char_length = len(payload.narrative_text or "")
    narrative_word_count = len((payload.narrative_text or "").split())
    has_delay_reason_text = int(bool(payload.narrative_text and payload.narrative_text.strip()))
    delay_reason_was_missing = int(not has_delay_reason_text)

    state_freq_encoded = _get_state_freq_by_region().get(payload.region_final, 0.0)  # APPROXIMATE, see docstring

    row = {
        "region_final": payload.region_final,
        "sector_extracted": payload.sector_extracted,
        "state_freq_encoded": state_freq_encoded,
        "original_cost_crore": payload.original_cost_crore,
        "anticipated_cost_crore_extracted": anticipated_cost,
        "cost_overrun_pct_calc_clean": cost_overrun_pct,
        "physical_progress_pct": physical_progress,
        "project_age_months_at_report": payload.project_age_months_at_report or 0.0,
        "land_required_ha": land_required,
        "land_acquired_ha": land_acquired,
        "land_possession_ha": land_possession,
        "land_gap_ha_calc": land_gap_ha_calc,
        "land_acquisition_pct": land_acquisition_pct,
        "land_possession_pct_calc": land_possession_pct_calc,
        "land_acquisition_progress_ratio": land_acquisition_progress_ratio,
        "has_land_component_v2": has_land_component_v2,
        "compensation_mentioned": int(payload.compensation_mentioned),
        "legal_dispute": int(payload.legal_dispute),
        "forest_land_or_clearance_issue": int(payload.forest_land_or_clearance_issue),
        "rr_issue": int(payload.rr_issue),
        "row_issue": int(payload.row_issue),
        "administrative_issue": int(payload.administrative_issue),
        "num_issue_flags_v2": num_issue_flags_v2,
        "narrative_issue_richness_score": narrative_issue_richness_score,
        "narrative_char_length": narrative_char_length,
        "narrative_word_count": narrative_word_count,
        "has_delay_reason_text": has_delay_reason_text,
        "physical_progress_pct_was_missing": physical_progress_was_missing,
        "land_required_ha_was_missing": land_required_was_missing,
        "delay_reason_was_missing": delay_reason_was_missing,
        "extracted_scheduled_date_was_missing": extracted_scheduled_date_was_missing,
        "original_completion_date_was_missing": original_completion_date_was_missing,
        "covid_period": int(payload.covid_period),
        **kw_flags,
    }
    return pd.DataFrame([row]), {
        "land_gap_ha_calc": land_gap_ha_calc,
        "num_issue_flags_v2": num_issue_flags_v2,
    }


@router.post("/predict-new-project")
def predict_new_project(payload: NewProjectInput):
    if payload.region_final not in VALID_REGIONS:
        raise HTTPException(status_code=422, detail=f"region_final must be one of {VALID_REGIONS}")
    if payload.sector_extracted not in VALID_SECTORS:
        raise HTTPException(status_code=422, detail=f"sector_extracted must be one of {VALID_SECTORS}")

    bundle = _get_bundle()
    model = bundle["model"]
    train_cols = bundle["columns"]
    needs_scaling = bundle["needs_scaling"]
    scaler = bundle["scaler"]

    X_raw, raw_values_for_priority = _build_feature_row(payload)
    X = pd.get_dummies(X_raw, columns=[c for c in CAT_COLS if c in X_raw.columns], dummy_na=True)
    X = X.reindex(columns=train_cols, fill_value=0)

    X_for_pred = scaler.transform(X) if needs_scaling else X
    proba = float(model.predict_proba(X_for_pred)[:, 1][0])
    risk_tier = tier(proba)

    # --- explanation: SHAP if available and model supports it, else global feature importance ---
    top_drivers = []
    try:
        import shap
        if needs_scaling:
            explainer = shap.LinearExplainer(model, scaler.transform(X))
            shap_values = explainer.shap_values(scaler.transform(X))
        else:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X)
            if isinstance(shap_values, list):
                shap_values = shap_values[1]
        row_shap = shap_values[0]
        feature_names = X.columns.to_numpy()
        top_idx = np.argsort(row_shap)[::-1][:3]
        top_drivers = [feature_names[j] for j in top_idx if row_shap[j] > 0]
    except Exception:
        fi_path = os.path.join(MODEL_DIR, "feature_importance.csv")
        if os.path.exists(fi_path):
            top_drivers = pd.read_csv(fi_path, index_col=0).index[:3].tolist()

    if not top_drivers:
        top_drivers = ["Insufficient evidence"]
    driver_labels, recommended_actions = explain_row(top_drivers)

    # --- priority score, mirrors explain_and_score.py's add_priority_score formula,
    # but normalized against a persisted reference range instead of a degenerate
    # single-row min-max (see _get_priority_ref docstring) ---
    ref = _get_priority_ref()
    cost_score = _minmax_ref(payload.original_cost_crore, ref["cost"])
    gap_score = _minmax_ref(raw_values_for_priority["land_gap_ha_calc"], ref["gap"])
    issue_score = _minmax_ref(raw_values_for_priority["num_issue_flags_v2"], ref["issues"])
    progress_urgency = 1 - ((payload.physical_progress_pct or 0.0) / 100)
    sector_score = CRITICAL_SECTORS.get(payload.sector_extracted, 0.5)

    priority_score = round(
        40 * proba + 20 * cost_score + 15 * gap_score
        + 10 * progress_urgency + 10 * issue_score + 5 * sector_score,
        2,
    )

    approximated_fields_used = [
    "state_freq_encoded (region average, not true per-state value)",
    "land_acquisition_pct / land_possession_pct_calc / land_acquisition_progress_ratio (simple ratio proxy)",
    "num_issue_flags_v2 (sum of 6 structured checkboxes)",
]

    if not payload.scheduled_completion_date:
        approximated_fields_used.append(
        "extracted_scheduled_date_was_missing (scheduled completion date not supplied)"
    )

    if not payload.original_completion_date:
        approximated_fields_used.append(
        "original_completion_date_was_missing (original completion date not supplied)"
    )

    return {
    "project_id": payload.project_id,
    "predicted_delay_probability": round(proba * 100, 1),
    "risk_tier": risk_tier,
    "priority_score": priority_score,
    "top_delay_drivers": driver_labels,
    "recommended_actions": list(dict.fromkeys(recommended_actions)),
    "approximated_fields_used": approximated_fields_used,
}