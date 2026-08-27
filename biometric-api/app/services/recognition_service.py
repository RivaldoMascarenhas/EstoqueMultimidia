import uuid
from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import numpy as np

from app.models.event import Event
from app.models.event_participant import EventParticipant
from app.models.presence import Presence
from app.models.person import Person
from app.models.face_embedding import FaceEmbedding
from app.models.device import Device
from app.schemas.presence import RecognizeResponse
from app.schemas.face import BiometricTestResponse, PersonBasicInfo
from app.services.face_service import FaceService
from app.services.audit_service import AuditService
from app.config import settings


class RecognitionService:
    @staticmethod
    def distance_to_confidence(distance: float) -> float:
        """
        Converts Euclidean distance of 128D embeddings into a confidence percentage.
        Distance 0.00 -> 100% (1.00)
        Distance 0.20 -> 91% (0.91)
        Distance 0.45 -> 80% (0.80)
        Distance 0.60 -> 74% (0.74)
        """
        return float(round(max(0.0, min(1.0, 1.0 - (distance * 0.44))), 4))

    @classmethod
    def enroll_person_face(
        cls,
        db: Session,
        person_id: str,
        image_bytes: bytes,
        is_crop: bool = True,
        operator_user_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> Tuple[str, datetime]:
        # 1. Verify Person exists and is active
        person = db.query(Person).filter(Person.id == person_id).first()
        if not person:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada.")

        # 2. Extract 128D embedding
        if is_crop:
            embedding = FaceService.extract_crop_face_encoding(image_bytes)
        else:
            embedding = FaceService.extract_single_face_encoding(image_bytes)

        now = datetime.now(timezone.utc)
        embedding_id = str(uuid.uuid4())

        # 3. Deactivate previous active embeddings for this person
        db.query(FaceEmbedding).filter(
            FaceEmbedding.personId == person_id,
            FaceEmbedding.active == True,
        ).update({"active": False})

        # 4. Insert new embedding (using raw SQL for pgvector format)
        vec_str = "[" + ",".join(str(x) for x in embedding) + "]"
        is_postgres = "postgresql" in settings.DATABASE_URL

        if is_postgres:
            insert_sql = text("""
                INSERT INTO "FaceEmbedding" (id, "personId", embedding, model, active, "createdAt", "updatedAt")
                VALUES (:id, :person_id, (:vec)::vector, 'dlib_face_recognition', true, :now, :now);
            """)
            db.execute(insert_sql, {
                "id": embedding_id,
                "person_id": person_id,
                "vec": vec_str,
                "now": now,
            })
        else:
            new_emb = FaceEmbedding(
                id=embedding_id,
                personId=person_id,
                embedding=vec_str,
                model="dlib_face_recognition",
                active=True,
                createdAt=now,
                updatedAt=now,
            )
            db.add(new_emb)

        db.commit()

        AuditService.log(
            db=db,
            action="FACE_ENROLL",
            entity="Person",
            entity_id=person_id,
            user_id=operator_user_id,
            ip_address=ip,
            details={
                "person_name": person.name,
                "registration": person.registration,
                "embedding_id": embedding_id,
            },
        )

        return embedding_id, now

    @classmethod
    def recognize_and_register(
        cls,
        db: Session,
        event_id: str,
        crop_bytes: bytes,
        device_identifier: Optional[str] = None,
        operator_user_id: Optional[str] = None,
        ip: Optional[str] = None,
    ) -> RecognizeResponse:
        # 1. Validate Event
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado.")

        if event.status not in ["OPEN", "DRAFT", "IN_PROGRESS"]:
            return RecognizeResponse(
                success=False,
                status="EVENT_NOT_OPEN",
                message=f"O evento está com status '{event.status}'. O registro de presença não está ativo.",
            )

        # 2. Extract 128D embedding
        try:
            crop_embedding = FaceService.extract_crop_face_encoding(crop_bytes)
        except HTTPException as e:
            return RecognizeResponse(
                success=False,
                status="NOT_RECOGNIZED",
                message=f"Falha na detecção facial: {e.detail}",
            )
        except Exception as e:
            return RecognizeResponse(
                success=False,
                status="ERROR",
                message=f"Erro ao processar imagem: {str(e)}",
            )

        # 3. Resolve Device if provided
        device_id = None
        if device_identifier:
            device = db.query(Device).filter(Device.identifier == device_identifier).first()
            if device:
                device_id = device.id
                device.lastSeenAt = datetime.now(timezone.utc)
                db.commit()

        threshold = settings.FACE_DISTANCE_THRESHOLD
        matched_person_id: Optional[str] = None
        min_distance: float = 999.0

        is_postgres = "postgresql" in settings.DATABASE_URL

        # 4. Search in pgvector filtered strictly to active event participants
        if is_postgres:
            query_sql = text("""
                SELECT
                    fe."personId",
                    fe.embedding <-> (:vec)::vector AS distance
                FROM "FaceEmbedding" fe
                INNER JOIN "EventParticipant" ep ON ep."personId" = fe."personId"
                INNER JOIN "Person" p ON p.id = fe."personId"
                WHERE ep."eventId" = :event_id
                  AND ep.status = 'ACTIVE'
                  AND fe.active = true
                  AND p.active = true
                ORDER BY fe.embedding <-> (:vec)::vector ASC
                LIMIT 1;
            """)
            vec_str = "[" + ",".join(str(x) for x in crop_embedding) + "]"
            row = db.execute(query_sql, {"vec": vec_str, "event_id": event_id}).first()

            if row:
                person_cand_id, dist = row[0], float(row[1])
                if dist <= threshold:
                    matched_person_id = person_cand_id
                    min_distance = dist
        else:
            # Fallback for local testing without pgvector
            participants = (
                db.query(FaceEmbedding, Person)
                .join(EventParticipant, EventParticipant.personId == FaceEmbedding.personId)
                .join(Person, Person.id == FaceEmbedding.personId)
                .filter(
                    EventParticipant.eventId == event_id,
                    EventParticipant.status == "ACTIVE",
                    FaceEmbedding.active == True,
                    Person.active == True,
                )
                .all()
            )
            crop_vec = np.array(crop_embedding, dtype=np.float32)
            for emb, person in participants:
                import json
                try:
                    emb_vec = np.array(json.loads(emb.embedding), dtype=np.float32)
                except Exception:
                    clean = emb.embedding.strip("[]() ").split(",")
                    emb_vec = np.array([float(x) for x in clean if x.strip()], dtype=np.float32)
                d = float(np.linalg.norm(crop_vec - emb_vec))
                if d < min_distance:
                    min_distance = d
                    if d <= threshold:
                        matched_person_id = person.id

        # 5. If matched in this event
        if matched_person_id:
            person = db.query(Person).filter(Person.id == matched_person_id).first()
            if not person:
                return RecognizeResponse(
                    success=False,
                    status="NOT_RECOGNIZED",
                    message="Participante não localizado.",
                )

            confidence = round(cls.distance_to_confidence(min_distance), 2)
            min_conf = settings.MIN_CONFIDENCE_THRESHOLD

            if confidence < min_conf:
                return RecognizeResponse(
                    success=False,
                    status="NOT_RECOGNIZED",
                    message=f"Confiança biométrica de {int(confidence * 100)}% abaixo do mínimo de {int(min_conf * 100)}%. Centralize o rosto e aproxime-se.",
                )

            # Check if presence already registered
            existing_presence = (
                db.query(Presence)
                .filter(Presence.eventId == event_id, Presence.personId == person.id)
                .first()
            )
            if existing_presence:
                return RecognizeResponse(
                    success=True,
                    status="ALREADY_REGISTERED",
                    message="Presença já confirmada para este evento.",
                    person=PersonBasicInfo(
                        id=person.id,
                        name=person.name,
                        registration=person.registration,
                        cpf=person.cpf,
                        email=person.email,
                        photoUrl=person.photoUrl,
                        category=person.category,
                    ),
                    confidence=confidence,
                    distance=round(min_distance, 4),
                    method=existing_presence.method,
                    capturedAt=existing_presence.capturedAt,
                )

            now = datetime.now(timezone.utc)
            presence_id = str(uuid.uuid4())

            # Validate foreign keys
            valid_operator_id = None
            if operator_user_id:
                try:
                    if is_postgres:
                        u = db.execute(text('SELECT id FROM "User" WHERE id = :uid'), {"uid": operator_user_id}).first()
                        if u:
                            valid_operator_id = operator_user_id
                    else:
                        valid_operator_id = operator_user_id
                except Exception:
                    valid_operator_id = None

            valid_device_id = None
            if device_id:
                try:
                    if is_postgres:
                        d = db.execute(text('SELECT id FROM "Device" WHERE id = :did'), {"did": device_id}).first()
                        if d:
                            valid_device_id = device_id
                    else:
                        valid_device_id = device_id
                except Exception:
                    valid_device_id = None

            try:
                if is_postgres:
                    insert_presence_sql = text("""
                        INSERT INTO "Presence" (id, "eventId", "personId", method, confidence, distance, "capturedAt", "deviceId", "operatorUserId", status, "createdAt")
                        VALUES (:id, :event_id, :person_id, 'FACE'::"PresenceMethod", :confidence, :distance, :captured_at, :device_id, :operator_id, 'REGISTERED', :now);
                    """)
                    db.execute(insert_presence_sql, {
                        "id": presence_id,
                        "event_id": event_id,
                        "person_id": person.id,
                        "confidence": confidence,
                        "distance": round(min_distance, 4),
                        "captured_at": now,
                        "device_id": valid_device_id,
                        "operator_id": valid_operator_id,
                        "now": now,
                    })
                else:
                    presence = Presence(
                        id=presence_id,
                        eventId=event_id,
                        personId=person.id,
                        method="FACE",
                        confidence=confidence,
                        distance=round(min_distance, 4),
                        capturedAt=now,
                        deviceId=valid_device_id,
                        operatorUserId=valid_operator_id,
                        status="REGISTERED",
                    )
                    db.add(presence)

                db.commit()
            except IntegrityError:
                db.rollback()
                return RecognizeResponse(
                    success=True,
                    status="ALREADY_REGISTERED",
                    message="Presença já confirmada para este evento.",
                    person=PersonBasicInfo(
                        id=person.id,
                        name=person.name,
                        registration=person.registration,
                        cpf=person.cpf,
                        email=person.email,
                        photoUrl=person.photoUrl,
                        category=person.category,
                    ),
                    confidence=confidence,
                    distance=round(min_distance, 4),
                    method="FACE",
                    capturedAt=now,
                )

            AuditService.log(
                db=db,
                action="PRESENCE_REGISTERED",
                entity="Presence",
                entity_id=presence_id,
                user_id=operator_user_id,
                ip_address=ip,
                details={
                    "event_id": event_id,
                    "person_id": person.id,
                    "person_name": person.name,
                    "confidence": confidence,
                    "distance": round(min_distance, 4),
                    "device_id": device_id,
                },
            )

            return RecognizeResponse(
                success=True,
                status="REGISTERED",
                message="Presença registrada com sucesso!",
                person=PersonBasicInfo(
                    id=person.id,
                    name=person.name,
                    registration=person.registration,
                    cpf=person.cpf,
                    email=person.email,
                    photoUrl=person.photoUrl,
                    category=person.category,
                ),
                confidence=confidence,
                distance=round(min_distance, 4),
                method="FACE",
                capturedAt=now,
            )

        # 6. If not matched in this event, check global match
        global_matched = False
        if is_postgres:
            global_sql = text("""
                SELECT fe."personId", fe.embedding <-> (:vec)::vector AS distance
                FROM "FaceEmbedding" fe
                INNER JOIN "Person" p ON p.id = fe."personId"
                WHERE fe.active = true AND p.active = true
                ORDER BY fe.embedding <-> (:vec)::vector ASC
                LIMIT 1;
            """)
            vec_str = "[" + ",".join(str(x) for x in crop_embedding) + "]"
            g_row = db.execute(global_sql, {"vec": vec_str}).first()
            if g_row and float(g_row[1]) <= threshold:
                global_matched = True
        else:
            all_embeddings = (
                db.query(FaceEmbedding, Person)
                .join(Person, Person.id == FaceEmbedding.personId)
                .filter(FaceEmbedding.active == True, Person.active == True)
                .all()
            )
            crop_vec = np.array(crop_embedding, dtype=np.float32)
            for emb, person in all_embeddings:
                import json
                try:
                    emb_vec = np.array(json.loads(emb.embedding), dtype=np.float32)
                except Exception:
                    clean = emb.embedding.strip("[]() ").split(",")
                    emb_vec = np.array([float(x) for x in clean if x.strip()], dtype=np.float32)
                d = float(np.linalg.norm(crop_vec - emb_vec))
                if d <= threshold:
                    global_matched = True
                    break

        if global_matched:
            return RecognizeResponse(
                success=False,
                status="NOT_PARTICIPANT",
                message="Pessoa identificada, mas não está inscrita neste evento.",
            )

        return RecognizeResponse(
            success=False,
            status="NOT_RECOGNIZED",
            message="Rosto não reconhecido no sistema.",
        )

    @classmethod
    def test_biometrics(
        cls,
        db: Session,
        crop_bytes: bytes,
        target_person_id: Optional[str] = None,
    ) -> BiometricTestResponse:
        """
        Tests biometric recognition 1:1 or 1:N without saving presence records.
        """
        try:
            crop_embedding = FaceService.extract_crop_face_encoding(crop_bytes)
        except HTTPException as e:
            return BiometricTestResponse(
                success=False,
                status="NO_FACE_DETECTED",
                message=f"Falha na detecção facial: {e.detail}",
            )
        except Exception as e:
            return BiometricTestResponse(
                success=False,
                status="ERROR",
                message=f"Erro ao processar imagem: {str(e)}",
            )

        is_postgres = "postgresql" in settings.DATABASE_URL
        vec_str = "[" + ",".join(str(x) for x in crop_embedding) + "]"
        threshold = settings.FACE_DISTANCE_THRESHOLD

        # 1:1 Target Person Verification
        if target_person_id:
            person = db.query(Person).filter(Person.id == target_person_id).first()
            if not person:
                return BiometricTestResponse(
                    success=False,
                    status="NO_MATCH",
                    message="Pessoa alvo não encontrada.",
                )

            if is_postgres:
                q = text("""
                    SELECT fe.embedding <-> (:vec)::vector AS distance
                    FROM "FaceEmbedding" fe
                    WHERE fe."personId" = :person_id AND fe.active = true
                    LIMIT 1;
                """)
                row = db.execute(q, {"vec": vec_str, "person_id": target_person_id}).first()
                if not row:
                    return BiometricTestResponse(
                        success=False,
                        status="NO_MATCH",
                        matchedPerson=PersonBasicInfo(
                            id=person.id,
                            name=person.name,
                            registration=person.registration,
                            cpf=person.cpf,
                            email=person.email,
                            photoUrl=person.photoUrl,
                        ),
                        message=f"{person.name} não possui biometria facial cadastrada.",
                    )
                dist = float(row[0])
            else:
                emb = db.query(FaceEmbedding).filter(
                    FaceEmbedding.personId == target_person_id,
                    FaceEmbedding.active == True,
                ).first()
                if not emb:
                    return BiometricTestResponse(
                        success=False,
                        status="NO_MATCH",
                        message=f"{person.name} não possui biometria cadastrada.",
                    )
                import json
                try:
                    emb_vec = np.array(json.loads(emb.embedding), dtype=np.float32)
                except Exception:
                    clean = emb.embedding.strip("[]() ").split(",")
                    emb_vec = np.array([float(x) for x in clean if x.strip()], dtype=np.float32)
                crop_vec = np.array(crop_embedding, dtype=np.float32)
                dist = float(np.linalg.norm(crop_vec - emb_vec))

            conf = cls.distance_to_confidence(dist)
            is_match = dist <= threshold and conf >= settings.MIN_CONFIDENCE_THRESHOLD

            return BiometricTestResponse(
                success=is_match,
                status="MATCH" if is_match else "NO_MATCH",
                matchedPerson=PersonBasicInfo(
                    id=person.id,
                    name=person.name,
                    registration=person.registration,
                    cpf=person.cpf,
                    email=person.email,
                    photoUrl=person.photoUrl,
                ),
                confidence=round(conf, 4),
                distance=round(dist, 4),
                isApproved=is_match,
                message=f"Biometria validada com sucesso! ({int(conf * 100)}%)" if is_match else f"Biometria divergente. Confiança ({int(conf * 100)}%) abaixo do limiar.",
            )

        # 1:N Global Search
        if is_postgres:
            q_all = text("""
                SELECT
                    p.id, p.name, p.registration, p.cpf, p.email, p."photoUrl", p.category,
                    fe.embedding <-> (:vec)::vector AS distance
                FROM "FaceEmbedding" fe
                INNER JOIN "Person" p ON p.id = fe."personId"
                WHERE fe.active = true AND p.active = true
                ORDER BY fe.embedding <-> (:vec)::vector ASC
                LIMIT 1;
            """)
            row = db.execute(q_all, {"vec": vec_str}).first()
            if row:
                p_id, p_name, p_reg, p_cpf, p_email, p_photo, p_cat, dist = row
                dist = float(dist)
                conf = cls.distance_to_confidence(dist)
                is_match = dist <= threshold and conf >= settings.MIN_CONFIDENCE_THRESHOLD

                return BiometricTestResponse(
                    success=is_match,
                    status="MATCH" if is_match else "NO_MATCH",
                    matchedPerson=PersonBasicInfo(
                        id=p_id,
                        name=p_name,
                        registration=p_reg,
                        cpf=p_cpf,
                        email=p_email,
                        photoUrl=p_photo,
                        category=p_cat,
                    ),
                    confidence=round(conf, 4),
                    distance=round(dist, 4),
                    isApproved=is_match,
                    message=f"Identificado: {p_name} com {int(conf * 100)}% de confiança." if is_match else f"Rosto detectado, porém confiança ({int(conf * 100)}%) insuficiente.",
                )
        else:
            all_embs = (
                db.query(FaceEmbedding, Person)
                .join(Person, Person.id == FaceEmbedding.personId)
                .filter(FaceEmbedding.active == True, Person.active == True)
                .all()
            )
            if all_embs:
                crop_vec = np.array(crop_embedding, dtype=np.float32)
                best_person = None
                min_d = 999.0
                for emb, p in all_embs:
                    import json
                    try:
                        emb_vec = np.array(json.loads(emb.embedding), dtype=np.float32)
                    except Exception:
                        clean = emb.embedding.strip("[]() ").split(",")
                        emb_vec = np.array([float(x) for x in clean if x.strip()], dtype=np.float32)
                    d = float(np.linalg.norm(crop_vec - emb_vec))
                    if d < min_d:
                        min_d = d
                        best_person = p

                if best_person:
                    conf = cls.distance_to_confidence(min_d)
                    is_match = min_d <= threshold and conf >= settings.MIN_CONFIDENCE_THRESHOLD
                    return BiometricTestResponse(
                        success=is_match,
                        status="MATCH" if is_match else "NO_MATCH",
                        matchedPerson=PersonBasicInfo(
                            id=best_person.id,
                            name=best_person.name,
                            registration=best_person.registration,
                            cpf=best_person.cpf,
                            email=best_person.email,
                            photoUrl=best_person.photoUrl,
                            category=best_person.category,
                        ),
                        confidence=round(conf, 4),
                        distance=round(min_d, 4),
                        isApproved=is_match,
                        message=f"Identificado: {best_person.name} com {int(conf * 100)}% de confiança." if is_match else f"Rosto detectado, porém confiança insuficiente.",
                    )

        return BiometricTestResponse(
            success=False,
            status="NO_MATCH",
            message="Nenhuma pessoa correspondente encontrada.",
        )
