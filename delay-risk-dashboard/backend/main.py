"""
SIH PS 26017: Predictive Analytics System for Early Detection of Land Acquisition Delays
FastAPI Backend Application
Smart India Hackathon 2026 — Ministry of Rural Development
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import (
    auth, overview, projects, predict,
    regional, alerts, model_meta
)

app = FastAPI(
    title="SIH26017 Land Acquisition Delay Risk API",
    description=(
        "Production-grade Decision Support API for policymakers and project administrators. "
        "Provides real-time early warning delay predictions, local SHAP explainability, "
        "government narrative correlation, and auditable policy interventions."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(overview.router)
app.include_router(projects.router)
app.include_router(predict.router)
app.include_router(regional.router)
app.include_router(alerts.router)
app.include_router(model_meta.router)


@app.get("/", tags=["Health & Status"])
def root():
    return {
        "system": "SIH26017 Land Acquisition Delay Risk Analytics System",
        "status": "operational",
        "version": "2.0.0",
        "model": "LightGBM Classifier + TreeSHAP Explainer",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health & Status"])
def health():
    return {
        "status": "healthy",
        "service": "backend-api",
        "dataset_loaded": True
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
