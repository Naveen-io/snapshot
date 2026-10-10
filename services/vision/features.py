import math
from typing import List, Dict, Any, Tuple

def euclidean_dist(p1: Dict[str, float], p2: Dict[str, float]) -> float:
    """Calculates 3D Euclidean distance between two landmark points."""
    dx = p1["x"] - p2["x"]
    dy = p1["y"] - p2["y"]
    dz = p1.get("z", 0.0) - p2.get("z", 0.0)
    return math.sqrt(dx * dx + dy * dy + dz * dz)

def euclidean_dist_2d(p1: Dict[str, float], p2: Dict[str, float]) -> float:
    """Calculates 2D Euclidean distance in screen projection space."""
    dx = p1["x"] - p2["x"]
    dy = p1["y"] - p2["y"]
    return math.sqrt(dx * dx + dy * dy)

class FeatureExtractor:
    """
    Extracts geometric features from 21 MediaPipe hand landmarks.
    Normalizes biometric distances by palm scale to ensure invariant gesture detection
    regardless of user hand size or camera distance.
    """
    def __init__(
        self,
        left_pinch_down_thresh: float = 0.32,
        left_pinch_up_thresh: float = 0.42,
        right_pinch_down_thresh: float = 0.30,
        right_pinch_up_thresh: float = 0.40,
    ):
        self.left_pinch_down_thresh = left_pinch_down_thresh
        self.left_pinch_up_thresh = left_pinch_up_thresh
        self.right_pinch_down_thresh = right_pinch_down_thresh
        self.right_pinch_up_thresh = right_pinch_up_thresh
        
        self.is_left_pinching = False
        self.is_right_pinching = False
        self.last_scroll_y: float = 0.0

    def extract(self, landmarks: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Analyzes 21 landmarks and outputs derived feature vector.
        """
        if len(landmarks) < 21:
            return {
                "valid": False,
                "palm_scale": 0.0,
                "thumb_index_dist": 1.0,
                "thumb_middle_dist": 1.0,
                "index_tip": {"x": 0.5, "y": 0.5},
                "is_left_pinch": False,
                "is_right_pinch": False,
                "is_scroll_mode": False,
                "extended_fingers": [False, False, False, False, False],
            }

        wrist = landmarks[0]
        middle_mcp = landmarks[9]

        # Calculate palm scale (wrist to middle knuckle)
        palm_scale = euclidean_dist_2d(wrist, middle_mcp)
        if palm_scale < 0.02:
            palm_scale = 0.1  # Fallback to avoid div by zero

        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        middle_tip = landmarks[12]
        ring_tip = landmarks[16]
        pinky_tip = landmarks[20]

        index_pip = landmarks[6]
        middle_pip = landmarks[10]
        ring_pip = landmarks[14]
        pinky_pip = landmarks[18]

        # Normalized distances
        thumb_index_dist = euclidean_dist_2d(thumb_tip, index_tip) / palm_scale
        thumb_middle_dist = euclidean_dist_2d(thumb_tip, middle_tip) / palm_scale

        # Finger extension check: distance from wrist to tip vs wrist to pip
        index_extended = euclidean_dist_2d(wrist, index_tip) > (euclidean_dist_2d(wrist, index_pip) * 1.15)
        middle_extended = euclidean_dist_2d(wrist, middle_tip) > (euclidean_dist_2d(wrist, middle_pip) * 1.15)
        ring_extended = euclidean_dist_2d(wrist, ring_tip) > (euclidean_dist_2d(wrist, ring_pip) * 1.15)
        pinky_extended = euclidean_dist_2d(wrist, pinky_tip) > (euclidean_dist_2d(wrist, pinky_pip) * 1.15)
        # Thumb extended: distance from wrist to thumb tip vs thumb mcp (2)
        thumb_extended = euclidean_dist_2d(wrist, thumb_tip) > (euclidean_dist_2d(wrist, landmarks[2]) * 1.2)

        extended_fingers = [thumb_extended, index_extended, middle_extended, ring_extended, pinky_extended]

        # Pinch detection with hysteresis
        if not self.is_left_pinching:
            if thumb_index_dist < self.left_pinch_down_thresh:
                self.is_left_pinching = True
        else:
            if thumb_index_dist > self.left_pinch_up_thresh:
                self.is_left_pinching = False

        if not self.is_right_pinching:
            # Right pinch requires clear separation from index
            if thumb_middle_dist < self.right_pinch_down_thresh and thumb_index_dist > (thumb_middle_dist * 1.35):
                self.is_right_pinching = True
        else:
            if thumb_middle_dist > self.right_pinch_up_thresh:
                self.is_right_pinching = False

        # Scroll mode: Index + Middle extended, Ring and Pinky folded, no pinch
        is_scroll_mode = (
            index_extended
            and middle_extended
            and not ring_extended
            and not pinky_extended
            and not self.is_left_pinching
            and not self.is_right_pinching
        )

        return {
            "valid": True,
            "palm_scale": round(palm_scale, 4),
            "thumb_index_dist": round(thumb_index_dist, 4),
            "thumb_middle_dist": round(thumb_middle_dist, 4),
            "index_tip": {"x": index_tip["x"], "y": index_tip["y"]},
            "is_left_pinch": self.is_left_pinching,
            "is_right_pinch": self.is_right_pinching,
            "is_scroll_mode": is_scroll_mode,
            "extended_fingers": extended_fingers,
        }

    def reset(self):
        """Resets pinch and scroll hysteresis states."""
        self.is_left_pinching = False
        self.is_right_pinching = False
        self.last_scroll_y = 0.0
