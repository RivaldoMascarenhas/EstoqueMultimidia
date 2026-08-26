from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base


class Presence(Base):
    __tablename__ = "presences"

    id = Column(String(50), primary_key=True, index=True)
    eventId = Column(String(50), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    personId = Column(String(50), ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, index=True)
    method = Column(String(20), default="FACE", nullable=False)  # FACE, MANUAL
    confidence = Column(Float, nullable=True)
    distance = Column(Float, nullable=True)
    capturedAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    deviceId = Column(String(50), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    operatorUserId = Column(String(50), nullable=True)
    status = Column(String(20), default="REGISTERED", nullable=False)  # REGISTERED, VALIDATED, REVOKED
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    event = relationship("Event", back_populates="presences")
    person = relationship("Person", back_populates="presences")
    device = relationship("Device", back_populates="presences")

    __table_args__ = (
        UniqueConstraint("eventId", "personId", name="uq_event_person_presence"),
    )
