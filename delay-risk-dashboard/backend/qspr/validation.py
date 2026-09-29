"""
Structural validation for uploaded QSPR/PAIMANA Flash Report PDFs.

A PDF is never accepted just because its filename contains "QSPR" or a
month name — we check the actual content for the structural markers a
genuine Flash Report has. Extraction/prediction never runs on a PDF that
fails this check.
"""
from dataclasses import dataclass, field
from typing import List, Optional

import pdfplumber

from qspr.extractor import extract_report_label, find_header_col_map

REQUIRED_TERMINOLOGY = ["paimana", "flash report"]


@dataclass
class ValidationResult:
    is_valid: bool
    reason: Optional[str] = None
    detected_report_label: Optional[str] = None
    checks: List[str] = field(default_factory=list)


def validate_pdf(path: str) -> ValidationResult:
    checks: List[str] = []

    try:
        with pdfplumber.open(path) as pdf:
            if len(pdf.pages) == 0:
                return ValidationResult(False, "The PDF has no pages.", checks=checks)

            # 1. Terminology check across the first few pages (cover/title).
            front_text = ""
            for page in pdf.pages[:5]:
                front_text += (page.extract_text() or "") + "\n"
            front_text_lower = front_text.lower()
            terminology_hit = any(term in front_text_lower for term in REQUIRED_TERMINOLOGY)
            if terminology_hit:
                checks.append("Found PAIMANA/Flash Report terminology on the cover pages.")
            else:
                # Some reports only carry the terminology in a running header
                # further in; check a broader window before failing.
                wider_text = ""
                for page in pdf.pages[:30]:
                    wider_text += (page.extract_text() or "") + "\n"
                if any(term in wider_text.lower() for term in REQUIRED_TERMINOLOGY):
                    checks.append("Found PAIMANA/Flash Report terminology in the report header.")
                    terminology_hit = True

            if not terminology_hit:
                return ValidationResult(
                    False,
                    "Report is not compatible with the expected PAIMANA/QSPR Flash "
                    "Report structure: no 'PAIMANA' or 'Flash Report' terminology "
                    "was found anywhere in the first 30 pages.",
                    checks=checks,
                )

            # 2. Table 6 "All Ongoing Projects" structural check: scan a
            # generous window of pages for the real per-project header.
            found_table6 = False
            for page in pdf.pages[:250]:
                for table in page.extract_tables():
                    for row in table:
                        if find_header_col_map(row):
                            found_table6 = True
                            break
                    if found_table6:
                        break
                if found_table6:
                    break

            if not found_table6:
                return ValidationResult(
                    False,
                    "Report is not compatible with the expected PAIMANA/QSPR Flash "
                    "Report structure: the 'All Ongoing Projects' project table "
                    "(with Project Name / Agency / Project Code, State, and "
                    "Physical Progress columns) could not be found.",
                    checks=checks,
                )
            checks.append("Found the 'All Ongoing Projects' project table structure.")

            # 3. Report month/year detection (informational, not fatal — the
            # router falls back to a manual selector if this is None).
            report_label = extract_report_label(pdf)
            if report_label:
                checks.append(f"Detected report period: {report_label}.")

            return ValidationResult(True, None, detected_report_label=report_label, checks=checks)

    except Exception as exc:
        msg = str(exc).lower()
        if "pdf" in msg and ("header" in msg or "not a pdf" in msg or "eof" in msg):
            return ValidationResult(False, "This file is not a valid PDF, or the PDF is corrupted.", checks=checks)
        return ValidationResult(False, f"Could not open this PDF: {exc}", checks=checks)
