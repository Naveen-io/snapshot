import test from 'node:test';
import assert from 'node:assert';
import { OrbitStateMachine } from '../state_machine.ts';
import { DisplayCalibrationManager } from '../input/calibration.ts';
import { WindowsInputAdapter, MockInputSink } from '../input/windows_input.ts';
import type { DisplayTarget, GestureMessage } from '../../../../../packages/protocol/src/types.ts';

const mockPrimaryDisplay: DisplayTarget = {
  id: 'display-1',
  name: '\\\\.\\DISPLAY1',
  x: 0,
  y: 0,
  width: 1536,
  height: 864,
  primary: true,
};

const mockSecondaryDisplay: DisplayTarget = {
  id: 'display-5',
  name: '\\\\.\\DISPLAY5',
  x: 1536,
  y: 0,
  width: 1440,
  height: 900,
  primary: false,
};

test('Input Adapter: blocks pointer movement when state is OFF, PREVIEW, or PAUSED', () => {
  const sm = new OrbitStateMachine('OFF');
  const calib = new DisplayCalibrationManager();
  const sink = new MockInputSink();
  const adapter = new WindowsInputAdapter(sm, calib, mockPrimaryDisplay, sink);

  // In OFF
  const movedOff = adapter.onPointerPosition(0.5, 0.5);
  assert.strictEqual(movedOff, false);
  assert.strictEqual(sink.history.length, 0);

  // In PREVIEW
  sm.requestMode('PREVIEW');
  const movedPrev = adapter.onPointerPosition(0.5, 0.5);
  assert.strictEqual(movedPrev, false);
  assert.strictEqual(sink.history.length, 0);

  // In PAUSED
  sm.requestMode('PAUSED');
  const movedPaused = adapter.onPointerPosition(0.5, 0.5);
  assert.strictEqual(movedPaused, false);
  assert.strictEqual(sink.history.length, 0);
});

test('Input Adapter: executes movement and maps coordinates in POINTER mode', () => {
  const sm = new OrbitStateMachine('PREVIEW');
  sm.requestMode('POINTER');
  const calib = new DisplayCalibrationManager();
  const sink = new MockInputSink();
  const adapter = new WindowsInputAdapter(sm, calib, mockPrimaryDisplay, sink);

  // Move to center
  const moved = adapter.onPointerPosition(0.5, 0.5);
  assert.strictEqual(moved, true);
  assert.strictEqual(sink.history.length, 1);
  assert.strictEqual(sink.history[0].type, 'move');
  assert.ok(sink.currentX > 0 && sink.currentX < 1536);
  assert.ok(sink.currentY > 0 && sink.currentY < 864);
});

test('Input Adapter: maps coordinates accurately to secondary display bounds', () => {
  const sm = new OrbitStateMachine('PREVIEW');
  sm.requestMode('POINTER');
  const calib = new DisplayCalibrationManager();
  const sink = new MockInputSink();
  const adapter = new WindowsInputAdapter(sm, calib, mockSecondaryDisplay, sink);

  adapter.onPointerPosition(0.5, 0.5);
  assert.strictEqual(sink.history.length, 1);
  // Secondary display starts at x=1536
  assert.ok(sink.currentX >= 1536 && sink.currentX < (1536 + 1440));
  assert.ok(sink.currentY >= 0 && sink.currentY < 900);
});

test('Input Adapter: pinch left clicks down and up with debouncing', () => {
  const sm = new OrbitStateMachine('PREVIEW');
  sm.requestMode('POINTER');
  const calib = new DisplayCalibrationManager();
  const sink = new MockInputSink();
  const adapter = new WindowsInputAdapter(sm, calib, mockPrimaryDisplay, sink);

  const pinchStart: GestureMessage = {
    version: 1,
    type: 'gesture',
    name: 'pinch_left',
    phase: 'start',
    confidence: 0.95,
    timestamp: Date.now(),
  };

  const pinchEnd: GestureMessage = {
    version: 1,
    type: 'gesture',
    name: 'pinch_left',
    phase: 'end',
    confidence: 0.95,
    timestamp: Date.now(),
  };

  // First pinch down
  const resDown1 = adapter.onGesture(pinchStart);
  assert.strictEqual(resDown1, true);
  assert.strictEqual(sink.downButtons.has('left'), true);

  // Redundant pinch down while already held is ignored (no multi-click per frame)
  const resDown2 = adapter.onGesture(pinchStart);
  assert.strictEqual(resDown2, false);
  const downCount = sink.history.filter(h => h.type === 'down').length;
  assert.strictEqual(downCount, 1, 'Only one down event emitted per gesture transition');

  // Pinch end
  const resUp = adapter.onGesture(pinchEnd);
  assert.strictEqual(resUp, true);
  assert.strictEqual(sink.downButtons.has('left'), false);
});

test('Input Adapter: scroll gesture caps delta value', () => {
  const sm = new OrbitStateMachine('PREVIEW');
  sm.requestMode('POINTER');
  const calib = new DisplayCalibrationManager();
  const sink = new MockInputSink();
  const adapter = new WindowsInputAdapter(sm, calib, mockPrimaryDisplay, sink);
  adapter.setScrollSpeedCap(25);

  const scrollBigDelta: GestureMessage = {
    version: 1,
    type: 'gesture',
    name: 'scroll',
    phase: 'update',
    value: 120.0, // High raw delta
    confidence: 0.9,
    timestamp: Date.now(),
  };

  adapter.onGesture(scrollBigDelta);
  const scrollEvent = sink.history.find(h => h.type === 'scroll');
  assert.ok(scrollEvent);
  assert.strictEqual(scrollEvent.delta, 25, 'Scroll delta must be capped at 25');
});

test('Input Adapter: emergency stop releases held mouse buttons immediately', () => {
  const sm = new OrbitStateMachine('PREVIEW');
  sm.requestMode('POINTER');
  const calib = new DisplayCalibrationManager();
  const sink = new MockInputSink();
  const adapter = new WindowsInputAdapter(sm, calib, mockPrimaryDisplay, sink);

  // Press down left button
  adapter.onGesture({
    version: 1,
    type: 'gesture',
    name: 'pinch_left',
    phase: 'start',
    confidence: 0.9,
    timestamp: Date.now(),
  });
  assert.strictEqual(adapter.heldButtons.has('left'), true);
  assert.strictEqual(sink.downButtons.has('left'), true);

  // Emergency stop triggered!
  sm.emergencyStop();

  // Held button MUST be released immediately
  assert.strictEqual(adapter.heldButtons.size, 0);
  assert.strictEqual(sink.downButtons.size, 0, 'Zero stuck buttons after emergency stop');
});

test('Input Adapter: tracking loss releases held mouse buttons immediately', () => {
  const sm = new OrbitStateMachine('PREVIEW');
  sm.requestMode('POINTER');
  const calib = new DisplayCalibrationManager();
  const sink = new MockInputSink();
  const adapter = new WindowsInputAdapter(sm, calib, mockPrimaryDisplay, sink);

  // Press down right button
  adapter.onGesture({
    version: 1,
    type: 'gesture',
    name: 'pinch_right',
    phase: 'start',
    confidence: 0.9,
    timestamp: Date.now(),
  });
  assert.strictEqual(adapter.heldButtons.has('right'), true);

  // Hand lost >300ms
  sm.handleHandLoss();

  assert.strictEqual(adapter.heldButtons.size, 0);
  assert.strictEqual(sink.downButtons.size, 0, 'Zero stuck buttons after tracking loss');
});
