from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base


class EventParticipant(Base):
    __tablename__ = "EventParticipant"

    id = Column(String(50), primary_key=True, index=True)
    eventId = Column(String(50), ForeignKey("Event.id", ondelete="CASCADE"), nullable=False, index=True)
    personId = Column(String(50), ForeignKey("Person.id", ondelete="CASCADE"), nullable=False, index=True)
    ticketNumber = Column(Integer, nullable=False)
    category = Column(String(50), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    isEligible = Column(Boolean, default=True, nullable=False, index=True)
    isWinner = Column(Boolean, default=False, nullable=False)
    registeredAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    event = relationship("Event", back_populates="participants")
    person = relationship("Person", back_populates="participations")

    __table_args__ = (
        UniqueConstraint("eventId", "personId", name="uq_event_person_participant"),
        UniqueConstraint("eventId", "ticketNumber", name="uq_event_ticket_participant"),
    )
