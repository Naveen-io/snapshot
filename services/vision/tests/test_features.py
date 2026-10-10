import unittest
from services.vision.features import FeatureExtractor, euclidean_dist, euclidean_dist_2d

class TestFeatureExtractor(unittest.TestCase):
    def setUp(self):
        self.extractor = FeatureExtractor(
            left_pinch_down_thresh=0.32,
            left_pinch_up_thresh=0.42,
            right_pinch_down_thresh=0.30,
            right_pinch_up_thresh=0.40
        )

    def create_mock_hand(self, thumb_index_gap: float = 0.5, thumb_middle_gap: float = 0.5, fingers_extended: bool = True):
        """Builds synthetic 21-point hand landmark array with controlled geometry."""
        landmarks = []
        # Wrist at (0.5, 0.8)
        landmarks.append({"x": 0.5, "y": 0.8, "z": 0.0})
        
        # Palm scale is distance from wrist (0.5, 0.8) to middle_mcp (0.5, 0.5) = 0.3
        # Thumb: 1, 2, 3, 4
        landmarks.append({"x": 0.45, "y": 0.7, "z": 0.0})
        landmarks.append({"x": 0.40, "y": 0.6, "z": 0.0})
        landmarks.append({"x": 0.38, "y": 0.5, "z": 0.0})
        # Thumb tip (4)
        thumb_tip_x = 0.5 - thumb_index_gap * 0.15
        landmarks.append({"x": thumb_tip_x, "y": 0.4, "z": 0.0})

        # Index: 5(MCP), 6(PIP), 7(DIP), 8(TIP)
        landmarks.append({"x": 0.45, "y": 0.55, "z": 0.0})
        landmarks.append({"x": 0.45, "y": 0.45, "z": 0.0})
        landmarks.append({"x": 0.45, "y": 0.38, "z": 0.0})
        index_tip_y = 0.30 if fingers_extended else 0.50
        landmarks.append({"x": 0.45, "y": index_tip_y, "z": 0.0})

        # Middle: 9(MCP), 10(PIP), 11(DIP), 12(TIP)
        landmarks.append({"x": 0.50, "y": 0.50, "z": 0.0})
        landmarks.append({"x": 0.50, "y": 0.40, "z": 0.0})
        landmarks.append({"x": 0.50, "y": 0.32, "z": 0.0})
        middle_tip_y = 0.25 if fingers_extended else 0.48
        landmarks.append({"x": 0.50, "y": middle_tip_y, "z": 0.0})

        # Ring: 13(MCP), 14(PIP), 15(DIP), 16(TIP)
        landmarks.append({"x": 0.55, "y": 0.55, "z": 0.0})
        landmarks.append({"x": 0.55, "y": 0.45, "z": 0.0})
        landmarks.append({"x": 0.55, "y": 0.38, "z": 0.0})
        ring_tip_y = 0.30 if fingers_extended else 0.52
        landmarks.append({"x": 0.55, "y": ring_tip_y, "z": 0.0})

        # Pinky: 17(MCP), 18(PIP), 19(DIP), 20(TIP)
        landmarks.append({"x": 0.60, "y": 0.60, "z": 0.0})
        landmarks.append({"x": 0.60, "y": 0.50, "z": 0.0})
        landmarks.append({"x": 0.60, "y": 0.42, "z": 0.0})
        pinky_tip_y = 0.35 if fingers_extended else 0.58
        landmarks.append({"x": 0.60, "y": pinky_tip_y, "z": 0.0})

        return landmarks

    def test_euclidean_distance_helpers(self):
        p1 = {"x": 0.0, "y": 0.0, "z": 0.0}
        p2 = {"x": 3.0, "y": 4.0, "z": 0.0}
        self.assertAlmostEqual(euclidean_dist_2d(p1, p2), 5.0)
        p3 = {"x": 3.0, "y": 4.0, "z": 12.0}
        self.assertAlmostEqual(euclidean_dist(p1, p3), 13.0)

    def test_insufficient_landmarks(self):
        res = self.extractor.extract([])
        self.assertFalse(res["valid"])
        self.assertFalse(res["is_left_pinch"])

    def test_left_pinch_hysteresis(self):
        # Create landmarks with tight gap between thumb and index
        pinching_hand = self.create_mock_hand(thumb_index_gap=0.1)
        # Position thumb tip right next to index tip
        pinching_hand[4] = {"x": 0.455, "y": 0.305, "z": 0.0}
        
        res = self.extractor.extract(pinching_hand)
        self.assertTrue(res["valid"])
        self.assertTrue(res["is_left_pinch"], "Tight gap should trigger pinch down")

        # Now slightly open thumb (still within hysteresis zone between 0.32 and 0.42)
        # Distance ~ 0.36 normalized
        mid_gap_hand = self.create_mock_hand()
        mid_gap_hand[4] = {"x": 0.455, "y": 0.41, "z": 0.0}
        res_mid = self.extractor.extract(mid_gap_hand)
        # Should stay pinching due to hysteresis
        self.assertTrue(res_mid["is_left_pinch"], "Hysteresis should keep pinch held until up-threshold")

        # Now open hand wide
        open_hand = self.create_mock_hand(thumb_index_gap=1.5)
        open_hand[4] = {"x": 0.15, "y": 0.4, "z": 0.0}
        res_open = self.extractor.extract(open_hand)
        self.assertFalse(res_open["is_left_pinch"], "Wide gap should release pinch")

    def test_scroll_mode_finger_posture(self):
        hand = self.create_mock_hand(fingers_extended=True)
        # For scroll mode: index and middle extended, ring and pinky folded
        # Fold ring (16) and pinky (20) below pip
        hand[16] = {"x": 0.55, "y": 0.52, "z": 0.0}
        hand[20] = {"x": 0.60, "y": 0.58, "z": 0.0}

        res = self.extractor.extract(hand)
        self.assertTrue(res["is_scroll_mode"], "Index+middle extended with ring+pinky folded must enter scroll mode")
        self.assertFalse(res["is_left_pinch"], "Click pinch must be suppressed during scroll")

if __name__ == "__main__":
    unittest.main()
