from fastapi import FastAPI
from app.routes import auth, quiz
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import user

# Initialize DB tables
user.Base.metadata.create_all(bind=engine)

app = FastAPI(title="QuizLock API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(quiz.router)
