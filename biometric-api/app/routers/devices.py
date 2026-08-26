from typing import List, Optional
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import verify_internal_token
from app.models.device import Device

router = APIRouter(prefix="/devices", tags=["Devices"], dependencies=[Depends(verify_internal_token)])


class DeviceResponse(BaseModel):
    id: str
    identifier: str
    name: str
    location: Optional[str] = None
    status: str
    lastSeenAt: Optional[datetime] = None
    active: bool


@router.get("", response_model=List[DeviceResponse])
def list_devices(db: Session = Depends(get_db)):
    devices = db.query(Device).filter(Device.active == True).order_by(Device.name.asc()).all()
    return [
        DeviceResponse(
            id=d.id,
            identifier=d.identifier,
            name=d.name,
            location=d.location,
            status=d.status,
            lastSeenAt=d.lastSeenAt,
            active=d.active,
        )
        for d in devices
    ]


@router.post("", response_model=DeviceResponse)
def register_device(
    identifier: str = Form(...),
    name: str = Form(...),
    location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    existing = db.query(Device).filter(Device.identifier == identifier).first()
    if existing:
        existing.name = name
        existing.location = location
        existing.notes = notes
        existing.active = True
        db.commit()
        db.refresh(existing)
        return DeviceResponse(
            id=existing.id,
            identifier=existing.identifier,
            name=existing.name,
            location=existing.location,
            status=existing.status,
            lastSeenAt=existing.lastSeenAt,
            active=existing.active,
        )

    new_device = Device(
        id=str(uuid.uuid4()),
        identifier=identifier,
        name=name,
        location=location,
        notes=notes,
        status="ACTIVE",
        active=True,
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return DeviceResponse(
        id=new_device.id,
        identifier=new_device.identifier,
        name=new_device.name,
        location=new_device.location,
        status=new_device.status,
        lastSeenAt=new_device.lastSeenAt,
        active=new_device.active,
    )
