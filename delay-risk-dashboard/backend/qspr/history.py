"""
QSPR prediction history.

Completely independent storage from the existing dashboard's scoring
database - a dedicated SQLite file that only this package reads and writes.
Snapshot identity is (project_id, report_date); current vs previous is
always determined by comparing report_date values, never by list/upload
order, so a project can be re-scored out of order without corrupting its
timeline.
"""
import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from qspr.feature_pipeline import parse_report_label

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))  # .../backend/qspr
DB_PATH = os.path.join(_THIS_DIR, "qspr_history.db")

_lock = threading.Lock()


def report_label_to_sortable(report_label: str) -> str:
    """'July 2026' -> '2026-07' so report_date sorts correctly as text."""
    parsed = parse_report_label(report_label)
    if not parsed:
        # Fall back to something that still sorts reasonably rather than
        # crashing the whole save.
        return report_label
    year, month = parsed
    return f"{year:04d}-{month:02d}"


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock:
        conn = _get_connection()
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS qspr_predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_key TEXT NOT NULL,
                    project_id TEXT,
                    legacy_project_id TEXT,
                    report_date TEXT NOT NULL,
                    report_label TEXT NOT NULL,
                    prediction_probability REAL NOT NULL,
                    prediction_class TEXT NOT NULL,
                    risk_category TEXT NOT NULL,
                    model_version TEXT NOT NULL,
                    source_report TEXT,
                    actual_outcome TEXT,
                    actual_outcome_known INTEGER NOT NULL DEFAULT 0,
                    prediction_correct INTEGER,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(project_key, report_date)
                )
            """)
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_qspr_project_key ON qspr_predictions(project_key)"
            )
            conn.commit()
        finally:
            conn.close()


def save_predictions(
    results: List[Dict[str, Any]], report_label: str, source_report: Optional[str] = None
) -> None:
    """Store one snapshot per project for this report. Re-processing the
    SAME report_date for a project refreshes that one snapshot; it never
    touches any other month's row, and never fabricates actual_outcome."""
    init_db()
    report_date = report_label_to_sortable(report_label)
    now = datetime.now(timezone.utc).isoformat()

    with _lock:
        conn = _get_connection()
        try:
            for r in results:
                project_id = r.get("project_id")
                if not project_id:
                    continue
                conn.execute(
                    """
                    INSERT INTO qspr_predictions (
                        project_key, project_id, legacy_project_id, report_date,
                        report_label, prediction_probability, prediction_class,
                        risk_category, model_version, source_report,
                        actual_outcome, actual_outcome_known, prediction_correct,
                        payload_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
                    ON CONFLICT(project_key, report_date) DO UPDATE SET
                        legacy_project_id=excluded.legacy_project_id,
                        report_label=excluded.report_label,
                        prediction_probability=excluded.prediction_probability,
                        prediction_class=excluded.prediction_class,
                        risk_category=excluded.risk_category,
                        model_version=excluded.model_version,
                        source_report=excluded.source_report,
                        payload_json=excluded.payload_json,
                        created_at=excluded.created_at
                    """,
                    (
                        project_id, project_id, r.get("legacy_project_id"), report_date,
                        report_label, r["delay_probability_pct"], r["prediction_class"],
                        r["risk_category"], r["model_version"], source_report,
                        None, json.dumps(r), now,
                    ),
                )
            conn.commit()
        finally:
            conn.close()


def get_history_for_project(project_id: str) -> List[Dict[str, Any]]:
    """All snapshots for exactly this project, newest report_date first.
    History lookup is always scoped to this one project_key - never a
    global array reused across projects."""
    init_db()
    conn = _get_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM qspr_predictions
            WHERE project_key = ?
            ORDER BY report_date DESC
            """,
            (project_id,),
        ).fetchall()
        return [_row_to_dict(row) for row in rows]
    finally:
        conn.close()


def get_current_and_previous(project_id: str):
    """Split a project's snapshots into (current, previous_list) purely by
    report_date recency - never by upload order or list position."""
    snapshots = get_history_for_project(project_id)
    if not snapshots:
        return None, []
    return snapshots[0], snapshots[1:]


def get_latest_report_snapshots() -> List[Dict[str, Any]]:
    """All project snapshots belonging to the most recently-dated report
    processed so far (by report_date, not upload time). Used by the
    standalone analytics endpoints so they don't require re-uploading a
    PDF; each snapshot's `details` is the full predictor result dict."""
    init_db()
    conn = _get_connection()
    try:
        max_row = conn.execute(
            "SELECT MAX(report_date) AS max_date FROM qspr_predictions"
        ).fetchone()
        max_date = max_row["max_date"] if max_row else None
        if not max_date:
            return []
        rows = conn.execute(
            "SELECT * FROM qspr_predictions WHERE report_date = ?",
            (max_date,),
        ).fetchall()
        return [_row_to_dict(row) for row in rows]
    finally:
        conn.close()


def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    payload = json.loads(row["payload_json"])
    return {
        "project_key": row["project_key"],
        "project_id": row["project_id"],
        "legacy_project_id": row["legacy_project_id"],
        "report_date": row["report_date"],
        "report_label": row["report_label"],
        "prediction_probability": row["prediction_probability"],
        "prediction_class": row["prediction_class"],
        "risk_category": row["risk_category"],
        "model_version": row["model_version"],
        "source_report": row["source_report"],
        "actual_outcome": row["actual_outcome"],
        "actual_outcome_known": bool(row["actual_outcome_known"]),
        "prediction_correct": row["prediction_correct"],
        "created_at": row["created_at"],
        "details": payload,
    }
