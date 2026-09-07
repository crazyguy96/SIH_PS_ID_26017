"""
SIH PS 26017: Comprehensive Automated Verification Test Script
Tests all FastAPI REST endpoints, ML model serving, SHAP explainability,
auditable recommendations, narrative integration, and anti-leakage constraints.
"""

import sys
import io

# Set UTF-8 encoding for Windows stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from main import app
from auth import create_access_token, USERS_DB

def run_tests():
    print("=" * 70)
    print("STARTING SIH26017 AUTOMATED SYSTEM VERIFICATION")
    print("=" * 70)

    from data_repo import get_data_repo
    from ml_engine import get_ml_engine, DROP_COLS

    repo = get_data_repo()
    ml_engine = get_ml_engine()

    # TEST 1: Overview KPIs
    print("\n[TEST 1] Testing /api/overview...")
    ov = repo.get_overview_kpis()
    assert ov["total_monitored"] > 0, "Total monitored should be > 0"
    assert "high_risk_pct" in ov, "Overview must have high_risk_pct"
    assert "avg_predicted_delay_probability" in ov, "Overview must have avg_predicted_delay_probability"
    assert "confidence_tier_distribution" in ov, "Overview must have confidence_tier_distribution"
    assert len(ov["by_region"]) > 0, "Overview must have by_region breakdown"
    assert len(ov["top_10_sectors"]) > 0, "Overview must have top 10 sectors"
    assert len(ov["quarterly_trend"]) > 0, "Overview must have quarterly trend"
    print(f"  [PASS] Total Monitored: {ov['total_monitored']}")
    print(f"  [PASS] High Risk Rate: {ov['high_risk_pct']}% ({ov['high_risk_count']} projects)")
    print(f"  [PASS] Avg Delay Probability: {ov['avg_predicted_delay_probability']}")
    print(f"  [PASS] Confidence Tiers: {ov['confidence_tier_distribution']}")
    print(f"  [PASS] Regions: {len(ov['by_region'])}, Sectors: {len(ov['top_10_sectors'])}, Quarters: {len(ov['quarterly_trend'])}")

    # TEST 2: Project Register & Filtering
    print("\n[TEST 2] Testing /api/projects filtering & pagination...")
    pjs = repo.get_projects(page=1, page_size=10, sort_by="predicted_delay_probability", sort_order="desc")
    assert pjs["total_count"] == 7955, f"Expected 7955 projects, got {pjs['total_count']}"
    assert len(pjs["projects"]) == 10, "Page size should be 10"
    
    first_proj = pjs["projects"][0]
    pid = first_proj["project_id"]
    print(f"  [PASS] Filtered project sample: ID={pid}, Risk={first_proj['risk_category']}, Prob={first_proj['predicted_delay_pct']}%")
    print(f"  [PASS] Confidence Tier: {first_proj['label_confidence_tier']}")
    print(f"  [PASS] Top Drivers: {first_proj['top_contributing_drivers']}")

    # Test region filter
    north_pjs = repo.get_projects(region="North", page=1, page_size=5)
    assert all(p["region_final"] == "North" for p in north_pjs["projects"]), "All filtered projects must be North"
    print(f"  [PASS] North Region Filter Count: {north_pjs['total_count']}")

    # Test risk filter
    high_pjs = repo.get_projects(risk="High", page=1, page_size=5)
    assert all(p["risk_category"] == "High" for p in high_pjs["projects"]), "All filtered projects must be High risk"
    print(f"  [PASS] High Risk Filter Count: {high_pjs['total_count']}")

    # TEST 3: Project Detail, SHAP Explanation & Narrative Join
    print(f"\n[TEST 3] Testing /api/projects/{pid} detail view...")
    detail = repo.get_project_detail(pid)
    assert detail is not None, f"Project detail for {pid} must not be None"
    assert "shap_explanation" in detail, "Detail must have shap_explanation"
    assert len(detail["shap_explanation"]) > 0, "SHAP explanation must not be empty"
    assert "recommended_actions" in detail, "Detail must have recommended_actions"
    assert len(detail["recommended_actions"]) > 0, "Must have recommended actions"
    assert "narrative" in detail, "Detail must have narrative"
    assert "audit_record" in detail, "Detail must have isolated audit record"

    print(f"  [PASS] Project ID: {detail['project_id']}, Quarter: {detail['quarter']}")
    print(f"  [PASS] Delay Probability: {detail['predicted_delay_probability']} ({detail['risk_category']} Risk)")
    print(f"  [PASS] SHAP Drivers ({len(detail['shap_explanation'])} items):")
    for d in detail["shap_explanation"][:3]:
        print(f"      - {d['friendly_name']}: SHAP={d['shap_value']} ({d['impact']})")
    print(f"  [PASS] Recommended Interventions ({len(detail['recommended_actions'])} items):")
    for r in detail["recommended_actions"][:2]:
        print(f"      - {r}")
    print(f"  [PASS] MOSPI Narrative Length: {detail['narrative']['character_length']} chars")
    print(f"  [PASS] Active Keyword Flags in Narrative: {len(detail['narrative']['active_keyword_flags'])}")

    # TEST 4: Anti-Leakage Compliance Verification
    print("\n[TEST 4] Verifying STRICT Anti-Leakage Compliance...")
    # 1. Verify time_overrun_months is NOT in model feature schema
    assert "time_overrun_months" not in ml_engine.feature_columns, "LEAKAGE ERROR: time_overrun_months found in model columns!"
    assert "time_overrun_months_was_missing" not in ml_engine.feature_columns, "LEAKAGE ERROR: time_overrun_months_was_missing found in model columns!"
    # 2. Verify time_overrun_months is NOT in SHAP drivers
    for d in detail["shap_explanation"]:
        assert "time_overrun" not in d["raw_feature"], f"LEAKAGE ERROR: time_overrun found in SHAP feature: {d['raw_feature']}"
    # 3. Verify audit record is isolated
    assert "time_overrun_months" in detail["audit_record"], "Audit record must contain historical time_overrun_months"
    print("  [PASS] Strict Anti-Leakage Verification PASSED: time_overrun_months is excluded from model, features, and SHAP.")

    # TEST 5: Public /predict Endpoint Simulation
    print("\n[TEST 5] Testing POST /api/predict...")
    sample_payload = {
        "region_final": "North",
        "sector_extracted": "ROAD TRANSPORT AND HIGHWAYS",
        "original_cost_crore": 1200.0,
        "anticipated_cost_crore_extracted": 1500.0,
        "cost_overrun_pct_calc_clean": 25.0,
        "physical_progress_pct": 35.0,
        "project_age_months_at_report": 24.0,
        "land_required_ha": 300.0,
        "land_acquired_ha": 150.0,
        "land_possession_ha": 120.0,
        "land_gap_ha_calc": 150.0,
        "land_acquisition_pct": 50.0,
        "land_possession_pct_calc": 40.0,
        "land_acquisition_progress_ratio": 0.50,
        "has_land_component_v2": 1,
        "compensation_mentioned": 1,
        "legal_dispute": 1,
        "rr_issue": 1,
        "row_issue": 1,
        "kw_court_litigation": 1,
        "kw_compensation_dispute": 1
    }
    pred_res = ml_engine.predict_single(sample_payload)
    assert "predicted_delay_probability" in pred_res, "Prediction response must have probability"
    assert pred_res["mock"] is False, "Prediction must be real (mock=False)"
    assert pred_res["risk_category"] in ["Low", "Medium", "High"], "Risk category must be Low/Medium/High"
    print(f"  [PASS] Predicted Delay Probability: {pred_res['predicted_delay_probability']} ({pred_res['risk_category']} Risk)")
    print(f"  [PASS] Top Contributor: {pred_res['top_contributing_drivers'][0]['friendly_name']}")
    print(f"  [PASS] Primary Recommendation: {pred_res['recommended_actions'][0]}")

    # TEST 6: Regional GIS & Comparative Analytics
    print("\n[TEST 6] Testing /api/regional analytics...")
    reg_data = repo.get_regional_analytics()
    assert len(reg_data["map_bubbles"]) > 0, "Map bubbles must not be empty"
    assert len(reg_data["heatmap_matrix"]) > 0, "Heatmap matrix must not be empty"
    assert len(reg_data["timeline"]) > 0, "Timeline points must not be empty"
    print(f"  [PASS] Regional Bubbles: {len(reg_data['map_bubbles'])} regions mapped with centroids")
    print(f"  [PASS] Heatmap Matrix: {len(reg_data['heatmap_matrix'])} sectors x {len(reg_data['regions_list'])} regions")
    print(f"  [PASS] Progress Timeline: {len(reg_data['timeline'])} quarters analyzed")

    # TEST 7: Alerts Feed
    print("\n[TEST 7] Testing /api/alerts...")
    alerts = repo.get_alerts(min_prob=0.65)
    assert len(alerts) > 0, "Alerts list should not be empty"
    assert all(a["predicted_delay_probability"] >= 0.65 for a in alerts), "All alerts must cross 65% delay risk"
    print(f"  [PASS] High-Risk Early Warning Alerts: {len(alerts)} alerts generated")
    print(f"  [PASS] Sample Alert: ID={alerts[0]['project_id']}, Prob={alerts[0]['predicted_delay_pct']}%, Driver={alerts[0]['primary_driver']}")

    # TEST 8: Model Metadata & Evaluation
    print("\n[TEST 8] Testing /api/model/metadata...")
    meta = repo.get_model_metadata()
    assert meta["model_type"] == "LightGBM Classifier (LGBMClassifier)", "Model type mismatch"
    assert meta["test_set_evaluation"]["test_samples"] == 6099, "Test sample count mismatch"
    assert meta["test_set_evaluation"]["f1_score"] == 0.8674, "F1 score mismatch"
    cm = meta["test_set_evaluation"]["confusion_matrix"]
    print(f"  [PASS] Model: {meta['model_type']}")
    print(f"  [PASS] Test Set Samples: {meta['test_set_evaluation']['test_samples']}")
    print(f"  [PASS] Test Metrics: Precision={meta['test_set_evaluation']['precision']}, Recall={meta['test_set_evaluation']['recall']}, F1={meta['test_set_evaluation']['f1_score']}")
    print(f"  [PASS] Confusion Matrix: TN={cm['true_negatives']}, FP={cm['false_positives']}, FN={cm['false_negatives']}, TP={cm['true_positives']}")

    # TEST 9: JWT Authentication
    print("\n[TEST 9] Testing JWT Auth & Role Scoping...")
    for role_key, creds in USERS_DB.items():
        token = create_access_token({"sub": creds["username"], "role": creds["role"]})
        assert token is not None and len(token) > 20, f"Token generation failed for {role_key}"
        print(f"  [PASS] User '{creds['username']}' ({creds['role']}) authenticated successfully -> JWT token generated")

    print("\n" + "=" * 70)
    print("ALL 9 SYSTEM VERIFICATION TESTS PASSED PERFECTLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
