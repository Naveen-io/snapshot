import unittest
from services.vision.filter import AdaptiveSmoothingFilter

class TestAdaptiveSmoothingFilter(unittest.TestCase):
    def setUp(self):
        self.filter = AdaptiveSmoothingFilter(base_smoothing=0.7, deadzone=0.005, velocity_threshold=0.05)

    def test_first_coordinate_is_unaltered(self):
        x, y = self.filter.filter(0.42, 0.58)
        self.assertAlmostEqual(x, 0.42)
        self.assertAlmostEqual(y, 0.58)

    def test_deadzone_suppresses_micro_tremor(self):
        # Initial point
        self.filter.filter(0.50, 0.50)
        
        # Micro jitter within deadzone (< 0.005)
        jx, jy = self.filter.filter(0.501, 0.502)
        self.assertAlmostEqual(jx, 0.50, "Micro jitter must be locked to previous coordinate by deadzone")
        self.assertAlmostEqual(jy, 0.50, "Micro jitter must be locked to previous coordinate by deadzone")

    def test_slow_movement_is_smoothed(self):
        self.filter.filter(0.50, 0.50)
        # Moderate displacement beyond deadzone but slow
        sx, sy = self.filter.filter(0.52, 0.50)
        # With base_smoothing = 0.7, coordinate should be between 0.50 and 0.52
        self.assertGreater(sx, 0.50)
        self.assertLess(sx, 0.52, "Slow movement must be damped by smoothing")

    def test_fast_movement_has_low_latency(self):
        self.filter.filter(0.10, 0.10)
        # Big flick (distance 0.40 >> velocity_threshold 0.05)
        fx, fy = self.filter.filter(0.50, 0.50)
        # Fast movement dynamically lowers smoothing, reaching closer to target
        self.assertGreater(fx, 0.40, "Fast movement must have high alpha to minimize latency")

    def test_reset_clears_history(self):
        self.filter.filter(0.10, 0.10)
        self.filter.reset()
        self.assertIsNone(self.filter.prev_x)
        self.assertIsNone(self.filter.prev_y)

if __name__ == "__main__":
    unittest.main()
