from pydantic import BaseModel
from typing import Dict, Any


class HealthResponse(BaseModel):
    status: str
    version: str
    databaseConnected: bool
    pgvectorAvailable: bool
    faceRecognitionEngine: str
    activeEmbeddingsCount: int
