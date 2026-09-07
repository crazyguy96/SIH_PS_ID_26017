# -*- coding: utf-8 -*-
"""
narrative_keywords.py
----------------------
Best-effort regex keyword extraction for the 16 kw_* narrative flags used by
the trained model, applied to a NEW project's free-text narrative (if the
user provides one on the "Predict New Project" form).

IMPORTANT LIMITATION (read before trusting this in production):
The original NLP/keyword-extraction script that generated kw_* for the
historical training data was NOT included in the delivered project package
(only `add_documentation_flag.py` for kw_incomplete_documentation was
present, which this module's pattern is modeled on). The keyword lists
below are a reasonable reconstruction based on each flag's plain-English
meaning (see explain_and_score.py's RECOMMENDATIONS dict), not a verified
match to the original extraction logic. If you find the original script,
swap the pattern lists below for the real ones.

If the user leaves the narrative box empty, every kw_* flag is 0 -- this
is consistent with how the training pipeline treats projects with no
narrative text.
"""
import re

# kw_incomplete_documentation patterns copied verbatim from add_documentation_flag.py
# (the one category where we DO have the original, verified list).
KEYWORD_PATTERNS = {
    "kw_incomplete_documentation": [
        "incomplete document", "incomplete documents", "missing document",
        "missing documents", "documentation pending", "documents pending",
        "paperwork pending", "documentation issue", "documentation incomplete",
        "required documents pending", "documents not submitted",
        "document not submitted", "land records pending", "land record pending",
        "records not available", "record not available", "land records unavailable",
        "land record unavailable", "paperwork incomplete", "records incomplete",
    ],
    "kw_court_litigation": [
        "court case", "litigation", "legal dispute", "stay order",
        "writ petition", "high court", "supreme court", "sub judice",
        "case pending in court", "court proceedings",
    ],
    "kw_forest_clearance": [
        "forest clearance", "forest land diversion", "stage-i clearance",
        "stage i clearance", "stage-ii clearance", "stage ii clearance",
        "forest department approval", "forest diversion proposal",
    ],
    "kw_environment_clearance": [
        "environment clearance", "environmental clearance", "ec pending",
        "moef approval", "environmental impact assessment",
    ],
    "kw_rr_resettlement": [
        "rehabilitation and resettlement", "resettlement", "r&r package",
        "rr package", "displaced families", "rehabilitation package",
    ],
    "kw_compensation_dispute": [
        "compensation dispute", "compensation not paid", "compensation pending",
        "enhanced compensation", "compensation litigation", "compensation delay",
    ],
    "kw_row_utility_shift": [
        "right of way", "row issue", "utility shifting", "shifting of utilities",
        "power line shifting", "pipeline shifting", "cable shifting",
    ],
    "kw_contractor_agency": [
        "contractor issue", "agency delay", "contractor performance",
        "termination of contract", "poor performance of contractor",
        "contractor default",
    ],
    "kw_equipment_supply": [
        "equipment shortage", "supply delay", "material shortage",
        "non-availability of equipment", "equipment non-availability",
    ],
    "kw_funding_financial": [
        "fund constraint", "financial sanction", "non-release of funds",
        "budgetary constraint", "funds not released", "financial approval pending",
    ],
    "kw_monsoon_weather": [
        "monsoon", "heavy rain", "weather condition", "flood affected",
        "rainy season", "adverse weather",
    ],
    "kw_geological_technical": [
        "geological issue", "technical issue", "soil condition",
        "geotechnical", "design change", "geological survey",
    ],
    "kw_law_and_order": [
        "law and order", "agitation", "protest", "local unrest", "bandh",
        "public agitation",
    ],
    "kw_railway_line_issue": [
        "railway crossing", "railway line", "level crossing",
        "railway approval", "railway clearance",
    ],
    "kw_defence_land": [
        "defence land", "defence ministry", "military land", "cantonment",
        "defence clearance",
    ],
    "kw_admin_approval_delay": [
        "administrative approval", "approval pending", "sanction pending",
        "inter-departmental", "approval delay", "administrative sanction",
    ],
}

_COMPILED = {
    flag: re.compile("|".join(p.replace(" ", r"\s+") for p in phrases), re.IGNORECASE)
    for flag, phrases in KEYWORD_PATTERNS.items()
}


def extract_keyword_flags(text: str) -> dict:
    """Return {kw_flag_name: 0/1} for every known kw_* flag given free text."""
    text = (text or "").lower()
    return {flag: int(bool(pattern.search(text))) for flag, pattern in _COMPILED.items()}
