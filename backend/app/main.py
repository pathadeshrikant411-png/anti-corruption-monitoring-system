import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database import engine, Base
from app.seed import seed_initial_admin
from app.routers import auth, contractors, contractor_portal, public

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Running initial admin seed...")
    seed_initial_admin()
    yield
    # Shutdown actions
    logger.info("Application shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Anti Curruption Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(500)
async def internal_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Internal Server Error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."}
    )

# Include Routers
app.include_router(auth.router)
app.include_router(contractors.router)
app.include_router(contractor_portal.router)
app.include_router(public.router)

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "module": "Admin & Contractor Transparency Subsystem",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
