import json
import time
import unittest
from services.vision.server import OrbitVisionService

class TestVisionProtocolFormat(unittest.TestCase):
    def setUp(self):
        self.service = OrbitVisionService(host="127.0.0.1", port=8765)

    def test_status_message_format(self):
        msg = self.service.create_status_message()
        self.assertEqual(msg["version"], 1)
        self.assertEqual(msg["type"], "status")
        self.assertIn(msg["camera"], ["closed", "opening", "active", "error"])
        self.assertIn(msg["mode"], ["OFF", "PREVIEW", "CALIBRATION", "POINTER", "PAUSED", "ERROR"])
        self.assertIsInstance(msg["fps"], (int, float))
        self.assertIsInstance(msg["handDetected"], bool)
        self.assertIsInstance(msg["timestamp"], int)

        # JSON serializable
        serialized = json.dumps(msg)
        deserialized = json.loads(serialized)
        self.assertEqual(deserialized["version"], 1)

if __name__ == "__main__":
    unittest.main()
