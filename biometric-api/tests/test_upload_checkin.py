import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from fastapi import HTTPException
from app.services import recognition_service as service
from app.routers.face import read_limited_upload, MAX_IMAGE_BYTES


class UploadTests(unittest.IsolatedAsyncioTestCase):
    async def test_ten_megabytes_allowed(self):
        upload = SimpleNamespace(content_type="image/jpeg", read=AsyncMock(return_value=b"x" * (10 * 1024 * 1024)))
        self.assertEqual(len(await read_limited_upload(upload)), MAX_IMAGE_BYTES)
        upload.read.assert_awaited_once_with(MAX_IMAGE_BYTES + 1)

    async def test_one_byte_over_limit_rejected(self):
        upload = SimpleNamespace(content_type="image/jpeg", read=AsyncMock(return_value=b"x" * (10 * 1024 * 1024 + 1)))
        with self.assertRaises(HTTPException) as error:
            await read_limited_upload(upload)
        self.assertEqual(error.exception.status_code, 413)


class CheckinTimezoneTests(unittest.TestCase):
    def test_server_clock_is_interpreted_in_fortaleza(self):
        for utc_hour, minute, expected in [(21, 59, "EVENT_NOT_OPEN"), (22, 0, "ERROR")]:
            instant = datetime(2026, 9, 6, utc_hour, minute, tzinfo=timezone.utc)
            class Clock(datetime):
                @classmethod
                def now(cls, tz=None):
                    return instant.astimezone(tz)
            db = Mock()
            db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(
                status="PUBLISHED", date=datetime(2026, 9, 6), time="19:00", checkinOpenMinutesBefore=0
            )
            with self.subTest(instant=instant), patch.object(service, "datetime", Clock), patch.object(
                service.RecognitionService, "validate_operator_identity", return_value=None
            ), patch.object(service.FaceService, "extract_crop_face_encoding", side_effect=HTTPException(503, "Motor indisponível")) as extract:
                result = service.RecognitionService.recognize_and_register(db, "event", b"test")
                self.assertEqual(result.status, expected)
                self.assertFalse(result.success)
                self.assertEqual(extract.call_count, 0 if expected == "EVENT_NOT_OPEN" else 1)
