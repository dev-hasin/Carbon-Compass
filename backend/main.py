import os
import sys
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend dir is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import get_settings
from app.api.v1.routes import router as v1_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("carbon-compass")

app = FastAPI(
    title="Carbon Compass API",
    description=(
        "AI-powered supply chain sustainability risk platform. "
        "Self-check environmental compliance risk using public satellite data, "
        "ESG disclosures, and activity proxies."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router)


@app.get("/")
async def root():
    return {
        "app": "Carbon Compass",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
