from fastapi import APIRouter
from data_repo import get_data_repo

router = APIRouter(prefix="/api/overview", tags=["Executive Overview"])

@router.get("")
def get_overview():
    """
    Returns Executive Overview KPI cards:
    - Total projects monitored
    - % currently flagged high-risk
    - Average predicted delay probability
    - Count by label_confidence_tier
    - Bar chart of project count & delay rate by region_final
    - Bar chart of project count & delay rate by sector_extracted (top 10)
    - Chronological quarterly delay trend line
    """
    repo = get_data_repo()
    return repo.get_overview_kpis()
