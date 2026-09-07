from fastapi import APIRouter
from data_repo import get_data_repo

router = APIRouter(prefix="/api/regional", tags=["Regional & Comparative Analytics"])

@router.get("")
def get_regional_summary():
    """
    Returns complete Regional & Comparative Analytics payload:
    - Map bubbles (regional centroids, project counts, avg risk, high risk count)
    - Sector x Region comparative heatmap matrix
    - Quarterly physical progress & land acquisition progress timeline
    - GIS data governance disclaimer
    """
    repo = get_data_repo()
    return repo.get_regional_analytics()
