from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from auth import (
    LoginRequest, LoginResponse, User, USERS_DB,
    create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    username = req.username.strip().lower()
    if username not in USERS_DB:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    user_data = USERS_DB[username]
    if user_data["password"] != req.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    token = create_access_token({"sub": username, "role": user_data["role"]})
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=User(**user_data)
    )

@router.get("/me", response_model=User)
def get_me(user: User = Depends(get_current_user)):
    return user
