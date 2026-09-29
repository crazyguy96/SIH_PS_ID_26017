"""
Train (or retrain) the QSPR model bundle using whatever scikit-learn
version is installed in THIS environment.

Run this locally instead of copying a joblib file trained elsewhere.
HistGradientBoostingClassifier - like most sklearn estimators - wraps
hand-written Cython internals rather than plain Python objects, so it
does not reliably unpickle across scikit-learn minor versions. Always
(re)train where the bundle will actually be loaded.

Usage (from delay-risk-dashboard/backend):
    python qspr/train_qspr_model.py --csv /path/to/small_model_2014_2025_ml_ready.csv

Takes under a minute on the ~49k-row training CSV. Reuses the exact same
normalize_state()/compute_cost_overrun_pct() functions as inference
(qspr/feature_pipeline.py) so training and inference can never drift
apart the way the original cost_overrun_pct_calc column did.
"""
import argparse
import json
import os
import sys

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix,
)
import joblib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from qspr.constants import CATEGORICAL_FEATURES, NUMERIC_FEATURES, ALL_FEATURES, VALID_STATES, STATE_TO_REGION
from qspr.feature_pipeline import normalize_state, compute_cost_overrun_pct


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    out["state_clean"] = df["state"].apply(normalize_state)
    out["region_filled"] = df["region_filled"].fillna("Unknown").astype(str)
    out["sector_extracted"] = df["sector_extracted"].fillna("UNKNOWN").astype(str).str.upper()

    original_cost = pd.to_numeric(df["original_cost_crore"], errors="coerce")
    original_cost = original_cost.where(original_cost > 0, np.nan)  # invalid -> missing, not 0
    anticipated_cost = pd.to_numeric(df["anticipated_cost_crore_extracted"], errors="coerce")

    out["original_cost_crore"] = original_cost
    out["anticipated_cost_crore_extracted"] = anticipated_cost
    out["cost_overrun_pct_model"] = [
        compute_cost_overrun_pct(oc, ac) for oc, ac in zip(original_cost, anticipated_cost)
    ]
    out["physical_progress_pct"] = pd.to_numeric(df["physical_progress_pct"], errors="coerce")
    out["project_age_months_at_report"] = pd.to_numeric(df["project_age_months_at_report"], errors="coerce")
    out["physical_progress_pct_was_missing"] = pd.to_numeric(
        df["physical_progress_pct_was_missing"], errors="coerce"
    ).fillna(0).astype(int)
    out["original_completion_date_was_missing"] = pd.to_numeric(
        df["original_completion_date_was_missing"], errors="coerce"
    ).fillna(0).astype(int)
    return out[ALL_FEATURES]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to small_model_2014_2025_ml_ready.csv")
    parser.add_argument("--out", default=None, help="Output .joblib path (default: qspr/model/qspr_model_bundle.joblib)")
    args = parser.parse_args()

    out_path = args.out or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "model", "qspr_model_bundle.joblib"
    )
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    print(f"Loading {args.csv} ...")
    raw = pd.read_csv(args.csv)
    print(f"Raw rows: {len(raw)}")

    X_full = build_feature_frame(raw)
    y_full = pd.to_numeric(raw["is_delayed_v2"], errors="coerce").astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X_full, y_full, test_size=0.2, random_state=42, stratify=y_full
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
            ("num", SimpleImputer(strategy="median"), NUMERIC_FEATURES),
        ],
        remainder="drop",
    )
    clf = HistGradientBoostingClassifier(
        max_iter=300, learning_rate=0.06, max_depth=6, l2_regularization=1.0,
        class_weight="balanced", random_state=42,
    )
    pipeline = Pipeline(steps=[("preprocess", preprocessor), ("model", clf)])

    print("Training...")
    pipeline.fit(X_train, y_train)
    probs = pipeline.predict_proba(X_test)[:, 1]
    preds = (probs >= 0.5).astype(int)
    metrics = {
        "test_samples": int(len(y_test)),
        "precision": round(float(precision_score(y_test, preds)), 4),
        "recall": round(float(recall_score(y_test, preds)), 4),
        "f1_score": round(float(f1_score(y_test, preds)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probs)), 4),
        "pr_auc": round(float(average_precision_score(y_test, probs)), 4),
        "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
    }
    print("Test metrics:", json.dumps(metrics, indent=2))

    print("Refitting on the full dataset for the production bundle...")
    pipeline.fit(X_full, y_full)

    import sklearn
    bundle = {
        "pipeline": pipeline,
        "categorical_features": CATEGORICAL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "all_features": ALL_FEATURES,
        "state_to_region": STATE_TO_REGION,
        "valid_states": sorted(VALID_STATES),
        "model_version": f"qspr-v1-histgb-sklearn{sklearn.__version__}",
        "trained_rows": int(len(X_full)),
        "test_metrics": metrics,
    }
    joblib.dump(bundle, out_path)
    print(f"\nSaved bundle to {out_path}")
    print(f"Trained with scikit-learn {sklearn.__version__} - this bundle will only reliably load in an")
    print(f"environment with a matching scikit-learn version.")


if __name__ == "__main__":
    main()
