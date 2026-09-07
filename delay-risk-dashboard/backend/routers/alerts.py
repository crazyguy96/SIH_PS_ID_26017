from fastapi import APIRouter, Query
from data_repo import get_data_repo

router = APIRouter(prefix="/api/alerts", tags=["Early Warning Alerts"])

@router.get("")
def get_alerts(min_probability: float = Query(0.65, ge=0.0, le=1.0)):
    """
    In-app alert feed: any project in inference set whose predicted delay
    probability crosses 65% (High Risk threshold).
    Generates actionable alert card with project ID, sector, region,
    primary delay driver, severity, and cycle timestamp.
    """
    repo = get_data_repo()
    alerts = repo.get_alerts(min_prob=min_probability)
    return {
        "alert_count": len(alerts),
        "threshold_probability": min_probability,
        "alerts": alerts
    }
