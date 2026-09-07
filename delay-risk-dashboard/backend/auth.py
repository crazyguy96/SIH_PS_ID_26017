import datetime
import jwt
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from pydantic import BaseModel

SECRET_KEY = "sih26017-land-acquisition-secret-key-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Pre-seeded users for demonstration & role evaluation
USERS_DB = {
    "admin": {
        "username": "admin",
        "password": "adminpassword",
        "name": "System Administrator",
        "role": "admin",
        "region": "All",
        "department": "Infrastructure Oversight Directorate"
    },
    "policymaker": {
        "username": "policymaker",
        "password": "policypassword",
        "name": "Policy Analyst (MoRD)",
        "role": "policymaker",
        "region": "All",
        "department": "Ministry of Rural Development"
    },
    "project_manager": {
        "username": "project_manager",
        "password": "pmpassword",
        "name": "Project Manager (North Zone)",
        "role": "project_manager",
        "region": "North",
        "department": "National Infrastructure Pipeline Execution"
    }
}

class User(BaseModel):
    username: str
    name: str
    role: str
    region: str
    department: str

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) + (
        expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[User]:
    if not authorization:
        return None
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    payload = decode_access_token(token)
    if not payload:
        return None
    username = payload.get("sub")
    if username in USERS_DB:
        u = USERS_DB[username]
        return User(**u)
    return None

def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_role(allowed_roles: List[str]):
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: role '{user.role}' is not authorized for this resource (requires: {allowed_roles})"
            )
        return user
    return role_checker
