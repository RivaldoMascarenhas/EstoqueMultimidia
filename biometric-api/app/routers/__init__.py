from app.routers.health import router as health_router
from app.routers.face import router as face_router
from app.routers.devices import router as devices_router

__all__ = [
    "health_router",
    "face_router",
    "devices_router",
]
