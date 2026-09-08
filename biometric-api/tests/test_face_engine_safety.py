import unittest
from unittest.mock import patch, Mock
import numpy as np
from fastapi import HTTPException
from app.services import face_service


class FaceEngineSafetyTests(unittest.TestCase):
    def test_missing_engine_refuses_enrollment_and_recognition_before_decoding(self):
        with patch.object(face_service, "HAS_FACE_RECOGNITION", False), patch.object(
            face_service.FaceService, "bytes_to_rgb_array"
        ) as decode:
            for method in [face_service.FaceService.extract_single_face_encoding,
                           face_service.FaceService.extract_crop_face_encoding]:
                with self.subTest(method=method.__name__):
                    with self.assertRaises(HTTPException) as error:
                        method(b"synthetic-test-input")
                    self.assertEqual(error.exception.status_code, 503)
            decode.assert_not_called()

    def test_crop_selects_largest_face_even_when_background_face_is_first(self):
        engine = Mock()
        largest = (5, 110, 115, 10)
        engine.face_locations.return_value = [(0, 20, 20, 0), largest, (30, 60, 60, 30)]
        engine.face_encodings.return_value = [np.arange(128, dtype=float)]
        with patch.object(face_service, "HAS_FACE_RECOGNITION", True), patch.object(
            face_service, "face_recognition", engine, create=True
        ), patch.object(face_service.FaceService, "bytes_to_rgb_array", return_value=np.zeros((120, 120, 3))), patch.object(
            face_service.FaceService, "validate_quality_and_anti_replay"
        ):
            result = face_service.FaceService.extract_crop_face_encoding(b"test")
            self.assertEqual(result, list(range(128)))
            self.assertEqual(engine.face_encodings.call_args.kwargs["known_face_locations"], [largest])

    def test_available_engine_returns_its_encoding(self):
        engine = Mock()
        engine.face_locations.return_value = [(0, 100, 100, 0)]
        engine.face_encodings.return_value = [np.arange(128, dtype=float)]
        with patch.object(face_service, "HAS_FACE_RECOGNITION", True), patch.object(
            face_service, "face_recognition", engine, create=True
        ), patch.object(face_service.FaceService, "bytes_to_rgb_array", return_value=np.zeros((120, 120, 3))), patch.object(
            face_service.FaceService, "validate_quality_and_anti_replay"
        ):
            for method in [face_service.FaceService.extract_single_face_encoding,
                           face_service.FaceService.extract_crop_face_encoding]:
                with self.subTest(method=method.__name__):
                    self.assertEqual(method(b"test"), list(range(128)))


if __name__ == "__main__":
    unittest.main()
