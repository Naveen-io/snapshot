import asyncio
import json
import logging
import os
import signal
import sys
import time
from typing import Set, Optional, Dict, Any

import websockets
from websockets.server import WebSocketServerProtocol

from .camera import CameraManager
from .landmarker import HandLandmarkDetector
from .features import FeatureExtractor
from .filter import AdaptiveSmoothingFilter

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [ORBIT Vision] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("orbit_vision")

class OrbitVisionService:
    def __init__(self, host: str = "127.0.0.1", port: int = 8765, token: Optional[str] = None):
        self.host = host
        self.port = port
        self.token = token or os.environ.get("ORBIT_SESSION_TOKEN")

        self.mode = "OFF"  # OFF, PREVIEW, CALIBRATION, POINTER, PAUSED, ERROR
        self.camera_status = "closed"  # closed, opening, active, error
        self.error_message: Optional[str] = None

        self.camera = CameraManager(camera_index=0, width=640, height=480, target_fps=30)
        self.detector: Optional[HandLandmarkDetector] = None
        self.features = FeatureExtractor()
        self.filter = AdaptiveSmoothingFilter()

        self.connected_clients: Set[WebSocketServerProtocol] = set()
        self.is_running = True
        
        self.hand_detected = False
        self.last_hand_time = 0.0
        self.tracking_loss_reported = False
        self.was_left_pinching = False
        self.was_right_pinching = False
        self.was_scrolling = False
        self.last_index_y = 0.5

    def init_detector(self) -> bool:
        if self.detector is not None:
            return True
        try:
            self.detector = HandLandmarkDetector()
            logger.info("MediaPipe HandLandmarker initialized successfully.")
            return True
        except Exception as e:
            self.camera_status = "error"
            self.mode = "ERROR"
            self.error_message = f"Failed to initialize MediaPipe HandLandmarker: {str(e)}"
            logger.error(self.error_message)
            return False

    async def broadcast(self, message: Dict[str, Any]):
        if not self.connected_clients:
            return
        payload = json.dumps(message)
        dead_clients = set()
        for client in self.connected_clients:
            try:
                await client.send(payload)
            except websockets.ConnectionClosed:
                dead_clients.add(client)
        self.connected_clients.difference_update(dead_clients)

    def create_status_message(self) -> Dict[str, Any]:
        return {
            "version": 1,
            "type": "status",
            "camera": self.camera_status,
            "mode": self.mode,
            "fps": self.camera.measured_fps,
            "handDetected": self.hand_detected,
            "message": self.error_message,
            "timestamp": int(time.time() * 1000)
        }

    async def handle_command(self, data: Dict[str, Any]):
        cmd = data.get("command")
        payload = data.get("payload", {})

        if cmd == "SET_MODE":
            target_mode = payload.get("targetMode", "OFF")
            logger.info(f"Mode change requested: {self.mode} -> {target_mode}")
            
            if target_mode in ["OFF", "PAUSED", "ERROR"] and self.mode == "POINTER":
                # Send immediate safety release
                await self.broadcast({
                    "version": 1,
                    "type": "safety_release",
                    "reason": "pause" if target_mode == "PAUSED" else "shutdown",
                    "timestamp": int(time.time() * 1000)
                })

            if target_mode == "OFF":
                self.mode = "OFF"
                self.camera.close()
                self.camera_status = "closed"
                self.hand_detected = False
                self.filter.reset()
                self.features.reset()
            elif target_mode in ["PREVIEW", "CALIBRATION", "POINTER", "PAUSED"]:
                if not self.camera.is_open:
                    self.camera_status = "opening"
                    await self.broadcast(self.create_status_message())
                    if not self.init_detector():
                        return
                    if self.camera.open():
                        self.camera_status = "active"
                        self.mode = target_mode
                        self.error_message = None
                    else:
                        self.camera_status = "error"
                        self.mode = "ERROR"
                        self.error_message = self.camera.last_error or "Failed to open camera"
                else:
                    self.mode = target_mode

            await self.broadcast(self.create_status_message())

        elif cmd == "EMERGENCY_STOP":
            logger.warning("EMERGENCY STOP received via protocol.")
            self.mode = "PAUSED"
            await self.broadcast({
                "version": 1,
                "type": "safety_release",
                "reason": "emergency_stop",
                "timestamp": int(time.time() * 1000)
            })
            await self.broadcast(self.create_status_message())

        elif cmd == "UPDATE_CONFIG":
            cam_idx = payload.get("cameraIndex")
            if cam_idx is not None and cam_idx != self.camera.camera_index:
                logger.info(f"Switching camera index to {cam_idx}")
                self.camera.camera_index = cam_idx
                if self.camera.is_open:
                    self.camera.open(cam_idx)
            
            smooth = payload.get("smoothingFactor")
            if smooth is not None:
                self.filter.base_smoothing = float(smooth)
                
            deadzone = payload.get("deadzone")
            if deadzone is not None:
                self.filter.deadzone = float(deadzone)

            await self.broadcast(self.create_status_message())

        elif cmd == "PING":
            await self.broadcast(self.create_status_message())

    async def handle_client(self, websocket: WebSocketServerProtocol, path: str = ""):
        # Validate session token if configured
        query_token = None
        if "?" in path:
            qs = path.split("?", 1)[1]
            params = dict(qp.split("=", 1) for qp in qs.split("&") if "=" in qp)
            query_token = params.get("token")

        if self.token and query_token != self.token:
            logger.warning("Rejecting connection with invalid or missing session token.")
            await websocket.close(1008, "Invalid session token")
            return

        self.connected_clients.add(websocket)
        logger.info(f"Client connected from {websocket.remote_address}. Active: {len(self.connected_clients)}")

        # Send initial status
        await websocket.send(json.dumps(self.create_status_message()))

        try:
            async for raw_msg in websocket:
                try:
                    data = json.loads(raw_msg)
                    if data.get("type") == "control_command":
                        await self.handle_command(data)
                except json.JSONDecodeError:
                    logger.warning("Received malformed JSON message.")
        except websockets.ConnectionClosed:
            pass
        finally:
            self.connected_clients.discard(websocket)
            logger.info(f"Client disconnected. Active: {len(self.connected_clients)}")

    async def vision_loop(self):
        """High-frequency vision processing loop (target 30 FPS)."""
        logger.info("Vision processing loop started.")
        last_status_broadcast = 0.0

        while self.is_running:
            now = time.time()
            now_ms = int(now * 1000)

            if self.mode == "OFF":
                # Idle when OFF to preserve CPU/GPU
                await asyncio.sleep(0.05)
                continue

            if not self.camera.is_open:
                await asyncio.sleep(0.05)
                continue

            # Read frame from webcam
            success, frame = self.camera.read_frame()
            if not success or frame is None:
                self.camera_status = "error"
                self.mode = "ERROR"
                self.error_message = self.camera.last_error or "Lost connection to webcam"
                await self.broadcast(self.create_status_message())
                await asyncio.sleep(0.1)
                continue

            # Detect landmarks via MediaPipe
            assert self.detector is not None
            det_result = self.detector.detect(frame, now_ms)
            
            is_detected = det_result["detected"]
            landmarks = det_result["landmarks"]
            handedness = det_result["handedness"]
            confidence = det_result["confidence"]

            if is_detected and len(landmarks) == 21:
                self.hand_detected = True
                self.last_hand_time = now
                self.tracking_loss_reported = False

                # Extract biometric & gesture features
                feat = self.features.extract(landmarks)
                
                # Send landmarks for local preview visualization
                await self.broadcast({
                    "version": 1,
                    "type": "landmarks",
                    "landmarks": landmarks,
                    "handedness": handedness,
                    "confidence": confidence,
                    "timestamp": now_ms
                })

                # Index fingertip pointer mapping
                raw_x = feat["index_tip"]["x"]
                raw_y = feat["index_tip"]["y"]

                # Horizontal mirroring for natural selfie control
                mirrored_x = 1.0 - raw_x
                smoothed_x, smoothed_y = self.filter.filter(mirrored_x, raw_y)

                # Broadcast pointer position
                await self.broadcast({
                    "version": 1,
                    "type": "pointer_position",
                    "x": round(smoothed_x, 4),
                    "y": round(smoothed_y, 4),
                    "confidence": confidence,
                    "timestamp": now_ms
                })

                # Process gestures
                # Left click pinch transition
                is_left = feat["is_left_pinch"]
                if is_left and not self.was_left_pinching:
                    self.was_left_pinching = True
                    await self.broadcast({
                        "version": 1,
                        "type": "gesture",
                        "name": "pinch_left",
                        "phase": "start",
                        "confidence": confidence,
                        "timestamp": now_ms
                    })
                elif not is_left and self.was_left_pinching:
                    self.was_left_pinching = False
                    await self.broadcast({
                        "version": 1,
                        "type": "gesture",
                        "name": "pinch_left",
                        "phase": "end",
                        "confidence": confidence,
                        "timestamp": now_ms
                    })

                # Right click pinch transition
                is_right = feat["is_right_pinch"]
                if is_right and not self.was_right_pinching:
                    self.was_right_pinching = True
                    await self.broadcast({
                        "version": 1,
                        "type": "gesture",
                        "name": "pinch_right",
                        "phase": "start",
                        "confidence": confidence,
                        "timestamp": now_ms
                    })
                elif not is_right and self.was_right_pinching:
                    self.was_right_pinching = False
                    await self.broadcast({
                        "version": 1,
                        "type": "gesture",
                        "name": "pinch_right",
                        "phase": "end",
                        "confidence": confidence,
                        "timestamp": now_ms
                    })

                # Scroll gesture
                is_scrolling = feat["is_scroll_mode"]
                if is_scrolling:
                    # Delta from previous index y
                    delta_y = (raw_y - self.last_index_y) * 100.0  # scaled delta
                    if not self.was_scrolling:
                        self.was_scrolling = True
                        await self.broadcast({
                            "version": 1,
                            "type": "gesture",
                            "name": "scroll",
                            "phase": "start",
                            "confidence": confidence,
                            "timestamp": now_ms
                        })
                    else:
                        if abs(delta_y) > 0.5:
                            await self.broadcast({
                                "version": 1,
                                "type": "gesture",
                                "name": "scroll",
                                "phase": "update",
                                "value": round(-delta_y, 2),  # Invert so moving hand up scrolls up
                                "confidence": confidence,
                                "timestamp": now_ms
                            })
                elif self.was_scrolling:
                    self.was_scrolling = False
                    await self.broadcast({
                        "version": 1,
                        "type": "gesture",
                        "name": "scroll",
                        "phase": "end",
                        "confidence": confidence,
                        "timestamp": now_ms
                    })

                self.last_index_y = raw_y

            else:
                # No hand detected
                self.hand_detected = False
                
                # Check 300ms hand-loss timeout for safety release
                if (now - self.last_hand_time) > 0.30 and not self.tracking_loss_reported:
                    self.tracking_loss_reported = True
                    self.was_left_pinching = False
                    self.was_right_pinching = False
                    self.was_scrolling = False
                    self.filter.reset()
                    self.features.reset()
                    
                    if self.mode == "POINTER":
                        await self.broadcast({
                            "version": 1,
                            "type": "safety_release",
                            "reason": "tracking_lost",
                            "timestamp": now_ms
                        })

            # Broadcast periodic status (every 500ms)
            if (now - last_status_broadcast) >= 0.5:
                last_status_broadcast = now
                await self.broadcast(self.create_status_message())

            # Target ~30 FPS loop pacing (33ms per frame)
            await asyncio.sleep(0.005)

    async def start(self):
        """Starts WebSocket server and vision processing loop concurrently."""
        server = await websockets.serve(self.handle_client, self.host, self.port)
        logger.info(f"FROSTEX ORBIT Vision Server listening on ws://{self.host}:{self.port}")

        try:
            await self.vision_loop()
        finally:
            server.close()
            await server.wait_closed()
            self.camera.close()
            if self.detector:
                self.detector.close()
            logger.info("FROSTEX ORBIT Vision Server cleanly terminated.")

    def stop(self):
        self.is_running = False

def main():
    port = int(os.environ.get("ORBIT_PORT", "8765"))
    token = os.environ.get("ORBIT_SESSION_TOKEN", None)

    service = OrbitVisionService(host="127.0.0.1", port=port, token=token)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def signal_handler():
        logger.info("Signal received, stopping vision service...")
        service.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, lambda s, f: signal_handler())
        except Exception:
            pass

    try:
        loop.run_until_complete(service.start())
    except KeyboardInterrupt:
        service.stop()
    finally:
        loop.close()

if __name__ == "__main__":
    main()
