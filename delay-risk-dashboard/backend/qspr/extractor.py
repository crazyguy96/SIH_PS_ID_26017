"""
QSPR/PAIMANA Flash Report extractor.

Reads Table 6 "All Ongoing Projects" from an official PAIMANA/QSPR Flash
Report PDF and returns one raw record per project, plus a list of
row-level extraction issues (never a hard failure for the whole document).

Design notes (see project README/plan for the full rationale — these were
worked out empirically against 4 real report PDFs spanning Jan/Mar/Apr/Jul
2026, not guessed):

- pdfplumber's own extract_tables() is used, but we never trust a fixed
  column position: header cells are matched by content, because the
  leading/trailing blank column offset varies page to page.
- A page can contain other tables that share superficial similarity
  (ministry-wise summary, "Major Projects" highlights) — these are
  excluded by requiring the header to contain "Project Name (Agency)"
  together with a "State" and "Physical Progress" column, which only
  Table 6's real per-project header has.
- Ministry/Sector are not columns; they appear as marker rows (only the
  "project name" column populated, everything else blank) that must be
  carried forward as running state across rows AND across page breaks.
- The "(Agency) (ProjectCode) (LegacyCode)" trailing groups in the project
  cell are parsed by POSITION, not by digit/letter pattern, because some
  ministries (e.g. Coal) use all-digit legacy codes that would otherwise
  collide with the project-code pattern. A "-" is a valid placeholder
  meaning "no code recorded here", and can appear more than once.
- Some reports repeat Table 6 in full (once "by region", once "by
  ministry" as the master list) — the same project_id then appears twice.
  We deduplicate by project_id, keeping the first occurrence, and record
  the rest as informational (non-fatal) issues.
"""
import re
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

import pdfplumber

MONTHS = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]


def clean_cell(c: Any) -> str:
    if c is None:
        return ""
    return re.sub(r"\s+", " ", str(c)).strip()


def find_header_col_map(header_row: List[Any]) -> Optional[Dict[str, Optional[int]]]:
    """Return a column-name -> index map if this row is Table 6's real
    per-project header, else None. Matched by content, not position."""
    cells = [clean_cell(c) for c in header_row]
    lower = [c.lower() for c in cells]

    def find_idx(*needles: str) -> Optional[int]:
        for i, c in enumerate(lower):
            if all(n in c for n in needles):
                return i
        return None

    idx_project = find_idx("project name", "agency")
    idx_state = None
    for i, c in enumerate(cells):
        if c.lower() == "state":
            idx_state = i
            break
    idx_progress = find_idx("physical progress")
    idx_slno = None
    for i, c in enumerate(cells):
        if c == "Sl.No":
            idx_slno = i
            break

    # These three signals together are unique to Table 6's per-project
    # header; the ministry-wise summary and "Major Projects" tables each
    # fail at least one of them.
    if idx_project is None or idx_state is None or idx_progress is None or idx_slno is None:
        return None

    idx_approval = find_idx("date of approval")
    idx_doc = find_idx("orignal/target") or find_idx("original/target")
    idx_cost = None
    for i, c in enumerate(lower):
        if ("orignal cost" in c or "original cost" in c) and "revised cost" in c:
            idx_cost = i
            break
    idx_cumulative = find_idx("cumulative")

    return {
        "sl_no": idx_slno,
        "project": idx_project,
        "state": idx_state,
        "approval": idx_approval,
        "doc": idx_doc,
        "cost": idx_cost,
        "cumulative": idx_cumulative,
        "progress": idx_progress,
    }


def parse_paren_pair(cell: Any) -> Tuple[Optional[str], Optional[str]]:
    """'05/2021\\n(05/2021)' or '412.3\\n(577)' -> (first, second-in-parens).
    Also tolerates single-line rendering '05/2021 (05/2021)'."""
    if cell is None:
        return None, None
    raw = str(cell)
    lines = [l.strip() for l in raw.split("\n") if l.strip() != ""]
    if len(lines) >= 2:
        first, second_line = lines[0], lines[1]
    else:
        # single-line rendering: split on the first '(' that starts the
        # parenthesized second value
        m = re.match(r"^(.*?)\s*(\(.*\))\s*$", raw.strip())
        if m:
            first, second_line = m.group(1).strip(), m.group(2).strip()
        else:
            first, second_line = (lines[0] if lines else None), None

    def norm(v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if v.startswith("(") and v.endswith(")"):
            v = v[1:-1].strip()
        if v in ("-", "--", "", "N/A", "NA"):
            return None
        return v

    return norm(first), norm(second_line)


def parse_project_cell(cell: Any) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """Extract (project_name, agency, project_code, legacy_project_id).

    Trailing parenthetical groups are peeled right-to-left as long as they
    are "code slots" - a single token (no internal whitespace) containing
    at least one digit, or a "-"/"" placeholder. The slot closest to the
    agency (last one peeled) is always the official project code; any
    earlier slot is a legacy/other code. This is positional rather than
    pattern-based because legacy codes are sometimes all-digit too.
    """
    if cell is None:
        return None, None, None, None
    text = re.sub(r"\s+", " ", str(cell).replace("\n", " ")).strip()
    if not text:
        return None, None, None, None

    code_slots: List[str] = []
    while True:
        m = re.search(r"\(([^()]{0,120})\)\s*$", text)
        if not m:
            break
        content = m.group(1).strip()
        is_code_like = content in ("", "-", "--") or (
            " " not in content and len(content) <= 20 and re.search(r"\d", content)
        )
        if not is_code_like:
            break
        code_slots.append(content)
        text = text[: m.start()].strip()

    project_code = None
    legacy_id = None
    if code_slots:
        last = code_slots[-1]
        if last not in ("-", "--", ""):
            project_code = last
        for earlier in code_slots[:-1]:
            if earlier not in ("-", "--", ""):
                legacy_id = earlier
                break

    agency = None
    m3 = re.search(r"\(([^()]{1,160})\)\s*$", text)
    if m3:
        agency = m3.group(1).strip()
        text = text[: m3.start()].strip()

    project_name = text.strip(" -") or None
    return project_name, agency, project_code, legacy_id

def _release(page) -> None:
    """Release pdfplumber's cached page objects after processing."""
    try:
        page.flush_cache()
    except Exception:
        pass


def extract_report_label(pdf: "pdfplumber.PDF") -> Optional[str]:
    """Detect the report's month/year from the PDF's own content (never
    from the filename). Returns e.g. 'July 2026', or None if undetectable."""
    counter: Counter = Counter()
    for page in pdf.pages[:200]:
      text = page.extract_text() or ""
      for m in re.finditer(
          r"\b(" + "|".join(MONTHS) + r")\s+(\d{4})\b",
          text.upper()
      ):
          counter[(m.group(1), m.group(2))] += 1

      _release(page)
    if not counter:
        return None
    (month, year), _count = counter.most_common(1)[0]
    return f"{month.title()} {year}"


def extract_all_projects(path: str) -> Tuple[Optional[str], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Parse an official PAIMANA/QSPR Flash Report PDF.

    Returns (report_label, records, issues). `records` are raw extracted
    project rows (not yet feature-engineered). `issues` never causes the
    whole extraction to fail - one bad row is recorded and skipped.
    """
    records: List[Dict[str, Any]] = []
    issues: List[Dict[str, Any]] = []
    current_ministry: Optional[str] = None
    current_sector: Optional[str] = None
    seen_codes_this_report: Dict[str, int] = {}

    with pdfplumber.open(path) as pdf:
        report_label = extract_report_label(pdf)

        for page_idx, page in enumerate(pdf.pages):
            page_no = page_idx + 1
            try:
                tables = page.extract_tables()
            except Exception as exc:  # pragma: no cover - defensive
                issues.append({
                    "stage": "extraction", "page": page_no,
                    "project_id": None, "project_name": None,
                    "reason": f"Could not read tables on this page: {exc}",
                })
                _release(page)
                continue

            for table in tables:
                header_row_idx = None
                col_map = None
                for ridx, row in enumerate(table):
                    cm = find_header_col_map(row)
                    if cm:
                        header_row_idx, col_map = ridx, cm
                        break
                if col_map is None:
                    continue  # not a Table 6 slice on this table

                for row in table[header_row_idx + 1:]:
                    def cell_at(key: str):
                        idx = col_map.get(key)
                        return row[idx] if idx is not None and idx < len(row) else None

                    sl_no_cell = clean_cell(cell_at("sl_no"))
                    project_cell = cell_at("project")
                    state_cell_raw = cell_at("state")
                    progress_cell_raw = cell_at("progress")

                    # Ministry/Sector marker row: sl_no + state + progress
                    # all blank, only the project-name column has text.
                    if (sl_no_cell == "" and project_cell
                            and clean_cell(state_cell_raw) == ""
                            and clean_cell(progress_cell_raw) == ""):
                        text = clean_cell(project_cell)
                        if text:
                            if text.lower().startswith(("ministry of", "department")):
                                current_ministry = text
                            else:
                                current_sector = text
                        continue

                    if sl_no_cell.lower().startswith("total"):
                        continue
                    if not re.match(r"^\d+$", sl_no_cell):
                        continue  # neither a data row nor a marker row

                    try:
                        project_name, agency, project_code, legacy_id = parse_project_cell(project_cell)

                        if not project_code:
                            issues.append({
                                "stage": "extraction", "page": page_no,
                                "project_id": None, "project_name": project_name,
                                "reason": "Could not identify a project code for this row",
                            })
                            continue

                        if project_code in seen_codes_this_report:
                            issues.append({
                                "stage": "extraction", "page": page_no,
                                "project_id": project_code, "project_name": project_name,
                                "reason": (
                                    f"Duplicate project code also seen on page "
                                    f"{seen_codes_this_report[project_code]}; "
                                    f"keeping first occurrence (reports often list "
                                    f"projects once by region and again nationally)"
                                ),
                            })
                            continue
                        seen_codes_this_report[project_code] = page_no

                        approval_date, revised_approval_date = parse_paren_pair(cell_at("approval"))
                        original_completion_date, revised_completion_date = parse_paren_pair(cell_at("doc"))
                        original_cost_raw, revised_cost_raw = parse_paren_pair(cell_at("cost"))

                        records.append({
                            "project_id": project_code,
                            "legacy_project_id": legacy_id,
                            "project_name": project_name,
                            "agency": agency,
                            "ministry": current_ministry,
                            "sector": current_sector,
                            "state_raw": clean_cell(state_cell_raw) or None,
                            "approval_date": approval_date,
                            "revised_approval_date": revised_approval_date,
                            "original_completion_date": original_completion_date,
                            "revised_completion_date": revised_completion_date,
                            "original_cost_raw": original_cost_raw,
                            "revised_cost_raw": revised_cost_raw,
                            "cumulative_expenditure_raw": clean_cell(cell_at("cumulative")) or None,
                            "physical_progress_raw": clean_cell(progress_cell_raw) or None,
                            "source_page": page_no,
                        })
                    except Exception as exc:  # pragma: no cover - defensive
                        issues.append({
                            "stage": "extraction", "page": page_no,
                            "project_id": None, "project_name": None,
                            "reason": f"Unexpected error parsing this row: {exc}",
                        })
            _release(page)    
    return report_label, records, issues
