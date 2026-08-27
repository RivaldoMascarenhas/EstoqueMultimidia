from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False

from app.database import Base


class FaceEmbedding(Base):
    __tablename__ = "FaceEmbedding"

    id = Column(String(50), primary_key=True, index=True)
    personId = Column(String(50), ForeignKey("Person.id", ondelete="CASCADE"), nullable=False, index=True)
    
    if HAS_PGVECTOR:
        embedding = Column(Vector(128), nullable=False)
    else:
        embedding = Column(String, nullable=False)

    model = Column(String(50), default="dlib_face_recognition", nullable=False)
    active = Column(Boolean, default=True, nullable=False, index=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updatedAt = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    person = relationship("Person", back_populates="faceEmbeddings")
