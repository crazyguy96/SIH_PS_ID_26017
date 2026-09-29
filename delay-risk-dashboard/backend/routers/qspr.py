"""
QSPR/PAIMANA API routes. Entirely independent of the existing
/api/projects, /api/overview, /api/regional, and /api/alerts routers -
none of those are imported, read, or modified here.
"""
import os
import tempfile
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from qspr import analytics, history
from qspr.extractor import extract_all_projects
from qspr.predictor import predict_batch
from qspr.validation import validate_pdf

router = APIRouter(prefix="/api/qspr", tags=["QSPR / PAIMANA Prediction"])


async def _save_upload_to_temp(file: UploadFile) -> str:
    content = await file.read()
    fd, path = tempfile.mkstemp(suffix=".pdf")
    with os.fdopen(fd, "wb") as f:
        f.write(content)
    return path


@router.post("/validate")
async def validate_report(file: UploadFile = File(...)):
    """Structural validation only - never runs extraction or prediction."""
    if not file.filename.lower().endswith(".pdf"):
        return {
            "is_valid": False,
            "reason": "This file is not a PDF.",
            "detected_report_label": None,
            "checks": [],
        }
    tmp_path = await _save_upload_to_temp(file)
    try:
        result = validate_pdf(tmp_path)
        return {
            "is_valid": result.is_valid,
            "reason": result.reason,
            "detected_report_label": result.detected_report_label,
            "checks": result.checks,
        }
    finally:
        os.remove(tmp_path)


@router.post("/predict-pdf")
async def predict_pdf(
    file: UploadFile = File(...),
    report_label_override: Optional[str] = Query(
        None,
        description=(
            "Fallback report month/year (e.g. 'July 2026'). Used ONLY if the "
            "PDF's own content doesn't reveal its report period - never trust "
            "a manually selected month over what the PDF itself says."
        ),
    ),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    tmp_path = await _save_upload_to_temp(file)
    try:
        validation = validate_pdf(tmp_path)
        if not validation.is_valid:
            raise HTTPException(status_code=422, detail=validation.reason)

        report_label_from_content, records, extraction_issues = extract_all_projects(tmp_path)
        effective_label = (
            validation.detected_report_label
            or report_label_from_content
            or report_label_override
        )
        if not effective_label:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Could not detect the report month/year from this PDF's "
                    "content. Retry with report_label_override set, e.g. "
                    "'July 2026'."
                ),
            )

        results, prediction_issues = predict_batch(records, effective_label)

        # Attach each project's prior history BEFORE writing this batch, so
        # "previous" can never include the snapshot we're about to save.
        for r in results:
            prev_snapshots = history.get_history_for_project(r["project_id"])
            r["previously_scored"] = len(prev_snapshots) > 0
            r["previous_predictions"] = [
                {
                    "report_label": s["report_label"],
                    "delay_probability_pct": s["prediction_probability"],
                    "prediction_class": s["prediction_class"],
                    "risk_category": s["risk_category"],
                }
                for s in prev_snapshots
            ]
            # 2026 reports: never fabricate an actual outcome from progress
            # or revised dates.
            r["actual_outcome_known"] = False

        history.save_predictions(results, effective_label, source_report=file.filename)

        summary = analytics.summary(results)
        all_issues = extraction_issues + prediction_issues

        return {
            "report_label": effective_label,
            "projects_extracted": len(records),
            "predictions_generated": len(results),
            "high_risk_count": summary.get("high_risk_count", 0),
            "average_delay_probability_pct": summary.get("average_delay_probability_pct", 0.0),
            "issue_count": len(all_issues),
            "results": results,
            "issues": all_issues,
        }
    finally:
        os.remove(tmp_path)


@router.get("/project/{project_id}")
def get_project(project_id: str):
    """Scoped strictly to this one project_key - never a global history
    array shared across projects."""
    snapshots = history.get_history_for_project(project_id)
    if not snapshots:
        raise HTTPException(
            status_code=404,
            detail=f"No QSPR predictions found for project '{project_id}'",
        )
    current, previous = snapshots[0], snapshots[1:]
    return {
        "project_id": project_id,
        "current": {**current["details"], "report_label": current["report_label"]},
        "previous": [
            {
                "report_label": s["report_label"],
                "delay_probability_pct": s["prediction_probability"],
                "prediction_class": s["prediction_class"],
                "risk_category": s["risk_category"],
            }
            for s in previous
        ],
        "actual_outcome_known": current["actual_outcome_known"],
        "actual_outcome": current["actual_outcome"],
    }


@router.get("/analytics/summary")
def analytics_summary():
    snapshots = history.get_latest_report_snapshots()
    results = [s["details"] for s in snapshots]
    return {
        "report_label": snapshots[0]["report_label"] if snapshots else None,
        **analytics.summary(results),
    }


@router.get("/analytics/sector")
def analytics_sector(top_n: int = Query(10, ge=1, le=20)):
    snapshots = history.get_latest_report_snapshots()
    results = [s["details"] for s in snapshots]
    return {
        "report_label": snapshots[0]["report_label"] if snapshots else None,
        "sectors": analytics.by_sector(results, top_n=top_n),
    }


@router.get("/analytics/geography")
def analytics_geography(top_n: int = Query(12, ge=1, le=20)):
    """State-level only - no fabricated region or lat/lng data."""
    snapshots = history.get_latest_report_snapshots()
    results = [s["details"] for s in snapshots]
    return {
        "report_label": snapshots[0]["report_label"] if snapshots else None,
        "states": analytics.by_state(results, top_n=top_n),
    }
