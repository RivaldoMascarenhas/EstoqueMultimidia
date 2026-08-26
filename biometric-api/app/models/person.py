from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Person(Base):
    __tablename__ = "persons"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    cpf = Column(String(50), unique=True, index=True, nullable=True)
    registration = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(255), index=True, nullable=True)
    phone = Column(String(50), nullable=True)
    photoUrl = Column(String(500), nullable=True)
    category = Column(String(50), nullable=True)
    active = Column(Boolean, default=True, nullable=False, index=True)
    notes = Column(String(1000), nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    faceEmbeddings = relationship("FaceEmbedding", back_populates="person", cascade="all, delete-orphan")
    participations = relationship("EventParticipant", back_populates="person", cascade="all, delete-orphan")
    presences = relationship("Presence", back_populates="person", cascade="all, delete-orphan")
