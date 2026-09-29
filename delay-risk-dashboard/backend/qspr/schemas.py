"""
Response/request shapes for the QSPR API. Kept as plain pydantic models
matching the style already used in backend/auth.py.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ValidateResponse(BaseModel):
    is_valid: bool
    reason: Optional[str] = None
    detected_report_label: Optional[str] = None
    checks: List[str] = []


class ExtractionIssue(BaseModel):
    stage: str  # extraction | feature_preparation | prediction | missing_required_source_information | unexpected_error
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    page: Optional[int] = None
    reason: str


class ProjectPrediction(BaseModel):
    project_id: str
    legacy_project_id: Optional[str] = None
    project_name: Optional[str] = None
    agency: Optional[str] = None
    ministry: Optional[str] = None
    sector: Optional[str] = None
    state: Optional[str] = None
    approval_date: Optional[str] = None
    original_completion_date: Optional[str] = None
    revised_completion_date: Optional[str] = None
    original_cost_crore: Optional[float] = None
    anticipated_cost_crore: Optional[float] = None
    cumulative_expenditure_crore: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    source_page: Optional[int] = None
    delay_probability_pct: float
    prediction_class: str
    risk_category: str
    model_version: str
    previously_scored: bool = False
    previous_predictions: List[Dict[str, Any]] = []
    actual_outcome_known: bool = False


class PredictPdfResponse(BaseModel):
    report_label: Optional[str]
    projects_extracted: int
    predictions_generated: int
    high_risk_count: int
    average_delay_probability_pct: float
    issue_count: int
    results: List[ProjectPrediction]
    issues: List[ExtractionIssue]
