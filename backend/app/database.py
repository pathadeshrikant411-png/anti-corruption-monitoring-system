import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try PostgreSQL first, fallback to SQLite if connection fails
database_url = settings.DATABASE_URL
connect_args = {}

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    if database_url.startswith("postgresql"):
        # Test creating postgresql engine
        engine = create_engine(database_url, pool_pre_ping=True)
        # Verify connection capability
        with engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL database.")
    else:
        engine = create_engine(database_url, connect_args=connect_args)
except Exception as e:
    logger.warning(f"Failed to connect to PostgreSQL ({e}). Falling back to local SQLite database.")
    database_url = settings.SQLITE_FALLBACK_URL
    engine = create_engine(database_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
