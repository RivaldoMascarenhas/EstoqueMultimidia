from typing import Optional
from fastapi import APIRouter, Depends, File, Form, UploadFile, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import verify_internal_token
from app.schemas.face import FaceEnrollResponse, BiometricTestResponse, FaceDeleteResponse
from app.schemas.presence import RecognizeResponse
from app.services.recognition_service import RecognitionService
from app.models.face_embedding import FaceEmbedding
from app.models.person import Person
from app.services.audit_service import AuditService

router = APIRouter(prefix="/face", tags=["Biometrics"])


@router.post("/enroll", response_model=FaceEnrollResponse, dependencies=[Depends(verify_internal_token)])
async def enroll_face(
    personId: str = Form(...),
    isCrop: bool = Form(True),
    operatorUserId: Optional[str] = Form(None),
    image: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Enrolls or replaces facial biometrics for a specific Person."""
    image_bytes = await image.read()
    if not image_bytes or len(image_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo de imagem vazio ou inválido.",
        )

    ip = request.client.host if request and request.client else None

    embedding_id, updated_at = RecognitionService.enroll_person_face(
        db=db,
        person_id=personId,
        image_bytes=image_bytes,
        is_crop=isCrop,
        operator_user_id=operatorUserId,
        ip=ip,
    )

    return FaceEnrollResponse(
        success=True,
        message="Biometria facial cadastrada com sucesso.",
        personId=personId,
        embeddingId=embedding_id,
        updatedAt=updated_at,
    )


@router.post("/recognize", response_model=RecognizeResponse, dependencies=[Depends(verify_internal_token)])
async def recognize_face(
    eventId: str = Form(...),
    deviceIdentifier: Optional[str] = Form(None),
    operatorUserId: Optional[str] = Form(None),
    crop: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    Recognizes face crop from client-side MediaPipe, verifies active participation in event,
    and registers attendance presence with concurrency and duplication protection.
    """
    crop_bytes = await crop.read()
    if not crop_bytes or len(crop_bytes) < 100:
        return RecognizeResponse(
            success=False,
            status="ERROR",
            message="Arquivo de recorte facial inválido.",
        )

    ip = request.client.host if request and request.client else None

    return RecognitionService.recognize_and_register(
        db=db,
        event_id=eventId,
        crop_bytes=crop_bytes,
        device_identifier=deviceIdentifier,
        operator_user_id=operatorUserId,
        ip=ip,
    )


@router.post("/test", response_model=BiometricTestResponse, dependencies=[Depends(verify_internal_token)])
async def test_biometrics(
    targetPersonId: Optional[str] = Form(None),
    crop: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Performs 1:1 or 1:N biometric validation for testing purposes.
    NEVER registers attendance presence.
    """
    crop_bytes = await crop.read()
    if not crop_bytes or len(crop_bytes) < 100:
        return BiometricTestResponse(
            success=False,
            status="ERROR",
            message="Arquivo de recorte facial inválido.",
        )

    return RecognitionService.test_biometrics(
        db=db,
        crop_bytes=crop_bytes,
        target_person_id=targetPersonId,
    )


@router.post("/delete", response_model=FaceDeleteResponse, dependencies=[Depends(verify_internal_token)])
def delete_face(
    personId: str = Form(...),
    operatorUserId: Optional[str] = Form(None),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Deactivates facial biometrics for a Person."""
    person = db.query(Person).filter(Person.id == personId).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada.")

    count = db.query(FaceEmbedding).filter(
        FaceEmbedding.personId == personId,
        FaceEmbedding.active == True,
    ).update({"active": False})

    db.commit()

    ip = request.client.host if request and request.client else None
    AuditService.log(
        db=db,
        action="FACE_DELETE",
        entity="Person",
        entity_id=personId,
        user_id=operatorUserId,
        ip_address=ip,
        details={"person_name": person.name, "deactivated_count": count},
    )

    return FaceDeleteResponse(
        success=True,
        message="Biometria facial desativada com sucesso.",
        personId=personId,
    )
