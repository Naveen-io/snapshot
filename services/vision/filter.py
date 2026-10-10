import math
from typing import Tuple, Optional

class AdaptiveSmoothingFilter:
    """
    Speed-adaptive smoothing filter with deadband for spatial pointer coordinates.
    Eliminates micro-tremor when still while preserving ultra-low latency during fast movement.
    """
    def __init__(self, base_smoothing: float = 0.65, deadzone: float = 0.003, velocity_threshold: float = 0.05):
        self.base_smoothing = base_smoothing  # Weight of previous position (0 = raw, 0.9 = heavy smooth)
        self.deadzone = deadzone              # Normalized coordinate threshold for stillness
        self.velocity_threshold = velocity_threshold
        
        self.prev_x: Optional[float] = None
        self.prev_y: Optional[float] = None

    def filter(self, x: float, y: float) -> Tuple[float, float]:
        if self.prev_x is None or self.prev_y is None:
            self.prev_x = x
            self.prev_y = y
            return x, y

        dx = x - self.prev_x
        dy = y - self.prev_y
        dist = math.hypot(dx, dy)

        # Deadband: suppress stillness tremor
        if dist < self.deadzone:
            return self.prev_x, self.prev_y

        # Dynamic smoothing factor: faster movement lowers smoothing weight for instant response
        speed_ratio = min(1.0, dist / self.velocity_threshold)
        effective_smoothing = self.base_smoothing * (1.0 - speed_ratio * 0.75)

        alpha = 1.0 - effective_smoothing
        filtered_x = self.prev_x + alpha * dx
        filtered_y = self.prev_y + alpha * dy

        self.prev_x = filtered_x
        self.prev_y = filtered_y

        return filtered_x, filtered_y

    def reset(self):
        self.prev_x = None
        self.prev_y = None
