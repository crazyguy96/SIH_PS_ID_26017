"""
Transforms one raw extracted project record (from qspr.extractor) into
exactly the 10 approved QSPR model input features. This is the ONE place
that formula lives — training and inference must use it identically, which
is why train_qspr_model.py imports the same normalize_state/compute_cost_
overrun_pct helpers rather than redefining them.
"""
import re
from typing import Any, Dict, Optional, Tuple

from qspr.constants import STATE_TO_REGION, VALID_STATES

_MONTH_NAME_TO_NUM = {
    name: i + 1
    for i, name in enumerate([
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
    ])
}


def normalize_state(raw_state: Optional[str]) -> str:
    """Bucket a raw state string into a clean, encoder-safe category.
    Unknown/garbled/missing values become 'UNKNOWN_STATE' rather than being
    fed to the model raw - never fabricated as a real state."""
    if not raw_state:
        return "UNKNOWN_STATE"
    s = str(raw_state).strip().upper()
    if not s:
        return "UNKNOWN_STATE"
    if s in VALID_STATES:
        return s
    if s.startswith("MULTI") or "MULTI-STATE" in s or "MULTI STATE" in s:
        return "MULTI STATE"
    return "UNKNOWN_STATE"


def region_for_state(state_clean: str) -> str:
    return STATE_TO_REGION.get(state_clean, "Unknown")


def parse_float(value: Optional[str]) -> Optional[float]:
    if value is None:
        return None
    v = str(value).replace(",", "").strip()
    if v in ("", "-", "--", "N/A", "NA"):
        return None
    try:
        return float(v)
    except ValueError:
        return None


def parse_mm_yyyy(value: Optional[str]) -> Optional[Tuple[int, int]]:
    if not value:
        return None
    m = re.match(r"^(\d{1,2})/(\d{4})$", str(value).strip())
    if not m:
        return None
    month, year = int(m.group(1)), int(m.group(2))
    if not (1 <= month <= 12):
        return None
    return year, month


def parse_report_label(report_label: Optional[str]) -> Optional[Tuple[int, int]]:
    """'July 2026' -> (2026, 7)."""
    if not report_label:
        return None
    parts = report_label.strip().split()
    if len(parts) != 2:
        return None
    month_name, year_str = parts[0].lower(), parts[1]
    if month_name not in _MONTH_NAME_TO_NUM or not year_str.isdigit():
        return None
    return int(year_str), _MONTH_NAME_TO_NUM[month_name]


def compute_cost_overrun_pct(
    original_cost: Optional[float], anticipated_cost: Optional[float]
) -> Optional[float]:
    """Approved formula: ((anticipated - original) / original) * 100.
    Invalid/non-positive original cost becomes missing (None), never 0 or
    an arbitrary value."""
    if original_cost is None or original_cost <= 0:
        return None
    if anticipated_cost is None:
        return None
    return ((anticipated_cost - original_cost) / original_cost) * 100.0


def build_features(raw_record: Dict[str, Any], report_label: Optional[str]) -> Dict[str, Any]:
    """Raw extracted project record -> the 10 approved model features."""
    state_clean = normalize_state(raw_record.get("state_raw"))
    region_filled = region_for_state(state_clean)
    sector_extracted = (raw_record.get("sector") or "UNKNOWN").strip().upper() or "UNKNOWN"

    original_cost = parse_float(raw_record.get("original_cost_raw"))
    if original_cost is not None and original_cost <= 0:
        original_cost = None  # invalid original cost -> missing, not 0

    anticipated_cost = parse_float(raw_record.get("revised_cost_raw"))
    if anticipated_cost is None and original_cost is not None:
        # Report recorded no revision at all: assume no cost change yet
        # rather than leaving both the cost and its overrun undefined.
        anticipated_cost = original_cost

    cost_overrun_pct_model = compute_cost_overrun_pct(original_cost, anticipated_cost)

    physical_progress_pct = parse_float(raw_record.get("physical_progress_raw"))
    physical_progress_pct_was_missing = 1 if physical_progress_pct is None else 0

    original_completion_date_was_missing = 1 if not raw_record.get("original_completion_date") else 0

    approval_ym = parse_mm_yyyy(raw_record.get("approval_date"))
    report_ym = parse_report_label(report_label)
    project_age_months_at_report = None
    if approval_ym and report_ym:
        ay, am = approval_ym
        ry, rm = report_ym
        project_age_months_at_report = (ry - ay) * 12 + (rm - am)

    return {
        "state_clean": state_clean,
        "region_filled": region_filled,
        "sector_extracted": sector_extracted,
        "original_cost_crore": original_cost,
        "anticipated_cost_crore_extracted": anticipated_cost,
        "physical_progress_pct": physical_progress_pct,
        "project_age_months_at_report": project_age_months_at_report,
        "cost_overrun_pct_model": cost_overrun_pct_model,
        "physical_progress_pct_was_missing": physical_progress_pct_was_missing,
        "original_completion_date_was_missing": original_completion_date_was_missing,
    }
