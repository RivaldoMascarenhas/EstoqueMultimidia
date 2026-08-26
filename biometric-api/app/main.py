from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import ensure_pgvector_extension
from app.routers import health_router, face_router, devices_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Serviço especializado de extração de embeddings e reconhecimento biométrico facial com pgvector para a UNIFAP Multimídia.",
)

# Restrict CORS to internal communication / configured hostnames
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://app:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    ensure_pgvector_extension()


# Include routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(face_router, prefix=settings.API_V1_STR)
app.include_router(devices_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
    }
