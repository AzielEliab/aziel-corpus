import unittest
from unittest import mock

from aziel_library.update_check import check_update, report_update


class UpdateCheckTest(unittest.TestCase):
    def test_prefers_runtime_payload(self):
        payload = {
            "ok": True,
            "latest": "2.8.0",
            "current": "2.7.0",
            "update_available": True,
            "source": "runtime:/v1/update/check",
            "author": "Aziel Eliab",
        }
        with mock.patch("aziel_library.update_check._get_json", side_effect=[payload, None]):
            doc = check_update(version="2.7.0")
        self.assertEqual(doc["latest"], "2.8.0")
        self.assertTrue(doc["update_available"])

    def test_local_fallback_when_runtime_missing(self):
        with mock.patch("aziel_library.update_check._get_json", return_value=None):
            doc = check_update(version="2.7.0")
            line = report_update("2.7.0")
        self.assertEqual(doc["source"], "local")
        self.assertFalse(doc["update_available"])
        self.assertEqual(doc["author"], "Aziel Eliab")
        self.assertIn("2.7.0", line)
        self.assertNotIn("Update available", line)


if __name__ == "__main__":
    unittest.main()
