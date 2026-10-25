from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.core.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


def get_token_from_request(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> Optional[str]:
    # Check Bearer authorization header first
    if credentials and credentials.credentials:
        return credentials.credentials
    # Fall back to access_token cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        # If stored with Bearer prefix in cookie, strip it
        if cookie_token.startswith("Bearer "):
            return cookie_token[7:]
        return cookie_token
    return None


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(get_token_from_request),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user
