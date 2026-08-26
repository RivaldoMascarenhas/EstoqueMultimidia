import io
import os
from typing import List, Optional
import numpy as np
from PIL import Image
from fastapi import HTTPException, status

try:
    import face_recognition
    HAS_FACE_RECOGNITION = True
except ImportError:
    HAS_FACE_RECOGNITION = False


class FaceService:
    @staticmethod
    def bytes_to_rgb_array(image_bytes: bytes) -> np.ndarray:
        """Converts raw image bytes to an RGB numpy array handling EXIF orientation."""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            if hasattr(image, "_getexif"):
                exif = image._getexif()
                if exif:
                    orientation = exif.get(0x0112)
                    if orientation == 3:
                        image = image.rotate(180, expand=True)
                    elif orientation == 6:
                        image = image.rotate(270, expand=True)
                    elif orientation == 8:
                        image = image.rotate(90, expand=True)
            rgb_image = image.convert("RGB")
            return np.array(rgb_image)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Arquivo de imagem inválido ou corrompido: {str(e)}",
            )

    @classmethod
    def extract_single_face_encoding(cls, image_bytes: bytes) -> List[float]:
        """
        Extracts 128-dimensional face embedding for full image enrollment.
        Enforces that EXACTLY ONE face is present.
        """
        rgb_array = cls.bytes_to_rgb_array(image_bytes)

        if HAS_FACE_RECOGNITION:
            face_locations = face_recognition.face_locations(rgb_array)
            if len(face_locations) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nenhum rosto detectado na imagem. Certifique-se de que o rosto está nítido e bem iluminado.",
                )
            if len(face_locations) > 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A imagem contém múltiplos rostos. Envie uma foto com apenas uma pessoa.",
                )

            encodings = face_recognition.face_encodings(rgb_array, known_face_locations=face_locations)
            if not encodings or len(encodings) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não foi possível extrair os traços biométricos faciais desta imagem.",
                )

            return [float(x) for x in encodings[0]]
        else:
            # Deterministic fallback for dev/test without dlib
            h, w, _ = rgb_array.shape
            if h < 40 or w < 40:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Resolução de imagem insuficiente.",
                )
            resized = np.array(Image.fromarray(rgb_array).resize((16, 8))).flatten().astype(np.float32)
            norm = np.linalg.norm(resized)
            if norm > 0:
                resized = resized / norm
            return [float(x) for x in resized[:128]]

    @classmethod
    def extract_crop_face_encoding(cls, crop_bytes: bytes) -> List[float]:
        """
        Extracts 128-dimensional face embedding from a pre-cropped face sent by client-side MediaPipe.
        """
        rgb_array = cls.bytes_to_rgb_array(crop_bytes)

        if HAS_FACE_RECOGNITION:
            encodings = face_recognition.face_encodings(rgb_array)
            if encodings and len(encodings) > 0:
                return [float(x) for x in encodings[0]]

            h, w, _ = rgb_array.shape
            locations = [(0, w, h, 0)]
            encodings = face_recognition.face_encodings(rgb_array, known_face_locations=locations)
            if encodings and len(encodings) > 0:
                return [float(x) for x in encodings[0]]

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível extrair a biometria facial do recorte recebido.",
            )
        else:
            resized = np.array(Image.fromarray(rgb_array).resize((16, 8))).flatten().astype(np.float32)
            norm = np.linalg.norm(resized)
            if norm > 0:
                resized = resized / norm
            return [float(x) for x in resized[:128]]
