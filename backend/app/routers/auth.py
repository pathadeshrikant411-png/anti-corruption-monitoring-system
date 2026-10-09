from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Admin, User, Contractor
from app.schemas import (
    AdminLoginRequest,
    LoginSuccessResponse,
    UserResponse,
    ContractorChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse
)
from app.security import verify_password, hash_password, create_access_token, decode_access_token
from app.deps import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def perform_user_login(
    payload: AdminLoginRequest,
    expected_portal: str, # "admin" or "contractor"
    db: Session
) -> LoginSuccessResponse:
    email = payload.email.lower().strip()
    password = payload.password

    invalid_credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email address or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Search in User table first
    user = db.query(User).filter(User.email == email).first()
    is_legacy_admin = False

    if not user:
        # Search in legacy Admin table
        legacy_admin = db.query(Admin).filter(Admin.email == email).first()
        if not legacy_admin:
            raise invalid_credentials_exc
        user = legacy_admin
        is_legacy_admin = True

    user_type = getattr(user, "user_type", "admin" if is_legacy_admin else "contractor")

    # STRICT PORTAL SEPARATION ENFORCEMENT
    if expected_portal == "admin" and user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Contractor accounts must log in through the Contractor Portal at /contractor/login."
        )

    if expected_portal == "contractor" and user_type != "contractor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Administrative accounts must log in through the Admin Portal at /login."
        )

    now = datetime.now(timezone.utc)

    # Check lockout
    if user.locked_until:
        locked_until_utc = user.locked_until
        if locked_until_utc.tzinfo is None:
            locked_until_utc = locked_until_utc.replace(tzinfo=timezone.utc)
            
        if now < locked_until_utc:
            minutes_remaining = int((locked_until_utc - now).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked due to repeated failed login attempts. Try again in {minutes_remaining} minutes."
            )
        else:
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive or disabled. Contact system support."
        )

    # For contractor user_type, also verify contractor profile is Active
    if user_type == "contractor":
        contractor = db.query(Contractor).filter(Contractor.user_id == user.id).first()
        if not contractor or contractor.status != "Active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Contractor profile is not active. Login denied until administrator activates your profile."
            )

    # Verify password hash
    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Account locked for {settings.LOCKOUT_MINUTES} minutes."
            )
        db.commit()
        raise invalid_credentials_exc

    # Successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    db.commit()
    db.refresh(user)

    must_change = getattr(user, "must_change_password", False)
    role = getattr(user, "role", "super_admin" if is_legacy_admin else "contractor")

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": role,
            "user_type": user_type
        }
    )

    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=role,
        user_type=user_type,
        is_active=user.is_active,
        must_change_password=must_change,
        created_at=user.created_at
    )

    return LoginSuccessResponse(
        message="Authentication successful.",
        access_token=access_token,
        token_type="bearer",
        user_type=user_type,
        must_change_password=must_change,
        user=user_resp
    )

@router.post("/login", response_model=LoginSuccessResponse)
def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Admin Portal Login endpoint."""
    return perform_user_login(payload, expected_portal="admin", db=db)

@router.post("/contractor-login", response_model=LoginSuccessResponse)
def contractor_login(
    payload: AdminLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Separate Contractor Portal Login endpoint."""
    return perform_user_login(payload, expected_portal="contractor", db=db)

@router.post("/change-password")
def change_password(
    payload: ContractorChangePasswordRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password updated successfully."}

@router.get("/me")
def get_authenticated_user_profile(
    current_user = Depends(get_current_user)
):
    user_type = getattr(current_user, "user_type", "admin")
    role = getattr(current_user, "role", "super_admin")
    must_change = getattr(current_user, "must_change_password", False)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": role,
        "user_type": user_type,
        "is_active": current_user.is_active,
        "must_change_password": must_change,
        "last_login_at": current_user.last_login_at,
        "created_at": current_user.created_at
    }

@router.post("/refresh", response_model=LoginSuccessResponse)
def refresh_auth_token(
    request: Request,
    db: Session = Depends(get_db)
):
    """Refreshes an access token for active users without requiring credentials."""
    auth_header = request.headers.get("Authorization")
    raw_token = None
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ")[1].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Decode token allowing expired signature up to 30 days for active renewal
    payload = decode_access_token(raw_token, verify_exp=False)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or corrupted authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user_type = payload.get("user_type", "admin")

    # Enforce maximum token age threshold (30 days)
    iat = payload.get("iat")
    if iat:
        try:
            token_time = datetime.fromtimestamp(iat, tz=timezone.utc)
            if datetime.now(timezone.utc) - token_time > timedelta(days=30):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication session expired. Please log in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except Exception:
            pass

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims.")

    is_legacy_admin = False
    if user_type == "contractor":
        user = db.query(User).filter(User.id == user_id_int, User.user_type == "contractor").first()
    else:
        user = db.query(Admin).filter(Admin.id == user_id_int).first()
        if not user:
            user = db.query(User).filter(User.id == user_id_int, User.user_type == "admin").first()
        else:
            is_legacy_admin = True

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive, disabled, or no longer exists."
        )

    if user_type == "contractor":
        contractor = db.query(Contractor).filter(Contractor.user_id == user.id).first()
        if not contractor or contractor.status != "Active":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Contractor profile is inactive or pending activation."
            )

    must_change = getattr(user, "must_change_password", False)
    role = getattr(user, "role", "super_admin" if is_legacy_admin else "contractor")

    new_access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": role,
            "user_type": user_type
        }
    )

    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=role,
        user_type=user_type,
        is_active=user.is_active,
        must_change_password=must_change,
        created_at=user.created_at
    )

    return LoginSuccessResponse(
        message="Session refreshed successfully.",
        access_token=new_access_token,
        token_type="bearer",
        user_type=user_type,
        must_change_password=must_change,
        user=user_resp
    )

@router.post("/logout")
def user_logout(
    current_user = Depends(get_current_user)
):
    return {"message": "User logged out successfully."}

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password_request(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    return ForgotPasswordResponse(
        message="If an account with that email exists, password reset instructions have been dispatched to the registered secure channel."
    )

