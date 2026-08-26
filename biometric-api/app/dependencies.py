from fastapi import Header, HTTPException, status
from app.config import settings


def verify_internal_token(
    authorization: str = Header(None),
    x_internal_token: str = Header(None),
):
    """
    Ensures that only authorized internal calls from Next.js backend are accepted.
    Supports both Authorization: Bearer <token> and X-Internal-Token: <token>.
    """
    token = None
    if x_internal_token:
        token = x_internal_token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()

    if not token or token != settings.BIOMETRIC_INTERNAL_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Acesso não autorizado ao serviço biométrico interno.",
        )
    return True
