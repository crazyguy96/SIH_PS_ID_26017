"""
Aggregations for the QSPR dashboard's charts. Deliberately capped (top 8-10)
so nothing renders an overcrowded chart, and geography is state-level only -
no fabricated region/coordinate data (see qspr/router - no lat/lng here).
"""
from collections import defaultdict
from typing import Any, Dict, List


def summary(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not results:
        return {
            "projects_extracted": 0, "predictions_generated": 0,
            "high_risk_count": 0, "average_delay_probability_pct": 0.0,
        }
    probs = [r["delay_probability_pct"] for r in results]
    high_risk = sum(1 for p in probs if p >= 65.0)
    return {
        "projects_extracted": len(results),
        "predictions_generated": len(results),
        "high_risk_count": high_risk,
        "high_risk_pct": round(100.0 * high_risk / len(results), 1),
        "average_delay_probability_pct": round(sum(probs) / len(probs), 1),
    }


def _group_avg(results: List[Dict[str, Any]], key: str, top_n: int) -> List[Dict[str, Any]]:
    buckets: Dict[str, List[float]] = defaultdict(list)
    for r in results:
        label = (r.get(key) or "Unknown").strip() or "Unknown"
        buckets[label].append(r["delay_probability_pct"])

    rows = [
        {
            "label": label,
            "average_delay_probability_pct": round(sum(vals) / len(vals), 1),
            "project_count": len(vals),
        }
        for label, vals in buckets.items()
    ]
    rows.sort(key=lambda r: r["average_delay_probability_pct"], reverse=True)
    return rows[:top_n]


def by_sector(results: List[Dict[str, Any]], top_n: int = 10) -> List[Dict[str, Any]]:
    return _group_avg(results, "sector", top_n)


def by_state(results: List[Dict[str, Any]], top_n: int = 12) -> List[Dict[str, Any]]:
    return _group_avg(results, "state", top_n)


def risk_distribution(results: List[Dict[str, Any]]) -> Dict[str, int]:
    dist = {"High": 0, "Medium": 0, "Low": 0}
    for r in results:
        cat = r.get("risk_category", "Low")
        if cat in dist:
            dist[cat] += 1
    return dist
