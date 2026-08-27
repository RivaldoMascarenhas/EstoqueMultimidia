from sqlalchemy import Column, String, DateTime, Boolean, Integer, func
from sqlalchemy.orm import relationship
from app.database import Base


class Event(Base):
    __tablename__ = "Event"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(String(1000), nullable=True)
    date = Column(DateTime(timezone=True), nullable=True)
    time = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    logoUrl = Column(String(500), nullable=True)
    coverUrl = Column(String(500), nullable=True)
    status = Column(String(50), default="DRAFT", nullable=False, index=True)
    primaryColor = Column(String(50), default="#002B49", nullable=False)
    secondaryColor = Column(String(50), default="#EAA023", nullable=False)
    allowRepeatWinners = Column(Boolean, default=False, nullable=False)
    maxParticipants = Column(Integer, nullable=True)
    presentationToken = Column(String(100), unique=True, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    participants = relationship("EventParticipant", back_populates="event", cascade="all, delete-orphan")
    presences = relationship("Presence", back_populates="event", cascade="all, delete-orphan")
