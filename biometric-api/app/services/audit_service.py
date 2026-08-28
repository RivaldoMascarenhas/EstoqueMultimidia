import logging
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

logger = logging.getLogger("unifap.audit")


class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity: str,
        entity_id: Optional[str] = None,
        user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ):
        """
        Creates an audit record in the central AuditLog table.
        NOTE: Never log face images, frames or embeddings.
        """
        try:
            log_entry = AuditLog(
                id=str(uuid.uuid4()),
                userId=user_id,
                action=action,
                entity=entity,
                entityId=entity_id,
                details=details or {},
                ipAddress=ip_address,
                userAgent=user_agent,
            )
            db.add(log_entry)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception(f"Falha ao registrar log de auditoria para ação '{action}' em '{entity}'.")
