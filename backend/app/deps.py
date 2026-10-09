from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Admin, User, Contractor
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception
        
    user_id = payload.get("sub")
    user_type = payload.get("user_type", "admin")

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise credentials_exception

    if user_type == "contractor":
        user = db.query(User).filter(User.id == user_id_int, User.user_type == "contractor").first()
    else:
        # Check Admin table first, then User table with admin user_type
        user = db.query(Admin).filter(Admin.id == user_id_int).first()
        if not user:
            user = db.query(User).filter(User.id == user_id_int, User.user_type == "admin").first()

    if not user:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled or inactive. Contact system administrator."
        )
        
    return user

def get_current_admin(
    current_user = Depends(get_current_user)
):
    role = getattr(current_user, "role", None)
    user_type = getattr(current_user, "user_type", "admin")
    
    if role not in ["super_admin", "admin"] and user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized administrators only."
        )
    return current_user

def get_current_contractor(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> Contractor:
    user_type = getattr(current_user, "user_type", None)
    if user_type != "contractor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to authorized contractors only."
        )

    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contractor profile not found."
        )

    if contractor.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contractor profile is not active. Login denied until admin activation."
        )

    return contractor
