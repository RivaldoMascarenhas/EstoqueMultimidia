from sqlalchemy import Column, String, Boolean, DateTime
from app.database import Base


class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, default="OPERADOR", nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, nullable=False)
    updatedAt = Column(DateTime, nullable=False)
