from fastapi import APIRouter, Body
from typing import Dict, Any
from ml_engine import get_ml_engine

router = APIRouter(prefix="/api/predict", tags=["External Integration & Prediction"])

SAMPLE_PAYLOAD = {
    "region_final": "North",
    "sector_extracted": "ROAD TRANSPORT AND HIGHWAYS",
    "original_cost_crore": 1450.0,
    "anticipated_cost_crore_extracted": 1820.0,
    "cost_overrun_pct_calc_clean": 25.5,
    "physical_progress_pct": 32.0,
    "project_age_months_at_report": 38.0,
    "land_required_ha": 250.0,
    "land_acquired_ha": 110.0,
    "land_possession_ha": 95.0,
    "land_gap_ha_calc": 140.0,
    "land_acquisition_pct": 44.0,
    "land_possession_pct_calc": 38.0,
    "land_acquisition_progress_ratio": 0.44,
    "has_land_component_v2": 1,
    "compensation_mentioned": 1,
    "legal_dispute": 1,
    "forest_land_or_clearance_issue": 0,
    "rr_issue": 1,
    "row_issue": 1,
    "administrative_issue": 0,
    "kw_court_litigation": 1,
    "kw_compensation_dispute": 1,
    "kw_rr_resettlement": 1
}

@router.post("")
def predict_project(payload: Dict[str, Any] = Body(...)):
    """
    Public Integration API for external Land Acquisition Management Systems.
    Accepts raw feature payload, runs real LightGBM classifier inference,
    computes real SHAP feature contributions, categorizes risk tier:
    - Low: < 35%
    - Medium: 35% - 65%
    - High: > 65%
    Returns probability, risk tier, top contributing drivers, and recommended actions.
    Strictly excludes 'time_overrun_months' from model computation.
    """
    engine = get_ml_engine()
    result = engine.predict_single(payload)
    return result
