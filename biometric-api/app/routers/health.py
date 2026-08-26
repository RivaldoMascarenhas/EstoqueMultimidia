from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.schemas.health import HealthResponse
from app.config import settings
from app.services.face_service import HAS_FACE_RECOGNITION

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    db_connected = False
    pgvector_available = False
    active_embeddings_count = 0

    try:
        db.execute(text("SELECT 1")).first()
        db_connected = True
    except Exception:
        db_connected = False

    if db_connected and "postgresql" in settings.DATABASE_URL:
        try:
            res = db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'")).first()
            pgvector_available = bool(res)
        except Exception:
            pgvector_available = False

    if db_connected:
        try:
            res = db.execute(text("SELECT count(*) FROM face_embeddings WHERE active = true")).first()
            if res:
                active_embeddings_count = int(res[0])
        except Exception:
            active_embeddings_count = 0

    return HealthResponse(
        status="healthy" if db_connected else "degraded",
        version=settings.VERSION,
        databaseConnected=db_connected,
        pgvectorAvailable=pgvector_available,
        faceRecognitionEngine="dlib_face_recognition" if HAS_FACE_RECOGNITION else "deterministic_fallback",
        activeEmbeddingsCount=active_embeddings_count,
    )
