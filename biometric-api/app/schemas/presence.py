from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.schemas.face import PersonBasicInfo


class RecognizeResponse(BaseModel):
    success: bool
    status: str  # REGISTERED, ALREADY_REGISTERED, NOT_PARTICIPANT, NOT_RECOGNIZED, EVENT_NOT_OPEN, ERROR
    message: str
    person: Optional[PersonBasicInfo] = None
    confidence: Optional[float] = None
    distance: Optional[float] = None
    method: str = "FACE"
    capturedAt: Optional[datetime] = None


class PresenceRecordResponse(BaseModel):
    id: str
    eventId: str
    personId: str
    personName: str
    personRegistration: Optional[str] = None
    method: str
    confidence: Optional[float] = None
    distance: Optional[float] = None
    capturedAt: datetime
    deviceId: Optional[str] = None
    deviceName: Optional[str] = None
    status: str
