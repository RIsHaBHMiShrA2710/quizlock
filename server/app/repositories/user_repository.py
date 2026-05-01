from sqlalchemy.orm import Session
from app.models import user

def get_user_by_id(db: Session, user_id: int):
    return db.query(user.User).filter(user.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(user.User).filter(user.User.email == email).first()

def create_user(db: Session, email: str, hashed_password: str):
    db_user = user.User(email=email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user