from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from data_repo import get_data_repo
from auth import get_current_user_optional, User

router = APIRouter(prefix="/api/model", tags=["Model Governance & ML Metadata"])

@router.get("/metadata")
def get_model_metadata(user: Optional[User] = Depends(get_current_user_optional)):
    """
    Model Governance and evaluation metrics:
    - Model version and algorithm
    - Training methodology & project-level split rules
    - Exclusion of proxy/leakage columns
    - Validation metrics on held-out test set (Precision, Recall, F1, ROC-AUC, PR-AUC)
    - 2x2 Confusion matrix
    - Engineered feature schema
    - Admin-only access rule
    """
    if user and user.role not in ["admin"]:
        raise HTTPException(
            status_code=403,
            detail="Access restricted: Model Metadata is accessible by System Administrators only."
        )

    repo = get_data_repo()
    return repo.get_model_metadata()
