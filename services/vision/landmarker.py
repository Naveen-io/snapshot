import os
from typing import Optional, Dict, Any, List
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

class HandLandmarkDetector:
    """
    Wraps Google MediaPipe Hand Landmarker task for robust 21-point 3D hand tracking.
    Operates synchronously in VIDEO running mode.
    """
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            # Default to local models directory
            base_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(base_dir, "models", "hand_landmarker.task")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"MediaPipe hand landmarker model not found at: {model_path}")

        self.model_path = model_path
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            running_mode=vision.RunningMode.VIDEO
        )
        self._detector = vision.HandLandmarker.create_from_options(options)

    def detect(self, frame_bgr: np.ndarray, timestamp_ms: int) -> Dict[str, Any]:
        """
        Processes a BGR image frame and returns normalized 21 hand landmarks.
        """
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

        result = self._detector.detect_for_video(mp_image, timestamp_ms)

        if not result.hand_landmarks:
            return {
                "detected": False,
                "landmarks": [],
                "handedness": "Right",
                "confidence": 0.0,
            }

        # Hand 0
        first_hand = result.hand_landmarks[0]
        handedness_name = "Right"
        confidence = 0.85

        if result.handedness and len(result.handedness) > 0:
            category = result.handedness[0][0]
            handedness_name = category.category_name
            confidence = float(category.score)

        landmarks_list: List[Dict[str, float]] = []
        for lm in first_hand:
            landmarks_list.append({
                "x": float(np.clip(lm.x, 0.0, 1.0)),
                "y": float(np.clip(lm.y, 0.0, 1.0)),
                "z": float(lm.z)
            })

        return {
            "detected": True,
            "landmarks": landmarks_list,
            "handedness": handedness_name,
            "confidence": round(confidence, 3),
        }

    def close(self):
        if hasattr(self, "_detector") and self._detector:
            self._detector.close()
