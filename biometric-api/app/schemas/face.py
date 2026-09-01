from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class FaceEnrollResponse(BaseModel):
    success: bool
    message: str
    personId: str
    embeddingId: Optional[str] = None
    model: str = "dlib_face_recognition"
    updatedAt: datetime


class PersonBasicInfo(BaseModel):
    id: str
    name: str
    registration: Optional[str] = None
    category: Optional[str] = None


class BiometricTestResponse(BaseModel):
    success: bool
    status: str  # MATCH, NO_MATCH, NO_FACE_DETECTED, ERROR
    matchedPerson: Optional[PersonBasicInfo] = None
    confidence: Optional[float] = None
    similarityScore: Optional[float] = None
    matchScore: Optional[float] = None
    distance: Optional[float] = None
    isApproved: bool = False
    message: str
    evaluatedAt: datetime = datetime.now()


class FaceDeleteResponse(BaseModel):
    success: bool
    message: str
    personId: str
