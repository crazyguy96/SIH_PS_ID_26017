"""
SIH PS 26017: QSPR/PAIMANA subsystem verification tests.

Mirrors the style of backend/test_system.py (plain print/assert, no pytest
dependency assumed) so it can be run the same way:

    cd backend && python qspr/tests/test_qspr.py

Requires the 4 sample report PDFs used during development. If you don't
have them locally, set QSPR_TEST_PDF_DIR to a folder containing:
  FlashReport_January_2026.pdf, FlashReport_March_2026.pdf,
  FlashReport_April2026.pdf, FlashReport_July_2026.pdf
Tests that need a PDF are skipped (not failed) if it's missing, so this
still runs everywhere else.
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))  # backend/

from qspr.extractor import extract_all_projects, parse_project_cell, parse_paren_pair
from qspr.feature_pipeline import build_features, normalize_state, compute_cost_overrun_pct
from qspr.predictor import predict_batch
from qspr.validation import validate_pdf
from qspr import history

PDF_DIR = os.environ.get("QSPR_TEST_PDF_DIR", "/mnt/user-data/uploads/test_reports/test_reports")

REPORTS = {
    "January 2026": os.path.join(PDF_DIR, "FlashReport_January_2026.pdf"),
    "March 2026": os.path.join(PDF_DIR, "FlashReport_March_2026.pdf"),
    "April 2026": os.path.join(PDF_DIR, "FlashReport_April2026.pdf"),
    "July 2026": os.path.join(PDF_DIR, "FlashReport_July_2026.pdf"),
}

ANCHOR_PROJECT_CODE = "706724"
ANCHOR_EXPECTED = {
    "January 2026": {"original_cost": 1712.0, "revised_cost": 2520.0, "physical_progress": 96.0},
    "July 2026": {"original_cost": 1712.0, "revised_cost": 2520.0, "physical_progress": 99.5},
}


def _available(path: str) -> bool:
    return os.path.exists(path)


def run_tests():
    print("=" * 70)
    print("STARTING QSPR/PAIMANA SUBSYSTEM VERIFICATION")
    print("=" * 70)

    passed = 0
    skipped = 0

    # ---------------------------------------------------------------
    # TEST 1: parsing helpers, in isolation (no PDF needed)
    # ---------------------------------------------------------------
    print("\n[TEST 1] Project-cell / paren-pair parsing helpers...")
    name, agency, code, legacy = parse_project_cell(
        "Guwahati Airport New Integrated Terminal Building Construction Project\n"
        "(Adani Airport Holdings Limited)\n(706724)"
    )
    assert code == "706724" and legacy is None and agency == "Adani Airport Holdings Limited"
    print("  [PASS] Multi-line cell, no legacy code")

    name, agency, code, legacy = parse_project_cell(
        "DIPKA EXPANSION OCP [40 MTY] (South Eastern Coalfields Limited [SECL]) (400354) (N06000200)"
    )
    assert code == "400354" and legacy == "N06000200"
    print("  [PASS] Single-line cell with letter-prefixed legacy code")

    name, agency, code, legacy = parse_project_cell(
        "Construction of New Domestic Terminal Building at Rajahmundry Airport. "
        "(Airport Authority of India [AAI]) (701121) (-)"
    )
    assert code == "701121" and legacy is None
    print("  [PASS] Trailing '-' legacy-code placeholder correctly ignored")

    first, second = parse_paren_pair("12/2016\n(03/2018)")
    assert first == "12/2016" and second == "03/2018"
    print("  [PASS] Approval-date paren pair")
    passed += 1

    # ---------------------------------------------------------------
    # TEST 2: normalize_state / cost overrun formula
    # ---------------------------------------------------------------
    print("\n[TEST 2] State normalization and cost-overrun formula...")
    assert normalize_state("Assam") == "ASSAM"
    assert normalize_state("Multi-States (Assam, Manipur)") == "MULTI STATE"
    assert normalize_state(None) == "UNKNOWN_STATE"
    assert normalize_state("656.94 12/2025") == "UNKNOWN_STATE"  # contaminated value
    print("  [PASS] normalize_state handles clean, multi-state, missing, and garbled input")

    assert compute_cost_overrun_pct(1712.0, 2520.0) == ((2520.0 - 1712.0) / 1712.0) * 100.0
    assert compute_cost_overrun_pct(0, 100) is None, "non-positive original cost must be missing, not 0"
    assert compute_cost_overrun_pct(-5, 100) is None
    assert compute_cost_overrun_pct(None, 100) is None
    print("  [PASS] Approved cost-overrun formula; invalid original cost -> missing")
    passed += 1

    # ---------------------------------------------------------------
    # TEST 3: PDF validation
    # ---------------------------------------------------------------
    print("\n[TEST 3] PDF validation...")
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
        f.write(b"this is not a pdf")
        not_pdf_path = f.name
    result = validate_pdf(not_pdf_path)
    assert result.is_valid is False
    os.remove(not_pdf_path)
    print("  [PASS] Non-PDF file rejected")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(b"%PDF-1.4 not actually a valid pdf body")
        corrupted_path = f.name
    result = validate_pdf(corrupted_path)
    assert result.is_valid is False
    os.remove(corrupted_path)
    print("  [PASS] Corrupted PDF rejected")

    any_pdf_available = False
    for label, path in REPORTS.items():
        if not _available(path):
            continue
        any_pdf_available = True
        result = validate_pdf(path)
        assert result.is_valid is True, f"{label} should validate as a genuine Flash Report"
        assert result.detected_report_label == label, (
            f"detected '{result.detected_report_label}', expected '{label}'"
        )
        print(f"  [PASS] {label}: valid, detected report period = {result.detected_report_label}")
    if any_pdf_available:
        passed += 1
    else:
        print("  [SKIP] No sample report PDFs found - set QSPR_TEST_PDF_DIR to run this test")
        skipped += 1

    # ---------------------------------------------------------------
    # TEST 4: extraction against real reports + anchor project regression
    # ---------------------------------------------------------------
    print("\n[TEST 4] Extraction + anchor project regression (project 706724)...")
    extracted_cache = {}
    if any_pdf_available:
        for label, path in REPORTS.items():
            if not _available(path):
                continue
            report_label, records, issues = extract_all_projects(path)
            extracted_cache[label] = (report_label, records, issues)

            ids = [r["project_id"] for r in records]
            assert len(ids) == len(set(ids)), f"{label}: duplicate project_id survived dedup"

            unknown_state_ok = all(
                r["state_raw"] is None or isinstance(r["state_raw"], str) for r in records
            )
            assert unknown_state_ok

            code_fail = [i for i in issues if "identify a project code" in i["reason"]]
            assert len(code_fail) == 0, f"{label}: {len(code_fail)} rows failed project-code extraction"

            anchor = next((r for r in records if r["project_id"] == ANCHOR_PROJECT_CODE), None)
            assert anchor is not None, f"{label}: anchor project {ANCHOR_PROJECT_CODE} not found"

            if label in ANCHOR_EXPECTED:
                exp = ANCHOR_EXPECTED[label]
                assert float(anchor["original_cost_raw"]) == exp["original_cost"]
                assert float(anchor["revised_cost_raw"]) == exp["revised_cost"]
                assert float(anchor["physical_progress_raw"]) == exp["physical_progress"]
                print(
                    f"  [PASS] {label}: anchor matches "
                    f"(cost {exp['original_cost']}->{exp['revised_cost']}, "
                    f"progress {exp['physical_progress']}%), "
                    f"{len(records)} unique projects, 0 code-extraction failures"
                )
            else:
                print(f"  [PASS] {label}: {len(records)} unique projects, 0 code-extraction failures")
        passed += 1
    else:
        print("  [SKIP] No sample report PDFs found")
        skipped += 1

    # ---------------------------------------------------------------
    # TEST 5: batch prediction - missing/unknown values never crash
    # ---------------------------------------------------------------
    print("\n[TEST 5] Batch prediction robustness...")
    synthetic_records = [
        {  # normal row
            "project_id": "TEST001", "legacy_project_id": None, "project_name": "Test Project A",
            "agency": "Test Agency", "ministry": "Ministry of Test", "sector": "Roads & Highways",
            "state_raw": "Assam", "approval_date": "01/2015", "revised_approval_date": None,
            "original_completion_date": "01/2020", "revised_completion_date": "01/2021",
            "original_cost_raw": "100", "revised_cost_raw": "150",
            "cumulative_expenditure_raw": "90", "physical_progress_raw": "80", "source_page": 1,
        },
        {  # unknown state + unknown sector
            "project_id": "TEST002", "legacy_project_id": None, "project_name": "Test Project B",
            "agency": "Test Agency", "ministry": "Ministry of Test", "sector": "Something Brand New",
            "state_raw": "Not A Real State", "approval_date": "06/2018", "revised_approval_date": None,
            "original_completion_date": "06/2023", "revised_completion_date": None,
            "original_cost_raw": "200", "revised_cost_raw": "200",
            "cumulative_expenditure_raw": "10", "physical_progress_raw": "5", "source_page": 2,
        },
        {  # missing numerics entirely + invalid original cost
            "project_id": "TEST003", "legacy_project_id": None, "project_name": "Test Project C",
            "agency": None, "ministry": None, "sector": None,
            "state_raw": None, "approval_date": None, "revised_approval_date": None,
            "original_completion_date": None, "revised_completion_date": None,
            "original_cost_raw": "0", "revised_cost_raw": None,
            "cumulative_expenditure_raw": None, "physical_progress_raw": None, "source_page": 3,
        },
    ]
    results, issues = predict_batch(synthetic_records, "July 2026")
    assert len(results) == 3, "one bad project must not stop the others"
    assert len(issues) == 0
    for r in results:
        assert 0.0 <= r["delay_probability_pct"] <= 100.0
        assert r["risk_category"] in ("High", "Medium", "Low")
    print("  [PASS] Unknown state/sector and fully-missing numerics all predicted without crashing")
    passed += 1

    # ---------------------------------------------------------------
    # TEST 6: history - isolation, current-vs-previous by date not order
    # ---------------------------------------------------------------
    print("\n[TEST 6] History storage...")
    tmp_db_fd, tmp_db_path = tempfile.mkstemp(suffix=".db")
    os.close(tmp_db_fd)
    os.remove(tmp_db_path)
    original_db_path = history.DB_PATH
    history.DB_PATH = tmp_db_path
    try:
        r_jan, _ = predict_batch(synthetic_records, "January 2026")
        r_jul, _ = predict_batch(synthetic_records, "July 2026")
        r_mar, _ = predict_batch(synthetic_records, "March 2026")

        # Save out of chronological order on purpose.
        history.save_predictions(r_jan, "January 2026", source_report="test-jan.pdf")
        history.save_predictions(r_jul, "July 2026", source_report="test-jul.pdf")
        history.save_predictions(r_mar, "March 2026", source_report="test-mar.pdf")

        current, previous = history.get_current_and_previous("TEST001")
        assert current["report_label"] == "July 2026", "current must be the newest report_date, not last-saved"
        assert [p["report_label"] for p in previous] == ["March 2026", "January 2026"]
        print("  [PASS] Current/previous determined by report_date, not upload order")

        hist_other = history.get_history_for_project("TEST002")
        assert len(hist_other) == 3
        assert all(h["project_id"] == "TEST002" for h in hist_other)
        print("  [PASS] History scoped strictly per project - no cross-project bleed")

        for h in history.get_history_for_project("TEST001"):
            assert h["actual_outcome_known"] is False, "2026 predictions must not fabricate actual outcomes"
        print("  [PASS] No fabricated actual outcomes")

        # Re-processing the same month must refresh, not duplicate.
        r_jul2, _ = predict_batch(synthetic_records, "July 2026")
        history.save_predictions(r_jul2, "July 2026", source_report="test-jul.pdf")
        assert len(history.get_history_for_project("TEST001")) == 3
        print("  [PASS] Re-processing the same report_date refreshes, never duplicates")
        passed += 1
    finally:
        history.DB_PATH = original_db_path
        if os.path.exists(tmp_db_path):
            os.remove(tmp_db_path)

    # ---------------------------------------------------------------
    print("\n" + "=" * 70)
    print(f"QSPR VERIFICATION COMPLETE: {passed} test group(s) passed, {skipped} skipped")
    print("=" * 70)
    return passed, skipped


if __name__ == "__main__":
    run_tests()
