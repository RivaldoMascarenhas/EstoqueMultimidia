from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Device(Base):
    __tablename__ = "Device"

    id = Column(String(50), primary_key=True, index=True)
    identifier = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    lastSeenAt = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String(500), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    presences = relationship("Presence", back_populates="device")
