import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch
from sqlalchemy.exc import IntegrityError
from app.services import recognition_service as service


class PresenceWriteSafetyTests(unittest.TestCase):
    def recognize_with_write_conflict(self, confirmed_presence):
        db = Mock()
        person = SimpleNamespace(id="person-test", name="Pessoa Teste", registration="001", category="Aluno")
        db.query.return_value.filter.return_value.first.side_effect = [
            SimpleNamespace(status="OPEN"), person, None, confirmed_presence,
        ]
        db.execute.return_value.first.return_value = (person.id, 0.1)
        db.commit.side_effect = IntegrityError("synthetic insert", {}, Exception("synthetic constraint"))
        with patch.object(service.RecognitionService, "validate_operator_identity", return_value=None), patch.object(
            service.FaceService, "extract_crop_face_encoding", return_value=[0.0] * 128
        ), patch.object(service.settings, "DATABASE_URL", "postgresql://synthetic"), patch.object(
            service.AuditService, "log"
        ) as audit:
            result = service.RecognitionService.recognize_and_register(db, "event-test", b"synthetic")
            db.rollback.assert_called_once()
            audit.assert_not_called()
            return result

    def test_unrelated_constraint_failure_does_not_confirm_presence(self):
        result = self.recognize_with_write_conflict(None)
        self.assertFalse(result.success)
        self.assertEqual(result.status, "ERROR")

    def test_concurrent_duplicate_returns_existing_presence(self):
        captured_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        result = self.recognize_with_write_conflict(SimpleNamespace(method="FACE", capturedAt=captured_at))
        self.assertTrue(result.success)
        self.assertEqual(result.status, "ALREADY_REGISTERED")
        self.assertEqual(result.capturedAt, captured_at)


if __name__ == "__main__":
    unittest.main()
