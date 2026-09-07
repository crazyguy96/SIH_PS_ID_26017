from fastapi import APIRouter, HTTPException, Query, Depends, Header
from typing import Optional
from data_repo import get_data_repo
from auth import get_current_user_optional, User

router = APIRouter(prefix="/api/projects", tags=["Risk Scoring & Project Register"])

@router.get("")
def get_projects(
    region: Optional[str] = Query(None, description="Filter by region_final"),
    sector: Optional[str] = Query(None, description="Filter by sector_extracted"),
    risk: Optional[str] = Query(None, description="Filter by risk category: Low, Medium, High"),
    confidence_tier: Optional[str] = Query(None, description="Filter by label_confidence_tier"),
    search: Optional[str] = Query(None, description="Search project ID, sector, region"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    sort_by: str = Query("predicted_delay_probability"),
    sort_order: str = Query("desc"),
    user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Sortable and filterable table of projects from infra_projects_inference_unlabeled.csv.
    Each row includes: project_id, sector, region, predicted delay probability (0-100%),
    computed risk category (Low <35 / Medium 35-65 / High >65), and top contributing drivers.
    Project managers have results scoped to their assigned region/sector if specified.
    """
    repo = get_data_repo()

    # Apply role scoping for project managers
    effective_region = region
    if user and user.role == "project_manager" and user.region and user.region != "All":
        if not region or region == "All":
            effective_region = user.region

    return repo.get_projects(
        region=effective_region,
        sector=sector,
        risk=risk,
        confidence_tier=confidence_tier,
        search=search,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.get("/{project_id}")
def get_project_detail(
    project_id: str,
    user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Returns full feature snapshot, real SHAP feature contribution breakdown,
    matched quarterly narrative from infra_projects_narratives.csv with keyword highlights,
    auditable recommended actions, and segregated audit records.
    Policymaker role is restricted to avoid over-indexing on single anecdotes.
    """
    if user and user.role == "policymaker":
        raise HTTPException(
            status_code=403,
            detail="Policymaker role is restricted from project-level narrative drill-down to maintain aggregate focus. Use Regional Analytics instead."
        )

    repo = get_data_repo()
    detail = repo.get_project_detail(project_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found in inference register")
    return detail
