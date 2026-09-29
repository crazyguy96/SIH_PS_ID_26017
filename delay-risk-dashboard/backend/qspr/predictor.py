"""
Loads the frozen QSPR model bundle once and serves batch predictions.

The model and its preprocessing are frozen: this module never retrains,
never fits, and never mutates the bundle - only .predict_proba() is called.
"""
import os
import threading
from typing import Any, Dict, List, Tuple

import joblib
import pandas as pd

from qspr.constants import ALL_FEATURES, risk_category
from qspr.feature_pipeline import build_features

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))  # .../backend/qspr
_BUNDLE_PATH = os.path.join(_THIS_DIR, "model", "qspr_model_bundle.joblib")

_bundle = None
_lock = threading.Lock()


def get_qspr_bundle() -> Dict[str, Any]:
    """Load the frozen model bundle once (thread-safe singleton), matching
    the existing codebase's get_data_repo()/get_ml_engine() pattern."""
    global _bundle
    if _bundle is None:
        with _lock:
            if _bundle is None:
                _bundle = joblib.load(_BUNDLE_PATH)
    return _bundle


def _to_float(v) -> Any:
    if v is None:
        return None
    try:
        return float(str(v).replace(",", ""))
    except ValueError:
        return None


def _build_result(rec: Dict[str, Any], prob: float, model_version: str) -> Dict[str, Any]:
    pct = round(float(prob) * 100.0, 1)
    return {
        "project_id": rec.get("project_id"),
        "legacy_project_id": rec.get("legacy_project_id"),
        "project_name": rec.get("project_name"),
        "agency": rec.get("agency"),
        "ministry": rec.get("ministry"),
        "sector": rec.get("sector") or "Unknown",
        "state": rec.get("state_raw"),
        "approval_date": rec.get("approval_date"),
        "original_completion_date": rec.get("original_completion_date"),
        "revised_completion_date": rec.get("revised_completion_date"),
        "original_cost_crore": _to_float(rec.get("original_cost_raw")),
        "anticipated_cost_crore": _to_float(rec.get("revised_cost_raw")),
        "cumulative_expenditure_crore": _to_float(rec.get("cumulative_expenditure_raw")),
        "physical_progress_pct": _to_float(rec.get("physical_progress_raw")),
        "source_page": rec.get("source_page"),
        "delay_probability_pct": pct,
        "prediction_class": "Delayed" if pct >= 50 else "On Track",
        "risk_category": risk_category(pct),
        "model_version": model_version,
    }


def predict_batch(
    raw_records: List[Dict[str, Any]], report_label: str
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Predict delay probability for a batch of raw extracted project
    records. Returns (results, issues).

    One bad project never stops the batch: feature preparation failures are
    captured per-row before the model call; if the single batched
    predict_proba() call itself fails unexpectedly, we fall back to
    per-row prediction so a single malformed row can't sink everyone else.
    """
    bundle = get_qspr_bundle()
    pipeline = bundle["pipeline"]
    model_version = bundle["model_version"]

    feature_rows: List[Dict[str, Any]] = []
    prepared: List[Dict[str, Any]] = []
    issues: List[Dict[str, Any]] = []

    for rec in raw_records:
        try:
            feats = build_features(rec, report_label)
            feature_rows.append(feats)
            prepared.append(rec)
        except Exception as exc:
            issues.append({
                "stage": "feature_preparation",
                "project_id": rec.get("project_id"),
                "project_name": rec.get("project_name"),
                "page": rec.get("source_page"),
                "reason": f"Could not prepare model features: {exc}",
            })

    results: List[Dict[str, Any]] = []
    if feature_rows:
        df = pd.DataFrame(feature_rows)[ALL_FEATURES]
        try:
            probs = pipeline.predict_proba(df)[:, 1]
            for rec, prob in zip(prepared, probs):
                results.append(_build_result(rec, prob, model_version))
        except Exception:
            # One batch call failed outright (unexpected) - fall back to
            # row-by-row so the rest of the report still gets predictions.
            for rec, feats in zip(prepared, feature_rows):
                try:
                    row_df = pd.DataFrame([feats])[ALL_FEATURES]
                    prob = pipeline.predict_proba(row_df)[:, 1][0]
                    results.append(_build_result(rec, prob, model_version))
                except Exception as exc:
                    issues.append({
                        "stage": "prediction",
                        "project_id": rec.get("project_id"),
                        "project_name": rec.get("project_name"),
                        "page": rec.get("source_page"),
                        "reason": f"Prediction failed for this project: {exc}",
                    })

    return results, issues
