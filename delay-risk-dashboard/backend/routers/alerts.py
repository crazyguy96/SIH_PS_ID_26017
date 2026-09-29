from fastapi import APIRouter, Query
from data_repo import get_data_repo

router = APIRouter(
    prefix="/api/alerts",
    tags=["Early Warning Alerts"],
)


@router.get("")
def get_alerts(
    min_probability: float = Query(
        0.65,
        ge=0.0,
        le=1.0,
    )
):
    repo = get_data_repo()

    return repo.get_alerts(
        min_prob=min_probability
    )