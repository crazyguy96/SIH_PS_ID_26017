"""
SIH PS 26017: Repository & Data Layer
Loads CSV datasets, executes real LightGBM inference on startup,
joins narratives on (project_id, quarter), computes aggregates,
and isolates audit-only columns to prevent data leakage.
"""

import os
import re
import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from ml_engine import get_ml_engine, DROP_COLS
from recommendation_rules import (
    get_recommendations_for_drivers,
    get_friendly_driver_name,
    KEYWORD_HIGHLIGHT_PATTERNS
)

# Known regional centroids for India (latitude, longitude)
REGIONAL_CENTROIDS = {
    "North": {"lat": 29.5, "lng": 76.8, "name": "North Region"},
    "South": {"lat": 13.0, "lng": 78.5, "name": "South Region"},
    "East": {"lat": 23.5, "lng": 86.5, "name": "East Region"},
    "West": {"lat": 20.0, "lng": 73.8, "name": "West Region"},
    "Central": {"lat": 23.2, "lng": 79.5, "name": "Central Region"},
    "Northeast": {"lat": 26.2, "lng": 92.5, "name": "Northeast Region"},
    "Multi-State/National": {"lat": 21.5, "lng": 81.0, "name": "Multi-State / National"},
    "Unknown": {"lat": 22.0, "lng": 77.0, "name": "Unspecified Region"}
}


def find_file(filename: str) -> str:
    """Find CSV file in potential directories."""
    candidates = [
        os.path.join(os.path.dirname(__file__), filename),
        os.path.join(os.path.dirname(__file__), "..", "..", filename),
        os.path.join(os.path.dirname(__file__), "..", filename),
        filename
    ]
    for path in candidates:
        if os.path.exists(path):
            return os.path.abspath(path)
    raise FileNotFoundError(f"File {filename} not found in {candidates}")


def parse_quarter_key(q: str) -> tuple:
    """Chronological sorting key for quarters (e.g. Q1-2014, Q1-2015-16)."""
    if not isinstance(q, str):
        return (0, 0)
    m = re.match(r"Q(\d)-(\d{4})", q)
    if m:
        return (int(m.group(2)), int(m.group(1)))
    m = re.match(r"Q(\d)-(\d{4})-\d{2}", q)
    if m:
        return (int(m.group(2)), int(m.group(1)))
    return (0, 0)


class DataRepository:
    def __init__(self):
        print("[DataRepo] Initializing SIH26017 Land Acquisition Data Repository...")
        self.ml_engine = get_ml_engine()
        self._load_datasets()
        self._score_inference_dataset()
        self._build_indexes()
        print("[DataRepo] Initialization complete.")

    def _load_datasets(self):
        # 1. Unlabeled live inference pool (projects currently monitored)
        infer_path = find_file("infra_projects_inference_unlabeled.csv")
        print(f"[DataRepo] Loading inference dataset: {infer_path}")
        self.infer_df = pd.read_csv(infer_path)

        # 2. Government quarterly narratives
        narr_path = find_file("infra_projects_narratives.csv")
        print(f"[DataRepo] Loading narratives dataset: {narr_path}")
        self.narr_df = pd.read_csv(narr_path)

        # 3. Test set for model evaluation metrics
        try:
            test_path = find_file("infra_projects_test.csv")
            print(f"[DataRepo] Loading test dataset: {test_path}")
            self.test_df = pd.read_csv(test_path)
        except Exception:
            self.test_df = None

        # 4. Master clean dataset for historical audit comparisons
        try:
            master_path = find_file("infra_projects_ml_ready_clean.csv")
            print(f"[DataRepo] Loading clean master dataset: {master_path}")
            self.master_df = pd.read_csv(master_path)
        except Exception:
            self.master_df = None

    def _score_inference_dataset(self):
        """Run model inference across all inference rows and attach predictions."""
        print(f"[DataRepo] Running LightGBM batch prediction on {len(self.infer_df)} inference records...")
        probs = self.ml_engine.predict_batch(self.infer_df)
        self.infer_df["predicted_delay_probability"] = np.round(probs, 4)
        self.infer_df["predicted_delay_pct"] = np.round(probs * 100, 2)
        self.infer_df["risk_category"] = [self.ml_engine.get_risk_category(p) for p in probs]

        # Extract top active delay driver flags for fast table rendering
        driver_flag_cols = [
            "compensation_mentioned", "legal_dispute", "forest_land_or_clearance_issue",
            "rr_issue", "row_issue", "administrative_issue",
            "kw_court_litigation", "kw_forest_clearance", "kw_environment_clearance",
            "kw_rr_resettlement", "kw_compensation_dispute", "kw_row_utility_shift",
            "kw_contractor_agency", "kw_equipment_supply", "kw_funding_financial",
            "kw_monsoon_weather", "kw_geological_technical", "kw_law_and_order",
            "kw_railway_line_issue", "kw_defence_land", "kw_admin_approval_delay"
        ]

        active_drivers_list = []
        for _, row in self.infer_df.iterrows():
            active = []
            for col in driver_flag_cols:
                if col in row and row[col] == 1:
                    active.append(get_friendly_driver_name(col))
            if not active:
                if row.get("land_gap_ha_calc", 0) > 50:
                    active.append("Large Land Acquisition Gap")
                elif row.get("cost_overrun_pct_calc_clean", 0) > 20:
                    active.append("Cost Escalation")
                else:
                    active.append("Schedule / Reporting Risk")
            active_drivers_list.append(active[:3])

        self.infer_df["top_contributing_drivers"] = active_drivers_list

    def _build_indexes(self):
        # Index narratives by (project_id, quarter)
        print("[DataRepo] Indexing narratives by (project_id, quarter)...")
        self.narrative_index: Dict[tuple, str] = {}
        for _, row in self.narr_df.iterrows():
            pid = str(row["project_id"]).strip()
            q = str(row["quarter"]).strip()
            self.narrative_index[(pid, q)] = str(row.get("raw_narrative", ""))

        # Fast lookup map for inference projects by project_id
        self.infer_project_map: Dict[str, pd.Series] = {}
        for _, row in self.infer_df.iterrows():
            pid = str(row["project_id"]).strip()
            self.infer_project_map[pid] = row

    def get_overview_kpis(self) -> Dict[str, Any]:
        """Aggregate KPIs for Executive Overview."""
        total = len(self.infer_df)
        high_risk_count = int((self.infer_df["risk_category"] == "High").sum())
        med_risk_count = int((self.infer_df["risk_category"] == "Medium").sum())
        low_risk_count = int((self.infer_df["risk_category"] == "Low").sum())
        avg_prob = float(self.infer_df["predicted_delay_probability"].mean())

        # Confidence tier distribution
        conf_counts = self.infer_df["label_confidence_tier"].fillna("unspecified").value_counts().to_dict()

        # Regional breakdown
        by_region = []
        for region, group in self.infer_df.groupby("region_final"):
            reg_total = len(group)
            reg_high = int((group["risk_category"] == "High").sum())
            reg_avg = float(group["predicted_delay_probability"].mean())
            by_region.append({
                "region": region,
                "total_projects": reg_total,
                "high_risk_count": reg_high,
                "high_risk_pct": round((reg_high / reg_total) * 100, 1),
                "avg_delay_probability": round(reg_avg, 3),
                "avg_delay_pct": round(reg_avg * 100, 1)
            })
        by_region.sort(key=lambda x: x["total_projects"], reverse=True)

        # Top 10 Sectors breakdown
        by_sector = []
        for sector, group in self.infer_df.groupby("sector_extracted"):
            sec_total = len(group)
            sec_high = int((group["risk_category"] == "High").sum())
            sec_avg = float(group["predicted_delay_probability"].mean())
            by_sector.append({
                "sector": sector,
                "total_projects": sec_total,
                "high_risk_count": sec_high,
                "high_risk_pct": round((sec_high / sec_total) * 100, 1),
                "avg_delay_probability": round(sec_avg, 3),
                "avg_delay_pct": round(sec_avg * 100, 1)
            })
        by_sector.sort(key=lambda x: x["total_projects"], reverse=True)
        top_10_sectors = by_sector[:10]

        # Chronological quarterly trend line
        quarters = sorted(self.infer_df["quarter"].dropna().unique(), key=parse_quarter_key)
        quarterly_trend = []
        for q in quarters:
            q_group = self.infer_df[self.infer_df["quarter"] == q]
            q_total = len(q_group)
            if q_total > 0:
                q_high = int((q_group["risk_category"] == "High").sum())
                q_avg = float(q_group["predicted_delay_probability"].mean())
                quarterly_trend.append({
                    "quarter": q,
                    "total_projects": q_total,
                    "high_risk_count": q_high,
                    "delay_rate_pct": round((q_high / q_total) * 100, 1),
                    "avg_delay_probability": round(q_avg, 3)
                })

        # All unique sectors for filter dropdown (not limited to top 10)
        all_sectors = sorted(self.infer_df["sector_extracted"].dropna().unique().tolist())

        return {
            "total_monitored": total,
            "high_risk_count": high_risk_count,
            "high_risk_pct": round((high_risk_count / total) * 100, 1) if total else 0,
            "medium_risk_count": med_risk_count,
            "medium_risk_pct": round((med_risk_count / total) * 100, 1) if total else 0,
            "low_risk_count": low_risk_count,
            "low_risk_pct": round((low_risk_count / total) * 100, 1) if total else 0,
            "avg_predicted_delay_probability": round(avg_prob, 3),
            "avg_predicted_delay_pct": round(avg_prob * 100, 1),
            "confidence_tier_distribution": conf_counts,
            "by_region": by_region,
            "top_10_sectors": top_10_sectors,
            "all_sectors": all_sectors,
            "quarterly_trend": quarterly_trend,
            "timestamp": datetime.datetime.now().isoformat()
        }

    def get_projects(
        self,
        region: Optional[str] = None,
        sector: Optional[str] = None,
        risk: Optional[str] = None,
        confidence_tier: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
        sort_by: str = "predicted_delay_probability",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Filtered, paginated project register from inference pool."""
        filtered = self.infer_df.copy()

        if region and region != "All":
            filtered = filtered[filtered["region_final"] == region]
        if sector and sector != "All":
            filtered = filtered[filtered["sector_extracted"] == sector]
        if risk and risk != "All":
            filtered = filtered[filtered["risk_category"].str.lower() == risk.lower()]
        if confidence_tier and confidence_tier != "All":
            filtered = filtered[filtered["label_confidence_tier"] == confidence_tier]
        if search:
            s = search.strip().lower()
            filtered = filtered[
                filtered["project_id"].str.lower().str.contains(s) |
                filtered["sector_extracted"].str.lower().str.contains(s) |
                filtered["region_final"].str.lower().str.contains(s)
            ]

        total_count = len(filtered)

        # Sorting
        ascending = (sort_order.lower() == "asc")
        if sort_by in filtered.columns:
            filtered = filtered.sort_values(by=sort_by, ascending=ascending)
        else:
            filtered = filtered.sort_values(by="predicted_delay_probability", ascending=False)

        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        page_rows = filtered.iloc[start:end]

        result_rows = []
        for _, r in page_rows.iterrows():
            result_rows.append({
                "project_id": str(r["project_id"]),
                "quarter": str(r["quarter"]),
                "region_final": str(r["region_final"]),
                "sector_extracted": str(r["sector_extracted"]),
                "predicted_delay_probability": float(r["predicted_delay_probability"]),
                "predicted_delay_pct": float(r["predicted_delay_pct"]),
                "risk_category": str(r["risk_category"]),
                "label_confidence_tier": str(r.get("label_confidence_tier", "unknown")),
                "original_cost_crore": float(r.get("original_cost_crore", 0) or 0),
                "physical_progress_pct": float(r.get("physical_progress_pct", 0) or 0),
                "land_acquisition_pct": float(r.get("land_acquisition_pct", 0) or 0),
                "land_gap_ha_calc": float(r.get("land_gap_ha_calc", 0) or 0),
                "top_contributing_drivers": r.get("top_contributing_drivers", []),
            })

        return {
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size if total_count else 1,
            "projects": result_rows
        }

    def get_project_detail(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Full project snapshot, SHAP explanation, highlighted narrative, and isolated audit tab."""
        pid = project_id.strip()
        if pid not in self.infer_project_map:
            # Fallback search case-insensitively
            matched_key = next((k for k in self.infer_project_map if k.lower() == pid.lower()), None)
            if not matched_key:
                return None
            pid = matched_key

        row = self.infer_project_map[pid]
        quarter = str(row["quarter"])

        # Fetch matched narrative text
        narrative_text = self.narrative_index.get((pid, quarter), "")

        # Compute SHAP explanation for this project row
        df_single = pd.DataFrame([row])
        X_aligned = self.ml_engine.preprocess_df(df_single)
        shap_drivers = self.ml_engine.explain_instance(X_aligned, top_k=6)

        # Generate rule-based recommendations from top delay drivers
        top_driver_keys = [d["raw_feature"] for d in shap_drivers if d["impact"] == "increases_risk"]
        recommendations = get_recommendations_for_drivers(top_driver_keys)

        # Identify keyword highlight spans in narrative
        highlight_tags = []
        for kw_flag, patterns in KEYWORD_HIGHLIGHT_PATTERNS.items():
            if row.get(kw_flag, 0) == 1:
                # Find occurrences in narrative
                for pat in patterns:
                    matches = list(re.finditer(pat, narrative_text, re.IGNORECASE))
                    if matches:
                        highlight_tags.append({
                            "keyword_flag": kw_flag,
                            "friendly_flag_name": get_friendly_driver_name(kw_flag),
                            "pattern": pat,
                            "match_count": len(matches)
                        })
                        break  # Found match for this flag

        # Compile full readable feature snapshot (no raw machine-only names)
        snapshot = {
            "identity": {
                "project_id": pid,
                "quarter": quarter,
                "region": str(row.get("region_final", "Unknown")),
                "sector": str(row.get("sector_extracted", "Unknown")),
                "state_freq_encoded": float(row.get("state_freq_encoded", 0) or 0),
                "label_confidence_tier": str(row.get("label_confidence_tier", "unknown")),
            },
            "progress_and_cost": {
                "original_cost_crore": float(row.get("original_cost_crore", 0) or 0),
                "anticipated_cost_crore": float(row.get("anticipated_cost_crore_extracted", 0) or 0),
                "cost_overrun_pct": float(row.get("cost_overrun_pct_calc_clean", 0) or 0),
                "physical_progress_pct": float(row.get("physical_progress_pct", 0) or 0),
                "project_age_months": float(row.get("project_age_months_at_report", 0) or 0),
            },
            "land_acquisition_status": {
                "land_required_ha": float(row.get("land_required_ha", 0) or 0),
                "land_acquired_ha": float(row.get("land_acquired_ha", 0) or 0),
                "land_possession_ha": float(row.get("land_possession_ha", 0) or 0),
                "land_gap_ha": float(row.get("land_gap_ha_calc", 0) or 0),
                "land_acquisition_pct": float(row.get("land_acquisition_pct", 0) or 0),
                "land_possession_pct": float(row.get("land_possession_pct_calc", 0) or 0),
                "land_progress_ratio": float(row.get("land_acquisition_progress_ratio", 0) or 0),
                "has_land_component": bool(row.get("has_land_component_v2", 0) == 1),
            },
            "bottleneck_indicators": {
                "legal_dispute_flag": bool(row.get("legal_dispute", 0) == 1),
                "compensation_mentioned": bool(row.get("compensation_mentioned", 0) == 1),
                "forest_or_clearance_issue": bool(row.get("forest_land_or_clearance_issue", 0) == 1),
                "rr_issue_flag": bool(row.get("rr_issue", 0) == 1),
                "row_issue_flag": bool(row.get("row_issue", 0) == 1),
                "administrative_issue_flag": bool(row.get("administrative_issue", 0) == 1),
                "num_compound_issues": int(row.get("num_issue_flags_v2", 0) or 0),
                "has_delay_reason_text": bool(row.get("has_delay_reason_text", 0) == 1),
            }
        }

        # ISOLATED AUDIT RECORD: Strictly segregated from classifier & explanations
        audit_record = {
            "time_overrun_months": float(row.get("time_overrun_months", 0) or 0),
            "time_overrun_months_was_missing": bool(row.get("time_overrun_months_was_missing", 0) == 1),
            "ml_split_status": "unlabeled_inference_set",
            "governance_note": (
                "AUDIT NOTICE: 'time_overrun_months' is retained for historical reporting only. "
                "Per SIH26017 anti-leakage guidelines, it is strictly excluded from feature inputs, "
                "SHAP explanations, and recommendation rules."
            )
        }

        return {
            "project_id": pid,
            "quarter": quarter,
            "predicted_delay_probability": float(row["predicted_delay_probability"]),
            "predicted_delay_pct": float(row["predicted_delay_pct"]),
            "risk_category": str(row["risk_category"]),
            "label_confidence_tier": str(row.get("label_confidence_tier", "unknown")),
            "feature_snapshot": snapshot,
            "shap_explanation": shap_drivers,
            "recommended_actions": recommendations,
            "narrative": {
                "raw_text": narrative_text if narrative_text else "No raw narrative text reported for this project and quarter in MOSPI archives.",
                "has_narrative": bool(narrative_text),
                "active_keyword_flags": highlight_tags,
                "character_length": len(narrative_text),
            },
            "audit_record": audit_record
        }

    def get_regional_analytics(self) -> Dict[str, Any]:
        """Data for regional GIS bubbles, Sector x Region heatmap, and progress timeline."""
        # 1. Regional map bubbles
        map_bubbles = []
        for region, group in self.infer_df.groupby("region_final"):
            reg_total = len(group)
            reg_high = int((group["risk_category"] == "High").sum())
            reg_avg = float(group["predicted_delay_probability"].mean())
            centroid = REGIONAL_CENTROIDS.get(region, REGIONAL_CENTROIDS["Unknown"])
            
            # Top 3 sectors in this region
            top_sectors = group["sector_extracted"].value_counts().head(3).to_dict()

            # Top drivers in this region
            all_drivers = []
            for dlist in group["top_contributing_drivers"]:
                if isinstance(dlist, list):
                    all_drivers.extend(dlist)
            driver_counts = pd.Series(all_drivers).value_counts().head(3).index.tolist() if all_drivers else ["Schedule Risk"]

            total_cost = round(float(group["original_cost_crore"].fillna(0).sum()), 1)
            avg_land_gap = round(float(group["land_gap_ha_calc"].fillna(0).mean()), 1)
            avg_prog = round(float(group["physical_progress_pct"].fillna(0).mean()), 1)
            crit_count = int((group["predicted_delay_probability"] >= 0.85).sum())

            map_bubbles.append({
                "region": region,
                "lat": centroid["lat"],
                "lng": centroid["lng"],
                "total_projects": reg_total,
                "high_risk_count": reg_high,
                "high_risk_pct": round((reg_high / reg_total) * 100, 1),
                "avg_delay_probability": round(reg_avg, 3),
                "top_sectors": top_sectors,
                "total_cost_crore": total_cost,
                "avg_land_gap_ha": avg_land_gap,
                "avg_physical_progress": avg_prog,
                "critical_count": crit_count,
                "top_delay_drivers": driver_counts
            })

        # 2. Sector x Region Heatmap Matrix
        regions = sorted(self.infer_df["region_final"].dropna().unique())
        top_sectors = self.infer_df["sector_extracted"].value_counts().head(8).index.tolist()

        matrix = []
        for sec in top_sectors:
            sec_row = {"sector": sec, "regions": {}}
            for reg in regions:
                cell_df = self.infer_df[(self.infer_df["sector_extracted"] == sec) & (self.infer_df["region_final"] == reg)]
                if len(cell_df) > 0:
                    sec_row["regions"][reg] = {
                        "count": len(cell_df),
                        "avg_prob": round(float(cell_df["predicted_delay_probability"].mean()), 3),
                        "delay_rate": round(float((cell_df["risk_category"] == "High").mean()) * 100, 1)
                    }
                else:
                    sec_row["regions"][reg] = {"count": 0, "avg_prob": 0, "delay_rate": 0}
            matrix.append(sec_row)

        # 3. Timeline progress curves (At-Risk vs On-Track projects across quarters)
        quarters = sorted(self.infer_df["quarter"].dropna().unique(), key=parse_quarter_key)
        timeline = []
        for q in quarters[-12:]:  # Last 12 quarters
            q_df = self.infer_df[self.infer_df["quarter"] == q]
            if len(q_df) > 0:
                high_df = q_df[q_df["risk_category"] == "High"]
                on_track_df = q_df[q_df["risk_category"] != "High"]
                timeline.append({
                    "quarter": q,
                    "high_risk_physical_progress": round(float(high_df["physical_progress_pct"].mean()), 1) if len(high_df) else 0.0,
                    "ontrack_physical_progress": round(float(on_track_df["physical_progress_pct"].mean()), 1) if len(on_track_df) else 0.0,
                    "high_risk_land_pct": round(float(high_df["land_acquisition_pct"].mean()), 1) if len(high_df) else 0.0,
                    "ontrack_land_pct": round(float(on_track_df["land_acquisition_pct"].mean()), 1) if len(on_track_df) else 0.0,
                })

        return {
            "map_bubbles": map_bubbles,
            "regions_list": regions,
            "top_sectors": top_sectors,
            "heatmap_matrix": matrix,
            "timeline": timeline,
            "gis_governance_notice": (
                "Location Note: District-level visualization requires location-enriched GIS coordinates. "
                "Displaying regional aggregate centroids based on 'region_final' per dataset specification."
            )
        }

    def get_alerts(self, min_prob: float = 0.65) -> List[Dict[str, Any]]:
        """In-app alert feed for inference-set projects crossing 65% delay probability."""
        high_risk_df = self.infer_df[self.infer_df["predicted_delay_probability"] >= min_prob].copy()
        high_risk_df = high_risk_df.sort_values(by="predicted_delay_probability", ascending=False)

        alerts = []
        for idx, row in high_risk_df.head(100).iterrows():
            drivers = row.get("top_contributing_drivers", ["Schedule Risk"])
            primary_driver = drivers[0] if isinstance(drivers, list) and len(drivers) > 0 else "Severe Delay Risk"
            alerts.append({
                "alert_id": f"ALT-{row['project_id']}-{row['quarter']}",
                "project_id": str(row["project_id"]),
                "quarter": str(row["quarter"]),
                "sector": str(row["sector_extracted"]),
                "region": str(row["region_final"]),
                "predicted_delay_probability": float(row["predicted_delay_probability"]),
                "predicted_delay_pct": float(row["predicted_delay_pct"]),
                "severity": "CRITICAL" if row["predicted_delay_probability"] >= 0.85 else "HIGH",
                "primary_driver": primary_driver,
                "label_confidence_tier": str(row.get("label_confidence_tier", "unknown")),
                "timestamp": f"2026-Q1 Alert Cycle"
            })
        return alerts

    def get_model_metadata(self) -> Dict[str, Any]:
        """Admin-only model governance metrics from held-out test set."""
        # Read test_metrics.txt if present
        metrics_file = find_file("test_metrics.txt")
        test_metrics_text = ""
        if os.path.exists(metrics_file):
            with open(metrics_file, "r") as f:
                test_metrics_text = f.read()

        return {
            "model_type": "LightGBM Classifier (LGBMClassifier)",
            "problem_statement": "SIH26017 — Early Detection of Land Acquisition Delays",
            "target": "target_is_delayed (Binary: 0=On-Track, 1=Delayed)",
            "split_methodology": "Project-level split (infra_projects_train/val/test) without leakage",
            "excluded_features": ["time_overrun_months", "time_overrun_months_was_missing", "project_id", "quarter", "ml_split_v2"],
            "total_engineered_features": len(self.ml_engine.feature_columns),
            "feature_names_sample": self.ml_engine.feature_columns[:25],
            "test_set_evaluation": {
                "test_samples": 6099,
                "precision": 0.9172,
                "recall": 0.8228,
                "f1_score": 0.8674,
                "roc_auc": 0.8867,
                "pr_auc": 0.9514,
                "confusion_matrix": {
                    "labels": ["Not Delayed (0)", "Delayed (1)"],
                    "matrix": [[1268, 334], [797, 3700]],
                    "true_negatives": 1268,
                    "false_positives": 334,
                    "false_negatives": 797,
                    "true_positives": 3700
                }
            },
            "raw_test_metrics_log": test_metrics_text,
            "retraining_instructions": (
                "Run `python train_model.py --data_dir extracted --out_dir model_output` to retrain. "
                "Features are fitted on TRAIN only, tuned on VAL, and evaluated once on TEST."
            )
        }


# Singleton instance
_data_repo = None

def get_data_repo() -> DataRepository:
    global _data_repo
    if _data_repo is None:
        _data_repo = DataRepository()
    return _data_repo
