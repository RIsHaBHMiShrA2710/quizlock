from fastapi import Depends, APIRouter
from app.database import get_db
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import register_user, login_user
from app.core.dependencies import get_current_user
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model= UserResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    return register_user(db, email = payload.email, password = payload.password)

@router.post("/login", response_model= TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    return login_user(db, email = payload.email, password = payload.password)

@router.get("/me", response_model= UserResponse)
def read_current_user(current_user: UserResponse = Depends(get_current_user)):
    return current_user

