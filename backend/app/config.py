import os
from json import JSONDecodeError
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Anti Curruption Monitoring System"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/anti_corruption_db")
    SQLITE_FALLBACK_URL: str = "sqlite:///./sql_app.db"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default_super_secret_key_change_in_production_2026")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    INITIAL_ADMIN_NAME: str = os.getenv("INITIAL_ADMIN_NAME", "System Administrator")
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "admin@transparency.gov")
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "Admin@SecurePass2026!")
    
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_MINUTES: int = 15

    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads")))

    # Public Web Domain / Base URL for QR Codes (Default ngrok URL for testing: https://company-frays-establish.ngrok-free.dev)
    PUBLIC_APP_URL: str = os.getenv("PUBLIC_APP_URL", os.getenv("PUBLIC_BASE_URL", "https://company-frays-establish.ngrok-free.dev"))
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "https://company-frays-establish.ngrok-free.dev")

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://company-frays-establish.ngrok-free.dev"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
