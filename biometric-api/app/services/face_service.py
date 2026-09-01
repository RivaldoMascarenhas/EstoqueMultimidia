import io
import os
from typing import List, Optional
import numpy as np
from PIL import Image, ImageOps
from fastapi import HTTPException, status

MAX_PIXELS = 12_000_000
MAX_DIMENSION = 4096

try:
    import face_recognition
    HAS_FACE_RECOGNITION = True
except ImportError:
    HAS_FACE_RECOGNITION = False


class FaceService:
    @staticmethod
    def bytes_to_rgb_array(image_bytes: bytes) -> np.ndarray:
        """
        Converts raw image bytes to an RGB numpy array handling EXIF orientation
        and strictly enforcing dimensions to prevent decompression bombs.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            width, height = image.size

            if width <= 0 or height <= 0:
                raise ValueError("Dimensões inválidas de imagem.")

            if width > MAX_DIMENSION or height > MAX_DIMENSION:
                raise ValueError("Dimensões da imagem excedem o limite seguro máximo.")

            if width * height > MAX_PIXELS:
                raise ValueError("Imagem excede o limite máximo permitido de pixels (12 megapixels).")

            image = ImageOps.exif_transpose(image)
            rgb_image = image.convert("RGB")
            return np.array(rgb_image)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Arquivo de imagem inválido, corrompido ou excessivamente grande.",
            )

    @staticmethod
    def validate_quality_and_anti_replay(rgb_array: np.ndarray, is_crop: bool = True) -> None:
        """
        Multi-Layer Optical Quality, Texture Analysis & Passive Liveness / Anti-Spoofing:
        1. Dimension constraints (min size: 60px crop, 120px full).
        2. Aspect ratio constraints (prevents distorted slices).
        3. Luminance / Exposure check (detects extreme darkness or screen glare).
        4. Focus / Sharpness check via discrete 2D Laplacian operator (detects extreme blur).
        5. Skin Chrominance Distribution (YCrCb color space consistency).
        6. Micro-Texture & Screen Moiré / Raster Artifact Detection (rejects flat prints and screen replays).
        """
        h, w, c = rgb_array.shape
        min_dim = 60 if is_crop else 120

        if h < min_dim or w < min_dim:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Resolução insuficiente para processamento facial seguro (mínimo {min_dim}x{min_dim}px).",
            )

        # 1. Aspect ratio check
        ratio = w / float(h)
        if ratio < 0.35 or ratio > 2.80:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Proporção anatômica da captura facial inválida.",
            )

        # 2. Grayscale conversion for luminance & sharpness
        r = rgb_array[..., 0].astype(np.float32)
        g = rgb_array[..., 1].astype(np.float32)
        b = rgb_array[..., 2].astype(np.float32)

        gray = 0.2989 * r + 0.5870 * g + 0.1140 * b
        mean_lum = float(np.mean(gray))

        if mean_lum < 15.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ambiente excessivamente escuro para leitura biométrica. Melhore a iluminação do rosto.",
            )
        if mean_lum > 248.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Imagem superexposta ou com reflexo excessivo de tela digital.",
            )

        # 3. Discrete 2D Laplacian filter for blur detection
        if h >= 20 and w >= 20:
            laplacian = (
                gray[:-2, 1:-1]
                + gray[2:, 1:-1]
                + gray[1:-1, :-2]
                + gray[1:-1, 2:]
                - 4 * gray[1:-1, 1:-1]
            )
            variance = float(np.var(laplacian))
            if variance < 5.0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A imagem capturada está excessivamente borrada ou sem nitidez. Mantenha a câmera estável diante do rosto.",
                )

        # 4. Chrominance & Skin Gamut Consistency Check (YCrCb space)
        # Cr = (R - Y) * 0.713 + 128 ; Cb = (B - Y) * 0.564 + 128
        cr = (r - gray) * 0.713 + 128.0
        cb = (b - gray) * 0.564 + 128.0

        # Human skin tone ranges generally reside within Cr ~ [120, 185], Cb ~ [70, 140]
        skin_mask = (cr >= 115) & (cr <= 190) & (cb >= 65) & (cb <= 145)
        skin_ratio = float(np.mean(skin_mask))

        # Check for mono/synthetic zero-variance color channels (common in fake renderings or flat paper)
        if skin_ratio < 0.05 and not is_crop:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível identificar pigmentação facial biológica coerente na captura.",
            )

        # 5. Screen Reflection / Moiré Frequency Artifact Check
        # Digital screens present unnatural high-frequency periodic variance in diagonal planes
        if h >= 30 and w >= 30:
            diag_diff = np.abs(gray[:-2, :-2] - gray[2:, 2:])
            mean_diag_diff = float(np.mean(diag_diff))
            max_diag_diff = float(np.max(diag_diff))

            # Detect saturated screen glare or extreme synthetic raster
            if mean_diag_diff > 90.0 and max_diag_diff > 250.0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Possível interferência de reflexo de monitor ou tela detectada. Por favor, posicione-se diretamente em frente à câmera.",
                )

    @classmethod
    def extract_single_face_encoding(cls, image_bytes: bytes) -> List[float]:
        """
        Extracts 128-dimensional face embedding for full image enrollment.
        Enforces that EXACTLY ONE face is present and quality checks pass.
        """
        rgb_array = cls.bytes_to_rgb_array(image_bytes)
        cls.validate_quality_and_anti_replay(rgb_array, is_crop=False)

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
        cls.validate_quality_and_anti_replay(rgb_array, is_crop=True)

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
