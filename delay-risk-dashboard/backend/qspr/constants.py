"""
QSPR/PAIMANA constants shared across validation, extraction, feature
preparation, and prediction. This is the single source of truth for the
approved model inputs — nothing outside this list may be used as a feature.
"""

# ---------------------------------------------------------------------------
# Approved model inputs (exactly 10). Do NOT add project_id, project_name,
# report_date, source_file, source_page, legacy_project_id, is_delayed_v2,
# label_confidence_tier, or label_basis to either of these lists.
# ---------------------------------------------------------------------------
CATEGORICAL_FEATURES = ["state_clean", "region_filled", "sector_extracted"]

NUMERIC_FEATURES = [
    "original_cost_crore",
    "anticipated_cost_crore_extracted",
    "physical_progress_pct",
    "project_age_months_at_report",
    "cost_overrun_pct_model",
    "physical_progress_pct_was_missing",
    "original_completion_date_was_missing",
]

ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES

# ---------------------------------------------------------------------------
# Valid Indian states/UTs recognized by the training data. Anything else in
# the "state" field is bucketed rather than fed to the encoder raw.
# ---------------------------------------------------------------------------
VALID_STATES = {
    "ANDHRA PRADESH", "ARUNACHAL PRADESH", "ASSAM", "BIHAR", "CHHATTISGARH",
    "GOA", "GUJARAT", "HARYANA", "HIMACHAL PRADESH", "JHARKHAND", "KARNATAKA",
    "KERALA", "MADHYA PRADESH", "MAHARASHTRA", "MANIPUR", "MEGHALAYA",
    "MIZORAM", "NAGALAND", "ODISHA", "PUNJAB", "RAJASTHAN", "SIKKIM",
    "TAMIL NADU", "TELANGANA", "TRIPURA", "UTTAR PRADESH", "UTTARAKHAND",
    "WEST BENGAL", "ANDAMAN AND NICOBAR ISLANDS", "CHANDIGARH",
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU", "DELHI",
    "JAMMU AND KASHMIR", "LADAKH", "LAKSHADWEEP", "PUDUCHERRY",
}

# Empirically derived from small_model_2014_2025_ml_ready.csv (majority
# region_filled per clean state) so inference-time region assignment matches
# exactly what the model was trained on. Baked into the model bundle too;
# this copy is for anything that needs it before the bundle is loaded.
STATE_TO_REGION = {
    "ANDAMAN AND NICOBAR ISLANDS": "Unknown", "ANDHRA PRADESH": "South",
    "ARUNACHAL PRADESH": "Northeast", "ASSAM": "Northeast", "BIHAR": "East",
    "CHANDIGARH": "North", "CHHATTISGARH": "Central", "DELHI": "North",
    "GOA": "West", "GUJARAT": "West", "HARYANA": "North",
    "HIMACHAL PRADESH": "North", "JAMMU AND KASHMIR": "North",
    "JHARKHAND": "East", "KARNATAKA": "South", "KERALA": "South",
    "LADAKH": "North", "MADHYA PRADESH": "Central", "MAHARASHTRA": "West",
    "MANIPUR": "Northeast", "MEGHALAYA": "Northeast", "MIZORAM": "Northeast",
    "NAGALAND": "Northeast", "ODISHA": "East", "PUDUCHERRY": "South",
    "PUNJAB": "North", "RAJASTHAN": "North", "SIKKIM": "Northeast",
    "TAMIL NADU": "South", "TELANGANA": "South", "TRIPURA": "Northeast",
    "UTTAR PRADESH": "North", "UTTARAKHAND": "North", "WEST BENGAL": "East",
    "MULTI STATE": "Multi-State/National", "LAKSHADWEEP": "Unknown",
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "West",
}

MODEL_BUNDLE_PATH = "qspr/model/qspr_model_bundle.joblib"

# Risk thresholds match the existing dashboard's convention (Low <35,
# Medium 35-65, High >65, on a 0-100 percentage scale) for visual consistency.
RISK_HIGH_THRESHOLD = 65.0
RISK_MEDIUM_THRESHOLD = 35.0


def risk_category(probability_pct: float) -> str:
    if probability_pct is None:
        return "Unknown"
    if probability_pct >= RISK_HIGH_THRESHOLD:
        return "High"
    if probability_pct >= RISK_MEDIUM_THRESHOLD:
        return "Medium"
    return "Low"
