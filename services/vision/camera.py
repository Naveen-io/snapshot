import time
import cv2
from typing import Optional, Tuple
import numpy as np

class CameraManager:
    """
    Manages local webcam capture lifecycle using OpenCV.
    Ensures cameras are opened and released cleanly with zero frame leakage to disk.
    """
    def __init__(self, camera_index: int = 0, width: int = 640, height: int = 480, target_fps: int = 30):
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.target_fps = target_fps
        self._cap: Optional[cv2.VideoCapture] = None
        self._is_open = False
        self._last_error: Optional[str] = None
        
        # FPS measurement
        self._frame_count = 0
        self._fps_start_time = time.time()
        self._measured_fps = 0.0

    @property
    def is_open(self) -> bool:
        return self._is_open and self._cap is not None and self._cap.isOpened()

    @property
    def measured_fps(self) -> float:
        return self._measured_fps

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    def open(self, index: Optional[int] = None) -> bool:
        """Opens camera using DirectShow backend for fast, deterministic startup on Windows."""
        if index is not None:
            self.camera_index = index

        self.close()

        try:
            # Use DirectShow backend on Windows (cv2.CAP_DSHOW)
            cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
            if not cap.isOpened():
                # Fallback to default backend if DSHOW fails
                cap = cv2.VideoCapture(self.camera_index)
            
            if not cap.isOpened():
                self._last_error = f"Camera {self.camera_index} is unavailable or in use by another application"
                self._is_open = False
                return False

            cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            cap.set(cv2.CAP_PROP_FPS, self.target_fps)

            # Warm-up read
            ret, test_frame = cap.read()
            if not ret or test_frame is None:
                cap.release()
                self._last_error = f"Camera {self.camera_index} opened but failed to yield initial frame"
                self._is_open = False
                return False

            self._cap = cap
            self._is_open = True
            self._last_error = None
            self._frame_count = 0
            self._fps_start_time = time.time()
            return True

        except Exception as e:
            self._last_error = f"Exception opening camera {self.camera_index}: {str(e)}"
            self._is_open = False
            return False

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Reads one BGR frame and updates truthful FPS calculation."""
        if not self.is_open or self._cap is None:
            return False, None

        ret, frame = self._cap.read()
        if not ret or frame is None:
            self._last_error = "Camera disconnected or failed to read frame"
            self.close()
            return False, None

        # Update FPS calculation
        self._frame_count += 1
        now = time.time()
        elapsed = now - self._fps_start_time
        if elapsed >= 1.0:
            self._measured_fps = round(self._frame_count / elapsed, 1)
            self._frame_count = 0
            self._fps_start_time = now

        return True, frame

    def close(self) -> None:
        """Releases camera hardware immediately."""
        self._is_open = False
        if self._cap is not None:
            try:
                self._cap.release()
            except Exception:
                pass
            self._cap = None
        self._measured_fps = 0.0

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
