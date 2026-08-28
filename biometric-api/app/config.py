import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load .env from biometric-api directory or project root
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
local_env = Path(__file__).resolve().parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)
if local_env.exists():
    load_dotenv(local_env)


class Settings(BaseSettings):
    PROJECT_NAME: str = "UNIFAP Multimídia Biometric API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres@localhost:5432/estoque_multimidia",
    )

    # Security Token for internal microservice communication
    BIOMETRIC_INTERNAL_TOKEN: str = os.getenv(
        "BIOMETRIC_INTERNAL_TOKEN",
        "unifap_dev_biometric_token_only_for_local_development",
    )

    # Biometric Recognition Thresholds
    # In 128D Euclidean space, distance <= 0.60 is standard matching threshold
    FACE_DISTANCE_THRESHOLD: float = float(os.getenv("FACE_DISTANCE_THRESHOLD", "0.60"))
    MIN_CONFIDENCE_THRESHOLD: float = float(os.getenv("MIN_CONFIDENCE_THRESHOLD", "0.80"))

    # Operational settings
    STORE_CAPTURE_IMAGES: bool = os.getenv("STORE_CAPTURE_IMAGES", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        case_sensitive = True


settings = Settings()
