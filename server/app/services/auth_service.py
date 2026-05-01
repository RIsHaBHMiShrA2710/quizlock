from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.repositories.user_repository import get_user_by_id, get_user_by_email, create_user
from app.core.security import hash_password, verify_password, create_access_token


def register_user(db: Session, email: str, password: str):
    existing = get_user_by_email(db, email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    hashed_password = hash_password(password)
    user = create_user(db, email, hashed_password)
    return user

def login_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}


